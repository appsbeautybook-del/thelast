import WebSocket from 'ws';
import crypto from 'crypto';

const TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const VOICES = {
  'fr': 'fr-FR-DeniseNeural',
  'fr-FR': 'fr-FR-DeniseNeural',
  'fr-FR-male': 'fr-FR-HenriNeural',
  'en': 'en-US-JennyNeural',
  'en-US': 'en-US-JennyNeural',
};
const DEFAULT_VOICE = 'fr-FR-DeniseNeural';

function uuid() {
  return crypto.randomUUID().replace(/-/g, '');
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function synthesize(text, voice, outputFormat = 'audio-24khz-48kbitrate-mono-mp3') {
  return new Promise((resolve, reject) => {
    const connId = uuid();
    const reqId = uuid();
    const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_TOKEN}&ConnectionId=${connId}`;

    const ws = new WebSocket(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      },
    });

    const chunks = [];
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.close();
        reject(new Error('TTS timeout'));
      }
    }, 15000);

    ws.on('open', () => {
      const config = JSON.stringify({
        context: {
          synthesis: {
            audio: {
              metadataoptions: {
                sentenceBoundaryEnabled: 'false',
                wordBoundaryEnabled: 'false',
              },
              outputFormat,
            },
          },
        },
      });
      ws.send(`Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${config}`);

      const now = new Date().toISOString();
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='fr-FR'><voice name='${voice}'>${escapeXml(text)}</voice></speak>`;
      ws.send(`X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${now}\r\nPath:ssml\r\n\r\n${ssml}`);
    });

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const headerEnd = buf.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const audioData = buf.slice(headerEnd + 4);
          if (audioData.length > 0) chunks.push(audioData);
        }
      } else {
        const msg = data.toString();
        if (msg.includes('Path:turn.end')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
            resolve(Buffer.concat(chunks));
          }
        }
      }
    });

    ws.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });

    ws.on('close', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        if (chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error('TTS connection closed without audio'));
        }
      }
    });
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, voice } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  const cleanText = text
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 3000);

  if (!cleanText) {
    return res.status(400).json({ error: 'Empty text after cleaning' });
  }

  const voiceName = VOICES[voice] || VOICES[voice?.split('-').slice(0, 2).join('-')] || DEFAULT_VOICE;

  try {
    console.log(`[tts] Synthesizing ${cleanText.length} chars with voice: ${voiceName}`);
    const audioBuffer = await synthesize(cleanText, voiceName);
    console.log(`[tts] Generated ${audioBuffer.length} bytes of audio`);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(audioBuffer);
  } catch (err) {
    console.error('[tts] Error:', err.message);
    return res.status(500).json({ error: 'TTS synthesis failed', detail: err.message });
  }
}
