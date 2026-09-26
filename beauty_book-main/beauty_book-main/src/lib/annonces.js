// ─── Annonces : job board salons ↔ particuliers ─────────────────────────────
// Les salons publient des annonces de travail (missions, remplacements, extras).
// Les particuliers répondent, le salon sélectionne un ou plusieurs candidats.
// Stockage localStorage (migrable vers Supabase : table `annonces` + `candidatures`).

const LS_KEY = "bb_annonces_v1";
const LS_CAND_KEY = "bb_candidatures_v1";

const CATEGORIES = [
  { id: "coiffure", label: "Coiffure", icon: "Scissors" },
  { id: "tresses", label: "Tresses", icon: "Waves" },
  { id: "ongles", label: "Ongles", icon: "Gem" },
  { id: "maquillage", label: "Maquillage", icon: "Paintbrush" },
  { id: "soin", label: "Soins", icon: "Droplets" },
  { id: "massage", label: "Massage", icon: "Hand" },
  { id: "esthetique", label: "Esthétique", icon: "Sparkles" },
  { id: "barbier", label: "Barbier", icon: "Razor" },
];

const TYPES_MISSION = [
  { id: "extra", label: "Extra", desc: "Mission ponctuelle (1 jour)" },
  { id: "remplacement", label: "Remplacement", desc: "Remplace un membre absent" },
  { id: "renfort", label: "Renfort", desc: "Coup de main en période chargée" },
  { id: "recrutement", label: "Recrutement", desc: "Poste à pourvoir (CDD/CDI)" },
  { id: "stage", label: "Stage", desc: "Stage ou apprentissage" },
];

function seedAnnonces() {
  const now = Date.now();
  const day = 86400000;
  return [
    {
      id: "ann-001",
      salon_name: "Mamara_hair 91",
      salon_email: "salon@example.com",
      salon_avatar: "",
      salon_city: "Athis-Mons",
      salon_rating: 4.3,
      title: "Braideuse experte pour samedi chargé",
      category: "tresses",
      type_mission: "extra",
      description: "Notre salon cherche une braideuse confirmée pour un samedi exceptionnellement chargé. Vous rejoindrez notre équipe de 3 coiffeuses dans une ambiance conviviale et professionnelle. Matériel fourni, clientèle fidèle et agréable.",
      competences: ["Box braids", "Knotless", "Cornrows", "Pose rapide"],
      date_debut: new Date(now + 2 * day).toISOString().slice(0, 10),
      date_fin: new Date(now + 2 * day).toISOString().slice(0, 10),
      remuneration: 180,
      remuneration_type: "jour",
      places: 2,
      places_prises: 0,
      adresse: "54 Rue de Juvisy, 91200 Athis-Mons",
      status: "active",
      vues: 234,
      created_at: new Date(now - 1 * day).toISOString(),
    },
    {
      id: "ann-002",
      salon_name: "Glow Studio Paris",
      salon_email: "glow@example.com",
      salon_avatar: "",
      salon_city: "Paris 11e",
      salon_rating: 4.8,
      title: "Maquilleuse pour shooting mode",
      category: "maquillage",
      type_mission: "extra",
      description: "Studio photo recherche une maquilleuse créative pour un shooting éditorial. Thème : beauté naturelle sublimée. Book et références demandés. Belle opportunité de visibilité avec crédit photo.",
      competences: ["Maquillage nude", "Teint parfait", "Shooting"],
      date_debut: new Date(now + 5 * day).toISOString().slice(0, 10),
      date_fin: new Date(now + 5 * day).toISOString().slice(0, 10),
      remuneration: 250,
      remuneration_type: "jour",
      places: 1,
      places_prises: 0,
      adresse: "12 Rue de la Roquette, 75011 Paris",
      status: "active",
      vues: 189,
      created_at: new Date(now - 3 * day).toISOString(),
    },
    {
      id: "ann-003",
      salon_name: "Nails & Co",
      salon_email: "nails@example.com",
      salon_avatar: "",
      salon_city: "Lyon",
      salon_rating: 4.6,
      title: "Prothésiste ongulaire — renfort fêtes",
      category: "ongles",
      type_mission: "renfort",
      description: "Période des fêtes très chargée ! Nous cherchons un(e) prothésiste ongulaire pour nous épauler de mi-décembre à début janvier. Pose américaine, nail art et gainage : vous maîtrisez tout. Ambiance jeune et dynamique.",
      competences: ["Pose américaine", "Nail art", "Gainage", "Vernis semi-permanent"],
      date_debut: new Date(now + 10 * day).toISOString().slice(0, 10),
      date_fin: new Date(now + 30 * day).toISOString().slice(0, 10),
      remuneration: 160,
      remuneration_type: "jour",
      places: 3,
      places_prises: 1,
      adresse: "8 Place Bellecour, 69002 Lyon",
      status: "active",
      vues: 412,
      created_at: new Date(now - 5 * day).toISOString(),
    },
  ];
}

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function getCategories() {
  return CATEGORIES;
}

