import BeautyImage from '@/components/ui/BeautyImage';
import { Badge } from "@/components/ui/badge";
import { Star, Award } from "lucide-react";

export default function FeaturedSalon() {
  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-foreground">Salon du Mois</h2>
        <Badge className="bg-primary text-primary-foreground font-semibold text-xs px-3 py-1 rounded-full gap-1">
          <Award className="w-3 h-3" />
          À L'HONNEUR
        </Badge>
      </div>
      <div className="relative rounded-2xl overflow-hidden shadow-lg cursor-pointer group">
        <BeautyImage
          src="https://media.base44.com/images/public/6a0ba7bd3d55dddeb85a8366/dcdf6a7f4_generated_784ab59f.png"
          alt="L'Atelier de Beauté"
          className="w-full h-52 object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white text-xl font-bold">L'Atelier de Beauté</h3>
          <div className="flex items-center gap-1 mt-1">
            <p className="text-white/80 text-sm">Paris 8ème</p>
            <span className="text-white/60 mx-1">•</span>
            <Star className="w-3.5 h-3.5 text-primary fill-primary" />
            <span className="text-white text-sm font-semibold">4.9</span>
            <span className="text-white/60 text-sm">(120 avis)</span>
          </div>
          <div className="flex gap-2 mt-3">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold uppercase rounded-full border border-white/30 tracking-wider">
              Luxueux
            </span>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold uppercase rounded-full border border-white/30 tracking-wider">
              Éco-responsable
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}