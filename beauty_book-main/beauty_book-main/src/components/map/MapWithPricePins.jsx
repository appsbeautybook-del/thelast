import { useState, useEffect, useRef, useMemo } from "react";
import { MapPin } from "lucide-react";

const APPLE_MAPS_TOKEN = "eyJraWQiOiI2SDkyNDI0WDJEIiwidHlwIjoiSldUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJHNFpYTkszVTJWIiwiaWF0IjoxNzkwMDM2NDQ3LCJzY29wZSI6ImVtYmVkX2FwaSIsImV4cCI6MTc5MDY2NTE5OX0.FibCotF_o2NCM5DvdhZK_btdTrruc2mdQw1V4lTTORjzQeBZls9n4c5dK06sGqxfjxDSwVkoIkOSntTte3Zx9Q";

let mapkitLoaded = false;
let mapkitLoading = false;
const mapkitCallbacks = [];

function loadMapKit(cb) {
  if (mapkitLoaded) { cb(); return; }
  mapkitCallbacks.push(cb);
  if (mapkitLoading) return;
  mapkitLoading = true;
  const script = document.createElement("script");
  script.src = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js";
  script.async = true;
  script.onload = () => {
    window.mapkit.init({
      authorizationCallback: (done) => done(APPLE_MAPS_TOKEN),
      language: "fr",
    });
    mapkitLoaded = true;
    mapkitCallbacks.forEach(fn => fn());
  };
  document.head.appendChild(script);
}

export default function MapWithPricePins({ items = [], onSelectItem, height = "h-52" }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [ready, setReady] = useState(false);

  const resolvedItems = useMemo(() =>
    items.filter(it => it.lat && it.lng && !isNaN(it.lat) && !isNaN(it.lng))
      .map(it => ({ ...it, _lat: parseFloat(it.lat), _lng: parseFloat(it.lng) })),
    [items]);

  const center = useMemo(() => {
    if (resolvedItems.length === 0) return { lat: 48.8566, lng: 2.3522 };
    const lat = resolvedItems.reduce((s, it) => s + it._lat, 0) / resolvedItems.length;
    const lng = resolvedItems.reduce((s, it) => s + it._lng, 0) / resolvedItems.length;
    return { lat, lng };
  }, [resolvedItems]);

  useEffect(() => {
    if (!mapRef.current) return;
    loadMapKit(() => {
      if (!mapRef.current || mapInstanceRef.current) return;
      try {
        const map = new window.mapkit.Map(mapRef.current, {
          center: new window.mapkit.Coordinate(center.lat, center.lng),
          cameraDistance: resolvedItems.length > 0 ? 10000 : 15000,
          mapType: window.mapkit.Map.MapTypes.Standard,
          showsCompass: window.mapkit.FeatureVisibility.Hidden,
          showsUserLocationControl: true,
          showsZoomControl: false,
        });

        // Add annotations with price bubbles
        const annotations = resolvedItems.slice(0, 30).map(item => {
          const ann = new window.mapkit.MarkerAnnotation(
            new window.mapkit.Coordinate(item._lat, item._lng),
            {
              title: item.title || item.name || "",
              subtitle: item.price > 0 ? `Dès ${item.price}€` : "",
              color: "#FF6B00",
              glyphText: item.price > 0 ? `${item.price}€` : "•",
            }
          );
          ann.addEventListener("select", () => {
            setSelected(item.id);
            onSelectItem?.(item);
          });
          ann.addEventListener("deselect", () => setSelected(null));
          ann._item = item;
          return ann;
        });

        if (annotations.length > 0) {
          map.addAnnotations(annotations);
          if (annotations.length > 1) {
            map.showItems(annotations, { animate: false, padding: new window.mapkit.Padding(40, 40, 40, 40) });
          }
        }

        // Show user location
        map.showsUserLocation = true;
        mapInstanceRef.current = map;
        setReady(true);
      } catch (e) {
        console.warn("[MapWithPricePins] Apple Maps init error:", e);
        setReady(false);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.destroy(); } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, []); // only init once

  const selectedItem = selected ? resolvedItems.find(it => it.id === selected) : null;

  return (
    <div className={`relative ${height} overflow-hidden bg-gray-100`}>
      {/* Apple Maps container */}
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* Loading placeholder */}
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ background: "linear-gradient(135deg, #FFF5F0 0%, #FFE8D6 100%)" }}>
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#FF6B00" }}>
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <p className="text-[12px] font-bold" style={{ color: "#FF6B00" }}>Chargement de la carte...</p>
        </div>
      )}

      {/* Selected item popup */}
      {selectedItem && (
        <div className="absolute bottom-3 left-3 right-3 bg-white rounded-2xl shadow-xl px-4 py-3 z-[1000] flex items-center gap-3 border border-orange-100"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,107,0,0.12)" }}>
            <MapPin className="w-4 h-4" style={{ color: "#FF6B00" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-gray-900 truncate">{selectedItem.title || selectedItem.name}</p>
            <p className="text-[11px] text-gray-400 font-medium truncate">{selectedItem.address || selectedItem.city}</p>
          </div>
          {selectedItem.price > 0 && (
            <span className="text-[15px] font-black shrink-0" style={{ color: "#FF6B00" }}>
              Dès {selectedItem.price}€
            </span>
          )}
        </div>
      )}
    </div>
  );
}
