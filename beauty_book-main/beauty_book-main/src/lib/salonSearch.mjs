export const normalizeSearch = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const aliases = { Ongles: ['ongle', 'manucure', 'nail'], Pedicure: ['pedicure', 'pied'], Soin: ['soin', 'visage', 'epilation'], Tresses: ['tresse', 'braid', 'twist', 'locs'], Coiffure: ['coiff', 'coupe', 'balayage', 'barbier', 'brushing'], Massage: ['massage'], Maquillage: ['maquillage', 'makeup'] };
export function matchesCategory(value, category) {
  return category === 'Tous' || !category || (aliases[category] || [normalizeSearch(category)]).some(term => normalizeSearch(value).includes(term));
}
export function coordinates(profile) {
  const rawLat = profile.latitude ?? profile.lat, rawLng = profile.longitude ?? profile.lng;
  if (rawLat == null || rawLng == null || String(rawLat).trim() === '' || String(rawLng).trim() === '') return null;
  const lat = Number(rawLat), lng = Number(rawLng);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}
export function searchSalons(profiles, services, { q = '', category = 'Tous', city = '', maxPrice = '', minRating = '', sort = 'recent' } = {}) {
  const serviceIndex = new Map();
  for (const service of services) {
    if (service.status && service.status !== 'actif') continue;
    const key = normalizeSearch(service.pro_email);
    if (!key) continue;
    if (!serviceIndex.has(key)) serviceIndex.set(key, []);
    serviceIndex.get(key).push(service);
  }
  const tokens = normalizeSearch(q).split(/\s+/).filter(Boolean);
  const results = profiles.flatMap(profile => {
    const offers = serviceIndex.get(normalizeSearch(profile.user_email)) || [];
    const specialties = Array.isArray(profile.specialites) ? profile.specialites.join(' ') : profile.specialites || '';
    const serviceText = service => [service.name, service.title, service.category, service.description].filter(Boolean).join(' ');
    const relevant = offers.filter(service => matchesCategory(serviceText(service), category));
    if (!matchesCategory(specialties, category) && relevant.length === 0) return [];
    const haystack = normalizeSearch([profile.salon_name, profile.city, profile.postal_code, specialties, ...offers.map(serviceText)].join(' '));
    if (!tokens.every(token => haystack.includes(token)) || !normalizeSearch([profile.city, profile.postal_code].join(' ')).includes(normalizeSearch(city))) return [];
    const prices = relevant.map(s => s.price == null || s.price === '' ? NaN : Number(s.price)).filter(n => Number.isFinite(n) && n >= 0);
    const minPrice = prices.length ? Math.min(...prices) : null;
    const rating = Number(profile.rating) || 0;
    if (maxPrice !== '' && (minPrice === null || minPrice > Number(maxPrice))) return [];
    if (minRating !== '' && rating < Number(minRating)) return [];
    return [{ ...profile, minPrice, rating, coordinates: coordinates(profile) }];
  });
  if (sort === 'price') results.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
  if (sort === 'rating') results.sort((a, b) => b.rating - a.rating);
  return results;
}
