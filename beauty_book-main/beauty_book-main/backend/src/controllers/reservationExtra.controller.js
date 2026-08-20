import { supabaseAdmin } from '../config/supabase.js';

// POST /api/reservations/complete
export const completeReservation = async (req, res) => {
  try {
    const user = req.user;
    const { reservation_id } = req.body;
    if (!reservation_id) return res.status(400).json({ error: 'reservation_id requis' });

    const { data: r, error: fetchErr } = await supabaseAdmin
      .from('Reservation').select('*').eq('id', reservation_id).single();
    if (fetchErr || !r) return res.status(404).json({ error: 'Réservation introuvable' });

    // Fetch the user profile to check email
    const { data: userProfile } = await supabaseAdmin
      .from('profiles').select('email').eq('id', user.id).single();

    if (r.pro_email !== userProfile?.email) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    await supabaseAdmin.from('Reservation').update({
      status: 'termine', completed_at: new Date().toISOString(),
    }).eq('id', reservation_id);

    // Loyalty points: client +50 pts, pro +30 pts
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    const clientPts = 50;
    const proPts = 30;

    // Créditer CLIENT (+50 pts)
    if (r.client_email) {
      const { data: existingPoints } = await supabaseAdmin
        .from('PointsFidelite').select('*').eq('user_email', r.client_email).limit(1);
      const rec = existingPoints?.[0];
      if (rec) {
        const newTotal = (rec.points_total || 0) + clientPts;
        const niveau = newTotal >= 2500 ? 'Platinum' : newTotal >= 1000 ? 'Gold' : 'Silver';
        const entry = { label: `Prestation : ${r.service_name}`, pts: clientPts, date: dateStr, type: 'credit' };
        await supabaseAdmin.from('PointsFidelite').update({
          points_total: newTotal, niveau,
          historique: [entry, ...(rec.historique || [])].slice(0, 50),
        }).eq('id', rec.id);
      } else {
        const prenom = r.client_name || r.client_email.split('@')[0];
        const code = prenom.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) + Math.floor(1000 + Math.random() * 9000);
        await supabaseAdmin.from('PointsFidelite').insert({
          user_email: r.client_email, points_total: clientPts, points_depenses: 0,
          niveau: clientPts >= 2500 ? 'Platinum' : clientPts >= 1000 ? 'Gold' : 'Silver',
          historique: [{ label: `Prestation : ${r.service_name}`, pts: clientPts, date: dateStr, type: 'credit' }],
          code_parrainage: code,
        });
      }
    }

    // Créditer PRO (+30 pts)
    if (r.pro_email) {
      const { data: existingPro } = await supabaseAdmin
        .from('PointsFidelitePro').select('*').eq('pro_email', r.pro_email).limit(1);
      const proRec = existingPro?.[0];
      if (proRec) {
        const newTotal = (proRec.points_total || 0) + proPts;
        const niveau = newTotal >= 5000 ? 'Elite' : newTotal >= 2000 ? 'Gold' : newTotal >= 500 ? 'Silver' : 'Bronze';
        const entry = { label: `Réservation terminée : ${r.service_name}`, pts: proPts, date: dateStr, type: 'credit' };
        await supabaseAdmin.from('PointsFidelitePro').update({
          points_total: newTotal, niveau,
          reservations_count: (proRec.reservations_count || 0) + 1,
          historique: [entry, ...(proRec.historique || [])].slice(0, 50),
        }).eq('id', proRec.id);
      } else {
        const proName = (r.pro_name || r.pro_email.split('@')[0]).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
        const code = proName + 'PRO' + Math.floor(1000 + Math.random() * 9000);
        await supabaseAdmin.from('PointsFidelitePro').insert({
          pro_email: r.pro_email, points_total: proPts, points_depenses: 0,
          niveau: proPts >= 5000 ? 'Elite' : proPts >= 2000 ? 'Gold' : proPts >= 500 ? 'Silver' : 'Bronze',
          historique: [{ label: `Réservation terminée : ${r.service_name}`, pts: proPts, date: dateStr, type: 'credit' }],
          reservations_count: 1,
          code_parrainage: code,
        });
      }
    }

    // Notifications
    await supabaseAdmin.from('Notification').insert([
      {
        user_email: r.client_email, type: 'promo',
        title: `🌟 +${clientPts} points fidélité gagnés !`,
        body: `Bravo ! Vous avez gagné ${clientPts} points suite à votre prestation "${r.service_name}" chez ${r.salon_name || r.pro_name}.`,
        link: '/programme-fidelite', read: false, data: { pts_earned: clientPts, reservation_id },
      },
      {
        user_email: r.client_email, type: 'avis',
        title: '⭐ Donnez votre avis !',
        body: `Comment s'est passée votre séance "${r.service_name}" chez ${r.salon_name || r.pro_name} ? Votre avis aide la communauté 💬`,
        link: `/service/${r.service_id}?avis=1&reservation_id=${reservation_id}`, read: false,
        data: { reservation_id, pro_email: r.pro_email, service_id: r.service_id, service_name: r.service_name, can_review: true },
      }
    ]);

    return res.json({ success: true, pts_earned: clientPts, reservation_id });
  } catch (error) {
    console.error('❌ completeReservation error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

// POST /api/reservations/:id
export const updateReservation = async (req, res) => {
  try {
    const user = req.user;
    const reservationId = req.params.id;
    const { status, payment_status } = req.body;

    if (!reservationId) return res.status(400).json({ error: 'reservationId requis' });

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('Reservation').select('*').eq('id', reservationId).single();
    if (fetchErr || !existing) return res.status(404).json({ error: 'Réservation introuvable' });

    const { data: userProfile } = await supabaseAdmin
      .from('profiles').select('email').eq('id', user.id).single();

    if (existing.pro_email !== userProfile?.email && existing.client_email !== userProfile?.email) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const updates = {};
    if (status) updates.status = status;
    if (payment_status) updates.payment_status = payment_status;

    const { data: reservation, error: updateErr } = await supabaseAdmin
      .from('Reservation').update(updates).eq('id', reservationId).select().single();
    if (updateErr) return res.status(500).json({ error: updateErr.message });

    // Notify client if pro updates status
    if (existing.pro_email === userProfile?.email && status) {
      const statusLabels = { confirme: 'confirmée ✅', annule: 'annulée ❌', termine: 'terminée' };
      await supabaseAdmin.from('Notification').insert({
        user_email: existing.client_email, type: 'reservation',
        title: 'Mise à jour de votre réservation',
        body: `Votre réservation "${existing.service_name}" a été ${statusLabels[status] || status}`,
        link: '/rendez-vous', read: false,
      });
    }

    return res.json({ reservation, success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// POST /api/reservations/list
export const getReservations = async (req, res) => {
  try {
    const user = req.user;
    const { role = 'client', status } = req.body || {};

    const { data: userProfile } = await supabaseAdmin
      .from('profiles').select('email').eq('id', user.id).single();

    let query = supabaseAdmin.from('Reservation').select('*').order('date', { ascending: false }).limit(50);
    if (role === 'pro') {
      query = query.eq('pro_email', userProfile?.email);
    } else {
      query = query.eq('client_email', userProfile?.email);
    }
    if (status) query = query.eq('status', status);

    const { data: reservations, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.json({ reservations: reservations || [] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
