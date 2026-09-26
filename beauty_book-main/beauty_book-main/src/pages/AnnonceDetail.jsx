import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Share2, MapPin, Star, CalendarDays, Users, Clock,
  BadgeCheck, Briefcase, CheckCircle2, XCircle, Send, Eye, Sparkles,
  Phone, MessageCircle, ChevronRight, Banknote, Timer, Heart,
  FileSignature, PenLine, Building2, ShieldCheck, Bell
} from "lucide-react";
import BeautyImage from "@/components/ui/BeautyImage";
import {
  getAnnonceById, getAnnonces, getCategories, getTypesMission,
  getCandidatures, hasCandidature, postuler, incrementVues,
  signerContrat, genererContrat, toggleFavori, isFavori
} from "@/lib/annonces";
import "./Annonces.css";

const money = (v) => Number(v || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
};

const SUIVI_ICONS = {
  send: Send,
  eye: Eye,
  check: CheckCircle2,
  x: XCircle,
  pen: PenLine,
};

// ─── Timeline de suivi ───
function SuiviTimeline({ suivi, status }) {
  return (
    <div style={{ position: "relative", paddingLeft: 28 }}>
      <div style={{ position: "absolute", left: 9, top: 8, bottom: 8, width: 2, background: "#E5E7EB", borderRadius: 2 }} />
      {(suivi || []).map((s, i) => {
        const Icon = SUIVI_ICONS[s.icon] || Send;
        const isLast = i === (suivi || []).length - 1;
        return (
          <div key={i} style={{ position: "relative", paddingBottom: i < suivi.length - 1 ? 16 : 0 }}>
            <div style={{
              position: "absolute", left: -28, top: 0, width: 20, height: 20, borderRadius: "50%",
              background: isLast ? "#111827" : "#fff", border: isLast ? "none" : "2px solid #E5E7EB",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Icon size={10} style={{ color: isLast ? "#fff" : "#9CA3AF" }} />
            </div>
            <p style={{ fontSize: 13, fontWeight: isLast ? 800 : 600, color: isLast ? "#111827" : "#6B7280" }}>{s.etape}</p>
            <p style={{ fontSize: 11, color: "#9CA3AF" }}>
              {new Date(s.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function AnnonceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [annonce, setAnnonce] = useState(null);
  const [maCandidature, setMaCandidature] = useState(null);
  const [showApply, setShowApply] = useState(false);
  const [applyForm, setApplyForm] = useState({ nom: "", tel: "", message: "" });
  const [userEmail, setUserEmail] = useState("");
  const [fav, setFav] = useState(false);
  // Contrat
  const [showContrat, setShowContrat] = useState(false);
  const [nomSignataire, setNomSignataire] = useState("");
  const [contratSigne, setContratSigne] = useState(false);

  const refresh = () => {
    const a = getAnnonceById(id);
    if (!a) { navigate("/annonces"); return; }
    setAnnonce(a);
    try {
      const session = JSON.parse(localStorage.getItem("bb_session") || "{}");
      const email = session.email || "";
      setUserEmail(email);
      if (email) {
        setFav(isFavori(email, id));
        const cands = getCandidatures(id);
        const mine = cands.find(c => c.candidat_email === email);
        setMaCandidature(mine || null);
        if (mine?.contrat?.signe) setContratSigne(true);
      }
    } catch {}
  };

  useEffect(() => {
    refresh();
    incrementVues(id);
  }, [id]);

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
  const accepte = maCandidature?.status === "accepte";
  const refuse = maCandidature?.status === "refuse";
  const isOwner = userEmail && annonce.salon_email === userEmail;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: annonce.title, text: annonce.description?.slice(0, 100), url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      alert("Lien copié !");
    }
  };

  const handleFav = () => {
    if (!userEmail) { alert("Connectez-vous pour sauvegarder cette annonce"); return; }
    setFav(toggleFavori(userEmail, id));
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
    setMaCandidature(res.data);
    setShowApply(false);
  };

  const handleSigner = () => {
    if (!nomSignataire.trim()) { alert("Indiquez votre nom complet pour signer"); return; }
    signerContrat(maCandidature.id, nomSignataire.trim());
    setContratSigne(true);
    setShowContrat(false);
    refresh();
  };

  const contratTexte = maCandidature ? genererContrat(annonce, { ...maCandidature, contrat: { ...maCandidature.contrat, nom_signataire: nomSignataire || maCandidature.contrat?.nom_signataire } }) : "";

  return (
    <div className="annonces-page">
      {/* ── Hero avec cover + profil salon ── */}
      <div style={{ position: "relative" }}>
        {/* Cover */}
        <div style={{ height: 220, position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #FF6B00, #FFB25E)" }}>
          {annonce.salon_cover ? (
            <BeautyImage src={annonce.salon_cover} alt="" className="w-full h-full object-cover" />
          ) : (
            <BeautyImage src="https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1200" alt="" className="w-full h-full object-cover" />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%)" }} />
        </div>
        {/* Top buttons */}
        <div style={{ position: "absolute", top: 14, left: 14, right: 14, display: "flex", justifyContent: "space-between" }}>
          <button className="annonce-back" onClick={() => navigate(-1)} style={{ background: "rgba(255,255,255,0.9)" }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="annonce-share" onClick={handleFav} style={{ background: "rgba(255,255,255,0.9)" }}>
              <Heart size={18} style={{ color: fav ? "#EF4444" : undefined }} fill={fav ? "#EF4444" : "none"} />
            </button>
            <button className="annonce-share" onClick={handleShare} style={{ background: "rgba(255,255,255,0.9)" }}>
              <Share2 size={18} />
            </button>
          </div>
        </div>
        {/* Profil salon */}
        <div style={{ position: "absolute", bottom: -34, left: 20, right: 20, display: "flex", alignItems: "flex-end", gap: 14 }}>
          <div style={{ width: 76, height: 76, borderRadius: 24, border: "3px solid #fff", overflow: "hidden", background: "linear-gradient(135deg, #FF6B00, #FFB25E)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 30, flexShrink: 0, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
            {annonce.salon_avatar ? (
              <BeautyImage src={annonce.salon_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              (annonce.salon_name || "S")[0]
            )}
          </div>
          <div style={{ paddingBottom: 4 }}>
            <p style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 900, fontSize: 17, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
              {annonce.salon_name} <BadgeCheck size={17} style={{ color: "#60A5FA" }} />
            </p>
            <p style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#fff", opacity: 0.95, textShadow: "0 1px 4px rgba(0,0,0,0.4)", marginTop: 2 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin size={12} /> {annonce.salon_city}</span>
              {annonce.salon_rating > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Star size={12} fill="currentColor" /> {annonce.salon_rating}</span>}
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Eye size={12} /> {annonce.vues || 0} vues</span>
            </p>
          </div>
        </div>
      </div>

      <div className="annonce-detail-body" style={{ paddingTop: 48 }}>
        {/* Bannière propriétaire */}
        {isOwner && (
          <button
            onClick={() => navigate(`/pro/annonces/${annonce.id}`)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "linear-gradient(135deg, #111827, #374151)", color: "#fff", border: "none", borderRadius: 16, padding: "14px 16px", marginBottom: 16, cursor: "pointer", fontWeight: 800, fontSize: 14 }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Briefcase size={17} /> C'est votre annonce — gérez les candidatures
            </span>
            <ChevronRight size={18} />
          </button>
        )}
        {/* Titre */}
        <h1 className="annonce-detail-title" style={{ color: "#111827", marginBottom: 8 }}>{annonce.title}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          {typeMission && <span className="annonce-tag annonce-tag-type">{typeMission.label}</span>}
          {cat && <span className="annonce-tag">{cat.label}</span>}
          {placesRestantes > 0
            ? <span className="annonce-tag annonce-tag-places"><Users size={11} /> {placesRestantes} place{placesRestantes > 1 ? "s" : ""} restante{placesRestantes > 1 ? "s" : ""}</span>
            : <span className="annonce-tag" style={{ background: "#FEE2E2", color: "#B91C1C" }}>Complet</span>}
        </div>

        {/* ── Suivi de candidature ── */}
        {maCandidature && (
          <div className="annonce-section" style={{ border: accepte ? "2px solid #10B981" : refuse ? "2px solid #FCA5A5" : "1px solid #FDBA74", background: accepte ? "#ECFDF5" : refuse ? "#FEF2F2" : "#FFFBEB" }}>
            <p className="annonce-section-title">
              {accepte ? <><CheckCircle2 size={14} style={{ color: "#057A55" }} /> Candidature acceptée 🎉</>
               : refuse ? <><XCircle size={14} style={{ color: "#B91C1C" }} /> Candidature refusée</>
               : <><Clock size={14} style={{ color: "#D97706" }} /> Suivi de ma candidature</>}
            </p>
            <SuiviTimeline suivi={maCandidature.suivi} status={maCandidature.status} />

            {/* Réponse du salon */}
            {maCandidature.reponse_salon && (
              <div style={{ marginTop: 14, background: "#fff", borderRadius: 12, padding: 12, border: "1px solid #E5E7EB" }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#6B7280", marginBottom: 6, letterSpacing: 0.5 }}>MESSAGE DU SALON</p>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "#374151", whiteSpace: "pre-wrap" }}>{maCandidature.reponse_salon}</p>
              </div>
            )}

            {/* Contrat électronique */}
            {accepte && !contratSigne && (
              <button onClick={() => setShowContrat(true)} className="annonce-cta-btn" style={{ marginTop: 14 }}>
                <FileSignature size={18} /> Signer mon contrat
              </button>
            )}
            {accepte && contratSigne && (
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 12, padding: 12, border: "1px solid #6EE7B7" }}>
                <ShieldCheck size={22} style={{ color: "#057A55", flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#057A55" }}>Contrat signé électroniquement</p>
                  <p style={{ fontSize: 11, color: "#6B7280" }}>
                    {maCandidature.contrat?.date && new Date(maCandidature.contrat.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    {maCandidature.contrat?.nom_signataire && ` · par ${maCandidature.contrat.nom_signataire}`}
                  </p>
                </div>
              </div>
            )}

            {/* Contact salon après acceptation */}
            {accepte && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {annonce.salon_tel && (
                  <a href={`tel:${annonce.salon_tel}`} className="candidat-btn" style={{ flex: 1, background: "#111827", color: "#fff", textDecoration: "none" }}>
                    <Phone size={14} /> Appeler le salon
                  </a>
                )}
                <a href={`mailto:${annonce.salon_email}`} className="candidat-btn" style={{ flex: 1, background: "#fff", color: "#111827", border: "1.5px solid #E5E7EB", textDecoration: "none" }}>
                  <MessageCircle size={14} /> Contacter
                </a>
              </div>
            )}
          </div>
        )}

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

        {/* ── À propos du salon ── */}
        <div className="annonce-section">
          <p className="annonce-section-title"><Building2 size={13} /> À propos du salon</p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, overflow: "hidden", background: "linear-gradient(135deg, #FF6B00, #FFB25E)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 20, flexShrink: 0 }}>
              {annonce.salon_avatar ? (
                <BeautyImage src={annonce.salon_avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                (annonce.salon_name || "S")[0]
              )}
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 5 }}>{annonce.salon_name} <BadgeCheck size={14} style={{ color: "#3B82F6" }} /></p>
              <p style={{ fontSize: 12, color: "#6B7280" }}>{annonce.salon_city}{annonce.salon_rating > 0 && ` · ⭐ ${annonce.salon_rating}`}</p>
            </div>
          </div>
          {annonce.salon_bio ? (
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#4B5563" }}>{annonce.salon_bio}</p>
          ) : (
            <p style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>Ce salon n'a pas encore ajouté de présentation.</p>
          )}
        </div>

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
            {maCandidature
              ? accepte
                ? "🎉 Félicitations ! Signez votre contrat puis contactez le salon pour préparer votre arrivée."
                : refuse
                  ? "💪 Ne baissez pas les bras ! Votre profil peut convenir à d'autres salons. Explorez les annonces similaires."
                  : "⏳ Votre candidature est en cours d'examen. Les salons répondent généralement sous 48h. Activez les notifications pour être alerté(e)."
              : placesRestantes <= 1
                ? "⚡ Dernière place disponible ! Postulez vite avec un message personnalisé pour maximiser vos chances."
                : "💡 Astuce : un message de motivation personnalisé multiplie par 3 vos chances d'être retenu(e)."}
          </p>
        </div>
      </div>

      {/* ── CTA fixe ── */}
      {!maCandidature && (
        <div className="annonce-cta-bar">
          <div className="annonce-cta-price">
            <p className="amount">{money(annonce.remuneration)}</p>
            <p className="per">/{annonce.remuneration_type === "jour" ? "jour" : "mission"}</p>
          </div>
          <button
            className="annonce-cta-btn"
            onClick={() => setShowApply(true)}
            disabled={placesRestantes <= 0}
          >
            {placesRestantes <= 0 ? "Complet" : <><Send size={18} /> Postuler</>}
          </button>
        </div>
      )}
      {maCandidature && !accepte && (
        <div className="annonce-cta-bar" style={{ justifyContent: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", display: "flex", alignItems: "center", gap: 8 }}>
            <Bell size={15} /> Vous serez notifié(e) de la décision du salon
          </p>
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
              <input value={applyForm.nom} onChange={e => setApplyForm({ ...applyForm, nom: e.target.value })} placeholder="Ex. Aïcha Diallo" />
            </div>
            <div className="annonce-field">
              <label>Téléphone</label>
              <input value={applyForm.tel} onChange={e => setApplyForm({ ...applyForm, tel: e.target.value })} placeholder="06 12 34 56 78" type="tel" />
            </div>
            <div className="annonce-field">
              <label>Message au salon</label>
              <textarea value={applyForm.message} onChange={e => setApplyForm({ ...applyForm, message: e.target.value })} placeholder="Présentez-vous : expérience, disponibilités..." />
            </div>
            <button className="annonce-cta-btn" onClick={handleApply}>
              <Send size={18} /> Envoyer ma candidature
            </button>
          </div>
        </div>
      )}

      {/* ── Modal contrat électronique ── */}
      {showContrat && (
        <div className="annonce-modal-overlay" onClick={() => setShowContrat(false)}>
          <div className="annonce-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: "#DEF7EC", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileSignature size={22} style={{ color: "#057A55" }} />
              </div>
              <div>
                <h3 style={{ margin: 0 }}>Contrat de mission</h3>
                <p className="sub" style={{ margin: 0 }}>Signature électronique</p>
              </div>
            </div>
            <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, maxHeight: 320, overflowY: "auto", margin: "14px 0" }}>
              <pre style={{ fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "inherit", color: "#374151" }}>{contratTexte}</pre>
            </div>
            <div className="annonce-field">
              <label>Signer : écrivez votre nom complet *</label>
              <input
                value={nomSignataire}
                onChange={e => setNomSignataire(e.target.value)}
                placeholder="Ex. Aïcha Diallo"
                style={{ fontFamily: "cursive", fontSize: 18 }}
              />
            </div>
            {nomSignataire.trim() && (
              <div style={{ background: "#FFFBEB", border: "1px dashed #F59E0B", borderRadius: 12, padding: 12, marginBottom: 12, textAlign: "center" }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#92400E", marginBottom: 4 }}>APERÇU DE LA SIGNATURE</p>
                <p style={{ fontFamily: "cursive", fontSize: 26, color: "#111827" }}>{nomSignataire}</p>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowContrat(false)} className="annonce-modal-cancel" style={{ flex: 1 }}>Plus tard</button>
              <button onClick={handleSigner} className="annonce-modal-submit" style={{ flex: 2 }}>
                <PenLine size={15} /> Signer électroniquement
              </button>
            </div>
            <p style={{ fontSize: 10, color: "#9CA3AF", textAlign: "center", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <ShieldCheck size={11} /> Signature horodatée et juridiquement valable
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
