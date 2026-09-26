import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Users, Eye, MessageSquareText, Settings2, CheckCircle2, XCircle,
  Clock, PenLine, Send, Wand2, Phone, Mail, FileText, CalendarDays, Euro,
  MapPin, Sparkles, Trash2, Pencil, Play, Pause, Archive, BadgeCheck
} from "lucide-react";
import {
  getAnnonceById, getCandidatures, updateCandidatureStatus, getAnnonceStats,
  ANNONCE_STATUS, updateAnnonce, setAnnonceStatus, deleteAnnonce,
  fillTemplate, DEFAULT_MSG_ACCEPTE, DEFAULT_MSG_REFUSE, getTypesMission,
  checkSalonAccess
} from "@/lib/annonces";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import "../Annonces.css";

const money = (v) => Number(v || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function getUserEmail(authEmail) {
  if (authEmail) return authEmail;
  try { return JSON.parse(localStorage.getItem("bb_session") || "{}").email || "salon@beautybook.app"; }
  catch { return "salon@beautybook.app"; }
}

const TABS = [
  { id: "candidats", label: "Candidatures", icon: Users },
  { id: "apercu", label: "Aperçu", icon: Eye },
  { id: "messages", label: "Messages auto", icon: MessageSquareText },
];

export default function AnnonceProDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const email = getUserEmail(user?.email);
  const [annonce, setAnnonce] = useState(null);
  const [candidats, setCandidats] = useState([]);
  const [tab, setTab] = useState("candidats");
  const [filterCand, setFilterCand] = useState("tous");
  // Modale de décision
  const [deciding, setDeciding] = useState(null); // { cand, action: "accepte"|"refuse" }
  const [useTemplate, setUseTemplate] = useState(true);
  const [customMsg, setCustomMsg] = useState("");
  // Édition templates
  const [tplAccepte, setTplAccepte] = useState("");
  const [tplRefuse, setTplRefuse] = useState("");
  const [tplSaved, setTplSaved] = useState(false);
  // Accès réservé aux salons professionnels
  const [access, setAccess] = useState({ loading: true, isSalon: false });

  const refresh = () => {
    const a = getAnnonceById(id);
    if (a) {
      setAnnonce(a);
      setTplAccepte(a.msg_accepte || DEFAULT_MSG_ACCEPTE);
      setTplRefuse(a.msg_refuse || DEFAULT_MSG_REFUSE);
      setCandidats(getCandidatures(id));
    }
  };
  useEffect(refresh, [id]);
  useEffect(() => {
    checkSalonAccess(supabase, email).then(setAccess);
  }, [email]);

  if (access.loading) {
    return <div className="annonces-page"><div className="annonces-empty"><p>Vérification de votre profil...</p></div></div>;
  }
  if (!access.isSalon) {
    return (
      <div className="annonces-page">
        <div className="annonces-empty" style={{ padding: "60px 20px" }}>
          <div className="annonces-empty-icon"><Users size={28} /></div>
          <p className="annonces-empty-title">Réservé aux salons professionnels</p>
          <p className="annonces-empty-desc">
            La gestion des candidatures est réservée aux profils professionnels
            ayant le statut de « Salon professionnel ».
          </p>
          <button className="annonce-cta-btn" style={{ marginTop: 16, maxWidth: 280, margin: "16px auto 0" }} onClick={() => navigate("/annonces")}>
            Voir les annonces
          </button>
        </div>
      </div>
    );
  }

  if (!annonce) {
    return <div className="annonces-page"><div className="annonces-empty"><p>Annonce introuvable.</p></div></div>;
  }

  const stats = getAnnonceStats(id);
  const st = ANNONCE_STATUS[annonce.status] || ANNONCE_STATUS.brouillon;
  const typeMission = getTypesMission().find(t => t.id === annonce.type_mission);

  const filteredCands = candidats.filter(c => {
    if (filterCand === "tous") return true;
    return c.status === filterCand;
  });

  const openDecision = (cand, action) => {
    const tpl = action === "accepte" ? (annonce.msg_accepte || DEFAULT_MSG_ACCEPTE) : (annonce.msg_refuse || DEFAULT_MSG_REFUSE);
    setCustomMsg(fillTemplate(tpl, templateVars(cand)));
    setUseTemplate(true);
    setDeciding({ cand, action });
  };

  const templateVars = (cand) => ({
    nom: cand.candidat_nom,
    titre: annonce.title,
    salon: annonce.salon_name,
    date_debut: annonce.date_debut ? new Date(annonce.date_debut + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—",
    remuneration: `${money(annonce.remuneration)}${annonce.remuneration_type === "jour" ? " / jour" : " / mission"}`,
  });

  const confirmDecision = () => {
    updateCandidatureStatus(deciding.cand.id, deciding.action, customMsg);
    setDeciding(null);
    refresh();
  };

  const saveTemplates = () => {
    updateAnnonce(id, { msg_accepte: tplAccepte, msg_refuse: tplRefuse });
    setTplSaved(true);
    setTimeout(() => setTplSaved(false), 2500);
    refresh();
  };

  const handleDelete = () => {
    if (!confirm("Supprimer définitivement cette annonce ?")) return;
    deleteAnnonce(id);
    navigate("/pro/annonces");
  };

  return (
    <div className="annonces-page">
      {/* Hero compact */}
      <header className="discovery-hero" style={{ paddingBottom: 18 }}>
        <div className="discovery-topline">
          <button onClick={() => navigate("/pro/annonces")} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontWeight: 800, fontSize: 14 }}>
            <ArrowLeft size={18} /> Mes annonces
          </button>
          <span className="discovery-brand">BeautyBook<span className="brand-dot">.</span></span>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 22, fontWeight: 900 }}>{annonce.title}</h1>
            <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: st.bg, color: st.color }}>{st.label}</span>
          </div>
          <p style={{ fontSize: 13, color: "#6B7280" }}>
            {typeMission?.label} · {money(annonce.remuneration)}/{annonce.remuneration_type === "jour" ? "j" : "m"} · {annonce.vues || 0} vues
          </p>
        </div>
      </header>

      <div style={{ padding: "0 max(20px, calc((100% - 1180px) / 2))", maxWidth: 1180, margin: "0 auto", paddingBottom: 32 }}>
        {/* Compteurs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, margin: "18px 0" }}>
          {[
            { label: "Total", value: stats.total, color: "#111827" },
            { label: "En attente", value: stats.en_attente, color: "#D97706" },
            { label: "Acceptés", value: stats.accepte, color: "#057A55" },
            { label: "Refusés", value: stats.refuse, color: "#B91C1C" },
          ].map((s, i) => (
            <div key={i} className="annonce-section" style={{ margin: 0, padding: 12, textAlign: "center" }}>
              <p style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: 10, color: "#6B7280", fontWeight: 700 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Onglets */}
        <div className="annonce-tabs" style={{ marginBottom: 16 }}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`annonce-tab ${tab === t.id ? "active" : ""}`}>
                <Icon size={13} style={{ marginRight: 5 }} />{t.label}
                {t.id === "candidats" && stats.en_attente > 0 && (
                  <span style={{ marginLeft: 6, background: "#D97706", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "1px 7px" }}>{stats.en_attente}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── ONGLET CANDIDATURES ─── */}
        {tab === "candidats" && (
          <>
            <div className="annonces-types" style={{ padding: "0 0 14px" }}>
              {["tous", "en_attente", "accepte", "refuse"].map(f => (
                <button key={f} className={`annonce-type ${filterCand === f ? "active" : ""}`} onClick={() => setFilterCand(f)}>
                  {f === "tous" ? "Tous" : f === "en_attente" ? "En attente" : f === "accepte" ? "Acceptés" : "Refusés"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredCands.length === 0 ? (
                <div className="annonces-empty">
                  <div className="annonces-empty-icon"><Users size={28} /></div>
                  <p className="annonces-empty-title">Aucune candidature</p>
                  <p className="annonces-empty-desc">Les candidatures reçues apparaîtront ici.</p>
                </div>
              ) : filteredCands.map(c => (
                <article key={c.id} className="annonce-card">
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg, #FF6B00, #FFB25E)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 20, flexShrink: 0, overflow: "hidden" }}>
                      {c.candidat_avatar ? <img src={c.candidat_avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : c.candidat_nom.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <h3 style={{ fontSize: 15, fontWeight: 900 }}>{c.candidat_nom}</h3>
                        <CandBadge status={c.status} />
                        {c.contrat?.signe && (
                          <span className="annonce-tag" style={{ background: "#DEF7EC", color: "#057A55" }}><BadgeCheck size={11} /> Contrat signé</span>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                        {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {c.candidat_tel && <> · <Phone size={10} style={{ display: "inline" }} /> {c.candidat_tel}</>}
                      </p>
                      {c.candidat_bio && <p style={{ fontSize: 12, color: "#4B5563", marginTop: 6, fontStyle: "italic" }}>« {c.candidat_bio} »</p>}
                      {c.message && (
                        <div style={{ marginTop: 8, background: "#F9FAFB", borderRadius: 12, padding: 10 }}>
                          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.5 }}>{c.message}</p>
                        </div>
                      )}
                      {c.reponse_salon && c.status !== "en_attente" && (
                        <div style={{ marginTop: 8, background: c.status === "accepte" ? "#ECFDF5" : "#FEF2F2", borderRadius: 12, padding: 10 }}>
                          <p style={{ fontSize: 10, fontWeight: 800, color: c.status === "accepte" ? "#057A55" : "#B91C1C", marginBottom: 4 }}>VOTRE RÉPONSE</p>
                          <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{c.reponse_salon}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    {c.status === "en_attente" ? (
                      <>
                        <button onClick={() => openDecision(c, "accepte")} className="candidat-btn accept" style={{ flex: 1 }}>
                          <CheckCircle2 size={14} /> Accepter
                        </button>
                        <button onClick={() => openDecision(c, "refuse")} className="candidat-btn reject" style={{ flex: 1 }}>
                          <XCircle size={14} /> Refuser
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => openDecision(c, c.status === "accepte" ? "refuse" : "accepte")} className="candidat-btn" style={{ flex: 1, background: "#F3F4F6", color: "#111827" }}>
                          {c.status === "accepte" ? <><XCircle size={14} /> Passer en refus</> : <><CheckCircle2 size={14} /> Passer en accepté</>}
                        </button>
                        <a href={`mailto:${c.candidat_email}`} className="candidat-btn" style={{ background: "#F3F4F6", color: "#111827", textDecoration: "none" }}>
                          <Mail size={14} />
                        </a>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {/* ─── ONGLET APERÇU ─── */}
        {tab === "apercu" && (
          <div className="annonce-card">
            <p className="annonce-section-title">Description</p>
            <p className="annonce-desc" style={{ WebkitLineClamp: "unset" }}>{annonce.description}</p>
            <p className="annonce-section-title" style={{ marginTop: 16 }}>Compétences</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {(annonce.competences || []).map((c, i) => <span key={i} className="annonce-tag">{c}</span>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
              <div className="annonce-detail-box"><CalendarDays size={15} /><div><p>Début</p><strong>{annonce.date_debut || "—"}</strong></div></div>
              <div className="annonce-detail-box"><CalendarDays size={15} /><div><p>Fin</p><strong>{annonce.date_fin || "—"}</strong></div></div>
              <div className="annonce-detail-box"><Euro size={15} /><div><p>Rémunération</p><strong>{money(annonce.remuneration)}</strong></div></div>
              <div className="annonce-detail-box"><MapPin size={15} /><div><p>Lieu</p><strong>{annonce.salon_city || "—"}</strong></div></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
              <button onClick={() => navigate(`/annonces/nouvelle?edit=${annonce.id}`)} className="candidat-btn" style={{ background: "#F3F4F6", color: "#111827" }}><Pencil size={13} /> Modifier</button>
              {annonce.status === "publiee" && <button onClick={() => { setAnnonceStatus(annonce.id, "pause"); refresh(); }} className="candidat-btn" style={{ background: "#FEF3C7", color: "#92400E" }}><Pause size={13} /> Mettre en pause</button>}
              {annonce.status === "pause" && <button onClick={() => { setAnnonceStatus(annonce.id, "publiee"); refresh(); }} className="candidat-btn accept"><Play size={13} /> Republier</button>}
              {annonce.status === "brouillon" && <button onClick={() => { setAnnonceStatus(annonce.id, "publiee"); refresh(); }} className="candidat-btn accept"><Play size={13} /> Publier</button>}
              <button onClick={handleDelete} className="candidat-btn reject"><Trash2 size={13} /> Supprimer</button>
            </div>
            <button onClick={() => navigate(`/annonces/${annonce.id}`)} style={{ marginTop: 12, background: "none", border: "none", color: "#FF6B00", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              Voir comme un candidat →
            </button>
          </div>
        )}

        {/* ─── ONGLET MESSAGES AUTO ─── */}
        {tab === "messages" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="annonce-card">
              <p className="annonce-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={16} style={{ color: "#057A55" }} /> Message d'acceptation
              </p>
              <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 8 }}>Variables : {"{nom}"} {"{titre}"} {"{salon}"} {"{date_debut}"} {"{remuneration}"}</p>
              <textarea
                value={tplAccepte}
                onChange={e => setTplAccepte(e.target.value)}
                rows={10}
                style={{ width: "100%", borderRadius: 12, border: "1.5px solid #E5E7EB", padding: 12, fontSize: 13, lineHeight: 1.6, resize: "vertical" }}
              />
            </div>
            <div className="annonce-card">
              <p className="annonce-section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <XCircle size={16} style={{ color: "#B91C1C" }} /> Message de refus
              </p>
              <p style={{ fontSize: 11, color: "#6B7280", marginBottom: 8 }}>Variables : {"{nom}"} {"{titre}"} {"{salon}"}</p>
              <textarea
                value={tplRefuse}
                onChange={e => setTplRefuse(e.target.value)}
                rows={8}
                style={{ width: "100%", borderRadius: 12, border: "1.5px solid #E5E7EB", padding: 12, fontSize: 13, lineHeight: 1.6, resize: "vertical" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveTemplates} className="candidat-btn accept" style={{ flex: 1, padding: 13 }}>
                <BadgeCheck size={15} /> Enregistrer les messages
              </button>
              <button onClick={() => { setTplAccepte(DEFAULT_MSG_ACCEPTE); setTplRefuse(DEFAULT_MSG_REFUSE); }} className="candidat-btn" style={{ background: "#F3F4F6", color: "#111827" }}>
                <Wand2 size={14} /> Réinitialiser
              </button>
            </div>
            {tplSaved && <p style={{ textAlign: "center", color: "#057A55", fontWeight: 800, fontSize: 13 }}>✓ Messages enregistrés</p>}
            <div className="annonce-maria-tip">
              <Sparkles size={16} style={{ flexShrink: 0 }} />
              <p><strong>Conseil Maria IA :</strong> un message chaleureux et personnalisé augmente de 40% vos chances de fidéliser les meilleurs profils pour vos prochaines missions.</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODALE DÉCISION ─── */}
      {deciding && (
        <div className="annonce-modal-overlay" onClick={() => setDeciding(null)}>
          <div className="annonce-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: deciding.action === "accepte" ? "#DEF7EC" : "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {deciding.action === "accepte" ? <CheckCircle2 size={22} style={{ color: "#057A55" }} /> : <XCircle size={22} style={{ color: "#B91C1C" }} />}
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 900 }}>
                  {deciding.action === "accepte" ? "Accepter" : "Refuser"} {deciding.cand.candidat_nom}
                </h3>
                <p style={{ fontSize: 12, color: "#6B7280" }}>Le candidat recevra le message ci-dessous</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, margin: "14px 0" }}>
              <button onClick={() => setUseTemplate(true)} className={`annonce-type ${useTemplate ? "active" : ""}`} style={{ flex: 1 }}>
                <Wand2 size={13} style={{ marginRight: 4 }} /> Message automatique
              </button>
              <button onClick={() => setUseTemplate(false)} className={`annonce-type ${!useTemplate ? "active" : ""}`} style={{ flex: 1 }}>
                <PenLine size={13} style={{ marginRight: 4 }} /> Personnalisé
              </button>
            </div>

            <textarea
              value={customMsg}
              onChange={e => setCustomMsg(e.target.value)}
              rows={useTemplate ? 10 : 6}
              placeholder={useTemplate ? "" : "Écrivez votre message personnalisé..."}
              style={{ width: "100%", borderRadius: 12, border: "1.5px solid #E5E7EB", padding: 12, fontSize: 13, lineHeight: 1.6, resize: "vertical", background: useTemplate ? "#F9FAFB" : "#fff" }}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => setDeciding(null)} className="annonce-modal-cancel" style={{ flex: 1 }}>Annuler</button>
              <button
                onClick={confirmDecision}
                className="annonce-modal-submit"
                style={{ flex: 2, background: deciding.action === "accepte" ? "linear-gradient(135deg, #057A55, #10B981)" : "linear-gradient(135deg, #B91C1C, #EF4444)" }}
              >
                <Send size={15} /> Envoyer et {deciding.action === "accepte" ? "accepter" : "refuser"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CandBadge({ status }) {
  const map = {
    en_attente: { label: "En attente", bg: "#FEF3C7", color: "#92400E", icon: Clock },
    accepte: { label: "Accepté", bg: "#DEF7EC", color: "#057A55", icon: CheckCircle2 },
    refuse: { label: "Refusé", bg: "#FEE2E2", color: "#B91C1C", icon: XCircle },
  };
  const s = map[status] || map.en_attente;
  const Icon = s.icon;
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999, background: s.bg, color: s.color, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Icon size={10} /> {s.label}
    </span>
  );
}
