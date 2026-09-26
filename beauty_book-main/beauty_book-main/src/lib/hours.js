// ─── Helpers partagés : horaires d'ouverture ─────────────────────────────────
// Source de vérité unique pour l'interprétation des horaires pro.
// Gère les plages de nuit (ex : Mode Nuit 09:00 → 07:00 le lendemain,
// c'est-à-dire une heure de fin <= heure de début).

export const DAY_KEYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
// Indexé par Date.getDay() (0 = dimanche)
export const DAY_KEYS_JS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

// Clés de jours utilisées dans DemandeProV2 (parcours Devenir Pro)
const DEMANDE_DAY_MAP = {
  lun: "lundi", mar: "mardi", mer: "mercredi",
  jeu: "jeudi", ven: "vendredi", sam: "samedi", dim: "dimanche",
};

// Définition du Mode Nuit : 9h du matin → 7h le lendemain
export const NIGHT_START = "09:00";
export const NIGHT_END = "07:00";
export const DAY_START = "09:00";
export const DAY_END = "19:00";

export function timeToMin(t) {
  if (!t || typeof t !== "string") return null;
  const parts = t.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] || 0);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

// true si curMin est dans la plage [startMin, endMin].
// Si endMin <= startMin, la plage déborde sur le lendemain (nuit).
export function isInTimeRange(curMin, startMin, endMin) {
  if (startMin == null || endMin == null || curMin == null) return false;
  if (endMin <= startMin) return curMin >= startMin || curMin <= endMin;
  return curMin >= startMin && curMin <= endMin;
}

// true si la plage start → end se termine le lendemain
export function isOvernight(start, end) {
  const s = timeToMin(start);
  const e = timeToMin(end);
  return s != null && e != null && e <= s;
}

// true si ouvert maintenant, false si fermé, null si aucune donnée.
// Gère le débordement : la nuit du jour précédent peut courir jusqu'au matin.
export function isOpenNow(ouverture, now = new Date()) {
  if (!ouverture || typeof ouverture !== "object" || Object.keys(ouverture).length === 0) return null;
  const curMin = now.getHours() * 60 + now.getMinutes();
  const dayKey = DAY_KEYS_JS[now.getDay()];
  const d = ouverture[dayKey];
  if (d && d.open) {
    if (isInTimeRange(curMin, timeToMin(d.start || DAY_START), timeToMin(d.end || DAY_END))) return true;
  }
  // Nuit du jour précédent encore en cours ce matin ?
  const prevKey = DAY_KEYS_JS[(now.getDay() + 6) % 7];
  const p = ouverture[prevKey];
  if (p && p.open && isOvernight(p.start, p.end)) {
    if (curMin <= timeToMin(p.end)) return true;
  }
  return false;
}

// Construit un objet ouverture depuis une DemandeProV2 (parcours Devenir Pro).
// Retourne null si la demande ne définit aucun jour ouvert.
// Utilisé comme pré-remplissage / repli quand ProfilPro.ouverture est vide,
// pour que la section Horaires & Congés et la page client affichent la même chose.
export function ouvertureFromDemande(demande) {
  if (!demande || typeof demande !== "object") return null;
  const days = Array.isArray(demande.days) ? demande.days : [];
  const slots = Array.isArray(demande.time_slots) ? demande.time_slots : [];
  const night = !!demande.travail_nuit;
  const start = night ? NIGHT_START : (slots[0]?.start || DAY_START);
  const end = night ? NIGHT_END : (slots[0]?.end || DAY_END);
  const ouv = {};
  DAY_KEYS.forEach(k => { ouv[k] = { open: false, start: "", end: "" }; });
  let anyOpen = false;
  days.forEach(dk => {
    const key = DEMANDE_DAY_MAP[dk];
    if (key) {
      ouv[key] = { open: true, start, end };
      anyOpen = true;
    }
  });
  return anyOpen ? ouv : null;
}
