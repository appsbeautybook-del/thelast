import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Share2, MapPin, Star, CalendarDays, Euro, Users, Clock,
  BadgeCheck, Briefcase, CheckCircle2, XCircle, Send, Eye, Sparkles,
  Phone, MessageCircle, ChevronRight, Building2, Banknote, Timer
} from "lucide-react";
import BeautyImage from "@/components/ui/BeautyImage";
import {
  getAnnonceById, getAnnonces, getCategories, getTypesMission,
  getCandidatures, hasCandidature, postuler, updateCandidatureStatus, incrementVues
} from "@/lib/annonces";
import "./Annonces.css";

const money = (v) => Number(v || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
};

function CandidatCard({ candidat, isOwner, onDecision }) {
  return (
    <div className="candidat-card">
      <div className="candidat-avatar">
        {candidat.candidat_avatar ? (
          <BeautyImage src={candidat.candidat_avatar} alt="" className="w-full h-full object-cover rounded-2xl" />
        ) : (
          (candidat.candidat_nom || "C")[0].toUpperCase()
        )}
      </div>
      <div className="candidat-info">
        <p className="candidat-name">{candidat.candidat_nom}</p>
        <span className={`candidat-status ${candidat.status}`}>
          {candidat.status === "en_attente" && "En attente"}
          {candidat.status === "accepte" && "✓ Accepté(e)"}
          {candidat.status === "refuse" && "✕ Refusé(e)"}
        </span>
        {candidat.message && <p className="candidat-msg">« {candidat.message} »</p>}
        {candidat.candidat_tel && (
          <p className="candidat-msg" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Phone size={12} /> {candidat.candidat_tel}
          </p>
        )}
        {isOwner && candidat.status === "en_attente" && (
          <div className="candidat-actions">
            <button className="candidat-btn accept" onClick={() => onDecision(candidat.id, "accepte")}>
              <CheckCircle2 size={14} /> Accepter
            </button>
            <button className="candidat-btn reject" onClick={() => onDecision(candidat.id, "refuse")}>
              <XCircle size={14} /> Refuser
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnnonceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [annonce, setAnnonce] = useState(null);
  const [candidatures, setCandidatures] = useState([]);
  const [showApply, setShowApply] = useState(false);
  const [applyForm, setApplyForm] = useState({ nom: "", tel: "", message: "" });
  const [applied, setApplied] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const a = getAnnonceById(id);
    if (!a) { navigate("/annonces"); return; }
    setAnnonce(a);
    incrementVues(id);
    setCandidatures(getCandidatures(id));
    // Email utilisateur (si connecté)
    try {
      const session = JSON.parse(localStorage.getItem("bb_session") || "{}");
      setUserEmail(session.email || "");
      if (session.email && hasCandidature(id, session.email)) setApplied(true);
    } catch {}
  }, [id]);

  const isOwner = useMemo(() => {
    if (!annonce || !userEmail) return false;
    return annonce.salon_email === userEmail;
  }, [annonce, userEmail]);

  const similar = useMemo(() => {
    if (!annonce) return [];
    return getAnnonces()
      .filter(a => a.id !== annonce.id && (a.category === annonce.category || a.salon_city === annonce.salon_city))
      .slice(0, 3);
  }, [annonce]);

  if (!annonce) return null;

  const cat = getCategories().find(c => c.id === annonce.category);
  const typeMission = getTypesMission().find(t => t.id === annonce.type_mission);
  const placesRestantes = (annonce.places || 1) - (annonce.places_prises || 0);
  const stats = {
    total: candidatures.length,
    attente: candidatures.filter(c => c.status === "en_attente").length,
    acceptes: candidatures.filter(c => c.status === "accepte").length,
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: annonce.title, text: annonce.description?.slice(0, 100), url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      alert("Lien copié !");
    }
  };

  const handleApply = () => {
    if (!applyForm.nom.trim()) { alert("Indiquez votre nom"); return; }
    const res = postuler(annonce.id, {
      email: userEmail || `invite-${Date.now()}@beautybook.app`,
      nom: applyForm.nom,
      tel: applyForm.tel,
      message: applyForm.message,
    });
    if (res.error) { alert(res.error); return; }
    setCandidatures(getCandidatures(annonce.id));
    setApplied(true);
    setShowApply(false);
  };

  const handleDecision = (candId, status) => {
    updateCandidatureStatus(candId, status);
    setCandidatures(getCandidatures(annonce.id));
    const a = getAnnonceById(annonce.id);
    if (a) setAnnonce(a);
  };

  return (
    <div className="annonces-page">
      {/* ── Hero ── */}
      <div className="annonce-detail-hero">
        <div className="annonce-detail-top">
          <button className="annonce-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <button className="annonce-share" onClick={handleShare}>
            <Share2 size={18} />
          </button>
        </div>

        <div className="annonce-detail-salon">
          <div className="annonce-detail-avatar">
            {annonce.salon_avatar ? (
              <BeautyImage src={annonce.salon_avatar} alt="" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              (annonce.salon_name || "S")[0]
            )}
          </div>
          <div>
            <p style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 15 }}>
              {annonce.salon_name} <BadgeCheck size={15} />
            </p>
            <p className="annonce-detail-meta" style={{ marginTop: 4 }}>
              <span><MapPin size={12} /> {annonce.salon_city}</span>
              {annonce.salon_rating > 0 && <span><Star size={12} fill="currentColor" /> {annonce.salon_rating}</span>}
              <span><Eye size={12} /> {annonce.vues || 0} vues</span>
            </p>
          </div>
        </div>

        <h1 className="annonce-detail-title">{annonce.title}</h1>
        <div className="annonce-detail-meta">
          {typeMission && <span className="annonce-tag annonce-tag-type" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>{typeMission.label}</span>}
          {cat && <span>{cat.label}</span>}
        </div>
      </div>

      <div className="annonce-detail-body">
        {/* ── Infos clés ── */}
        <div className="annonce-section">
          <p className="annonce-section-title"><Sparkles size={13} /> Informations clés</p>
          <div className="annonce-info-grid">
            <div className="annonce-info-item">
              <p className="lbl">Rémunération</p>
              <p className="val orange"><Banknote size={16} /> {money(annonce.remuneration)}<span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280" }}>/{annonce.remuneration_type === "jour" ? "jour" : "mission"}</span></p>
            </div>
            <div className="annonce-info-item">
              <p className="lbl">Places</p>
              <p className="val"><Users size={16} /> {placesRestantes} restante{placesRestantes > 1 ? "s" : ""}</p>
            </div>
            <div className="annonce-info-item">
              <p className="lbl">Début</p>
              <p className="val"><CalendarDays size={16} /> {fmtDate(annonce.date_debut)}</p>
            </div>
            <div className="annonce-info-item">
              <p className="lbl">Fin</p>
              <p className="val"><Timer size={16} /> {fmtDate(annonce.date_fin)}</p>
            </div>
          </div>
          {annonce.adresse && (
            <p style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 13, color: "#6B7280", fontWeight: 600 }}>
              <MapPin size={14} /> {annonce.adresse}
            </p>
          )}
        </div>

        {/* ── Description ── */}
        <div className="annonce-section">
          <p className="annonce-section-title"><Briefcase size={13} /> Description de la mission</p>
          <p className="annonce-text">{annonce.description}</p>
        </div>

        {/* ── Compétences ── */}
        {annonce.competences?.length > 0 && (
          <div className="annonce-section">
            <p className="annonce-section-title"><CheckCircle2 size={13} /> Compétences recherchées</p>
            <div className="annonce-skills">
              {annonce.competences.map((c, i) => (
                <span key={i} className="annonce-skill">{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Candidatures (propriétaire) ── */}
        {isOwner && (
          <div className="annonce-section">
            <p className="annonce-section-title"><Users size={13} /> Candidatures ({stats.total})</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <span className="annonce-tag">{stats.attente} en attente</span>
              <span className="annonce-tag annonce-tag-places">{stats.acceptes} accepté{stats.acceptes > 1 ? "s" : ""}</span>
            </div>
            {candidatures.length === 0 ? (
              <p style={{ fontSize: 13, color: "#6B7280", textAlign: "center", padding: "20px 0" }}>
                Aucune candidature pour le moment.<br />Partagez votre annonce pour attirer des talents !
              </p>
            ) : (
              candidatures.map(c => (
                <CandidatCard key={c.id} candidat={c} isOwner={true} onDecision={handleDecision} />
              ))
            )}
          </div>
        )}

        {/* ── Mes candidatures (candidat) ── */}
        {!isOwner && candidatures.filter(c => c.candidat_email === userEmail).length > 0 && (
          <div className="annonce-section">
            <p className="annonce-section-title"><Send size={13} /> Ma candidature</p>
            {candidatures.filter(c => c.candidat_email === userEmail).map(c => (
              <CandidatCard key={c.id} candidat={c} isOwner={false} />
            ))}
          </div>
        )}

        {/* ── Annonces similaires ── */}
        {similar.length > 0 && (
          <div className="annonce-section">
            <p className="annonce-section-title"><Sparkles size={13} /> Annonces similaires</p>
            {similar.map(s => (
              <div
                key={s.id}
                onClick={() => navigate(`/annonces/${s.id}`)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #F3F4F6", cursor: "pointer" }}
              >
                <div className="annonce-icon-badge" style={{ width: 40, height: 40 }}>
                  <Briefcase size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 800 }}>{s.title}</p>
                  <p style={{ fontSize: 11, color: "#6B7280" }}>{s.salon_name} · {s.salon_city} · {money(s.remuneration)}/{s.remuneration_type === "jour" ? "j" : "m"}</p>
                </div>
                <ChevronRight size={18} style={{ color: "#9CA3AF" }} />
              </div>
            ))}
          </div>
        )}

        {/* ── Conseil Maria ── */}
        <div className="annonce-section" style={{ background: "linear-gradient(135deg, #FFF7ED, #FFEDD5)", border: "1px solid #FDBA74" }}>
          <p className="annonce-section-title"><Sparkles size={13} /> Conseil de Maria IA</p>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: "#7C2D12" }}>
            {placesRestantes <= 1
              ? "⚡ Dernière place disponible ! Les annonces avec photo de salon reçoivent 3× plus de candidatures."
              : `💡 Astuce : précisez vos attentes dans la description pour recevoir des candidatures qualifiées. ${stats.total} candidat${stats.total > 1 ? "s" : ""} ont déjà postulé.`}
          </p>
        </div>
      </div>

      {/* ── CTA fixe ── */}
      {!isOwner && (
        <div className="annonce-cta-bar">
          <div className="annonce-cta-price">
            <p className="amount">{money(annonce.remuneration)}</p>
            <p className="per">/{annonce.remuneration_type === "jour" ? "jour" : "mission"}</p>
          </div>
          <button
            className={`annonce-cta-btn ${applied ? "applied" : ""}`}
            onClick={() => !applied && setShowApply(true)}
            disabled={applied || placesRestantes <= 0}
          >
            {applied ? <><CheckCircle2 size={18} /> Candidature envoyée</> : placesRestantes <= 0 ? "Complet" : <><Send size={18} /> Postuler</>}
          </button>
        </div>
      )}

      {/* ── Modal candidature ── */}
      {showApply && (
        <div className="annonce-modal-overlay" onClick={() => setShowApply(false)}>
          <div className="annonce-modal" onClick={e => e.stopPropagation()}>
            <h3>Postuler à cette mission</h3>
            <p className="sub">{annonce.title} — {annonce.salon_name}</p>
            <div className="annonce-field">
              <label>Votre nom *</label>
              <input
                value={applyForm.nom}
                onChange={e => setApplyForm({ ...applyForm, nom: e.target.value })}
                placeholder="Ex. Aïcha Diallo"
              />
            </div>
            <div className="annonce-field">
              <label>Téléphone</label>
              <input
                value={applyForm.tel}
                onChange={e => setApplyForm({ ...applyForm, tel: e.target.value })}
                placeholder="06 12 34 56 78"
                type="tel"
              />
            </div>
            <div className="annonce-field">
              <label>Message au salon</label>
              <textarea
                value={applyForm.message}
                onChange={e => setApplyForm({ ...applyForm, message: e.target.value })}
                placeholder="Présentez-vous en quelques mots : votre expérience, vos disponibilités..."
              />
            </div>
            <button className="annonce-cta-btn" onClick={handleApply}>
              <Send size={18} /> Envoyer ma candidature
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
