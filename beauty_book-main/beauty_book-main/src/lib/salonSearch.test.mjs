import test from 'node:test';
import assert from 'node:assert/strict';
import { coordinates, searchSalons } from './salonSearch.mjs';
const profiles = [
  { id: '1', user_email: 'salon@a.fr', salon_name: 'Éclat', city: 'Évry', postal_code: '91000', specialites: ['Coiffure', 'Ongles'], rating: 4.6 },
  { id: '2', user_email: 'salon@b.fr', salon_name: 'Studio B', city: 'Paris', specialites: ['Pédicure'], rating: 4.9 },
  { id: '3', user_email: 'salon@c.fr', salon_name: 'Studio C', city: 'Cergy', specialites: ['Coiffure'], rating: 0 },
];
const services = [
  { pro_email: 'salon@a.fr', name: 'Balayage', category: 'Coiffure', price: '85', status: 'actif' },
  { pro_email: 'salon@a.fr', name: 'French manucure', category: 'Ongles', price: 25, status: 'actif' },
  { pro_email: 'salon@b.fr', name: 'Pédicure', category: 'Pédicure', price: 40, status: 'actif' },
  { pro_email: 'salon@c.fr', name: 'Coupe', category: 'Coiffure', price: 1, status: 'inactif' },
];
test('search combines accent-insensitive salon, service, city and postcode tokens', () => {
  assert.deepEqual(searchSalons(profiles, services, { q: 'eclat balayage evry' }).map(p => p.id), ['1']);
  assert.equal(searchSalons(profiles, services, { city: '91000' }).length, 1);
  assert.equal(searchSalons(profiles, services, { q: 'introuvable' }).length, 0);
});
test('category and budget apply to a matching service, not an unrelated cheaper service', () => {
  assert.equal(searchSalons(profiles, services, { category: 'Coiffure', maxPrice: '30' }).length, 0);
  assert.deepEqual(searchSalons(profiles, services, { category: 'Ongles', maxPrice: '30' }).map(p => p.id), ['1']);
  assert.deepEqual(searchSalons(profiles, services, { category: 'Pedicure' }).map(p => p.id), ['2']);
});
test('missing and inactive prices stay unknown and are excluded by a budget', () => {
  const sorted = searchSalons(profiles, services, { sort: 'price' });
  assert.deepEqual(sorted.map(p => p.id), ['1', '2', '3']); assert.equal(sorted[2].minPrice, null);
  assert.deepEqual(searchSalons(profiles, services, { maxPrice: '100' }).map(p => p.id), ['1', '2']);
});
test('rating threshold and sorting use real values; clearing criteria restores every profile', () => {
  assert.deepEqual(searchSalons(profiles, services, { minRating: '4.5', sort: 'rating' }).map(p => p.id), ['2', '1']);
  assert.equal(searchSalons(profiles, services).length, 3);
  assert.equal(profiles[0].minPrice, undefined);
});
test('coordinates never invent a location and accept valid zero coordinates', () => {
  assert.equal(coordinates({}), null); assert.equal(coordinates({ latitude: '', longitude: '2.3' }), null);
  assert.equal(coordinates({ latitude: 'abc', longitude: 2.3 }), null); assert.equal(coordinates({ latitude: 91, longitude: 2 }), null);
  assert.deepEqual(coordinates({ latitude: 0, longitude: 0 }), [0, 0]);
  assert.deepEqual(coordinates({ lat: '48.85', lng: '2.35' }), [48.85, 2.35]);
});
