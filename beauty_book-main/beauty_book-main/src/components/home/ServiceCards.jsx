import BeautyImage from '@/components/ui/BeautyImage';
import { useState, useEffect } from "react";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';
import { useNavigate } from "react-router-dom";

export default function ServiceCards() {
  const [services, setServices] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    entities.Service.filter({ status: "actif" }, "-created_at", 20)
      .then(setServices)
      .catch(() => {});
  }, []);

  if (services.length === 0) return null;

  return (
    <div className="px-4 py-2">
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {services.map((service) => (
          <div
            key={service.id}
            onClick={() => navigate(`/service/${service.id}`, { state: { title: service.title, price: service.price, duration: service.duration_min, cover: service.image_url } })}
            className="min-w-[150px] max-w-[150px] bg-card rounded-xl overflow-hidden shadow-sm border border-border/50 flex-shrink-0 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="aspect-square overflow-hidden bg-gray-100">
              {service.image_url ? (
                <BeautyImage src={service.image_url} alt={service.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[32px]">✂️</div>
              )}
            </div>
            <div className="p-3">
              <h3 className="text-sm font-bold text-foreground leading-tight">{service.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">À partir de {service.price}€</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}