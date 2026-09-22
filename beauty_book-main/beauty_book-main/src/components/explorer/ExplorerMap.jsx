import BeautyImage from '@/components/ui/BeautyImage';
import { useState } from "react";
import { Star, X, Maximize2 } from "lucide-react";
import MapWithPricePins from "@/components/map/MapWithPricePins";

const SALON_IMG = "";
const STYLE_IMG = "";
const SPACE_IMG = "";

const prestataires = [
  { id: 1, title: "L'Atelier de Beauté", city: "Paris 8e", lat: 48.874, lng: 2.305, price: 65, rating: 4.9, img: SALON_IMG, category: "Coiffure" },
  { id: 2, title: "Studio Lumière", city: "Paris 16e", lat: 48.863, lng: 2.272, price: 55, rating: 4.8, img: STYLE_IMG, category: "Maquillage" },
  { id: 3, title: "Beauté Marais", city: "Paris 3e", lat: 48.861, lng: 2.358, price: 80, rating: 4.7, img: SALON_IMG, category: "Soin" },
  { id: 4, title: "Spa Montmartre", city: "Paris 18e", lat: 48.886, lng: 2.343, price: 95, rating: 4.9, img: SPACE_IMG, category: "Spa" },
  { id: 5, title: "Ongles Bastille", city: "Paris 11e", lat: 48.853, lng: 2.369, price: 40, rating: 4.6, img: STYLE_IMG, category: "Ongles" },
  { id: 6, title: "Coiff'Art Nation", city: "Paris 20e", lat: 48.864, lng: 2.395, price: 50, rating: 4.5, img: SALON_IMG, category: "Coiffure" },
];

export default function ExplorerMap() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="px-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">🗺</span>
          <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">À Proximité (Apple Maps)</h2>
          <span className="bg-green-100 text-green-600 text-[10px] font-black px-2 py-0.5 rounded-full">
            • {prestataires.length} OUVERTS
          </span>
        </div>
      </div>

      {/* Apple Maps Container */}
      <MapWithPricePins 
        items={prestataires} 
        onSelectItem={(item) => setSelected(item)} 
        height="h-56" 
      />
    </div>
  );
}