import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, MapPin, Star, X, ArrowUpRight, ArrowRight, Sparkles, Scissors, Waves, Gem, Footprints, Paintbrush, Droplets, Hand, LayoutGrid, Map as MapIcon, RotateCcw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import BeautyImage from '@/components/ui/BeautyImage';
import { supabase } from '@/api/supabaseClient';
import { entities } from '@/api/entities';
import { searchSalons, matchesCategory } from '@/lib/salonSearch.mjs';
import './Recherche.css';

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
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from(table).select('*').eq('status', 'actif').order('created_at', { ascending: false }).order('id').range(offset, offset + 499).abortSignal(signal);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
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
      <div className="discovery-dialog-head"><div><p className="discovery-eyebrow">À VOTRE MESURE</p><h2 id="filter-title">Affinez votre recherche</h2></div><button type="button" className="discovery-icon-button" onClick={onClose} aria-label="Fermer les filtres"><X size={21} /></button></div>
      <label>Ville ou code postal<input list="discovery-cities" autoComplete="address-level2" value={draft.city} onChange={e => update('city', e.target.value)} placeholder="Ex. Cergy ou 95000" /></label>
      <datalist id="discovery-cities">{cities.map(city => <option key={city} value={city} />)}</datalist>
      <label>Tarif de départ maximal (€)<input type="number" min="0" step="1" disabled={!servicesAvailable} value={draft.maxPrice} onChange={e => update('maxPrice', e.target.value)} placeholder="Sans limite" /><small>Au moins une prestation de la catégorie doit respecter ce budget.</small></label>
      <label>Note minimale<select value={draft.minRating} onChange={e => update('minRating', e.target.value)}><option value="">Toutes les notes</option><option value="4">4 étoiles et plus</option><option value="4.5">4,5 étoiles et plus</option></select></label>
      <div className="discovery-dialog-actions"><button type="button" className="discovery-secondary" onClick={() => setDraft(emptyFilters)}>Réinitialiser</button><button className="discovery-primary">Voir les résultats<ArrowRight size={18} /></button></div>
    </form>
  </dialog>;
}
export default function Recherche() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = categories.some(([id]) => id === params.get('category')) ? params.get('category') : 'Tous';
  const numericFilter = key => { const value = params.get(key); return value !== null && value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? value : ''; };
  const filters = { city: params.get('city') || '', maxPrice: numericFilter('maxPrice'), minRating: numericFilter('minRating') };
  const sort = ['recent', 'price', 'rating'].includes(params.get('sort')) ? params.get('sort') : 'recent';
  const [data, setData] = useState({ profiles: [], services: [], styles: [] });
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [servicesAvailable, setServicesAvailable] = useState(true);
  const [retry, setRetry] = useState(0), [showFilters, setShowFilters] = useState(false), [showMap, setShowMap] = useState(false), [mapError, setMapError] = useState(false), [visibleCount, setVisibleCount] = useState(12);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    Promise.allSettled([activeRows('ProfilPro', controller.signal), activeRows('Service', controller.signal), entities.Style.filter({ status: 'actif' }, '-created_at', 12)]).then(([profiles, services, styles]) => {
      if (controller.signal.aborted) return;
      if (profiles.status === 'rejected') { setError('Les salons n’ont pas pu être chargés. Vérifiez votre connexion et réessayez.'); return; }
      setData({ profiles: profiles.value.filter(p => p.user_email), services: services.status === 'fulfilled' ? services.value : [], styles: styles.status === 'fulfilled' ? styles.value : [] });
      setServicesAvailable(services.status === 'fulfilled');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  const results = useMemo(() => searchSalons(data.profiles, data.services, { q, category, ...filters, sort }), [data.profiles, data.services, q, category, filters.city, filters.maxPrice, filters.minRating, sort]);
  const mapped = useMemo(() => results.filter(p => p.coordinates), [results]);
  const points = useMemo(() => mapped.map(p => p.coordinates), [mapped]);
  const inspirations = data.styles.filter(style => matchesCategory(style.category, category));
  const cities = [...new Set(data.profiles.map(p => p.city).filter(Boolean))].sort();
  const filterCount = Object.values(filters).filter(Boolean).length;
  const hasCriteria = Boolean(q || category !== 'Tous' || filterCount);
  useEffect(() => setVisibleCount(12), [q, category, filters.city, filters.maxPrice, filters.minRating, sort]);
  function updateParams(values) {
    setParams(previous => { const next = new URLSearchParams(previous); for (const [key, value] of Object.entries(values)) { if (value !== '' && value !== 'Tous' && value !== 'recent') next.set(key, value); else next.delete(key); } return next; }, { replace: true });
  }
  const openPro = pro => navigate('/pro/vue-client', { state: { proEmail: pro.user_email } });
  function openMaria() { navigate('/maria', { state: { autoMessage: 'Bonjour Maria, aide-moi à trouver une prestation beauté' + (q ? ' : ' + q : '') + (filters.city ? ' à ' + filters.city : '') + '.' } }); }
  return <div className="discovery-page font-display">
    <header className="discovery-hero">
      <div className="discovery-topline"><span className="discovery-eyebrow"><span />LE RENDEZ-VOUS AVEC VOUS</span><span className="discovery-brand">BeautyBook.</span></div>
      <div className="discovery-heading"><div><h1>Votre prochaine<br /><em>parenthèse beauté.</em></h1><p>Un style, un soin, une adresse qui vous ressemble.</p></div><button className="discovery-maria" onClick={openMaria}><span className="discovery-maria-icon"><Sparkles size={24} /></span><span><strong>Un conseil de Maria ?</strong><small>Laissez-vous guider</small></span><ArrowUpRight size={19} /></button></div>
      <div className="discovery-searchbar"><label className="discovery-query"><Search size={21} aria-hidden="true" /><span className="sr-only">Rechercher un salon, une prestation ou une ville</span><input type="search" value={q} onChange={e => updateParams({ q: e.target.value })} placeholder="Un salon, une prestation, une ville…" /></label><button className="discovery-filter-button" aria-label="Ouvrir les filtres" onClick={() => setShowFilters(true)}><SlidersHorizontal size={19} /><span>Filtres</span>{filterCount > 0 && <b>{filterCount}</b>}</button></div>
      <nav className="discovery-categories" aria-label="Catégories de prestations">{categories.map(([id, label, Icon]) => <button key={id} aria-pressed={category === id} className={category === id ? 'selected' : ''} onClick={() => updateParams({ category: id })}><Icon size={18} />{label}</button>)}</nav>
    </header>
    <div className="discovery-body">
      {filterCount > 0 && <div className="discovery-active-filters">{Object.entries(filters).filter(([, value]) => value !== '').map(([key, value]) => <button key={key} onClick={() => updateParams({ [key]: '' })} aria-label={'Retirer le filtre ' + value}>{key === 'city' ? value : key === 'maxPrice' ? 'Dès ' + value + ' € max.' : value + ' étoiles et +'}<X size={15} /></button>)}<button onClick={() => updateParams(emptyFilters)}>Effacer les filtres</button></div>}
      <section className="discovery-results" aria-labelledby="results-title">
        <div className="discovery-section-head"><div><p className="discovery-eyebrow">TROUVEZ VOTRE ADRESSE</p><h2 id="results-title">{q ? 'Vos résultats' : category === 'Tous' ? 'Les adresses à découvrir' : categories.find(([id]) => id === category)?.[1]}<span aria-live="polite">{loading ? 'Recherche…' : error ? '' : results.length + ' professionnel' + (results.length > 1 ? 's' : '')}</span></h2></div><div className="discovery-view-toggle" aria-label="Affichage des résultats"><button aria-label="Afficher en liste" aria-pressed={!showMap} onClick={() => setShowMap(false)}><LayoutGrid size={17} /><span>Liste</span></button><button aria-label="Afficher sur la carte" aria-pressed={showMap} onClick={() => { setShowMap(true); setMapError(false); }}><MapIcon size={17} /><span>Carte</span></button></div></div>
        <div className="discovery-result-tools"><p>Faites de votre prochain rendez-vous un moment à vous.</p><label>Trier par <select aria-label="Trier les professionnels" value={sort} onChange={e => updateParams({ sort: e.target.value })}><option value="recent">Nouveautés</option><option value="rating">Meilleures notes</option><option value="price" disabled={!servicesAvailable}>Prix croissant</option></select></label></div>
        {!loading && !servicesAvailable && !error && <div className="discovery-notice" role="status">Les tarifs sont momentanément indisponibles. <button onClick={() => setRetry(n => n + 1)}>Réessayer</button>{filters.maxPrice !== '' && <button onClick={() => updateParams({ maxPrice: '' })}>Retirer le filtre de prix</button>}</div>}
        {loading ? <div className="discovery-grid" role="status" aria-label="Chargement des salons">{[1, 2, 3].map(id => <div key={id} className="discovery-skeleton"><div /><span /><span /></div>)}</div> : error ? <div className="discovery-empty" role="alert"><RotateCcw size={30} /><h3>Une petite interruption</h3><p>{error}</p><button className="discovery-primary" onClick={() => setRetry(n => n + 1)}>Réessayer</button></div> : <>
          {showMap && <div className="discovery-map-panel">{mapped.length ? <><div className="discovery-map"><MapContainer center={points[0]} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}><TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' eventHandlers={{ tileerror: () => setMapError(true) }} /><FitResults points={points} />{mapped.map(pro => <Marker key={pro.id} position={pro.coordinates} icon={pin}><Popup><strong>{pro.salon_name || 'Professionnel BeautyBook'}</strong><p>{pro.city}</p><button className="discovery-map-link" onClick={() => openPro(pro)}>Découvrir le salon →</button></Popup></Marker>)}</MapContainer></div><p className="discovery-map-caption"><MapPin size={15} />{mapped.length} adresse(s) localisée(s) sur {results.length} résultat(s).{mapError && ' Le fond de carte est indisponible ; les fiches restent accessibles ci-dessous.'}</p></> : <div className="discovery-map-empty"><MapPin size={26} /><p>Les professionnels de cette sélection n’ont pas encore renseigné leurs coordonnées sur la carte. Retrouvez leurs fiches ci-dessous.</p></div>}</div>}
          {results.length ? <><div className="discovery-grid">{results.slice(0, visibleCount).map(pro => <button key={pro.id} className="discovery-salon" onClick={() => openPro(pro)}>
            <div className="discovery-salon-photo"><BeautyImage src={pro.cover_url || pro.avatar_url} alt={pro.salon_name || 'Salon de beauté'} loading="lazy" />{pro.rating > 0 && <span className="discovery-rating"><Star size={14} fill="currentColor" />{pro.rating.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</span>}<span className="discovery-photo-arrow"><ArrowUpRight size={20} /></span></div>
            <div className="discovery-salon-info"><p className="discovery-specialties">{Array.isArray(pro.specialites) && pro.specialites.length ? pro.specialites.slice(0, 2).join(' · ') : 'Professionnel de la beauté'}</p><h3>{pro.salon_name || 'Professionnel BeautyBook'}</h3><p className="discovery-city"><MapPin size={15} />{pro.city || 'Adresse à consulter sur la fiche'}</p><div className="discovery-salon-bottom"><span>{pro.minPrice !== null ? <>À partir de <strong>{money(pro.minPrice)}</strong></> : 'Découvrir les prestations'}</span><ArrowRight size={19} /></div></div>
          </button>)}</div>{visibleCount < results.length && <button className="discovery-load-more discovery-secondary" onClick={() => setVisibleCount(n => n + 12)}>Voir plus d’adresses<ArrowRight size={18} /></button>}</> : <div className="discovery-empty"><Search size={32} /><h3>{hasCriteria ? 'Votre adresse se fait désirer.' : 'Les prochaines adresses arrivent.'}</h3><p>{hasCriteria ? 'Essayez une autre ville, un budget plus large ou une autre prestation.' : 'Les professionnels apparaîtront ici dès la publication de leur profil.'}</p>{hasCriteria && <button className="discovery-primary" onClick={() => updateParams({ q: '', category: 'Tous', ...emptyFilters })}>Effacer ma recherche</button>}</div>}
        </>}
      </section>
      {!loading && !error && inspirations.length > 0 && <section className="discovery-inspirations" aria-labelledby="inspirations-title"><div className="discovery-section-head"><div><p className="discovery-eyebrow">L’ENVIE COMMENCE ICI</p><h2 id="inspirations-title">Votre prochaine inspiration</h2></div><span className="discovery-subtle">Les dernières créations</span></div><div className="discovery-style-track">{inspirations.map(style => <button key={style.id} onClick={() => navigate('/style/' + style.id)} className="discovery-style"><BeautyImage src={style.image_url || style.images?.[0]} alt={style.title || 'Création beauté'} loading="lazy" /><span><small>{style.category || 'Inspiration'}</small><strong>{style.title || 'Découvrir ce style'}</strong></span><ArrowUpRight size={18} /></button>)}</div></section>}
      <aside className="discovery-assistant"><span className="discovery-assistant-icon"><Sparkles size={27} /></span><div><p className="discovery-eyebrow">UN PEU D’INSPIRATION ?</p><h2>On trouve votre prochain coup de cœur ?</h2><p>Partagez vos envies avec Maria, votre assistante beauté.</p></div><button className="discovery-secondary" onClick={openMaria}>Parler à Maria<ArrowUpRight size={18} /></button></aside>
    </div>
    {showFilters && <FilterDialog filters={filters} cities={cities} servicesAvailable={servicesAvailable} onClose={() => setShowFilters(false)} onApply={next => { updateParams(next); setShowFilters(false); }} />}
  </div>;
}
