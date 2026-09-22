import { useState, useEffect, useRef, useMemo } from "react";
import { MapPin, Navigation } from "lucide-react";

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
    if (window.mapkit) {
      window.mapkit.init({
        authorizationCallback: (done) => done(APPLE_MAPS_TOKEN),
        language: "fr",
      });
      mapkitLoaded = true;
      mapkitCallbacks.forEach(fn => fn());
    }
  };
  document.head.appendChild(script);
}

export default function MapWithPricePins({ items = [], onSelectItem, height = "h-96" }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [ready, setReady] = useState(false);

  const resolvedItems = useMemo(() =>
    items
      .filter(it => {
        const lat = it.lat ?? (Array.isArray(it.coordinates) ? it.coordinates[0] : null);
        const lng = it.lng ?? (Array.isArray(it.coordinates) ? it.coordinates[1] : null);
        return lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
      })
      .map(it => {
        const lat = parseFloat(it.lat ?? it.coordinates[0]);
        const lng = parseFloat(it.lng ?? it.coordinates[1]);
        return {
          ...it,
          _lat: lat,
          _lng: lng,
          displayTitle: it.salon_name || it.name || it.title || 'Professionnel BeautyBook',
          displayPrice: it.minPrice || it.price || 0,
        };
      }),
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
      if (!mapRef.current) return;

      if (mapInstanceRef.current) {
        // Map is initialized, update annotations
        try {
          const existing = mapInstanceRef.current.annotations || [];
          mapInstanceRef.current.removeAnnotations(existing);

          const annotations = resolvedItems.slice(0, 50).map(item => {
            const ann = new window.mapkit.MarkerAnnotation(
              new window.mapkit.Coordinate(item._lat, item._lng),
              {
                title: item.displayTitle,
                subtitle: item.displayPrice > 0 ? `Dès ${item.displayPrice}€` : item.city || "",
                color: "#FF6B00",
                glyphText: item.displayPrice > 0 ? `${item.displayPrice}€` : "•",
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
            mapInstanceRef.current.addAnnotations(annotations);
            if (annotations.length > 1) {
              mapInstanceRef.current.showItems(annotations, { animate: true, padding: new window.mapkit.Padding(40, 40, 40, 40) });
            }
          }
        } catch (e) {
          console.warn("[MapWithPricePins] Failed updating annotations:", e);
        }
        return;
      }

      // Initialize map for the first time
      try {
        const map = new window.mapkit.Map(mapRef.current, {
          center: new window.mapkit.Coordinate(center.lat, center.lng),
          cameraDistance: resolvedItems.length > 0 ? 12000 : 25000,
          mapType: window.mapkit.Map.MapTypes.Standard,
          showsCompass: window.mapkit.FeatureVisibility.Hidden,
          showsUserLocationControl: true,
          showsZoomControl: true,
        });

        const annotations = resolvedItems.slice(0, 50).map(item => {
          const ann = new window.mapkit.MarkerAnnotation(
            new window.mapkit.Coordinate(item._lat, item._lng),
            {
              title: item.displayTitle,
              subtitle: item.displayPrice > 0 ? `Dès ${item.displayPrice}€` : item.city || "",
              color: "#FF6B00",
              glyphText: item.displayPrice > 0 ? `${item.displayPrice}€` : "•",
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

        map.showsUserLocation = true;
        mapInstanceRef.current = map;
        setReady(true);
      } catch (e) {
        console.warn("[MapWithPricePins] Apple Maps init error:", e);
        setReady(false);
      }
    });
  }, [resolvedItems, center, onSelectItem]);

  const selectedItem = selected ? resolvedItems.find(it => it.id === selected) : null;

  return (
    <div className={`relative ${height} w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm`}>
      {/* Apple Maps container */}
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

      {/* Loading placeholder */}
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10"
          style={{ background: "linear-gradient(135deg, #FFF5F0 0%, #FFE8D6 100%)" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: "#FF6B00" }}>
            <MapPin className="w-6 h-6 text-white animate-bounce" />
          </div>
          <p className="text-[13px] font-extrabold" style={{ color: "#FF6B00" }}>
            Chargement de la carte Apple Maps…
          </p>
        </div>
      )}

      {/* Selected item popup card */}
      {selectedItem && (
        <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 z-[1000] flex items-center justify-between gap-4 border border-orange-100 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,107,0,0.12)" }}>
              <Navigation className="w-5 h-5" style={{ color: "#FF6B00" }} />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-black text-gray-900 truncate">{selectedItem.displayTitle}</p>
              <p className="text-[12px] text-gray-500 font-medium truncate">{selectedItem.city || selectedItem.address || 'Adresse disponible sur la fiche'}</p>
            </div>
          </div>
          {selectedItem.displayPrice > 0 && (
            <span className="text-[15px] font-black px-3 py-1.5 rounded-xl shrink-0 text-white shadow-sm" style={{ background: "#FF6B00" }}>
              Dès {selectedItem.displayPrice}€
            </span>
          )}
        </div>
      )}
    </div>
  );
}

