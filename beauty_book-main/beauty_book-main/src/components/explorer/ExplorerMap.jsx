import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Star, X, Maximize2 } from "lucide-react";

const SALON_IMG = "";
const STYLE_IMG = "";
const SPACE_IMG = "";

const prestataires = [
  { id: 1, name: "L'Atelier de Beauté", location: "Paris 8e", lat: 48.874, lng: 2.305, price: 65, rating: 4.9, img: SALON_IMG, category: "Coiffure" },
  { id: 2, name: "Studio Lumière", location: "Paris 16e", lat: 48.863, lng: 2.272, price: 55, rating: 4.8, img: STYLE_IMG, category: "Maquillage" },
  { id: 3, name: "Beauté Marais", location: "Paris 3e", lat: 48.861, lng: 2.358, price: 80, rating: 4.7, img: SALON_IMG, category: "Soin" },
  { id: 4, name: "Spa Montmartre", location: "Paris 18e", lat: 48.886, lng: 2.343, price: 95, rating: 4.9, img: SPACE_IMG, category: "Spa" },
  { id: 5, name: "Ongles Bastille", location: "Paris 11e", lat: 48.853, lng: 2.369, price: 40, rating: 4.6, img: STYLE_IMG, category: "Ongles" },
  { id: 6, name: "Coiff'Art Nation", location: "Paris 20e", lat: 48.864, lng: 2.395, price: 50, rating: 4.5, img: SALON_IMG, category: "Coiffure" },
];

// Créer une icône personnalisée avec le prix (style Airbnb)
const createPriceIcon = (price, selected) =>
  L.divIcon({
    className: "",
    html: `<div style="
      background: ${selected ? "#1a1a1a" : "white"};
      color: ${selected ? "white" : "#1a1a1a"};
      border: 2px solid ${selected ? "#1a1a1a" : "#1a1a1a"};
      border-radius: 20px;
      padding: 5px 10px;
      font-size: 12px;
      font-weight: 900;
      font-family: 'Plus Jakarta Sans', sans-serif;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.20);
      transform: ${selected ? "scale(1.15)" : "scale(1)"};
      transition: all 0.15s;
    ">${price}€</div>`,
    iconAnchor: [28, 18],
  });

export default function ExplorerMap() {
  const [selected, setSelected] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);

  const selectedPro = prestataires.find((p) => p.id === selected);

  return (
    <div className="px-5 mb-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">🗺</span>
          <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">À Proximité</h2>
          <span className="bg-green-100 text-green-600 text-[10px] font-black px-2 py-0.5 rounded-full">
            • {prestataires.length} OUVERTS
          </span>
        </div>
        <button
          onClick={() => setFullscreen(true)}
          className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1"
        >
          <Maximize2 className="w-3 h-3" />
          Plein écran
        </button>
      </div>

      {/* Map container */}
      <div className={`relative rounded-3xl overflow-hidden border border-gray-100 shadow-sm ${fullscreen ? "hidden" : ""}`} style={{ height: 220 }}>
        <MapContainer
          center={[48.866, 2.333]}
          zoom={12}
          style={{ width: "100%", height: "100%" }}
          zoomControl={false}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />
          {prestataires.map((p) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={createPriceIcon(p.price, selected === p.id)}
              eventHandlers={{ click: () => setSelected(selected === p.id ? null : p.id) }}
            />
          ))}
        </MapContainer>
      </div>

      {/* Popup card style Airbnb */}
      {selectedPro && (
        <div className="mt-3 bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden flex gap-3 p-3 animate-in slide-in-from-bottom-2 duration-200">
          <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-gray-100">
            <img src={selectedPro.img} alt={selectedPro.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <div>
                <p className="text-[14px] font-black text-gray-900 leading-tight">{selectedPro.name}</p>
                <p className="text-[11px] text-gray-400 font-medium">{selectedPro.location} • {selectedPro.category}</p>
              </div>
              <button onClick={() => setSelected(null)} className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                <X className="w-3 h-3 text-gray-500" />
              </button>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 text-primary fill-primary" />
              <span className="text-[12px] font-black text-gray-700">{selectedPro.rating}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[16px] font-black text-primary">à partir de {selectedPro.price}€</span>
              <button className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl active:scale-95 transition-all">
                Réserver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-[16px] font-black text-gray-900">Carte des prestataires</h2>
            <button onClick={() => setFullscreen(false)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          <div className="flex-1 relative">
            <MapContainer
              center={[48.866, 2.333]}
              zoom={12}
              style={{ width: "100%", height: "100%" }}
              zoomControl={true}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              />
              {prestataires.map((p) => (
                <Marker
                  key={p.id}
                  position={[p.lat, p.lng]}
                  icon={createPriceIcon(p.price, selected === p.id)}
                  eventHandlers={{ click: () => setSelected(selected === p.id ? null : p.id) }}
                >
                  <Popup>
                    <div className="font-display">
                      <p className="font-black text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.location}</p>
                      <p className="text-primary font-black mt-1">À partir de {p.price}€</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          {selectedPro && (
            <div className="px-4 py-4 border-t border-gray-100 bg-white flex gap-3 items-center">
              <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0">
                <img src={selectedPro.img} alt={selectedPro.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-black text-gray-900">{selectedPro.name}</p>
                <p className="text-[12px] text-gray-400">{selectedPro.location} • {selectedPro.category}</p>
                <p className="text-[16px] font-black text-primary mt-0.5">À partir de {selectedPro.price}€</p>
              </div>
              <button className="bg-gray-900 text-white text-[11px] font-black uppercase tracking-wider px-4 py-3 rounded-2xl">
                Réserver
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}