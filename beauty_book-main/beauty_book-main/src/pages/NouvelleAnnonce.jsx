import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Sparkles, Scissors, Waves, Gem, Paintbrush, Droplets, Hand,
  Briefcase, CheckCircle2, Wand2, MapPin, CalendarDays, Euro, Users
} from "lucide-react";
import { getCategories, getTypesMission, createAnnonce } from "@/lib/annonces";
import "./Annonces.css";

const categoryIcons = { Scissors, Waves, Gem, Paintbrush, Droplets, Hand, Sparkles };

export default function NouvelleAnnonce() {
  const navigate = useNavigate();
  const categories = getCategories();
  const types = getTypesMission();

  const [form, setForm] = useState({
    title: "",
    category: "coiffure",
    type_mission: "extra",
    description: "",
    competences: "",
    date_debut: "",
    date_fin: "",
    remuneration: "",
    remuneration_type: "jour",
    places: 1,
    adresse: "",
    salon_name: "",
    salon_city: "",
  });
  const [generating, setGenerating] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Maria IA : génère une description attractive ──
  const generateWithAI = async () => {
    if (!form.title.trim()) { alert("Donnez d'abord un titre à votre annonce"); return; }
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1200));
    const cat = categories.find(c => c.id === form.category)?.label || "beauté";
    const type = types.find(t => t.id === form.type_mission)?.label || "mission";
    const generated = `🌟 ${form.salon_name || "Notre salon"} recrute !\n\nNous recherchons un(e) expert(e) en ${cat.toLowerCase()} pour une ${type.toLowerCase()}${form.date_debut ? ` à partir du ${new Date(form.date_debut + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : ""}.\n\n✨ Ce que nous offrons :\n• Une équipe accueillante et passionnée\n• Une clientèle fidèle et agréable\n• ${form.remuneration ? `Une rémunération attractive de ${form.remuneration}€/${form.remuneration_type === "jour" ? "jour" : "mission"}` : "Une rémunération attractive"}\n\n💪 Ce que nous recherchons :\n• Professionnalisme et ponctualité\n• Maîtrise des techniques de ${cat.toLowerCase()}\n• Bon relationnel client\n\nRejoignez-nous pour cette belle aventure !`;
    set("description", generated);
    setGenerating(false);
  };

  const handleSubmit = () => {
    if (!form.title.trim()) { alert("Le titre est requis"); return; }
    if (!form.description.trim()) { alert("La description est requise"); return; }
    if (!form.salon_name.trim()) { alert("Le nom du salon est requis"); return; }
    const annonce = createAnnonce({
      ...form,
      competences: form.competences.split(",").map(s => s.trim()).filter(Boolean),
      remuneration: Number(form.remuneration) || 0,
      places: Number(form.places) || 1,
      salon_email: (() => { try { return JSON.parse(localStorage.getItem("bb_session") || "{}").email || "salon@beautybook.app"; } catch { return "salon@beautybook.app"; } })(),
      salon_rating: 0,
    });
    navigate(`/annonces/${annonce.id}`);
  };

  return (
    <div className="annonces-page">
      <header className="discovery-hero">
        <div className="discovery-topline">
          <button
            onClick={() => navigate(-1)}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontWeight: 800, fontSize: 14 }}
          >
            <ArrowLeft size={18} /> Retour
          </button>
          <span className="discovery-brand">BeautyBook<span className="brand-dot">.</span></span>
        </div>
        <div className="discovery-heading" style={{ marginTop: 12 }}>
          <div>
            <p className="discovery-eyebrow"><Sparkles size={14} /> RECRUTEMENT PRO</p>
            <h1>Publier une<br /><em>annonce.</em></h1>
            <p>Trouvez le talent parfait en quelques minutes.</p>
          </div>
        </div>
      </header>

      <div className="annonce-form">
        {/* Salon */}
        <div className="annonce-section">
          <p className="annonce-section-title"><Briefcase size={13} /> Votre salon</p>
          <div className="annonce-form-grid">
            <div className="annonce-field">
              <label>Nom du salon *</label>
              <input value={form.salon_name} onChange={e => set("salon_name", e.target.value)} placeholder="Ex. Mamara_hair 91" />
            </div>
            <div className="annonce-field">
              <label>Ville *</label>
              <input value={form.salon_city} onChange={e => set("salon_city", e.target.value)} placeholder="Ex. Athis-Mons" />
            </div>
          </div>
          <div className="annonce-field" style={{ marginTop: 12 }}>
            <label>Adresse</label>
            <input value={form.adresse} onChange={e => set("adresse", e.target.value)} placeholder="54 Rue de Juvisy, 91200 Athis-Mons" />
          </div>
        </div>

        {/* Mission */}
        <div className="annonce-section">
          <p className="annonce-section-title"><Sparkles size={13} /> La mission</p>
          <div className="annonce-field">
            <label>Titre de l'annonce *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ex. Braideuse experte pour samedi chargé" />
          </div>

          <div className="annonce-field">
            <label>Catégorie</label>
            <div className="annonce-chip-row">
              {categories.map(cat => {
                const Icon = categoryIcons[cat.icon] || Briefcase;
                return (
                  <button
                    key={cat.id}
                    className={`annonce-chip ${form.category === cat.id ? "active" : ""}`}
                    onClick={() => set("category", cat.id)}
                  >
                    <Icon size={14} /> {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="annonce-field">
            <label>Type de mission</label>
            <div className="annonce-chip-row">
              {types.map(t => (
                <button
                  key={t.id}
                  className={`annonce-chip orange ${form.type_mission === t.id ? "active" : ""}`}
                  onClick={() => set("type_mission", t.id)}
                  title={t.desc}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="annonce-field">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ margin: 0 }}>Description *</label>
              <button
                onClick={generateWithAI}
                disabled={generating}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #7C3AED, #A855F7)", color: "#fff", border: "none", borderRadius: 999, padding: "7px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
              >
                {generating ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Wand2 size={13} />}
                {generating ? "Génération..." : "Générer avec Maria IA"}
              </button>
            </div>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Décrivez la mission, l'ambiance, ce que vous offrez..."
              rows={6}
            />
          </div>

          <div className="annonce-field">
            <label>Compétences (séparées par des virgules)</label>
            <input value={form.competences} onChange={e => set("competences", e.target.value)} placeholder="Box braids, Knotless, Pose rapide" />
          </div>
        </div>

        {/* Planning & rémunération */}
        <div className="annonce-section">
          <p className="annonce-section-title"><CalendarDays size={13} /> Planning & rémunération</p>
          <div className="annonce-form-grid">
            <div className="annonce-field">
              <label>Date de début</label>
              <input type="date" value={form.date_debut} onChange={e => set("date_debut", e.target.value)} />
            </div>
            <div className="annonce-field">
              <label>Date de fin</label>
              <input type="date" value={form.date_fin} onChange={e => set("date_fin", e.target.value)} />
            </div>
            <div className="annonce-field">
              <label>Rémunération (€)</label>
              <input type="number" value={form.remuneration} onChange={e => set("remuneration", e.target.value)} placeholder="180" min="0" />
            </div>
            <div className="annonce-field">
              <label>Par</label>
              <select value={form.remuneration_type} onChange={e => set("remuneration_type", e.target.value)}>
                <option value="jour">Jour</option>
                <option value="mission">Mission</option>
              </select>
            </div>
          </div>
          <div className="annonce-field" style={{ marginTop: 12 }}>
            <label>Nombre de places</label>
            <input type="number" value={form.places} onChange={e => set("places", e.target.value)} min="1" max="20" />
          </div>
        </div>

        <button className="annonce-cta-btn" onClick={handleSubmit} style={{ marginBottom: 40 }}>
          <CheckCircle2 size={18} /> Publier l'annonce
        </button>
      </div>
    </div>
  );
}
