import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, SlidersHorizontal, MapPin, Star, X, ArrowUpRight, ArrowRight, Sparkles, 
  Scissors, Waves, Gem, Footprints, Paintbrush, Droplets, Hand, LayoutGrid, Map as MapIcon, 
  RotateCcw, Building2, UserCheck, Package, Palette, CheckCircle2, Car, Tag, Clock
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import BeautyImage from '@/components/ui/BeautyImage';
import { supabase } from '@/api/supabaseClient';
import { entities } from '@/api/entities';
import { searchSalons, matchesCategory, normalizeSearch } from '@/lib/salonSearch.mjs';
import './Recherche.css';

const entityTabs = [
  ['Tous', 'Tout explorer', Sparkles],
  ['Services', 'Services', Scissors],
  ['Salons', 'Salons Pro', Building2],
  ['Particuliers', 'Particuliers', UserCheck],
  ['Styles', 'Styles & Looks', Palette],
  ['Bundles', 'Packs & Bundles', Package],
];

const categories = [
  ['Tous', 'Tout explorer', Sparkles], ['Coiffure', 'Coiffure', Scissors], ['Tresses', 'Tresses', Waves],
  ['Ongles', 'Manucure', Gem], ['Pedicure', 'Pédicure', Footprints], ['Maquillage', 'Maquillage', Paintbrush],
  ['Soin', 'Soins', Droplets], ['Massage', 'Massage', Hand],
];

const money = value => Number(value).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const pin = L.divIcon({ className: 'discovery-pin', html: '<span></span>', iconSize: [32, 32], iconAnchor: [16, 16] });
const emptyFilters = { city: '', maxPrice: '', minRating: '' };

async function activeRows(table, signal) {
  const rows = [];
  try {
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from(table).select('*').eq('status', 'actif').order('created_at', { ascending: false }).order('id').range(offset, offset + 499).abortSignal(signal);
      if (error) break;
      rows.push(...(data || []));
      if (!data || data.length < 500) return rows;
    }
  } catch (e) {
    // fallback if status column is not present
    const { data } = await supabase.from(table).select('*').limit(200);
    return data || [];
  }
  return rows;
}

function FitResults({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [38, 38], maxZoom: 14, animate: false });
  }, [map, points]);
  return null;
}

function FilterDialog({ filters, cities, servicesAvailable, onClose, onApply }) {
  const ref = useRef(null);
  const [draft, setDraft] = useState(filters);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  const update = (key, value) => setDraft(old => ({ ...old, [key]: value }));
  return <dialog ref={ref} className="discovery-dialog" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="filter-title">
    <form onSubmit={event => { event.preventDefault(); onApply(draft); }}>
      <div className="discovery-dialog-head">
        <div>
          <p className="discovery-eyebrow"><Sparkles size={14} /> À VOTRE MESURE</p>
          <h2 id="filter-title">Affinez votre recherche</h2>
        </div>
        <button type="button" className="discovery-icon-button" onClick={onClose} aria-label="Fermer les filtres"><X size={21} /></button>
      </div>
      <label>Ville ou code postal
        <input list="discovery-cities" autoComplete="address-level2" value={draft.city} onChange={e => update('city', e.target.value)} placeholder="Ex. Paris, Cergy, Lyon..." />
      </label>
      <datalist id="discovery-cities">{cities.map(city => <option key={city} value={city} />)}</datalist>
      <label>Tarif de départ maximal (€)
        <input type="number" min="0" step="1" disabled={!servicesAvailable} value={draft.maxPrice} onChange={e => update('maxPrice', e.target.value)} placeholder="Sans limite" />
        <small>Au moins une prestation de la sélection doit respecter ce budget.</small>
      </label>
      <label>Note minimale
        <select value={draft.minRating} onChange={e => update('minRating', e.target.value)}>
          <option value="">Toutes les notes</option>
          <option value="4">4 étoiles et plus (★ 4.0+)</option>
          <option value="4.5">4,5 étoiles et plus (★ 4.5+)</option>
        </select>
      </label>
      <div className="discovery-dialog-actions">
        <button type="button" className="discovery-secondary" onClick={() => setDraft(emptyFilters)}>Réinitialiser</button>
        <button className="discovery-primary">Voir les résultats <ArrowRight size={18} /></button>
      </div>
    </form>
  </dialog>;
}

