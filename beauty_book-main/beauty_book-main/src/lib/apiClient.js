import { supabase } from '../api/supabaseClient';
import { clientSendVerificationCode, clientVerifyCode } from './clientOtp';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || '';

function isBackendAvailable() {
  const hostname = window.location.hostname;
  // Pas de backend sur Vercel, ni sur localhost/dev sans VITE_BACKEND_URL
  if (hostname.includes('vercel.app')) return false;
  if ((hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) && !API_BASE_URL) return false;
  return true;
}

export const apiClient = {
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },
  
  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  async request(endpoint, options = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: response.statusText };
      }
      throw new Error(errorData.error || 'API Request Failed');
    }

    return response.json();
  },

  async callFunction(functionName, payload = {}) {
    // ── AI functions: route ALL through /api/ai/maria (OpenRouter proxy) ──
    const aiFunctions = ['analyzePhoto', 'simulateHairstyle', 'shAiTryOn', 'shAiImageSearch', 'mariaAutoReply'];
    if (aiFunctions.includes(functionName)) {
      return this._callMariaAI(functionName, payload);
    }

    // Map old Base44 function names → new Express API routes
    const endpointMap = {
      // ----- Admin & Management (Phase 3) -----
      approvePro: { path: '/admin/approve-pro', method: 'POST' },
      adminCreateService: { path: '/admin/create-service', method: 'POST' },
      manageStyle: { path: '/admin/manage-style', method: 'POST' },
      manageReel: { path: '/v8/manage/reel', method: 'POST' },
      manageAnnonce: { path: '/admin/annonce', method: 'POST' },
      adminApi: { path: '/admin/api', method: 'POST' },
      deleteAccount: { path: '/account/delete', method: 'POST' },
      addFidelitePoints: { path: '/account/fidelite/add', method: 'POST' },
      creditFideliteAuto: { path: '/account/fidelite/auto', method: 'POST' },
      sendVerificationCode: { path: '/auth/send-verification-code', method: 'POST' },
      verifyCode: { path: '/auth/verify-code', method: 'POST' },
      adminLogin: { path: '/auth/admin/login', method: 'POST' },
      adminRegister: { path: '/auth/admin/register', method: 'POST' },
      vendeurLogin: { path: '/auth/vendeur/login', method: 'POST' },
      vendeurRegister: { path: '/auth/vendeur/register', method: 'POST' },
      placesAutocomplete: { path: '/maps/places-autocomplete', method: 'POST' },
      geocode: { path: '/maps/geocode', method: 'POST' },

      // --- Sellers / Pro (Phase 3) ---
      getProfilPro: { path: '/pro/profile/get', method: 'POST' },
      updateProfilPro: { path: '/pro/profile/update', method: 'POST' },

      // --- Reservations ---
      createReservation:           { path: '/reservations',          method: 'POST' },
      completeReservation:         { path: '/reservations/complete', method: 'POST' },
      getReservations:             { path: '/reservations/list',     method: 'POST' },
      updateReservation:           { path: `/reservations/${payload?.reservationId || ''}`, method: 'PUT' },
      sendReservationReminders:    { path: '/reservations/reminders',method: 'POST' },

      // --- Payments / Commerce ---
      createCheckoutSession:       { path: '/payments/checkout-session',      method: 'POST' },
      createSubscriptionCheckout:  { path: '/payments/subscription-checkout', method: 'POST' },
      createSetupIntent:           { path: '/payments/setup-intent',          method: 'POST' },
      getPaymentMethods:           { path: '/payments/payment-methods',       method: 'GET'  },
      deletePaymentMethod:         { path: '/payments/payment-methods',       method: 'DELETE' },
      setDefaultPaymentMethod:     { path: '/payments/payment-methods',       method: 'POST'  },
      chargeSavedCard:             { path: '/payments/charge-saved',          method: 'POST' },
      createCommande:              { path: '/commandes',                       method: 'POST' },
      getCommandes:                { path: '/commandes/list',                  method: 'POST' },
      trackOrder:                  { path: '/commandes/track',                 method: 'POST' },

      // --- Cart ---
      getPanier:                   { path: '/cart', method: 'GET'  },
      updatePanier:                { path: '/cart', method: 'POST' },

      // --- Feed & Social (Phase 5) ---
      getHomeData: { path: '/feed/home', method: 'POST' },
      getReels: { path: '/feed/reels', method: 'POST' },
      likeReel: { path: '/feed/reels/like', method: 'POST' },
      searchMusic: { path: '/feed/music/search', method: 'POST' },
      
      // --- Content & Catalog (Phase 5) ---
      getStyles: { path: '/content/styles', method: 'POST' },
      getAnnonces: { path: '/content/annonces', method: 'POST' },
      getProduits: { path: '/content/produits', method: 'POST' },
      getImmobilier: { path: '/content/immobilier', method: 'POST' },

      // --- Communication (Phase 6) ---
      getMessages: { path: '/communication/messages/get', method: 'POST' },
      sendMessage: { path: '/communication/messages/send', method: 'POST' },
      getNotifications: { path: '/communication/notifications/get', method: 'POST' },
      markNotificationsRead: { path: '/communication/notifications/mark-read', method: 'POST' },

      // --- AI (routed via _callMariaAI above) ---
      mariaAgent: { path: '/api/ai/maria', method: 'POST' },

      stripeWebhook: { path: '/webhooks/stripe', method: 'POST' },
      shopifyProducts: { path: '/webhooks/shopify', method: 'POST' },
      muxLive: { path: '/webhooks/mux-live', method: 'POST' },

      // --- Phase 8 ---
      addFidelitePoints:          { path: '/v8/fidelite/add', method: 'POST' },
      creditFideliteAuto:         { path: '/v8/fidelite/auto-credit', method: 'POST' },
      createShopifyCheckout:      { path: '/v8/boutique/shopify-checkout', method: 'POST' },
      createSubscriptionCheckout: { path: '/v8/subscription/checkout', method: 'POST' },
      manageAnnonce:              { path: '/v8/manage/annonce', method: 'POST' },
      manageStyle:                { path: '/v8/manage/style', method: 'POST' },
      manageEntity:               { path: '/v8/manage/entity', method: 'POST' },
      deleteAccount:              { path: '/v8/account', method: 'DELETE' },
    };

    const route = endpointMap[functionName];
    if (!route) {
      console.warn(`[apiClient.callFunction] "${functionName}" not yet migrated — returning mock`);
      return { data: { success: true, message: `Mock for ${functionName}` } };
    }

    // Sur Vercel: OTP directement via Supabase côté client
    if (!isBackendAvailable()) {
      if (functionName === 'sendVerificationCode') {
        return this._sendOtpClient(payload);
      }
      if (functionName === 'verifyCode') {
        return this._verifyOtpClient(payload);
      }
      if (functionName === 'createReservation') {
        return this._createReservationClient(payload);
      }
    }

    const options = { method: route.method };

    let path = route.path;
    if (route.method === 'GET') {
      const params = new URLSearchParams(payload).toString();
      if (params) path += `?${params}`;
    } else {
      options.body = JSON.stringify(payload);
    }

    try {
      const result = await this.request(path, options);
      return { data: result };
    } catch (error) {
      console.warn(`[apiClient.callFunction] "${functionName}" failed (${error.message}) — returning fallback`);
      return {
        data: {
          success: false,
          fallback: true,
          message: error.message,
          has_person: true,
          body_visible: true,
          quality_ok: true,
          compatibility_score: 80,
          issues: [],
          body_type: '',
          suggestion: 'Analyse IA indisponible.',
        },
      };
    }
  },

  // ── Route all AI functions ──
  async _callMariaAI(functionName, payload) {
    // simulateHairstyle: fal.ai for real image generation
    if (functionName === 'simulateHairstyle') {
      return this._falHairstyleGenerate(payload);
    }

    // shAiTryOn: fal.ai for virtual try-on
    if (functionName === 'shAiTryOn') {
      return this._falVirtualTryOn(payload);
    }

    // analyzePhoto: client-side image analysis
    if (functionName === 'analyzePhoto') {
      const { photoUrl, productName } = payload;
      try {
        const img = await new Promise((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = 'anonymous';
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = photoUrl;
        });

        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const aspectRatio = width / height;
        const megapixels = (width * height) / 1000000;

        const issues = [];
        let score = 70;

        if (megapixels < 0.5) { issues.push('Résolution faible'); score -= 15; }
        else if (megapixels >= 2) { score += 10; }

        if (aspectRatio > 0.8) { issues.push('Photo trop carrée'); score -= 10; }
        else if (aspectRatio < 0.35) { issues.push('Photo trop allongée'); score -= 5; }
        else { score += 5; }

        if (height > width * 1.3) { score += 10; }
        score = Math.max(35, Math.min(95, score));

        let body_type = '';
        if (aspectRatio < 0.5 && height > width * 1.5) body_type = 'Silhouette allongée';
        else if (aspectRatio < 0.6) body_type = 'Cadrage portrait standard';
        else body_type = 'Cadrage paysage';

        let suggestion = '';
        if (score >= 80) suggestion = 'Excellente photo pour l\'essayage virtuel !';
        else if (score >= 60) suggestion = 'Photo correcte. Pour un meilleur résultat, utilisez un fond neutre.';
        else suggestion = 'Essayez une photo avec meilleur éclairage et un fond simple.';

        return {
          data: {
            has_person: true, body_visible: height > width, quality_ok: score >= 50,
            compatibility_score: score, issues, body_type, suggestion,
            resolution: `${width}x${height}`, megapixels: Math.round(megapixels * 10) / 10,
          },
        };
      } catch (error) {
        console.error('[apiClient] analyzePhoto error:', error);
        return {
          data: {
            has_person: true, body_visible: true, quality_ok: true,
            compatibility_score: 70, issues: ['Impossible d\'analyser l\'image'], body_type: '',
            suggestion: 'Analyse automatique indisponible.', fallback: true,
          },
        };
      }
    }

    // shAiImageSearch / mariaAutoReply: Gemini via chat completions
    const chatBuilders = {
      shAiImageSearch: (p) => [{
        role: 'user',
        content: [
          ...(p.image_url && !p.image_url.startsWith('data:') ? [{ type: 'image_url', image_url: { url: p.image_url } }] : []),
          { type: 'text', text: `Analyse cette image et identifie les produits visibles.\nRetourne UNIQUEMENT ce JSON :\n{"description":"Description","categories":["cat1"],"keywords":["mot1"],"products":[{"name":"Produit","category":"Cat","brand":"Marque"}]}` }
        ]
      }],
      mariaAutoReply: (p) => p.messages || [{ role: 'user', content: p.text || 'Bonjour' }],
    };

    const builder = chatBuilders[functionName];
    if (!builder) {
      return { data: { fallback: true, message: `Function ${functionName} not configured` } };
    }

    // No backend available locally
    if (!API_BASE_URL) {
      if (functionName === 'mariaAutoReply') {
        return { data: { fallback: true, reply: "Je suis Maria, votre assistante beauté. Comment puis-je vous aider ?", message: "Maria IA nécessite le backend pour fonctionner." } };
      }
      return { data: { fallback: true, description: 'Analyse IA indisponible.', categories: [], keywords: [], products: [] } };
    }

    try {
      const messages = builder(payload);
      const result = await this.request('/api/ai/maria', {
        method: 'POST',
        body: JSON.stringify({
          messages,
          model: 'google/gemini-2.5-flash',
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      const content = result?.choices?.[0]?.message?.content || '';
      try {
        const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
        const parsed = JSON.parse(cleaned);
        return { data: parsed };
      } catch {
        return {
          data: {
            fallback: true,
            message: content || 'Analyse IA terminee.',
            has_person: true,
            body_visible: true,
            quality_ok: true,
            compatibility_score: 80,
            issues: [],
            body_type: '',
            suggestion: content || 'Analyse IA terminee.',
          },
        };
      }
    } catch (error) {
      console.error(`[apiClient._callMariaAI] Error for "${functionName}":`, error);
      return { data: { fallback: true, error: error.message } };
    }
  },

  // ── fal.ai: real hairstyle image generation ──
  async _falHairstyleGenerate(payload) {
    const { userPhotoUrl, styleTitle, referenceImages } = payload;
    const FAL_KEY = import.meta.env.VITE_FAL_KEY || '';

    // Early return if no API key - skip fetch entirely
    if (!FAL_KEY) {
      return {
        data: {
          generatedImageUrl: null,
          fallback: true,
          faceShape: 'Analyse par IA',
          compatibilityScore: 70,
          message: `Simulation du style "${styleTitle}" sera disponible prochainement.`,
          recommendations: ['Configurez VITE_FAL_KEY dans votre .env pour activer la génération d\'images'],
        }
      };
    }

    const prompt = `Professional hairstyle photo edit: Transform this person's hair to a beautiful ${styleTitle || 'stylish'} hairstyle. Keep the face, skin tone, expression, clothing and background exactly the same. Only change the hair. Photorealistic, high quality salon result.`;

    // Try fal.ai API with image-to-image
    try {
      const falRes = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${FAL_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          image_url: userPhotoUrl && !userPhotoUrl.startsWith('data:') ? userPhotoUrl : undefined,
          strength: 0.65,
          guidance_scale: 7.5,
          num_images: 1,
          enable_safety_checker: true,
        }),
      });

      // Handle non-200 responses without throwing
      if (!falRes.ok) {
        console.warn(`[fal.ai] API returned ${falRes.status}`);
        return {
          data: {
            generatedImageUrl: null,
            fallback: true,
            faceShape: 'Analyse par IA',
            compatibilityScore: 70,
            message: `Simulation du style "${styleTitle}" sera disponible prochainement.`,
            recommendations: ['Vérifiez votre VITE_FAL_KEY dans .env'],
          }
        };
      }

      const falData = await falRes.json();
      const imageUrl = falData?.images?.[0]?.url || falData?.output?.[0] || null;

      if (imageUrl) {
        return {
          data: {
            generatedImageUrl: imageUrl,
            fallback: false,
            faceShape: 'Analyse par IA',
            compatibilityScore: 92,
            message: `Simulation du style "${styleTitle}" générée.`,
            recommendations: ['Montrez cette simulation à votre coiffeur'],
          }
        };
      }
    } catch (err) {
      console.warn('[fal.ai Hairstyle] API failed:', err.message);
    }

    // Fallback: local analysis (no image generation)
    return {
      data: {
        generatedImageUrl: null, fallback: true, faceShape: 'Analyse par IA',
        compatibilityScore: 70,
        message: `La simulation du style "${styleTitle}" sera disponible prochainement avec une clé API fal.ai.`,
        recommendations: ['Configurez VITE_FAL_KEY dans votre .env pour activer la génération d\'images'],
      }
    };
  },

  // ── fal.ai: virtual try-on (clothing) ──
  async _falVirtualTryOn(payload) {
    const { user_photo, garment_photo, garment_name, mode } = payload;
    const FAL_KEY = import.meta.env.VITE_FAL_KEY || '';

    // Early return if no API key - skip fetch entirely
    if (!FAL_KEY) {
      return {
        data: {
          result_url: null,
          fallback: true,
          compatibility_score: 70,
          message: `Essayage virtuel de "${garment_name}" sera disponible prochainement.`,
          recommendations: ['Configurez VITE_FAL_KEY dans votre .env'],
        }
      };
    }

    const prompt = `Professional virtual try-on photo edit: Apply the clothing/garment onto the person. Keep the face, skin tone, body, pose, background and lighting exactly the same. Only change the clothing. The result should look like the person is wearing that exact garment. Photorealistic, high quality fashion result.`;

    // Try fal.ai API with image-to-image
    try {
      const falRes = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${FAL_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          image_url: user_photo && !user_photo.startsWith('data:') ? user_photo : undefined,
          strength: 0.7,
          guidance_scale: 7.5,
          num_images: 1,
          enable_safety_checker: true,
        }),
      });

      // Handle non-200 responses without throwing
      if (!falRes.ok) {
        console.warn(`[fal.ai] TryOn API returned ${falRes.status}`);
        return {
          data: {
            result_url: null,
            fallback: true,
            compatibility_score: 70,
            message: `Essayage virtuel de "${garment_name}" sera disponible prochainement.`,
            recommendations: ['Vérifiez votre VITE_FAL_KEY dans .env'],
          }
        };
      }

      const falData = await falRes.json();
      const imageUrl = falData?.images?.[0]?.url || falData?.output?.[0] || null;

      if (imageUrl) {
        return {
          data: {
            result_url: imageUrl,
            fallback: false,
            compatibility_score: 92,
            message: `Essayage virtuel de "${garment_name}" généré avec succès.`,
          }
        };
      }
    } catch (err) {
      console.warn('[fal.ai TryOn] API failed:', err.message);
    }

    // Fallback: local analysis (no image generation)
    return {
      data: {
        result_url: null, fallback: true, compatibility_score: 70,
        message: `L'essayage virtuel de "${garment_name}" sera disponible prochainement avec une clé API fal.ai.`,
        recommendations: ['Configurez VITE_FAL_KEY dans votre .env pour activer la génération d\'images'],
      }
    };
  },

  async _sendOtpClient(payload) {
    const result = await clientSendVerificationCode(payload.email);
    return { data: result };
  },

  async _verifyOtpClient(payload) {
    const result = await clientVerifyCode(payload.key, payload.code);
    if (!result.valid) {
      return { data: { success: false, error: result.error } };
    }
    return { data: { success: true } };
  },

  async _createReservationClient(payload) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Vous devez être connecté.");

    const dur = payload.duration_min || 60;
    const [h, m] = (payload.time_slot || "00:00").split(":").map(Number);
    const endMin = h * 60 + m + dur;
    const endH = Math.floor(endMin / 60) % 24;
    const endM = endMin % 60;
    const endSlot = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    const wantedData = {
      client_email: user.email,
      pro_email: payload.pro_email || "",
      pro_name: payload.pro_name || "",
      service_name: payload.service_name || "",
      service_price: payload.service_price || 0,
      date: payload.date || new Date().toISOString().slice(0, 10),
      time: payload.time_slot || payload.time || "00:00",
      time_slot: payload.time_slot || payload.time || "00:00",
      end_time_slot: endSlot,
      duration_min: dur,
      persons: payload.persons || 1,
      total_price: payload.total_price || 0,
      salon_name: payload.salon_name || "",
      salon_address: payload.salon_address || "",
      payment_type: payload.payment_type || "surplace",
      payment_status: "non_paye",
      crg_code: payload.crg_code || "",
      notes: payload.notes || "",
      status: "en_attente",
    };

    // Ensure pro_email is never empty (required by NOT NULL constraint)
    if (!wantedData.pro_email) {
      wantedData.pro_email = user.email;
    }

    // Known columns that exist in the Reservation table (backend-validated)
    const KNOWN_COLUMNS = [
      "id", "created_at",
      "client_email", "pro_name", "pro_email",
      "service_name", "service_price", "service_id",
      "date", "time", "time_slot", "end_time_slot",
      "duration_min", "persons", "total_price",
      "salon_name", "salon_address", "seats_total",
      "payment_type", "payment_status", "crg_code", "acompte_amount",
      "status", "notes", "addons",
      "reminder_scheduled", "reminder_sent", "completed_at",
      "review_requested", "created_by_id",
    ];

    // Discover actual columns if table has data, fallback to known list
    let actualColumns = KNOWN_COLUMNS;
    try {
      const { data: sample } = await supabase.from('Reservation').select('*').limit(1);
      if (sample && sample.length > 0) {
        actualColumns = Object.keys(sample[0]);
      }
    } catch {}

    // Build payload: only columns that actually exist
    const insertPayload = {};
    for (const key of Object.keys(wantedData)) {
      if (actualColumns.includes(key)) {
        insertPayload[key] = wantedData[key];
      }
    }
    // Ensure at least client_email exists
    if (!insertPayload.client_email) insertPayload.client_email = user.email;

    const { data: reservation, error } = await supabase
      .from('Reservation')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;

    // Create notifications
    await supabase.from('Notification').insert([
      {
        user_email: user.email,
        type: "reservation",
        title: "✅ Réservation créée",
        body: `Votre rendez-vous "${payload.service_name}" le ${payload.date} à ${payload.time_slot} est en attente de confirmation.`,
        action_url: "/rendez-vous",
        message: `Votre rendez-vous "${payload.service_name}" le ${payload.date} à ${payload.time_slot} est en attente de confirmation.`,
        is_read: false,
        read: false,
        data: { reservation_id: reservation.id },
      },
      {
        user_email: payload.pro_email,
        type: "reservation",
        title: "📅 Nouvelle réservation",
        body: `${user.email} a réservé "${payload.service_name}" le ${payload.date} à ${payload.time_slot || payload.time || "00:00"}.`,
        action_url: "/pro/gestion-agenda",
        message: `${user.email} a réservé "${payload.service_name}" le ${payload.date} à ${payload.time_slot || payload.time || "00:00"}.`,
        is_read: false,
        read: false,
      }
    ]);

    return { data: { reservation, success: true } };
  },
};

export { apiClient as default };
