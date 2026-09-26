import { useEffect, useRef, useState } from "react";
import { Navigation, Loader2 } from "lucide-react";
import { loadAppleMaps } from "@/lib/appleMaps";

// Carte Apple Maps centrée sur le salon avec un pin.
// Coordonnées : props lat/lng si présentes, sinon géocodage de l'adresse via MapKit JS.
// Ne s'affiche pas si aucune localisation ne peut être résolue.
export default function SalonMap({ lat, lng, address, city, postalCode, name, height = 180 }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | unavailable
  const [coords, setCoords] = useState(null);

  // Synchronise les coordonnées quand les props arrivent (le profil charge après le montage)
  useEffect(() => {
    const la = Number(lat);
    const ln = Number(lng);
    if (Number.isFinite(la) && Number.isFinite(ln) && la !== 0 && ln !== 0) {
      setCoords((prev) => {
        if (prev && prev.lat === la && prev.lng === ln) return prev;
        // Nouvelles coordonnées : on repasse en chargement pour afficher la carte
        setStatus("loading");
        return { lat: la, lng: ln };
      });
    }
  }, [lat, lng]);

  const parts = [address, postalCode, city].filter(Boolean);
  // Évite "Athis-Mons, Athis-Mons" quand l'adresse contient déjà la ville
  const query = parts.filter((p, i) => i === 0 || !parts[0].toLowerCase().includes(p.toLowerCase())).join(", ");

  // 1) Géocodage de l'adresse quand le salon n'a pas de coordonnées en base
  useEffect(() => {
    if (coords) return;
    if (!query) {
      setStatus("unavailable");
      return;
    }
    let cancelled = false;
    loadAppleMaps()
      .then((mapkit) => {
        if (cancelled) return;
        new mapkit.Geocoder().lookup(query, (error, data) => {
          if (cancelled) return;
          const c = !error && data?.results?.length ? data.results[0].coordinate : null;
          if (c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) {
            setStatus("loading");
            setCoords({ lat: c.latitude, lng: c.longitude });
          } else {
            setStatus("unavailable");
          }
        });
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // 2) Initialisation de la carte une fois les coordonnées connues
  useEffect(() => {
    if (!coords || !mapRef.current) return;
    let cancelled = false;
    loadAppleMaps()
      .then((mapkit) => {
        if (cancelled || !mapRef.current) return;
        if (mapInstanceRef.current) {
          try { mapInstanceRef.current.destroy(); } catch {}
          mapInstanceRef.current = null;
        }
        const center = new mapkit.Coordinate(coords.lat, coords.lng);
        const map = new mapkit.Map(mapRef.current, {
          center,
          region: new mapkit.CoordinateRegion(center, new mapkit.CoordinateSpan(0.025, 0.025)),
          mapType: mapkit.Map.MapTypes.Standard,
          showsMapTypeControl: false,
          showsZoomControl: false,
          showsUserLocationControl: false,
          isScrollEnabled: true,
          isZoomEnabled: true,
        });
        const annotation = new mapkit.MarkerAnnotation(center, {
          title: name || "Salon",
          subtitle: query || "",
          color: "#f97316",
          glyphText: "✂",
        });
        map.addAnnotation(annotation);
        mapInstanceRef.current = map;
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [coords, name, query]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.destroy(); } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (status === "unavailable") {
    // Repli : la carte ne doit jamais laisser un vide — affiche l'adresse + bouton itinéraire
    if (!query && !name) return null;
    return (
      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        <a
          href={`https://maps.apple.com/?q=${encodeURIComponent(query || name || "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 p-4 w-full text-left active:bg-orange-50 transition-colors"
        >
          <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0">
            <Navigation className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-black text-gray-800">Emplacement du salon</p>
            <p className="text-[12px] text-gray-500 font-medium mt-0.5">{query || name}</p>
          </div>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-orange-50 text-primary uppercase tracking-widest mt-1">
            Itinéraire
          </span>
        </a>
      </div>
    );
  }

  const itineraryUrl = coords
    ? `https://maps.apple.com/?daddr=${coords.lat},${coords.lng}&q=${encodeURIComponent(name || query || "Salon")}`
    : `https://maps.apple.com/?q=${encodeURIComponent(query || name || "")}`;

  return (
    <div className="relative rounded-3xl overflow-hidden border border-gray-100 shadow-sm bg-gray-100" style={{ height }}>
      <div ref={mapRef} className="absolute inset-0" />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      {status === "ready" && (
        <a
          href={itineraryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/95 backdrop-blur px-3 py-2 rounded-full shadow-md text-[11px] font-black text-gray-800 uppercase tracking-widest active:scale-95 transition-all"
        >
          <Navigation className="w-3.5 h-3.5 text-primary" />
          Itinéraire
        </a>
      )}
    </div>
  );
}
