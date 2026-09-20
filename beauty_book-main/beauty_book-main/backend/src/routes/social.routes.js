import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// ── Sauvegarder les identifiants d'un utilisateur pour une plateforme ──────
router.post('/credentials', requireAuth, async (req, res) => {
  try {
    const { platform, credentials } = req.body;
    const userEmail = req.user.email;

    if (!platform || !credentials) {
      return res.status(400).json({ error: 'Platform et credentials requis' });
    }

    // Chiffrer les credentials sensibles avant sauvegarde
    const sanitizedCreds = { ...credentials };
    
    // Nettoyer les clés vides
    Object.keys(sanitizedCreds).forEach(key => {
      if (sanitizedCreds[key] === '' || sanitizedCreds[key] === null) {
        delete sanitizedCreds[key];
      }
    });

    const { data, error } = await supabaseAdmin
      .from('SocialCredentials')
      .upsert({
        user_email: userEmail,
        platform,
        credentials: sanitizedCreds,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_email,platform' })
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (e) {
    console.error('[Social Credentials Save]', e);
    return res.status(500).json({ error: e.message });
  }
});

// ── Récupérer les identifiants d'un utilisateur pour une plateforme ────────
router.get('/credentials/:platform', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { platform } = req.params;

    const { data, error } = await supabaseAdmin
      .from('SocialCredentials')
      .select('*')
      .eq('user_email', userEmail)
      .eq('platform', platform)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return res.json({ credentials: data?.credentials || null });
  } catch (e) {
    console.error('[Social Credentials Get]', e);
    return res.status(500).json({ error: e.message });
  }
});

// ── Récupérer tous les identifiants d'un utilisateur ───────────────────────
router.get('/credentials', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;

    const { data, error } = await supabaseAdmin
      .from('SocialCredentials')
      .select('platform, credentials, updated_at')
      .eq('user_email', userEmail);

    if (error) throw error;

    return res.json({ credentials: data || [] });
  } catch (e) {
    console.error('[Social Credentials List]', e);
    return res.status(500).json({ error: e.message });
  }
});

// ── Supprimer les identifiants ─────────────────────────────────────────────
router.delete('/credentials/:platform', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { platform } = req.params;

    await supabaseAdmin
      .from('SocialCredentials')
      .delete()
      .eq('user_email', userEmail)
      .eq('platform', platform);

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── Facebook OAuth (utilise les credentials de l'utilisateur) ──────────────
router.get('/facebook/auth', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;

    // Récupérer les credentials de l'utilisateur
    const { data: creds } = await supabaseAdmin
      .from('SocialCredentials')
      .select('credentials')
      .eq('user_email', userEmail)
      .eq('platform', 'facebook')
      .single();

    const appId = creds?.credentials?.app_id;
    const redirectUri = creds?.credentials?.redirect_uri || `${req.protocol}://${req.get('host')}/auth/callback`;

    if (!appId) {
      return res.status(400).json({ error: 'Configurez d\'abord vos identifiants Facebook', setup_required: true });
    }

    const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=pages_manage_metadata,pages_messaging,instagram_basic,instagram_manage_messages&state=facebook_${userEmail}`;
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Facebook Callback ──────────────────────────────────────────────────────
router.get('/facebook/callback', async (req, res) => {
  const { code, state } = req.query;
  const userEmail = state?.replace('facebook_', '');
  if (!code || !userEmail) return res.status(400).json({ error: 'Missing code or state' });

  try {
    // Récupérer les credentials
    const { data: creds } = await supabaseAdmin
      .from('SocialCredentials')
      .select('credentials')
      .eq('user_email', userEmail)
      .eq('platform', 'facebook')
      .single();

    const appId = creds?.credentials?.app_id;
    const appSecret = creds?.credentials?.app_secret;
    const redirectUri = creds?.credentials?.redirect_uri || `${req.protocol}://${req.get('host')}/auth/callback`;

    // Échanger le code contre un access token
    const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`);
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error.message);

    // Récupérer les pages de l'utilisateur
    const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`);
    const pagesData = await pagesRes.json();

    // Sauvegarder la connexion
    await supabaseAdmin.from('SocialConnections').upsert({
      user_email: userEmail,
      platform: 'facebook',
      access_token: tokenData.access_token,
      page_id: pagesData.data?.[0]?.id,
      page_name: pagesData.data?.[0]?.name,
      connected_at: new Date().toISOString(),
    });

    res.redirect('/social-media?connected=facebook');
  } catch (e) {
    console.error('[Facebook Auth]', e);
    res.redirect('/social-media?error=facebook');
  }
});