export function getTypesMission() {
  return TYPES_MISSION;
}

export function getAnnonces() {
  let annonces = readLS(LS_KEY, null);
  if (!annonces) {
    annonces = seedAnnonces();
    writeLS(LS_KEY, annonces);
  }
  return annonces.filter(a => a.status === "active");
}

export function getAnnonceById(id) {
  return getAnnonces().find(a => a.id === id) || null;
}

export function createAnnonce(data) {
  const annonces = readLS(LS_KEY, seedAnnonces());
  const annonce = {
    id: "ann-" + Date.now().toString(36),
    status: "active",
    vues: 0,
    places_prises: 0,
    created_at: new Date().toISOString(),
    ...data,
  };
  annonces.unshift(annonce);
  writeLS(LS_KEY, annonces);
  return annonce;
}

export function incrementVues(id) {
  const annonces = readLS(LS_KEY, []);
  const a = annonces.find(x => x.id === id);
  if (a) {
    a.vues = (a.vues || 0) + 1;
    writeLS(LS_KEY, annonces);
  }
}

// ─── Candidatures ───

export function getCandidatures(annonceId) {
  const all = readLS(LS_CAND_KEY, []);
  return all.filter(c => c.annonce_id === annonceId);
}

export function hasCandidature(annonceId, email) {
  const all = readLS(LS_CAND_KEY, []);
  return all.some(c => c.annonce_id === annonceId && c.candidat_email === email);
}

export function postuler(annonceId, candidat) {
  const all = readLS(LS_CAND_KEY, []);
  if (all.some(c => c.annonce_id === annonceId && c.candidat_email === candidat.email)) {
    return { error: "Vous avez déjà postulé à cette annonce." };
  }
  const candidature = {
    id: "cand-" + Date.now().toString(36),
    annonce_id: annonceId,
    candidat_email: candidat.email,
    candidat_nom: candidat.nom || "Candidat",
    candidat_avatar: candidat.avatar || "",
    candidat_bio: candidat.bio || "",
    candidat_tel: candidat.tel || "",
    message: candidat.message || "",
    status: "en_attente", // en_attente | accepte | refuse
    created_at: new Date().toISOString(),
  };
  all.unshift(candidature);
  writeLS(LS_CAND_KEY, all);
  return { data: candidature };
}

export function updateCandidatureStatus(candidatureId, status) {
  const all = readLS(LS_CAND_KEY, []);
  const c = all.find(x => x.id === candidatureId);
  if (c) {
    c.status = status;
    writeLS(LS_CAND_KEY, all);
    // Met à jour les places prises
    if (status === "accepte") {
      const annonces = readLS(LS_KEY, []);
      const a = annonces.find(x => x.id === c.annonce_id);
      if (a) {
        a.places_prises = (a.places_prises || 0) + 1;
        writeLS(LS_KEY, annonces);
      }
    }
  }
  return c;
}

export function getMesAnnonces(email) {
  const annonces = readLS(LS_KEY, []);
  return annonces.filter(a => a.salon_email === email);
}

export function getMesCandidatures(email) {
  const all = readLS(LS_CAND_KEY, []);
  return all.filter(c => c.candidat_email === email);
}
