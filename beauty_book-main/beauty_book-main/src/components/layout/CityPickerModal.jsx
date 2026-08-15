import { useState, useEffect, useRef } from "react";
import { MapPin, X, Search, Navigation, ChevronDown } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const POPULAR_CITIES = [
  { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  { name: "Lyon", country: "France", lat: 45.764, lng: 4.8357 },
  { name: "Marseille", country: "France", lat: 43.2965, lng: 5.3698 },
  { name: "Bordeaux", country: "France", lat: 44.8378, lng: -0.5792 },
  { name: "Lille", country: "France", lat: 50.6292, lng: 3.0573 },
  { name: "Nice", country: "France", lat: 43.7102, lng: 7.262 },
  { name: "Toulouse", country: "France", lat: 43.6047, lng: 1.4442 },
  { name: "Nantes", country: "France", lat: 47.2184, lng: -1.5536 },
  { name: "Strasbourg", country: "France", lat: 48.5734, lng: 7.7521 },
  { name: "Montpellier", country: "France", lat: 43.6108, lng: 3.8767 },
  { name: "Bruxelles", country: "Belgique", lat: 50.8503, lng: 4.3517 },
  { name: "Montréal", country: "Canada", lat: 45.5017, lng: -73.5673 },
];

const customIcon = new L.DivIcon({
  className: "",
  html: `<div style="position:relative;width:32px;height:42px;">
    <div style="width:32px;height:32px;background:linear-gradient(135deg,#F97316,#EA580C);border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(249,115,22,0.5);">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:rotate(45deg)"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>
    <div style="position:absolute;bottom:-4px;left:50%;transform:translateX(-50%);width:14px;height:6px;background:rgba(0,0,0,0.15);border-radius:50%;filter:blur(2px);"></div>
  </div>`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
});

function MapFlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 13, { duration: 1.2 });
  }, [center, map]);
  return null;
}

export default function CityPickerModal({ currentCity, onSelect, onClose }) {
  const [input, setInput] = useState(currentCity || "");
  const [geoLoading, setGeoLoading] = useState(false);
  const [markerPos, setMarkerPos] = useState([48.8566, 2.3522]);
  const [selectedCity, setSelectedCity] = useState(null);

  useEffect(() => {
    if (currentCity) {
      const found = POPULAR_CITIES.find(c => currentCity.includes(c.name));
      if (found) {
        setMarkerPos([found.lat, found.lng]);
        setSelectedCity(found);
      }
    }
  }, [currentCity]);

  const handleSelectCity = (city) => {
    setInput(`${city.name}, ${city.country}`);
    setMarkerPos([city.lat, city.lng]);
    setSelectedCity(city);
  };

  const handleConfirm = () => {
    if (!input.trim()) return;
    localStorage.setItem("bb_user_city", input.trim());
    onSelect(input.trim());
    onClose();
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          setMarkerPos([latitude, longitude]);
          const API_BASE = import.meta.env.VITE_BACKEND_URL || '';
          const res = await fetch(`${API_BASE}/maps/reverse?lat=${latitude}&lng=${longitude}`);
          const data = await res.json();
          const city = data.city || "Ma ville";
          const country = data.country || "";
          const label = country ? `${city}, ${country}` : city;
          setInput(label);
          localStorage.setItem("bb_user_city", label);
          onSelect(label);
          onClose();
        } catch {}
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { timeout: 5000 }
    );
  };

  const filtered = POPULAR_CITIES.filter(c =>
    input.length < 2 || `${c.name}, ${c.country}`.toLowerCase().includes(input.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white font-display" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
        <button onClick={onClose} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all shrink-0">
          <X className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-[18px] font-black text-gray-900 flex-1">Ma localisation</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Map */}
        <div className="relative h-[260px] bg-gray-100">
          <MapContainer
            center={markerPos}
            zoom={5}
            className="w-full h-full"
            zoomControl={false}
            attributionControl={false}
            dragging={true}
            scrollWheelZoom={true}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <Marker position={markerPos} icon={customIcon} />
            <MapFlyTo center={markerPos} />
          </MapContainer>

          {/* Gradient overlay bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />

          {/* Floating pin info */}
          {selectedCity && (
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-lg border border-white/50 flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-gray-900 truncate">{selectedCity.name}</p>
                <p className="text-[11px] text-gray-500 font-medium">{selectedCity.country}</p>
              </div>
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
          )}
        </div>

        <div className="px-4 pt-5 pb-6 space-y-4">
          {/* GPS Button */}
          <button
            onClick={handleGeolocate}
            disabled={geoLoading}
            className="w-full flex items-center gap-3.5 px-4 py-4 bg-gradient-to-r from-orange-50 to-orange-100/60 border border-orange-200/60 rounded-2xl active:scale-[0.98] transition-all"
          >
            <div className="w-11 h-11 bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-200">
              <Navigation className={`w-5 h-5 text-white ${geoLoading ? "animate-spin" : ""}`} />
            </div>
            <div className="text-left flex-1">
              <p className="text-[14px] font-black text-gray-900">{geoLoading ? "Localisation en cours..." : "Utiliser ma position"}</p>
              <p className="text-[11px] text-gray-500 font-medium">Détection automatique via GPS</p>
            </div>
            <ChevronDown className="w-4 h-4 text-orange-400 -rotate-90" />
          </button>

          {/* Search */}
          <div className="bg-gray-50 rounded-2xl flex items-center gap-3 px-4 py-3.5 border border-gray-200 focus-within:border-orange-300 focus-within:bg-white transition-all">
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Rechercher une ville..."
              className="flex-1 bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-400 font-medium"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") handleConfirm(); }}
            />
            {input && (
              <button onClick={() => { setInput(""); setSelectedCity(null); }} className="active:scale-90">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Confirm */}
          {input.trim().length > 1 && (
            <button
              onClick={handleConfirm}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-[14px] uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-orange-300/40 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <MapPin className="w-5 h-5" /> Confirmer cette ville
            </button>
          )}

          {/* Popular Cities */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Villes populaires</p>
            <div className="grid grid-cols-2 gap-2">
              {filtered.map(city => (
                <button
                  key={city.name}
                  onClick={() => handleSelectCity(city)}
                  className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border transition-all text-left ${
                    selectedCity?.name === city.name
                      ? "bg-orange-50 border-orange-300 shadow-sm"
                      : "bg-white border-gray-100 shadow-sm active:scale-[0.97]"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedCity?.name === city.name
                      ? "bg-gradient-to-br from-orange-400 to-orange-500"
                      : "bg-gray-100"
                  }`}>
                    <MapPin className={`w-4 h-4 ${selectedCity?.name === city.name ? "text-white" : "text-gray-400"}`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[13px] font-bold truncate ${selectedCity?.name === city.name ? "text-orange-600" : "text-gray-800"}`}>
                      {city.name}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">{city.country}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
