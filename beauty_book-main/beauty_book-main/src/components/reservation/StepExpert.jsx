import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { entities } from "@/api/entities";
import { supabase } from "@/api/supabaseClient";

const PROFILE_IMG = "";

const ANY_EXPERT = {
  id: null,
  name: "Sans préférence",
  subtitle: "Nous choisirons le premier expert disponible pour vous.",
  avatar: null,
  isAny: true,
};

function mapMember(m) {
  return {
    id: m.id,
    name: m.name || m.membre_name || "Membre",
    subtitle: m.specialites || m.specialties || m.role || "Expert BeautyBook",
    avatar: m.membre_avatar || m.avatar_url || null,
    rating: null,
    reviews: null,
    memberEmail: m.membre_email || "",
  };
}

export default function StepExpert({ selected, onSelect, onNext, onBack, proProfile, proEmail }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const current = selected ?? ANY_EXPERT;

  useEffect(() => {
    let cancelled = false;

    const loadMembers = async () => {
      setLoading(true);
      try {
        let results = [];

        // Strategy 1: filter by pro_email if provided
        if (proEmail) {
          results = await entities.MembreEquipe.filter({ pro_email: proEmail }, "-created_at", 50).catch(() => []);
        }

        // Strategy 2: if no results, try logged-in user's email
        if (results.length === 0) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email && user.email !== proEmail) {
            results = await entities.MembreEquipe.filter({ pro_email: user.email }, "-created_at", 50).catch(() => []);
          }
        }

        // Strategy 3: if still no results, try to find via ProfilPro team_emails
        if (results.length === 0 && proProfile?.team_emails?.length > 0) {
          const allMembers = await Promise.all(
            proProfile.team_emails.map(email =>
              entities.MembreEquipe.filter({ pro_email: email }, "-created_at", 20).catch(() => [])
            )
          );
          results = allMembers.flat();
        }

        if (!cancelled) {
          setMembers(results.map(mapMember));
        }
      } catch {
        if (!cancelled) setMembers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMembers();
    return () => { cancelled = true; };
  }, [proEmail, proProfile?.team_emails]);

  const experts = [ANY_EXPERT, ...members];

  const handleSelect = (expert) => {
    onSelect(expert);
    onNext();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5 text-gray-900" />
        </button>
        <div className="flex items-center gap-2">
          {(proProfile?.avatar_url || PROFILE_IMG) && (
            <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-primary shrink-0">
              <img src={proProfile?.avatar_url || PROFILE_IMG} alt={proProfile?.salon_name || ""} className="w-full h-full object-cover" />
            </div>
          )}
          <span className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
            {proProfile?.salon_name || "Réservation"}
          </span>
        </div>
        <div className="w-9" />
      </div>

      {/* Title */}
      <div className="px-5 pb-8">
        <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-2">Étape 02 · Réservation</p>
        <h1 className="text-[42px] font-black text-gray-900 leading-tight">Choix de<br />l'Expert</h1>
        <p className="text-[13px] text-gray-400 font-medium mt-2 leading-relaxed max-w-[300px]">
          Sélectionnez le talent qui saura sublimer votre beauté naturelle.
        </p>
      </div>

      {/* Expert list */}
      <div className="flex-1 px-5 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          experts.map(expert => {
            const isSelected = current?.id === expert.id;
            return (
              <button
                key={expert.id ?? "any"}
                onClick={() => handleSelect(expert)}
                className="w-full flex items-center gap-4 bg-white border-2 rounded-3xl px-4 py-5 active:scale-[0.99] transition-all text-left"
                style={{ borderColor: isSelected ? "#E8732A" : "#f0f0f0" }}
              >
                {/* Avatar */}
                {expert.isAny ? (
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "#E8732A" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border-2" style={{ borderColor: isSelected ? "#E8732A" : "transparent" }}>
                    {expert.avatar ? (
                      <img src={expert.avatar} alt={expert.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-14 rounded-2xl flex items-center justify-center bg-gray-100">
                        <span className="text-[18px] font-black text-gray-400">{expert.name?.[0] || "?"}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-black text-gray-900">{expert.name}</p>
                  <p className="text-[12px] text-gray-400 font-medium leading-snug mt-0.5">{expert.subtitle}</p>
                </div>

                {/* Radio */}
                <div
                  className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                  style={{ borderColor: isSelected ? "#E8732A" : "#d1d5db" }}
                >
                  {isSelected && <div className="w-3 h-3 rounded-full" style={{ background: "#E8732A" }} />}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="h-20" />
    </div>
  );
}
