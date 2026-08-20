import { supabase } from '@/api/supabaseClient';

const POINTS_CLIENT = {
  reservation: 50,
  avis: 30,
  commande_10: 10,
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

function getClientNiveau(pts) {
  return pts >= 2500 ? 'Platinum' : pts >= 1000 ? 'Gold' : 'Silver';
}

function getProNiveau(pts) {
  return pts >= 5000 ? 'Elite' : pts >= 2000 ? 'Gold' : pts >= 500 ? 'Silver' : 'Bronze';
}

function dateStr() {
  return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function creditClientFidelite(action, label, userEmail) {
  try {
    const pts = POINTS_CLIENT[action];
    if (!pts || pts <= 0) return;

    const { data: user } = await supabase.auth.getUser();
    const email = userEmail || user?.email;
    if (!email) return;

    const { data: existing } = await supabase
      .from('PointsFidelite')
      .select('*')
      .eq('user_email', email)
      .limit(1);

    const rec = existing?.[0];
    const entry = { label: label || action, pts, date: dateStr(), type: 'credit' };

    if (rec) {
      const newTotal = (rec.points_total || 0) + pts;
      await supabase.from('PointsFidelite').update({
        points_total: newTotal,
        niveau: getClientNiveau(newTotal),
        historique: [entry, ...(rec.historique || [])].slice(0, 50),
      }).eq('id', rec.id);
    } else {
      const code = (email.split('@')[0] || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
        + Math.floor(1000 + Math.random() * 9000);
      await supabase.from('PointsFidelite').insert({
        user_email: email,
        points_total: pts,
        points_depenses: 0,
        niveau: getClientNiveau(pts),
        historique: [entry],
        code_parrainage: code,
      });
    }
  } catch (e) {
    console.error('creditClientFidelite error:', e);
  }
}

export async function creditProFidelite(action, label, proEmail) {
  try {
    const pts = POINTS_PRO[action];
    if (!pts || pts <= 0) return;

    const email = proEmail;
    if (!email) return;

    const { data: existing } = await supabase
      .from('PointsFidelitePro')
      .select('*')
      .eq('pro_email', email)
      .limit(1);

    const rec = existing?.[0];
    const entry = { label: label || action, pts, date: dateStr(), type: 'credit' };

    if (rec) {
      const newTotal = (rec.points_total || 0) + pts;
      await supabase.from('PointsFidelitePro').update({
        points_total: newTotal,
        niveau: getProNiveau(newTotal),
        reservations_count: action === 'pro_reservation' ? (rec.reservations_count || 0) + 1 : rec.reservations_count,
        historique: [entry, ...(rec.historique || [])].slice(0, 50),
      }).eq('id', rec.id);
    } else {
      const code = (email.split('@')[0] || 'PRO').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
        + 'PRO' + Math.floor(1000 + Math.random() * 9000);
      await supabase.from('PointsFidelitePro').insert({
        pro_email: email,
        points_total: pts,
        points_depenses: 0,
        niveau: getProNiveau(pts),
        historique: [entry],
        reservations_count: action === 'pro_reservation' ? 1 : 0,
        code_parrainage: code,
      });
    }
  } catch (e) {
    console.error('creditProFidelite error:', e);
  }
}
