import { supabaseAdmin } from '../config/supabase.js';

const POINTS_CLIENT = {
  reservation: 50,
  avis: 30,
  commande_10: 10, // par tranche de 10€
  parrainage: 200,
  rdv_honore: 20,
};

const POINTS_PRO = {
  pro_reservation: 30,
  pro_avis_recu: 40,
  pro_service_cree: 20,
  pro_parrainage_pro: 500,
  pro_abonnement: 100,
};

// addFidelitePoints — appelé manuellement depuis le frontend
export const addFidelitePoints = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { action, label, amount } = req.body;
    if (!action) return res.status(400).json({ error: 'action requis' });

    const isPro = action.startsWith('pro_');
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

    if (isPro) {
      const { data: records } = await supabaseAdmin
        .from('PointsFidelitePro')
        .select('*').eq('pro_email', user.email).limit(1);
      
      let record = records?.[0];
      if (!record) {
        const code = (user.user_metadata?.nom || 'PRO').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
          + 'PRO' + Math.floor(1000 + Math.random() * 9000);
        const { data: newRecord } = await supabaseAdmin.from('PointsFidelitePro').insert({
          pro_email: user.email,
          points_total: 0,
          points_depenses: 0,
          niveau: 'Bronze',
          historique: [],
          code_parrainage: code,
        }).select().single();
        record = newRecord;
      }

      let pts = POINTS_PRO[action];
      if (!pts && action === 'pro_commande') pts = Math.floor((amount || 0) / 10) * 10;
      if (!pts || pts <= 0) return res.status(400).json({ error: 'Action inconnue ou montant invalide' });

      const newTotal = (record.points_total || 0) + pts;
      const newNiveau = newTotal >= 5000 ? 'Elite' : newTotal >= 2000 ? 'Gold' : newTotal >= 500 ? 'Silver' : 'Bronze';
      const entry = { label: label || action, pts, date: dateStr, type: 'credit' };

      await supabaseAdmin.from('PointsFidelitePro').update({
        points_total: newTotal,
        niveau: newNiveau,
        historique: [entry, ...(record.historique || [])].slice(0, 50),
        reservations_count: action === 'pro_reservation' ? (record.reservations_count || 0) + 1 : record.reservations_count,
      }).eq('id', record.id);

      return res.json({ ok: true, pts_added: pts, new_total: newTotal, niveau: newNiveau });

    } else {
      const { data: records } = await supabaseAdmin
        .from('PointsFidelite')
        .select('*').eq('user_email', user.email).limit(1);
      
      let record = records?.[0];
      if (!record) {
        const prenom = user.user_metadata?.prenom || 'USER';
        const code = prenom.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
          + Math.floor(1000 + Math.random() * 9000);
        const { data: newRecord } = await supabaseAdmin.from('PointsFidelite').insert({
          user_email: user.email,
          points_total: 0,
          points_depenses: 0,
          niveau: 'Silver',
          historique: [],
          code_parrainage: code,
        }).select().single();
        record = newRecord;
      }

      let pts = POINTS_CLIENT[action];
      if (!pts && action === 'commande') pts = Math.floor((amount || 0) / 10) * POINTS_CLIENT.commande_10;
      if (!pts || pts <= 0) return res.status(400).json({ error: 'Action inconnue' });

      const newTotal = (record.points_total || 0) + pts;
      const newNiveau = newTotal >= 2500 ? 'Platinum' : newTotal >= 1000 ? 'Gold' : 'Silver';
      const entry = { label: label || action, pts, date: dateStr, type: 'credit' };

      await supabaseAdmin.from('PointsFidelite').update({
        points_total: newTotal,
        niveau: newNiveau,
        historique: [entry, ...(record.historique || [])].slice(0, 50),
      }).eq('id', record.id);

      return res.json({ ok: true, pts_added: pts, new_total: newTotal, niveau: newNiveau });
    }
  } catch (error) {
    console.error('addFidelitePoints error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// creditFideliteAuto — déclenché sur passage en "termine"
export const creditFideliteAuto = async (req, res) => {
  try {
    const { data, old_data } = req.body;

    if (!data || data.status !== 'termine') {
      return res.json({ ok: true, skipped: 'not termine' });
    }
    if (old_data?.status === 'termine') {
      return res.json({ ok: true, skipped: 'already was termine' });
    }

    const { client_email, pro_email, service_name = 'Service beauté' } = data;
    const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

    // Créditer CLIENT (+50 pts)
    if (client_email) {
      const { data: existing } = await supabaseAdmin.from('PointsFidelite').select('*').eq('user_email', client_email).limit(1);
      const rec = existing?.[0];
      if (rec) {
        const newTotal = (rec.points_total || 0) + 50;
        const newNiveau = newTotal >= 2500 ? 'Platinum' : newTotal >= 1000 ? 'Gold' : 'Silver';
        const entry = { label: `Réservation : ${service_name}`, pts: 50, date: dateStr, type: 'credit' };
        await supabaseAdmin.from('PointsFidelite').update({
          points_total: newTotal,
          niveau: newNiveau,
          historique: [entry, ...(rec.historique || [])].slice(0, 50),
        }).eq('id', rec.id);
      } else {
        const code = (client_email.split('@')[0] || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
          + Math.floor(1000 + Math.random() * 9000);
        await supabaseAdmin.from('PointsFidelite').insert({
          user_email: client_email, points_total: 50, points_depenses: 0,
          niveau: 'Silver',
          historique: [{ label: `Réservation : ${service_name}`, pts: 50, date: dateStr, type: 'credit' }],
          code_parrainage: code,
        });
      }
    }

    // Créditer PRO (+30 pts)
    if (pro_email) {
      const { data: existing } = await supabaseAdmin.from('PointsFidelitePro').select('*').eq('pro_email', pro_email).limit(1);
      const rec = existing?.[0];
      if (rec) {
        const newTotal = (rec.points_total || 0) + 30;
        const newNiveau = newTotal >= 5000 ? 'Elite' : newTotal >= 2000 ? 'Gold' : newTotal >= 500 ? 'Silver' : 'Bronze';
        const entry = { label: `Réservation terminée : ${service_name}`, pts: 30, date: dateStr, type: 'credit' };
        await supabaseAdmin.from('PointsFidelitePro').update({
          points_total: newTotal,
          niveau: newNiveau,
          reservations_count: (rec.reservations_count || 0) + 1,
          historique: [entry, ...(rec.historique || [])].slice(0, 50),
        }).eq('id', rec.id);
      } else {
        const code = (pro_email.split('@')[0] || 'PRO').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
          + 'PRO' + Math.floor(1000 + Math.random() * 9000);
        await supabaseAdmin.from('PointsFidelitePro').insert({
          pro_email: pro_email, points_total: 30, points_depenses: 0,
          niveau: 'Bronze',
          historique: [{ label: `Réservation terminée : ${service_name}`, pts: 30, date: dateStr, type: 'credit' }],
          reservations_count: 1,
          code_parrainage: code,
        });
      }
    }

    return res.json({ ok: true, credited_client: 50, credited_pro: 30 });
  } catch (error) {
    console.error('creditFideliteAuto error:', error);
    return res.status(500).json({ error: error.message });
  }
};