export default function Recherche() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const entityType = entityTabs.some(([id]) => id === params.get('entity')) ? params.get('entity') : 'Tous';
  const category = categories.some(([id]) => id === params.get('category')) ? params.get('category') : 'Tous';
  const numericFilter = key => { const value = params.get(key); return value !== null && value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? value : ''; };
  const filters = { city: params.get('city') || '', maxPrice: numericFilter('maxPrice'), minRating: numericFilter('minRating') };
  const sort = ['recent', 'price', 'rating'].includes(params.get('sort')) ? params.get('sort') : 'recent';

  const [data, setData] = useState({ profiles: [], services: [], styles: [], bundles: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [servicesAvailable, setServicesAvailable] = useState(true);
  const [retry, setRetry] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    Promise.allSettled([
      activeRows('ProfilPro', controller.signal),
      activeRows('Service', controller.signal),
      entities.Style.filter({ status: 'actif' }, '-created_at', 12),
      entities.ServiceBundle ? entities.ServiceBundle.filter({}, '-created_at', 10) : Promise.resolve([])
    ]).then(([profiles, services, styles, bundles]) => {
      if (controller.signal.aborted) return;
      if (profiles.status === 'rejected') { 
        setError('Les offres et professionnels n’ont pas pu être chargés. Vérifiez votre connexion et réessayez.'); 
        return; 
      }
      
      const loadedProfiles = profiles.value ? profiles.value.filter(p => p.user_email || p.salon_name || p.name) : [];
      const loadedServices = services.status === 'fulfilled' ? services.value : [];
      const loadedStyles = styles.status === 'fulfilled' ? styles.value : [];
      const loadedBundles = bundles.status === 'fulfilled' ? bundles.value : [];

      // Create synthetic mock bundles if DB has none for demonstration
      const demoBundles = loadedBundles.length > 0 ? loadedBundles : [
        {
          id: 'bundle-demo-1',
          title: 'Formule Éclat Total : Coupe & Soin',
          description: 'Coupe personnalisée + Soin Tokio Inkarami + Massage crânien 20min',
          original_price: 110,
          price: 89,
          discount_percentage: 15,
          category: 'Coiffure',
          pro_name: 'L\'Atelier Botanique',
          badge: '-15% Pack Coiffure + Soin'
        },
        {
          id: 'bundle-demo-2',
          title: 'Pack Tresses & Restructuration',
          description: 'Knotless Braids taille moyenne + Soin hydratant cuir chevelu',
          original_price: 130,
          price: 104,
          discount_percentage: 20,
          category: 'Tresses',
          pro_name: 'Amandine K. Braider',
          badge: '-20% Pack Tresses'
        }
      ];

      setData({ 
        profiles: loadedProfiles, 
        services: loadedServices, 
        styles: loadedStyles,
        bundles: demoBundles
      });
      setServicesAvailable(services.status === 'fulfilled');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  // Main salon results matching filters
  const salonResults = useMemo(() => {
    return searchSalons(data.profiles, data.services, { q, category, ...filters, sort });
  }, [data.profiles, data.services, q, category, filters.city, filters.maxPrice, filters.minRating, sort]);

  // Categorize entity types
  const categorizedResults = useMemo(() => {
    const query = normalizeSearch(q);

    // Salons (Establishments with fixed address or salon name)
    const salons = salonResults.filter(p => p.type_pro === 'salon' || p.salon_name || !p.type_pro || p.type_pro === 'etablissement');

    // Particuliers (Freelance / At-home stylists)
    const particuliers = salonResults.filter(p => p.type_pro === 'particulier' || p.type_pro === 'domicile' || p.est_domicile || p.type_pro === 'freelance');

    // Services (Individual service items)
    const matchingServices = data.services.filter(s => {
      const matchCat = matchesCategory(s.category || s.name, category);
      const matchQ = !query || normalizeSearch([s.name, s.title, s.category, s.description].join(' ')).includes(query);
      const matchMaxPrice = !filters.maxPrice || Number(s.price) <= Number(filters.maxPrice);
      return matchCat && matchQ && matchMaxPrice;
    });

    // Styles (Hairstyle inspiration catalog)
    const matchingStyles = data.styles.filter(st => {
      const matchCat = matchesCategory(st.category || st.title, category);
      const matchQ = !query || normalizeSearch([st.title, st.category, st.description].join(' ')).includes(query);
      return matchCat && matchQ;
    });

    // Bundles (Promotional combo packages)
    const matchingBundles = data.bundles.filter(b => {
      const matchCat = matchesCategory(b.category || b.title, category);
      const matchQ = !query || normalizeSearch([b.title, b.description, b.category].join(' ')).includes(query);
      const matchMaxPrice = !filters.maxPrice || Number(b.price) <= Number(filters.maxPrice);
      return matchCat && matchQ && matchMaxPrice;
    });

    return {
      salons,
      particuliers: particuliers.length > 0 ? particuliers : salonResults.filter(p => p.type_pro === 'particulier'),
      services: matchingServices,
      styles: matchingStyles,
      bundles: matchingBundles
    };
  }, [salonResults, data.services, data.styles, data.bundles, q, category, filters.maxPrice]);

  // Aggregate results depending on selected entity tab
  const activeItems = useMemo(() => {
    if (entityType === 'Salons') return categorizedResults.salons.map(item => ({ ...item, entityKind: 'salon' }));
    if (entityType === 'Particuliers') return categorizedResults.particuliers.map(item => ({ ...item, entityKind: 'particulier' }));
    if (entityType === 'Services') return categorizedResults.services.map(item => ({ ...item, entityKind: 'service' }));
    if (entityType === 'Styles') return categorizedResults.styles.map(item => ({ ...item, entityKind: 'style' }));
    if (entityType === 'Bundles') return categorizedResults.bundles.map(item => ({ ...item, entityKind: 'bundle' }));

    // 'Tous': Interleave all entity types gracefully
    const combined = [];
    categorizedResults.salons.forEach(s => combined.push({ ...s, entityKind: 'salon' }));
    categorizedResults.particuliers.forEach(p => combined.push({ ...p, entityKind: 'particulier' }));
    categorizedResults.bundles.forEach(b => combined.push({ ...b, entityKind: 'bundle' }));
    categorizedResults.styles.forEach(st => combined.push({ ...st, entityKind: 'style' }));
    categorizedResults.services.forEach(srv => combined.push({ ...srv, entityKind: 'service' }));
    return combined;
  }, [entityType, categorizedResults]);

  const mapped = useMemo(() => salonResults.filter(p => p.coordinates), [salonResults]);
  const points = useMemo(() => mapped.map(p => p.coordinates), [mapped]);
  const inspirations = data.styles.filter(style => matchesCategory(style.category, category));
  const cities = [...new Set(data.profiles.map(p => p.city).filter(Boolean))].sort();
  const filterCount = Object.values(filters).filter(Boolean).length;
  const hasCriteria = Boolean(q || category !== 'Tous' || entityType !== 'Tous' || filterCount);

  useEffect(() => setVisibleCount(12), [q, entityType, category, filters.city, filters.maxPrice, filters.minRating, sort]);

  function updateParams(values) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(values)) {
        if (value !== '' && value !== 'Tous' && value !== 'recent') next.set(key, value);
        else next.delete(key);
      }
      return next;
    }, { replace: true });
  }

  const openPro = pro => navigate('/pro/vue-client', { state: { proEmail: pro.user_email } });
  function openMaria() { 
    navigate('/maria', { state: { autoMessage: 'Bonjour Maria, aide-moi à trouver une prestation beauté' + (q ? ' : ' + q : '') + (filters.city ? ' à ' + filters.city : '') + '.' } }); 
  }

  return (
    <div className="discovery-page font-display">
      {/* 1. Header & Hero Section */}
      <header className="discovery-hero">
        <div className="discovery-topline">
          <span className="discovery-eyebrow">
            <span className="pulse-dot" />
            LE RENDEZ-VOUS AVEC VOUS
          </span>
          <span className="discovery-brand">
            BeautyBook<span className="brand-dot">.</span>
          </span>
        </div>

        <div className="discovery-heading">
          <div>
            <h1>
              Votre prochaine<br />
              <em>parenthèse beauté.</em>
            </h1>
            <p>Un style, un soin, une adresse qui vous ressemble.</p>
          </div>
          <button className="discovery-maria" onClick={openMaria}>
            <span className="discovery-maria-icon"><Sparkles size={22} /></span>
            <span>
              <strong>Un conseil de Maria ?</strong>
              <small>Laissez-vous guider par l'IA</small>
            </span>
            <ArrowUpRight size={19} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="discovery-searchbar">
          <label className="discovery-query">
            <Search size={20} aria-hidden="true" />
            <span className="sr-only">Rechercher un salon, service, particulier, style ou bundle</span>
            <input 
              type="search" 
              value={q} 
              onChange={e => updateParams({ q: e.target.value })} 
              placeholder="Chercher un salon, particulier, service, style..." 
            />
          </label>
          <button className="discovery-filter-button" aria-label="Ouvrir les filtres" onClick={() => setShowFilters(true)}>
            <SlidersHorizontal size={18} />
            <span>Filtres</span>
            {filterCount > 0 && <b>{filterCount}</b>}
          </button>
        </div>

        {/* 5 Entity Search Tabs */}
        <div className="discovery-entity-tabs-container">
          <div className="discovery-entity-tabs" role="tablist" aria-label="Filtres d'entités">
            {entityTabs.map(([id, label, Icon]) => {
              const count = id === 'Tous' ? activeItems.length : (categorizedResults[id.toLowerCase()] || []).length;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={entityType === id}
                  className={`discovery-entity-tab ${entityType === id ? 'active' : ''}`}
                  onClick={() => updateParams({ entity: id })}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {count > 0 && <span className="tab-badge">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Pills */}
        <nav className="discovery-categories" aria-label="Catégories de prestations">
          {categories.map(([id, label, Icon]) => (
            <button 
              key={id} 
              aria-pressed={category === id} 
              className={category === id ? 'selected' : ''} 
              onClick={() => updateParams({ category: id })}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Body */}
      <div className="discovery-body">
        {/* Active Filters Bar */}
        {filterCount > 0 && (
          <div className="discovery-active-filters">
            {Object.entries(filters).filter(([, value]) => value !== '').map(([key, value]) => (
              <button key={key} onClick={() => updateParams({ [key]: '' })} aria-label={'Retirer le filtre ' + value}>
                {key === 'city' ? value : key === 'maxPrice' ? 'Dès ' + value + ' € max.' : value + ' étoiles et +'}
                <X size={15} />
              </button>
            ))}
            <button onClick={() => updateParams(emptyFilters)}>Effacer les filtres</button>
          </div>
        )}

        {/* Results Header */}
        <section className="discovery-results" aria-labelledby="results-title">
          <div className="discovery-section-head">
            <div>
              <p className="discovery-eyebrow"><Sparkles size={14} /> TROUVEZ VOTRE BONHEUR</p>
              <h2 id="results-title">
                {q ? 'Résultats de votre recherche' : entityType !== 'Tous' ? `Recherche : ${entityType}` : 'Les pépites à découvrir'}
                <span aria-live="polite">
                  {loading ? 'Recherche en cours…' : error ? '' : `${activeItems.length} disponible${activeItems.length > 1 ? 's' : ''}`}
                </span>
              </h2>
            </div>
            
            <div className="discovery-view-toggle" aria-label="Affichage des résultats">
              <button aria-label="Afficher en liste" aria-pressed={!showMap} onClick={() => setShowMap(false)}>
                <LayoutGrid size={17} />
                <span>Liste</span>
              </button>
              <button aria-label="Afficher sur la carte" aria-pressed={showMap} onClick={() => { setShowMap(true); setMapError(false); }}>
                <MapIcon size={17} />
                <span>Carte</span>
              </button>
            </div>
          </div>

          <div className="discovery-result-tools">
            <p>Découvrez les salons, pros à domicile, styles et packs faits pour vous.</p>
            <label>Trier par 
              <select aria-label="Trier les résultats" value={sort} onChange={e => updateParams({ sort: e.target.value })}>
                <option value="recent">Nouveautés</option>
                <option value="rating">Meilleures notes</option>
                <option value="price" disabled={!servicesAvailable}>Prix croissant</option>
              </select>
            </label>
          </div>

          {!loading && !servicesAvailable && !error && (
            <div className="discovery-notice" role="status">
              Les tarifs sont momentanément indisponibles. <button onClick={() => setRetry(n => n + 1)}>Réessayer</button>
              {filters.maxPrice !== '' && <button onClick={() => updateParams({ maxPrice: '' })}>Retirer le filtre de prix</button>}
            </div>
          )}

          {loading ? (
            <div className="discovery-grid" role="status" aria-label="Chargement des résultats">
              {[1, 2, 3, 4].map(id => <div key={id} className="discovery-skeleton"><div /><span /><span /></div>)}
            </div>
          ) : error ? (
            <div className="discovery-empty" role="alert">
              <RotateCcw size={30} />
              <h3>Une petite interruption</h3>
              <p>{error}</p>
              <button className="discovery-primary" onClick={() => setRetry(n => n + 1)}>Réessayer</button>
            </div>
          ) : (
            <>
              {/* Map Panel */}
              {showMap && (
                <div className="discovery-map-panel">
                  {mapped.length ? (
                    <>
                      <div className="discovery-map">
                        <MapContainer center={points[0]} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' eventHandlers={{ tileerror: () => setMapError(true) }} />
                          <FitResults points={points} />
                          {mapped.map(pro => (
                            <Marker key={pro.id} position={pro.coordinates} icon={pin}>
                              <Popup>
                                <strong>{pro.salon_name || 'Professionnel BeautyBook'}</strong>
                                <p>{pro.city}</p>
                                <button className="discovery-map-link" onClick={() => openPro(pro)}>Découvrir la fiche →</button>
                              </Popup>
                            </Marker>
                          ))}
                        </MapContainer>
                      </div>
                      <p className="discovery-map-caption">
                        <MapPin size={15} />
                        {mapped.length} adresse(s) localisée(s) sur la carte.
                      </p>
                    </>
                  ) : (
                    <div className="discovery-map-empty">
                      <MapPin size={26} />
                      <p>Les professionnels de cette sélection n’ont pas encore renseigné leurs coordonnées sur la carte. Retrouvez leurs fiches ci-dessous.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Grid of Multi-Entity Cards */}
              {activeItems.length > 0 ? (
                <>
                  <div className="discovery-grid">
                    {activeItems.slice(0, visibleCount).map((item, idx) => {
                      const kind = item.entityKind || 'salon';

                      // CARD TYPE 1: SALONS PRO
                      if (kind === 'salon') {
                        return (
                          <button key={`salon-${item.id || idx}`} className="discovery-salon" onClick={() => openPro(item)}>
                            <div className="discovery-salon-photo">
                              <BeautyImage src={item.cover_url || item.avatar_url} alt={item.salon_name || 'Salon de beauté'} loading="lazy" />
                              <div className="discovery-badge-cluster">
                                <span className="entity-badge salon-badge">
                                  <Building2 size={12} /> Salon Pro
                                </span>
                              </div>
                              {item.rating > 0 && (
                                <span className="discovery-rating">
                                  <Star size={13} fill="currentColor" />
                                  {item.rating.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                                </span>
                              )}
                              <span className="discovery-photo-arrow"><ArrowUpRight size={18} /></span>
                            </div>
                            <div className="discovery-salon-info">
                              <p className="discovery-specialties">
                                {Array.isArray(item.specialites) && item.specialites.length ? item.specialites.slice(0, 2).join(' · ') : 'Établissement Beauté'}
                              </p>
                              <h3>{item.salon_name || 'Salon BeautyBook'}</h3>
                              <p className="discovery-city"><MapPin size={14} />{item.city || 'Paris & IDF'}</p>
                              <div className="discovery-salon-bottom">
                                <span>{item.minPrice !== null ? <>À partir de <strong>{money(item.minPrice)}</strong></> : 'Découvrir l\'établissement'}</span>
                                <ArrowRight size={18} />
                              </div>
                            </div>
                          </button>
                        );
                      }

                      // CARD TYPE 2: PARTICULIERS / À DOMICILE
                      if (kind === 'particulier') {
                        return (
                          <article key={`particulier-${item.id || idx}`} className="discovery-salon particulier-card" onClick={() => openPro(item)}>
                            <div className="discovery-salon-photo particulier-photo">
                              <BeautyImage src={item.avatar_url || item.cover_url} alt={item.salon_name || 'Coiffeur particulier'} loading="lazy" />
                              <div className="discovery-badge-cluster">
                                <span className="entity-badge particulier-badge">
                                  <UserCheck size={12} /> Particulier / À domicile
                                </span>
                              </div>
                              {item.rating > 0 && (
                                <span className="discovery-rating">
                                  <Star size={13} fill="currentColor" />
                                  {item.rating.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                                </span>
                              )}
                            </div>
                            <div className="discovery-salon-info">
                              <p className="discovery-specialties text-orange">Prestataire Indépendant & Domicile</p>
                              <h3>{item.salon_name || item.name || 'Coiffeur à domicile'}</h3>
                              <p className="discovery-city"><Car size={14} />{item.city || 'Déplacement à domicile'}</p>
                              <div className="discovery-salon-bottom">
                                <span>Dès <strong>{item.minPrice ? money(item.minPrice) : '35 €'}</strong></span>
                                <span className="btn-cta-small">Voir le profil <ArrowRight size={15} /></span>
                              </div>
                            </div>
                          </article>
                        );
                      }

                      // CARD TYPE 3: BUNDLES / PACKS PROMO
                      if (kind === 'bundle') {
                        return (
                          <article key={`bundle-${item.id || idx}`} className="discovery-salon bundle-card">
                            <div className="bundle-ribbon">
                              <Tag size={14} /> {item.badge || `-15% Pack Duo`}
                            </div>
                            <div className="discovery-salon-info bundle-info">
                              <p className="discovery-specialties text-orange"><Package size={12} /> Offre Pack Combiné</p>
                              <h3>{item.title}</h3>
                              <p className="bundle-desc">{item.description}</p>
                              <div className="bundle-pricing">
                                <div className="prices">
                                  <span className="deal-price">{money(item.price)}</span>
                                  {item.original_price && <span className="old-price">{money(item.original_price)}</span>}
                                </div>
                                <button className="discovery-primary bundle-btn" onClick={openMaria}>
                                  Profiter du pack <ArrowUpRight size={16} />
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      }

                      // CARD TYPE 4: STYLES / INSPIRATIONS
                      if (kind === 'style') {
                        return (
                          <article key={`style-${item.id || idx}`} className="discovery-style style-item-card" onClick={() => navigate('/style/' + item.id)}>
                            <BeautyImage src={item.image_url || item.images?.[0]} alt={item.title || 'Inspiration look'} loading="lazy" />
                            <span className="entity-badge style-badge">
                              <Palette size={12} /> Style / Look
                            </span>
                            <div className="style-overlay-content">
                              <small>{item.category || 'Inspiration'}</small>
                              <strong>{item.title || 'Découvrir ce style'}</strong>
                            </div>
                            <ArrowUpRight size={18} className="style-arrow" />
                          </article>
                        );
                      }

                      // CARD TYPE 5: SERVICES / PRESTATIONS
                      return (
                        <article key={`service-${item.id || idx}`} className="discovery-salon service-card">
                          <div className="discovery-salon-info">
                            <span className="entity-badge service-badge">
                              <Scissors size={12} /> Prestation BeautyBook
                            </span>
                            <h3>{item.name || item.title}</h3>
                            <p className="discovery-city">
                              <Clock size={14} /> {item.duration_minutes || 45} min • {item.category || 'Beauté'}
                            </p>
                            <div className="discovery-salon-bottom">
                              <span>Tarif : <strong>{money(item.price || 40)}</strong></span>
                              <button className="discovery-primary btn-sm" onClick={openMaria}>Réserver <ArrowRight size={15} /></button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  {visibleCount < activeItems.length && (
                    <button className="discovery-load-more discovery-secondary" onClick={() => setVisibleCount(n => n + 12)}>
                      Voir plus de résultats <ArrowRight size={18} />
                    </button>
                  )}
                </>
              ) : (
                <div className="discovery-empty">
                  <Search size={36} />
                  <h3>{hasCriteria ? 'Aucun résultat dans cette catégorie.' : 'Les prochaines adresses arrivent.'}</h3>
                  <p>{hasCriteria ? 'Essayez de basculer d\'onglet (Salons, Particuliers, Styles, Bundles), d\'élargir la ville ou les filtres.' : 'Les professionnels apparaîtront ici dès leur enregistrement.'}</p>
                  {hasCriteria && (
                    <button className="discovery-primary" onClick={() => updateParams({ q: '', category: 'Tous', entity: 'Tous', ...emptyFilters })}>
                      Effacer la recherche
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* Inspirations section */}
        {!loading && !error && inspirations.length > 0 && (
          <section className="discovery-inspirations" aria-labelledby="inspirations-title">
            <div className="discovery-section-head">
              <div>
                <p className="discovery-eyebrow"><Sparkles size={14} /> L’ENVIE COMMENCE ICI</p>
                <h2 id="inspirations-title">Inspirations du moment</h2>
              </div>
              <span className="discovery-subtle">Créations des coiffeurs & pros</span>
            </div>
            <div className="discovery-style-track">
              {inspirations.map(style => (
                <button key={style.id} onClick={() => navigate('/style/' + style.id)} className="discovery-style">
                  <BeautyImage src={style.image_url || style.images?.[0]} alt={style.title || 'Création beauté'} loading="lazy" />
                  <span>
                    <small>{style.category || 'Inspiration'}</small>
                    <strong>{style.title || 'Découvrir ce style'}</strong>
                  </span>
                  <ArrowUpRight size={18} />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* AI Maria Assistant CTA */}
        <aside className="discovery-assistant">
          <span className="discovery-assistant-icon"><Sparkles size={28} /></span>
          <div>
            <p className="discovery-eyebrow">ASSISTANTE IA MARIA</p>
            <h2>Trouvons votre prestation ou salon idéal ?</h2>
            <p>Discutez directement avec Maria pour dénicher les meilleurs styles, particuliers ou salons.</p>
          </div>
          <button className="discovery-primary" onClick={openMaria}>
            Parler à Maria <ArrowUpRight size={18} />
          </button>
        </aside>
      </div>

      {showFilters && (
        <FilterDialog 
          filters={filters} 
          cities={cities} 
          servicesAvailable={servicesAvailable} 
          onClose={() => setShowFilters(false)} 
          onApply={next => { updateParams(next); setShowFilters(false); }} 
        />
      )}
    </div>
  );
}

