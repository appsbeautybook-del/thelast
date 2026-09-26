import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, SlidersHorizontal, MapPin, Star, X, ArrowUpRight, ArrowRight, Sparkles,
  Scissors, Waves, Gem, Footprints, Paintbrush, Droplets, Hand, LayoutGrid,
  Briefcase, Clock, Euro, Users, Plus, ChevronRight, Eye, CalendarDays, BadgeCheck
} from "lucide-react";
import BeautyImage from "@/components/ui/BeautyImage";
import { getAnnonces, getCategories, getTypesMission } from "@/lib/annonces";
import "./Annonces.css";

const categoryIcons = { Scissors, Waves, Gem, Paintbrush, Droplets, Hand, Sparkles };

const money = (v) => Number(v || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function AnnonceCard({ annonce, onClick }) {
  const cat = getCategories().find(c => c.id === annonce.category);
  const Icon = categoryIcons[cat?.icon] || Briefcase;
  const typeMission = getTypesMission().find(t => t.id === annonce.type_mission);
  const placesRestantes = (annonce.places || 1) - (annonce.places_prises || 0);

  return (
    <article className="annonce-card" onClick={onClick}>
      <div className="annonce-card-top">
        <div className="annonce-salon">
          <div className="annonce-avatar">
            {annonce.salon_avatar ? (
              <BeautyImage src={annonce.salon_avatar} alt={annonce.salon_name} className="w-full h-full object-cover" />
            ) : (
              <span>{(annonce.salon_name || "S")[0]}</span>
            )}
          </div>
          <div className="annonce-salon-info">
            <p className="annonce-salon-name">
              {annonce.salon_name}
              <BadgeCheck size={14} className="annonce-verified" />
            </p>
            <p className="annonce-salon-meta">
              <MapPin size={12} /> {annonce.salon_city}
              {annonce.salon_rating > 0 && (
                <span className="annonce-rating"><Star size={12} fill="currentColor" /> {annonce.salon_rating}</span>
              )}
            </p>
          </div>
        </div>
        <span className="annonce-time">{timeAgo(annonce.created_at)}</span>
      </div>

      <div className="annonce-card-body">
        <div className="annonce-icon-badge">
          <Icon size={20} />
        </div>
        <div className="annonce-main">
          <h3>{annonce.title}</h3>
          <div className="annonce-tags">
            {typeMission && <span className="annonce-tag annonce-tag-type">{typeMission.label}</span>}
            {cat && <span className="annonce-tag">{cat.label}</span>}
            {placesRestantes > 0 && (
              <span className="annonce-tag annonce-tag-places">
                <Users size={11} /> {placesRestantes} place{placesRestantes > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <p className="annonce-desc">{annonce.description?.slice(0, 120)}...</p>
        </div>
      </div>

      <div className="annonce-card-foot">
        <div className="annonce-price">
          <Euro size={14} />
          <strong>{money(annonce.remuneration)}</strong>
          <span>/{annonce.remuneration_type === "jour" ? "jour" : "mission"}</span>
        </div>
        <div className="annonce-foot-meta">
          <span className="annonce-views"><Eye size={12} /> {annonce.vues || 0}</span>
          <span className="annonce-cta">Voir <ArrowRight size={14} /></span>
        </div>
      </div>
    </article>
  );
}

export default function Annonces() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState("tous");
  const [activeType, setActiveType] = useState("tous");
  const [showFilters, setShowFilters] = useState(false);

  const annonces = useMemo(() => getAnnonces(), []);
  const categories = getCategories();
  const types = getTypesMission();

  const filtered = useMemo(() => {
    return annonces.filter(a => {
      if (activeCat !== "tous" && a.category !== activeCat) return false;
      if (activeType !== "tous" && a.type_mission !== activeType) return false;
      if (q.trim()) {
        const needle = q.toLowerCase();
        const hay = `${a.title} ${a.description} ${a.salon_name} ${a.salon_city} ${(a.competences || []).join(" ")}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [annonces, q, activeCat, activeType]);

  return (
    <div className="annonces-page">
      {/* ── Hero inspiré Recherche ── */}
      <header className="discovery-hero">
        <div className="discovery-topline">
          <span className="discovery-eyebrow">
            <span className="pulse-dot" />
            OPPORTUNITÉS PRO
          </span>
          <span className="discovery-brand">
            BeautyBook<span className="brand-dot">.</span>
          </span>
        </div>

        <div className="discovery-heading">
          <div>
            <h1>
              Trouvez votre<br />
              <em>prochaine mission.</em>
            </h1>
            <p>Les salons recrutent, les talents répondent.</p>
          </div>
          <button className="discovery-maria" onClick={() => navigate("/annonces/nouvelle")}>
            <span className="discovery-maria-icon"><Plus size={22} /></span>
            <span>
              <strong>Publier une annonce</strong>
              <small>Salons : recrutez en 2 min</small>
            </span>
            <ArrowUpRight size={19} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="discovery-searchbar">
          <label className="discovery-query">
            <Search size={20} aria-hidden="true" />
            <span className="sr-only">Rechercher une annonce</span>
            <input
              type="search"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Métier, compétence, ville, salon..."
            />
          </label>
          <button className="discovery-filter-button" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal size={18} />
            <span>Filtres</span>
          </button>
        </div>

        {/* Category pills */}
        <div className="annonces-cats">
          <button
            className={`annonce-pill ${activeCat === "tous" ? "active" : ""}`}
            onClick={() => setActiveCat("tous")}
          >
            <Sparkles size={14} /> Tous
          </button>
          {categories.map(cat => {
            const Icon = categoryIcons[cat.icon] || Briefcase;
            return (
              <button
                key={cat.id}
                className={`annonce-pill ${activeCat === cat.id ? "active" : ""}`}
                onClick={() => setActiveCat(cat.id)}
              >
                <Icon size={14} /> {cat.label}
              </button>
            );
          })}
        </div>

        {/* Type mission pills */}
        <div className="annonces-types">
          <button
            className={`annonce-type ${activeType === "tous" ? "active" : ""}`}
            onClick={() => setActiveType("tous")}
          >
            Tous types
          </button>
          {types.map(t => (
            <button
              key={t.id}
              className={`annonce-type ${activeType === t.id ? "active" : ""}`}
              onClick={() => setActiveType(t.id)}
              title={t.desc}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Results ── */}
      <main className="annonces-list">
        <div className="annonces-count">
          <Briefcase size={14} />
          <span><strong>{filtered.length}</strong> annonce{filtered.length > 1 ? "s" : ""} disponible{filtered.length > 1 ? "s" : ""}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="annonces-empty">
            <div className="annonces-empty-icon"><Search size={28} /></div>
            <p className="annonces-empty-title">Aucune annonce trouvée</p>
            <p className="annonces-empty-desc">Essayez d'autres mots-clés ou catégories.</p>
          </div>
        ) : (
          filtered.map(a => (
            <AnnonceCard key={a.id} annonce={a} onClick={() => navigate(`/annonces/${a.id}`)} />
          ))
        )}
      </main>
    </div>
  );
}
