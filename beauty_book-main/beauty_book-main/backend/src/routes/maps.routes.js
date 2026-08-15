import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { placesAutocomplete, geocode, reverseGeocode } from '../controllers/maps.controller.js';

const router = express.Router();

router.post('/places-autocomplete', requireAuth, placesAutocomplete);
router.post('/geocode', requireAuth, geocode);
router.get('/reverse', reverseGeocode);

export default router;
