import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Building, Globe, Mail, Phone, Shield, Lock, Scale, Cookie, Send } from "lucide-react";
import { useThemeBg } from "@/hooks/useTheme";

export default function MentionsLegales() {
  const navigate = useNavigate();
  const themeBg = useThemeBg();

  const sections = [
    {
      icon: Building,
      title: "Éditeur de l'application",
      color: "bg-blue-50",
      iconColor: "text-blue-500",
      items: [
        { label: "Dénomination", value: "BeautyBook SAS" },
        { label: "Adresse", value: "[À compléter]" },
        { label: "RCS", value: "Paris B XXX XXX XXX" },
        { label: "Capital social", value: "[À compléter]" },
        { label: "Directeur de la publication", value: "[À compléter]" },
      ],
    },
    {
      icon: Globe,
      title: "Hébergeur",
      color: "bg-green-50",
      iconColor: "text-green-500",
      items: [
        { label: "Nom", value: "Vercel Inc." },
        { label: "Adresse", value: "340 S Lemon Ave #4133, Walnut, CA 91789, USA" },
        { label: "Site", value: "vercel.com" },
      ],
    },
    {
      icon: Shield,
      title: "Données personnelles",
      color: "bg-purple-50",
      iconColor: "text-purple-500",
      items: [
        { label: "Responsable du traitement", value: "BeautyBook SAS" },
        { label: "DPO", value: "dpo@beautybook.fr" },
        { label: "Durée de conservation", value: "3 ans après dernière activité" },
        {
          label: "Sous-traitants",
          value: "Supabase (données), Stripe (paiements), Vercel (hébergement), Resend (emails)",
        },
      ],
    },
    {
      icon: Scale,
      title: "Propriété intellectuelle",
      color: "bg-orange-50",
      iconColor: "text-primary",
      items: [
        {
          label: "",
          value:
            "Tous les contenus de l'application sont la propriété exclusive de BeautyBook SAS. Toute reproduction, même partielle, est interdite sans autorisation préalable écrite.",
        },
      ],
    },
    {
      icon: Cookie,
      title: "Cookies",
      color: "bg-yellow-50",
      iconColor: "text-yellow-600",
      items: [
        {
          label: "",
          value:
            "Pour en savoir plus sur l'utilisation des cookies, veuillez consulter notre politique de confidentialité.",
        },
      ],
      link: { label: "Politique de confidentialité", to: "/parametres/confidentialite" },
    },
    {
      icon: Mail,
      title: "Contact",
      color: "bg-red-50",
      iconColor: "text-red-500",
      items: [
        { label: "Email", value: "contact@beautybook.fr" },
        { label: "", value: "Un formulaire de contact est également disponible dans l'application." },
      ],
    },
  ];

  return (
    <div className="font-display min-h-screen" style={{ background: themeBg }}>
      <div className="bg-white px-5 pt-12 pb-4 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-primary" />
        </button>
        <h1 className="text-[20px] font-black text-gray-900">Mentions Légales</h1>
      </div>

      <div className="px-4 pb-20 pt-5 space-y-5">
        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden h-36">
          <img
            src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center px-5">
            <div>
              <p className="text-white text-[20px] font-black leading-tight">
                Mentions Légales
              </p>
              <p className="text-white/70 text-[11px] font-medium mt-1">
                Informations juridiques de BeautyBook
              </p>
            </div>
          </div>
        </div>

        {/* Sections */}
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title}>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">
                {section.title}
              </p>
              <div className="bg-white rounded-2xl px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 ${section.color} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${section.iconColor}`} />
                  </div>
                  <div className="flex-1 space-y-2">
                    {section.items.map((item, i) => (
                      <div key={i}>
                        {item.label && (
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
                            {item.label}
                          </p>
                        )}
                        <p className="text-[13px] text-gray-700 font-medium leading-relaxed">
                          {item.value}
                        </p>
                      </div>
                    ))}
                    {section.link && (
                      <button
                        onClick={() => navigate(section.link.to)}
                        className="mt-2 text-[13px] font-bold text-primary flex items-center gap-1 active:scale-95 transition-all"
                      >
                        {section.link.label}
                        <ArrowLeft className="w-3 h-3 rotate-180" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
