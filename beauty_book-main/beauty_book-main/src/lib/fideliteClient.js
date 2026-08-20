import { supabase } from '@/api/supabaseClient';
import { entities } from '@/api/entities';

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

async function ensureClientRecord(email) {
  const existing = await entities.PointsFidelite.filter({ user_email: email }, '-created_at', 1);
  if (existing.length > 0) return existing[0];
  const code = (email.split('@')[0] || 'USER').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
    + Math.floor(1000 + Math.random() * 9000);
  return entities.PointsFidelite.create({
    user_email: email,
    points_total: 0,
    points_depenses: 0,
    niveau: 'Silver',
    historique: [],
    code_parrainage: code,
  });
}

async function ensureProRecord(email) {
  const existing = await entities.PointsFidelitePro.filter({ pro_email: email }, '-created_at', 1);
  if (existing.length > 0) return existing[0];
  const code = (email.split('@')[0] || 'PRO').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4)
    + 'PRO' + Math.floor(1000 + Math.random() * 9000);
  return entities.PointsFidelitePro.create({
    pro_email: email,
    points_total: 0,
    points_depenses: 0,
    niveau: 'Bronze',
    historique: [],
    reservations_count: 0,
    code_parrainage: code,
  });
}

export async function creditClientFidelite(action, label, userEmail) {
  try {
    const pts = POINTS_CLIENT[action];
    if (!pts || pts <= 0) return;

    const { data: user } = await supabase.auth.getUser();
    const email = userEmail || user?.email;
    if (!email) return;

    const rec = await ensureClientRecord(email);
    if (!rec) return;

    const entry = { label: label || action, pts, date: dateStr(), type: 'credit' };
    const newTotal = (rec.points_total || 0) + pts;
    const historique = [entry, ...(rec.historique || [])].slice(0, 50);

    await entities.PointsFidelite.update(rec.id, {
      points_total: newTotal,
      niveau: getClientNiveau(newTotal),
      historique,
    });
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

    const rec = await ensureProRecord(email);
    if (!rec) return;

    const entry = { label: label || action, pts, date: dateStr(), type: 'credit' };
    const newTotal = (rec.points_total || 0) + pts;
    const historique = [entry, ...(rec.historique || [])].slice(0, 50);

    await entities.PointsFidelitePro.update(rec.id, {
      points_total: newTotal,
      niveau: getProNiveau(newTotal),
      reservations_count: action === 'pro_reservation' ? (rec.reservations_count || 0) + 1 : rec.reservations_count,
      historique,
    });
  } catch (e) {
    console.error('creditProFidelite error:', e);
  }
}

