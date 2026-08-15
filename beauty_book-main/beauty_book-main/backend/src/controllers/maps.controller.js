const NOMINATIM_HEADERS = {
  "User-Agent": "BeautyBookApp/1.0 (contact@beautybook.fr)",
  "Accept-Language": "fr",
};

export const placesAutocomplete = async (req, res) => {
  try {
    const { input, placeId } = req.body;

    // Récupérer les détails d'un lieu (place_id → adresse structurée)
    if (placeId) {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/lookup?osm_id=${encodeURIComponent(placeId)}&format=json&addressdetails=1&accept-language=fr`,
        { headers: NOMINATIM_HEADERS }
      );
      const data = await resp.json();
      if (!data.length) {
        return res.json({ address: "", city: "", postalCode: "", formatted: "", lat: null, lng: null });
      }

      const result = data[0];
      const addr = result.address || {};

      const streetNumber = addr.house_number || "";
      const route = addr.road || "";
      const city = addr.city || addr.town || addr.village || "";
      const postalCode = addr.postcode || "";

      const address = [streetNumber, route].filter(Boolean).join(" ");

      return res.json({
        address,
        city,
        postalCode,
        formatted: result.display_name || address,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
      });
    }

    // Autocomplete
    if (!input || input.length < 2) return res.json({ predictions: [] });

    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&limit=5&addressdetails=1&countrycodes=fr,be,ch&accept-language=fr`,
      { headers: NOMINATIM_HEADERS }
    );
    const data = await resp.json();

    const predictions = data.map((item) => ({
      description: item.display_name,
      place_id: item.osm_id?.toString() || "",
      structured: item.address || {},
    }));

    return res.json({ predictions });
  } catch (error) {
    console.error("placesAutocomplete error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ── Geocode: adresses → lat/lng (pour transport fees) ──
export const geocode = async (req, res) => {
  try {
    const { addresses } = req.body;
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({ error: "addresses array required" });
    }

    const results = await Promise.all(
      addresses.map(async (addr) => {
        if (!addr) return { lat: null, lng: null, error: "empty address" };
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1&countrycodes=fr,be,ch`,
            { headers: NOMINATIM_HEADERS }
          );
          const data = await resp.json();
          if (data.length === 0) return { lat: null, lng: null, error: "not found" };
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        } catch (e) {
          return { lat: null, lng: null, error: e.message };
        }
      })
    );

    return res.json({ results });
  } catch (error) {
    console.error("geocode error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};

// ── Reverse geocode: lat/lng → ville (public, pas d'auth) ──
export const reverseGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: "lat & lng required" });

    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: NOMINATIM_HEADERS }
    );
    const data = await resp.json();
    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || "";
    const country = data.address?.country_code?.toUpperCase() || "";
    return res.json({ city, country });
  } catch (error) {
    console.error("reverseGeocode error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};