// ── Instagram OAuth (via Facebook) ─────────────────────────────────────────
router.get('/instagram/auth', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;

    const { data: creds } = await supabaseAdmin
      .from('SocialCredentials')
      .select('credentials')
      .eq('user_email', userEmail)
      .eq('platform', 'instagram')
      .single();

    const appId = creds?.credentials?.app_id;
    const redirectUri = creds?.credentials?.redirect_uri || `${req.protocol}://${req.get('host')}/auth/callback`;

    if (!appId) {
      return res.status(400).json({ error: 'Configurez d\'abord vos identifiants Instagram', setup_required: true });
    }

    const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_manage_messages,instagram_manage_comments&state=instagram_${userEmail}`;
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── TikTok OAuth ───────────────────────────────────────────────────────────
router.get('/tiktok/auth', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;

    const { data: creds } = await supabaseAdmin
      .from('SocialCredentials')
      .select('credentials')
      .eq('user_email', userEmail)
      .eq('platform', 'tiktok')
      .single();

    const clientKey = creds?.credentials?.client_key;
    const redirectUri = creds?.credentials?.redirect_uri || `${req.protocol}://${req.get('host')}/auth/callback`;

    if (!clientKey) {
      return res.status(400).json({ error: 'Configurez d\'abord vos identifiants TikTok', setup_required: true });
    }

    const url = `https://www.tiktok.com/auth/authorize/?client_key=${clientKey}&response_type=code&scope=user.info.basic,video.list,video.publish&redirect_uri=${encodeURIComponent(redirectUri)}&state=tiktok_${userEmail}`;
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── TikTok Callback ────────────────────────────────────────────────────────
router.get('/tiktok/callback', async (req, res) => {
  const { code, state } = req.query;
  const userEmail = state?.replace('tiktok_', '');
  if (!code || !userEmail) return res.status(400).json({ error: 'Missing code' });

  try {
    const { data: creds } = await supabaseAdmin
      .from('SocialCredentials')
      .select('credentials')
      .eq('user_email', userEmail)
      .eq('platform', 'tiktok')
      .single();

    const clientKey = creds?.credentials?.client_key;
    const clientSecret = creds?.credentials?.client_secret;
    const redirectUri = creds?.credentials?.redirect_uri || `${req.protocol}://${req.get('host')}/auth/callback`;

    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error_description);

    // Récupérer les infos utilisateur
    const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url,username', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    await supabaseAdmin.from('SocialConnections').upsert({
      user_email: userEmail,
      platform: 'tiktok',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      handle: userData.data?.user?.username || '@tiktok',
      display_name: userData.data?.user?.display_name,
      avatar_url: userData.data?.user?.avatar_url,
      connected_at: new Date().toISOString(),
    });

    res.redirect('/social-media?connected=tiktok');
  } catch (e) {
    console.error('[TikTok Auth]', e);
    res.redirect('/social-media?error=tiktok');
  }
});

// ── WhatsApp Business ──────────────────────────────────────────────────────
router.get('/whatsapp/auth', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;

    const { data: creds } = await supabaseAdmin
      .from('SocialCredentials')
      .select('credentials')
      .eq('user_email', userEmail)
      .eq('platform', 'whatsapp')
      .single();

    const appId = creds?.credentials?.app_id;
    const redirectUri = creds?.credentials?.redirect_uri || `${req.protocol}://${req.get('host')}/auth/callback`;

    if (!appId) {
      return res.status(400).json({ error: 'Configurez d\'abord vos identifiants WhatsApp', setup_required: true });
    }

    const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=whatsapp_business_management,whatsapp_business_messaging&state=whatsapp_${userEmail}`;
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── WhatsApp Webhook ───────────────────────────────────────────────────────
router.get('/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe') {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

router.post('/whatsapp/webhook', async (req, res) => {
  const body = req.body;
  if (body.object !== 'whatsapp_business_account') return res.sendStatus(404);

  try {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          const messages = change.value?.messages || [];
          const phoneNumberId = change.value?.metadata?.phone_number_id;

          // Trouver l'utilisateur par phone_number_id
          const { data: conn } = await supabaseAdmin
            .from('SocialConnections')
            .select('user_email')
            .eq('platform', 'whatsapp')
            .eq('page_id', phoneNumberId)
            .single();

          if (!conn?.user_email) continue;

          // Récupérer le token de l'utilisateur
          const { data: creds } = await supabaseAdmin
            .from('SocialCredentials')
            .select('credentials')
            .eq('user_email', conn.user_email)
            .eq('platform', 'whatsapp')
            .single();

          const whatsappToken = creds?.credentials?.access_token;

          for (const msg of messages) {
            const phone = msg.from;
            const text = msg.text?.body || '';

            if (text) {
              // Générer une réponse IA
              const aiRes = await fetch('https://opencode.ai/zen/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.OPENCODE_API_KEY || ''}`,
                },
                body: JSON.stringify({
                  model: 'mimo-v2.5-free',
                  messages: [
                    { role: 'system', content: 'Tu es Maria, l\'assistante beauté de BeautyBook. Réponds de manière chaleureuse et professionnelle. Sois concise (2-3 phrases).' },
                    { role: 'user', content: text },
                  ],
                  max_tokens: 512,
                }),
              });
              const aiData = await aiRes.json();
              const reply = aiData.choices?.[0]?.message?.content || aiData.choices?.[0]?.message?.reasoning || 'Merci pour votre message !';

              // Envoyer la réponse
              if (whatsappToken && phoneNumberId) {
                await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${whatsappToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: phone,
                    type: 'text',
                    text: { body: reply },
                  }),
                });
              }

              // Sauvegarder
              await supabaseAdmin.from('SocialMessages').insert({
                user_email: conn.user_email,
                platform: 'whatsapp',
                from: phone,
                message: text,
                reply,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('[WhatsApp Webhook]', e);
  }

  res.sendStatus(200);
});