export async function reconcileClientPoints(userEmail) {
  try {
    if (!userEmail) {
      const { data: user } = await supabase.auth.getUser();
      userEmail = user?.email;
    }
    if (!userEmail) return;

    const rec = await ensureClientRecord(userEmail);

    const { data: reservations } = await supabase
      .from('Reservation')
      .select('id, service_name, created_at')
      .eq('client_email', userEmail)
      .eq('status', 'termine');

    if (!reservations || reservations.length === 0) return;

    const creditedIds = new Set((rec.historique || [])
      .filter(h => h.type === 'credit' && h.reservation_id)
      .map(h => h.reservation_id));

    let totalNewPts = 0;
    const newEntries = [];

    for (const r of reservations) {
      if (!creditedIds.has(r.id)) {
        const pts = POINTS_CLIENT.reservation;
        totalNewPts += pts;
        newEntries.push({
          label: `Prestation : ${r.service_name || 'Service beauté'}`,
          pts,
          date: new Date(r.created_at || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
          type: 'credit',
          reservation_id: r.id,
        });
      }
    }

    if (totalNewPts > 0) {
      const newTotal = (rec.points_total || 0) + totalNewPts;
      const historique = [...newEntries, ...(rec.historique || [])].slice(0, 50);
      await entities.PointsFidelite.update(rec.id, {
        points_total: newTotal,
        niveau: getClientNiveau(newTotal),
        historique,
      });
    }

    const { data: reviews } = await supabase
      .from('Avis')
      .select('id, reservation_id, created_at')
      .eq('auteur_email', userEmail)
      .eq('type', 'client_to_pro');

    if (reviews && reviews.length > 0) {
      const creditedReviewIds = new Set((rec.historique || [])
        .filter(h => h.type === 'credit' && h.review_id)
        .map(h => h.review_id));

      const currentRec = await ensureClientRecord(userEmail);
      let reviewPts = 0;
      const reviewEntries = [];

      for (const rev of reviews) {
        if (!creditedReviewIds.has(rev.id)) {
          reviewPts += POINTS_CLIENT.avis;
          reviewEntries.push({
            label: 'Avis laissé',
            pts: POINTS_CLIENT.avis,
            date: new Date(rev.created_at || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
            type: 'credit',
            review_id: rev.id,
          });
        }
      }

      if (reviewPts > 0 && currentRec) {
        const finalTotal = (currentRec.points_total || 0) + reviewPts;
        const historique = [...reviewEntries, ...(currentRec.historique || [])].slice(0, 50);
        await entities.PointsFidelite.update(currentRec.id, {
          points_total: finalTotal,
          niveau: getClientNiveau(finalTotal),
          historique,
        });
      }
    }
  } catch (e) {
    console.error('reconcileClientPoints error:', e);
  }
}

export async function reconcileProPoints(proEmail) {
  try {
    if (!proEmail) {
      const { data: user } = await supabase.auth.getUser();
      proEmail = user?.email;
    }
    if (!proEmail) return;

    const rec = await ensureProRecord(proEmail);

    const { data: reservations } = await supabase
      .from('Reservation')
      .select('id, service_name, created_at')
      .eq('pro_email', proEmail)
      .eq('status', 'termine');

    if (!reservations || reservations.length === 0) return;

    const creditedIds = new Set((rec.historique || [])
      .filter(h => h.type === 'credit' && h.reservation_id)
      .map(h => h.reservation_id));

    let totalNewPts = 0;
    const newEntries = [];

    for (const r of reservations) {
      if (!creditedIds.has(r.id)) {
        const pts = POINTS_PRO.pro_reservation;
        totalNewPts += pts;
        newEntries.push({
          label: `Réservation terminée : ${r.service_name || 'Service beauté'}`,
          pts,
          date: new Date(r.created_at || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
          type: 'credit',
          reservation_id: r.id,
        });
      }
    }

    if (totalNewPts > 0) {
      const currentRec = await ensureProRecord(proEmail);
      const newTotal = (currentRec.points_total || 0) + totalNewPts;
      const historique = [...newEntries, ...(currentRec.historique || [])].slice(0, 50);
      await entities.PointsFidelitePro.update(currentRec.id, {
        points_total: newTotal,
        niveau: getProNiveau(newTotal),
        reservations_count: (currentRec.reservations_count || 0) + newEntries.length,
        historique,
      });
    }

    const { data: reviews } = await supabase
      .from('Avis')
      .select('id, note, created_at')
      .eq('cible_email', proEmail)
      .eq('type', 'client_to_pro');

    if (reviews && reviews.length > 0) {
      const creditedReviewIds = new Set((rec.historique || [])
        .filter(h => h.type === 'credit' && h.review_id)
        .map(h => h.review_id));

      const currentRec = await ensureProRecord(proEmail);
      let reviewPts = 0;
      const reviewEntries = [];

      for (const rev of reviews) {
        if (!creditedReviewIds.has(rev.id)) {
          reviewPts += POINTS_PRO.pro_avis_recu;
          reviewEntries.push({
            label: 'Avis reçu',
            pts: POINTS_PRO.pro_avis_recu,
            date: new Date(rev.created_at || Date.now()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
            type: 'credit',
            review_id: rev.id,
          });
        }
      }

      if (reviewPts > 0 && currentRec) {
        const finalTotal = (currentRec.points_total || 0) + reviewPts;
        const historique = [...reviewEntries, ...(currentRec.historique || [])].slice(0, 50);
        await entities.PointsFidelitePro.update(currentRec.id, {
          points_total: finalTotal,
          niveau: getProNiveau(finalTotal),
          historique,
        });
      }
    }
  } catch (e) {
    console.error('reconcileProPoints error:', e);
  }
}
