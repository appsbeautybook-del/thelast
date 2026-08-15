/**
 * Compresse les médias (images ET vidéos) côté client avant upload.
 * Objectif : passer sous la barre des 500 Mo sans perte visuelle.
 *
 * Images → Canvas API (resize + JPEG quality adaptatif)
 * Vidéos → MediaRecorder (re-encodage bitrate adaptatif)
 */

const COMPRESS_THRESHOLD = 400 * 1024 * 1024; // 400 Mo – compresser au-delà pour rester sous 500 Mo
const IMAGE_TARGET_MAX = 450 * 1024 * 1024;   // 450 Mo cible pour images
const VIDEO_TARGET_MAX = 450 * 1024 * 1024;   // 450 Mo cible pour vidéos

// ─── IMAGES ──────────────────────────────────────────────────────────────────

/**
 * Compresse une image avec qualité adaptative.
 * Seulement si > 400 Mo. Conserve la qualité maximale possible.
 */
export async function compressImage(file, opts = {}) {
  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 0.90,
    maxBytes = IMAGE_TARGET_MAX,
  } = opts;

  if (!file || !(file instanceof File)) return file;

  const type = file.type || '';
  if (!type.startsWith('image/') || type === 'image/gif' || type === 'image/svg+xml') {
    return file;
  }

  // Si sous le seuil de 400 Mo, ne pas compresser (mais redimensionner si trop grand)
  if (file.size <= COMPRESS_THRESHOLD) {
    // Mais on redimensionne si trop grand en dimensions
    const bitmap = await createImageBitmap(file);
    const needsResize = bitmap.width > maxWidth || bitmap.height > maxHeight;
    bitmap.close();
    if (!needsResize) return file;
  }

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  // Redimensionner si dépasse les dimensions max
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const outputType = 'image/jpeg';
  let q = quality;

  // Essayer avec la qualité demandée, réduire si trop gros
  let blob = await canvasToBlob(canvas, outputType, q);
  let attempts = 0;
  while (blob && blob.size > maxBytes && q > 0.50 && attempts < 6) {
    q -= 0.05;
    blob = await canvasToBlob(canvas, outputType, Math.max(0.50, q));
    attempts++;
  }

  // Si toujours trop gros, réduire les dimensions légèrement
  if (blob && blob.size > maxBytes) {
    const scale = Math.sqrt(maxBytes / blob.size) * 0.95;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, outputType, 0.75);
  }

  if (!blob || blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.jpg`, { type: outputType, lastModified: Date.now() });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

// ─── VIDÉOS ──────────────────────────────────────────────────────────────────

/**
 * Compresse une vidéo via MediaRecorder (re-encodage canvas + stream).
 * Seulement si > 400 Mo. Conserve la qualité maximale possible.
 */
export async function compressVideo(file, opts = {}) {
  const {
    maxBytes = VIDEO_TARGET_MAX,
    maxWidth = 1920,
    maxHeight = 1080,
    onProgress = null,
  } = opts;

  if (!file || !(file instanceof File)) return file;
  if (!file.type.startsWith('video/')) return file;

  // Si sous le seuil de 40 Mo, pas de compression
  if (file.size <= COMPRESS_THRESHOLD) return file;

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    const url = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.pause();
      video.src = '';
    };

    const timeout = setTimeout(() => {
      cleanup();
      console.warn('[compressVideo] Timeout after 60s, using original');
      resolve(file);
    }, 60000);

    video.onloadedmetadata = () => {
      const vWidth = video.videoWidth;
      const vHeight = video.videoHeight;
      const duration = video.duration;

      if (!duration || duration === Infinity || !vWidth || !vHeight) {
        clearTimeout(timeout);
        cleanup();
        resolve(file);
        return;
      }

      const targetBitrate = (maxBytes * 0.85 * 8) / duration;
      const maxDim = Math.max(vWidth, vHeight);
      let scale = 1;
      if (maxDim > Math.max(maxWidth, maxHeight)) {
        scale = Math.max(maxWidth, maxHeight) / maxDim;
      }

      const outW = Math.round(vWidth * scale);
      const outH = Math.round(vHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');

      const canvasStream = canvas.captureStream(24);

      const videoBitrate = Math.min(targetBitrate, 20_000_000);

      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
      }

      let recorder;
      try {
        recorder = new MediaRecorder(canvasStream, {
          mimeType,
          videoBitsPerSecond: videoBitrate,
        });
      } catch (e) {
        clearTimeout(timeout);
        cleanup();
        console.warn('[compressVideo] MediaRecorder init failed:', e);
        resolve(file);
        return;
      }

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        clearTimeout(timeout);
        cleanup();
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size <= 0 || blob.size >= file.size) {
          resolve(file);
          return;
        }
        const baseName = file.name.replace(/\.[^.]+$/, '');
        resolve(new File([blob], `${baseName}.webm`, { type: mimeType, lastModified: Date.now() }));
      };

      recorder.onerror = () => {
        clearTimeout(timeout);
        cleanup();
        resolve(file);
      };

      try {
        recorder.start(100);
      } catch (e) {
        clearTimeout(timeout);
        cleanup();
        resolve(file);
        return;
      }

      video.currentTime = 0;

      const tryPlay = () => {
        video.play().catch(() => {
          setTimeout(tryPlay, 500);
        });
      };
      tryPlay();

      let frameCount = 0;
      const drawFrame = () => {
        if (video.ended || video.paused || video.currentTime >= duration) {
          if (recorder.state !== 'inactive') recorder.stop();
          return;
        }
        try {
          ctx.drawImage(video, 0, 0, outW, outH);
        } catch {}
        frameCount++;
        if (onProgress && frameCount % 30 === 0) {
          onProgress(Math.round((video.currentTime / duration) * 100));
        }
        requestAnimationFrame(drawFrame);
      };

      video.onseeked = () => drawFrame();
      video.currentTime = 0;
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve(file);
    };

    video.src = url;
  });
}

// ─── COMPREHENSIF ────────────────────────────────────────────────────────────

/**
 * Compresse un fichier média (image ou vidéo) avant upload.
 * Détecte automatiquement le type et applique la compression adaptée.
 */
export async function compressMedia(file, opts = {}) {
  if (!file || !(file instanceof File)) return file;

  const type = file.type || '';

  if (type.startsWith('image/')) {
    return compressImage(file, opts);
  }

  if (type.startsWith('video/')) {
    return compressVideo(file, opts);
  }

  // Autres types → pas de compression
  return file;
}