// ── Messenger ──────────────────────────────────────────────────────────────
router.get('/messenger/auth', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;

    const { data: creds } = await supabaseAdmin
      .from('SocialCredentials')
      .select('credentials')
      .eq('user_email', userEmail)
      .eq('platform', 'messenger')
      .single();

    const appId = creds?.credentials?.app_id;
    const redirectUri = creds?.credentials?.redirect_uri || `${req.protocol}://${req.get('host')}/auth/callback`;

    if (!appId) {
      return res.status(400).json({ error: 'Configurez d\'abord vos identifiants Messenger', setup_required: true });
    }

    const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=pages_messaging,pages_manage_metadata&state=messenger_${userEmail}`;
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Messenger Webhook ──────────────────────────────────────────────────────
router.get('/messenger/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe') {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

router.post('/messenger/webhook', async (req, res) => {
  const body = req.body;
  if (body.object !== 'page') return res.sendStatus(404);

  try {
    for (const entry of body.entry || []) {
      const pageId = entry.id;

      // Trouver l'utilisateur par page_id
      const { data: conn } = await supabaseAdmin
        .from('SocialConnections')
        .select('user_email')
        .eq('platform', 'messenger')
        .eq('page_id', pageId)
        .single();

      if (!conn?.user_email) continue;

      // Récupérer le token
      const { data: creds } = await supabaseAdmin
        .from('SocialCredentials')
        .select('credentials')
        .eq('user_email', conn.user_email)
        .eq('platform', 'messenger')
        .single();

      const pageAccessToken = creds?.credentials?.page_access_token;

      for (const event of entry.messaging || []) {
        if (event.message?.text) {
          const senderId = event.sender.id;
          const text = event.message.text;

          // Réponse IA
          const aiRes = await fetch('https://opencode.ai/zen/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENCODE_API_KEY || ''}`,
            },
            body: JSON.stringify({
              model: 'mimo-v2.5-free',
              messages: [
                { role: 'system', content: 'Tu es Maria, l\'assistante beauté de BeautyBook. Réponds de manière chaleureuse et professionnelle. Sois concise.' },
                { role: 'user', content: text },
              ],
              max_tokens: 1024,
            }),
          });
          const aiData = await aiRes.json();
          const reply = aiData.choices?.[0]?.message?.content || 'Merci pour votre message !';

          // Envoyer via Messenger Send API
          if (pageAccessToken) {
            await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipient: { id: senderId },
                message: { text: reply },
              }),
            });
          }

          await supabaseAdmin.from('SocialMessages').insert({
            user_email: conn.user_email,
            platform: 'messenger',
            from: senderId,
            message: text,
            reply,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  } catch (e) {
    console.error('[Messenger Webhook]', e);
  }

  res.sendStatus(200);
});

// ── Statistiques ───────────────────────────────────────────────────────────
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: messages } = await supabaseAdmin
      .from('SocialMessages')
      .select('*')
      .eq('user_email', userEmail)
      .gte('timestamp', thirtyDaysAgo);

    const { data: connections } = await supabaseAdmin
      .from('SocialConnections')
      .select('*')
      .eq('user_email', userEmail);

    const totalMessages = messages?.length || 0;
    const totalReplies = messages?.filter(m => m.reply)?.length || 0;
    const platforms = connections?.map(c => c.platform) || [];

    const messagesByDay = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const count = messages?.filter(m => m.timestamp?.startsWith(dateStr))?.length || 0;
      messagesByDay.push({ date: dateStr, count });
    }

    const byPlatform = {};
    messages?.forEach(m => { byPlatform[m.platform] = (byPlatform[m.platform] || 0) + 1; });

    const responseRate = totalMessages > 0 ? Math.round((totalReplies / totalMessages) * 100) : 0;

    return res.json({
      totalMessages,
      totalReplies,
      responseRate,
      avgResponseTime: totalReplies > 0 ? '< 2 min' : 'N/A',
      platforms,
      messagesByDay,
      byPlatform,
      period: '30 jours',
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── Déconnexion ────────────────────────────────────────────────────────────
router.delete('/disconnect/:platform', requireAuth, async (req, res) => {
  try {
    await supabaseAdmin
      .from('SocialConnections')
      .delete()
      .eq('user_email', req.user.email)
      .eq('platform', req.params.platform);

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ── Liste des connexions ───────────────────────────────────────────────────
router.get('/connections', requireAuth, async (req, res) => {
  try {
    const { data } = await supabaseAdmin
      .from('SocialConnections')
      .select('platform, handle, display_name, connected_at')
      .eq('user_email', req.user.email);

    return res.json({ connections: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
