import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bot, Phone, Calendar, Clock, User, Users, CheckCircle2,
  Send, Sparkles, MessageSquare, Bell, CalendarCheck, Star,
  Loader2, ChevronRight, PhoneIncoming, ClipboardList, TrendingUp,
  Settings, X, Save, PhoneCall, MapPin, Scissors
} from "lucide-react";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';

const QUICK_ACTIONS = [
  { icon: PhoneIncoming, label: "Appels en attente", prompt: "Quels appels ai-je manqués aujourd'hui ?", color: "from-blue-500 to-blue-600", bg: "bg-blue-50", textColor: "text-blue-600" },
  { icon: CalendarCheck, label: "Confirmer RDV", prompt: "Liste les réservations en attente de confirmation et aide-moi à les confirmer.", color: "from-green-500 to-emerald-600", bg: "bg-green-50", textColor: "text-green-600" },
  { icon: Bell, label: "Rappels clients", prompt: "Envoie des rappels aux clients pour leurs rendez-vous de demain.", color: "from-amber-500 to-orange-600", bg: "bg-amber-50", textColor: "text-amber-600" },
  { icon: ClipboardList, label: "Planning du jour", prompt: "Résume mon planning complet d'aujourd'hui avec les créneaux occupés et disponibles.", color: "from-purple-500 to-violet-600", bg: "bg-purple-50", textColor: "text-purple-600" },
  { icon: Users, label: "Arrivées du jour", prompt: "Qui sont les clients prévus aujourd'hui ? Affiche les détails de chaque RDV.", color: "from-pink-500 to-rose-600", bg: "bg-pink-50", textColor: "text-pink-600" },
  { icon: TrendingUp, label: "Stats du salon", prompt: "Donne-moi un résumé de mes stats : chiffre d'affaires, nombre de RDV, taux de remplissage.", color: "from-primary to-orange-600", bg: "bg-orange-50", textColor: "text-primary" },
];

const SUGGESTIONS = [
  "Analyse mes créneaux libres de la semaine",
  "Quels clients n'ont pas de prochain RDV ?",
  "Gère mes annulations et propose des remplaçants",
  "Prépare un récap de la journée pour l'équipe",
];

export default function ReceptionnistIA() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [todayStats, setTodayStats] = useState({ total: 0, confirmed: 0, pending: 0, completed: 0 });
  const [upcomingRDV, setUpcomingRDV] = useState([]);
  const [proProfile, setProProfile] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [configPhone, setConfigPhone] = useState("");
  const [configSalon, setConfigSalon] = useState("");
  const [configAddress, setConfigAddress] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadProfile();
    loadTodayData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profiles } = await supabase
        .from("ProfilPro")
        .select("*")
        .eq("user_email", user.email)
        .limit(1);

      if (profiles && profiles.length > 0) {
        const profile = profiles[0];
        setProProfile(profile);
        setConfigPhone(profile.phone || "");
        setConfigSalon(profile.salon_name || "");
        setConfigAddress(profile.city || profile.address || "");
      }
    } catch (e) {
      console.error("[ReceptionnistIA] Profile load error:", e);
    }
  };

  const loadTodayData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().slice(0, 10);
      const { data: reservations } = await supabase
        .from("Reservation")
        .select("*")
        .eq("pro_email", user.email)
        .eq("date", today)
        .order("time", { ascending: true });

      if (reservations) {
        const confirmed = reservations.filter(r => r.status === "confirme").length;
        const pending = reservations.filter(r => r.status === "en_attente").length;
        const completed = reservations.filter(r => r.status === "termine").length;
        setTodayStats({ total: reservations.length, confirmed, pending, completed });
        setUpcomingRDV(reservations.filter(r => r.status !== "annule" && r.status !== "termine").slice(0, 5));
      }
    } catch (e) {
      console.error("[ReceptionnistIA] Load error:", e);
    }
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        phone: configPhone.trim(),
        salon_name: configSalon.trim(),
        city: configAddress.trim(),
      };

      if (proProfile?.id) {
        await supabase.from("ProfilPro").update(updates).eq("id", proProfile.id);
      }

      setProProfile(prev => ({ ...prev, ...updates }));
      setShowConfig(false);
    } catch (e) {
      console.error("[ReceptionnistIA] Config save error:", e);
    }
    setSavingConfig(false);
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { id: Date.now(), role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "Pro";
      const salonName = proProfile?.salon_name || "mon salon";
      const phone = proProfile?.phone || "non renseigné";
      const city = proProfile?.city || proProfile?.address || "non renseignée";
      const specialties = proProfile?.specialites?.join(", ") || "beauté-général";

      const systemPrompt = `Tu es Maria, la réceptionniste IA du salon "${salonName}" de ${userName}.

INFORMATIONS DU SALON :
- Nom : ${salonName}
- Professionnel : ${userName}
- Téléphone du salon : ${phone}
- Ville : ${city}
- Spécialités : ${specialties}

TU ES UNE VRAIE RÉCEPTIONNISTE :
- Tu gères les appels téléphoniques du salon (tu peux donner le numéro aux clients)
- Tu accueilles les clients et gères les réservations
- Tu confirmes, modifies ou annules les RDV
- Tu envoies des rappels aux clients
- Tu gères le planning et les créneaux disponibles
- Tu connais les services et tarifs du salon
- Tu es professionnelle, chaleureuse et efficace
- Tu parles toujours en français
- Tu donnes des réponses concises et actionnable
- Quand un client demande le numéro de téléphone, donne toujours ${phone}
- Tu peux orienter vers la page "/rendez-vous" pour réserver`;

      const historyForAI = messages.slice(-6).map(m => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));

      const OR_KEY = (typeof __OPENROUTER_KEY__ !== 'undefined' ? __OPENROUTER_KEY__ : '') || import.meta.env.VITE_OPENROUTER_KEY || '';
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OR_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'BeautyBook Receptionniste IA',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: systemPrompt },
            ...historyForAI,
            { role: 'user', content: text.trim() },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || "Je n'ai pas pu traiter votre demande. Réessayez.";
        setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: reply }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: "Erreur de connexion. Réessayez." }]);
      }
    } catch (e) {
      console.error("[ReceptionnistIA] AI error:", e);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: "Une erreur est survenue. Réessayez dans un instant." }]);
    }
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const isConfigured = proProfile?.phone;

  return (
    <div className="font-display min-h-full bg-[#f8f7f5] flex flex-col">

      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-gray-100 sticky top-0 z-30">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-2xl flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shrink-0 bg-gradient-to-br from-emerald-500 to-teal-600">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-black text-gray-900 leading-none">Réceptionniste IA</h1>
              <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-widest">IA</span>
            </div>
            <p className="text-[10px] text-gray-400 font-medium">{proProfile?.salon_name || "Assistant salon"}</p>
          </div>
        </div>
        <button
          onClick={() => setShowConfig(true)}
          className="w-9 h-9 bg-gray-100 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
        >
          <Settings className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-y-auto pb-24">

        {/* Welcome + Stats */}
        {messages.length === 0 && (
          <div className="px-4 pt-4 pb-4">

            {/* Config Banner */}
            {!isConfigured && (
              <button
                onClick={() => setShowConfig(true)}
                className="w-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3.5 mb-4 flex items-center gap-3 active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-[13px] font-black text-amber-800">Configurez votre réceptionniste</p>
                  <p className="text-[11px] text-amber-600 font-medium">Ajoutez votre numéro de téléphone</p>
                </div>
                <ChevronRight className="w-5 h-5 text-amber-400 shrink-0" />
              </button>
            )}

            {/* Quick Actions — en haut pour être visible immédiatement */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {QUICK_ACTIONS.map(({ icon: Icon, label, prompt, color, bg, textColor }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(prompt)}
                  className={`${bg} rounded-2xl p-3.5 text-left active:scale-[0.97] transition-all border border-transparent hover:shadow-sm`}
                >
                  <div className={`w-9 h-9 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center mb-2 shadow-sm`}>
                    <Icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <p className={`text-[12px] font-black ${textColor}`}>{label}</p>
                </button>
              ))}
            </div>

            {/* Welcome compact */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white mb-4 shadow-lg shadow-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-black leading-tight">Bonjour ! 👋</p>
                  <p className="text-[11px] text-white/80 font-medium truncate">
                    {proProfile?.phone ? `📞 ${proProfile.phone}` : "Ajoutez votre numéro en configuration"}
                  </p>
                </div>
              </div>
            </div>

            {/* Today's Stats */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: "Total", value: todayStats.total, icon: Calendar, color: "text-gray-900" },
                { label: "Confirmés", value: todayStats.confirmed, icon: CheckCircle2, color: "text-green-600" },
                { label: "En attente", value: todayStats.pending, icon: Clock, color: "text-amber-600" },
                { label: "Terminés", value: todayStats.completed, icon: Star, color: "text-primary" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-2xl p-2.5 text-center shadow-sm">
                  <Icon className={`w-4 h-4 ${color} mx-auto mb-0.5`} />
                  <p className={`text-[16px] font-black ${color}`}>{value}</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase">{label}</p>
                </div>
              ))}
            </div>

            {/* Upcoming RDV */}
            {upcomingRDV.length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Prochains rendez-vous</p>
                <div className="space-y-2">
                  {upcomingRDV.map(rdv => (
                    <div key={rdv.id} className="bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-sm">
                      <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black text-gray-900 truncate">{rdv.client_name || rdv.client_email?.split("@")[0]}</p>
                        <p className="text-[11px] text-gray-400 font-medium">{rdv.service_name || "Rendez-vous"} · {rdv.time || rdv.time_slot}</p>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                        rdv.status === "confirme" ? "bg-green-100 text-green-700" :
                        rdv.status === "en_attente" ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {rdv.status === "confirme" ? "Confirmé" : rdv.status === "en_attente" ? "En attente" : rdv.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Suggestions</p>
            <div className="space-y-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="w-full bg-white rounded-2xl px-4 py-3 flex items-center gap-3 text-left active:scale-[0.98] transition-all shadow-sm"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-[12px] font-bold text-gray-600 flex-1">{s}</p>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.length > 0 && (
          <div className="px-4 pt-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-3`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shrink-0 mr-2 mt-1">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-br-md"
                    : "bg-white text-gray-800 shadow-sm rounded-bl-md"
                }`}>
                  <p className="text-[13px] font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-start mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shrink-0 mr-2">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                    <span className="text-[12px] text-gray-400 font-medium">Réflexion...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* ── INPUT BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 pt-3">
          <div className="flex-1 flex items-center bg-gray-100 rounded-2xl px-4 py-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ex: Confirme le RDV de Marie à 14h..."
              className="flex-1 bg-transparent text-[14px] text-gray-700 outline-none placeholder:text-gray-400"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-11 h-11 bg-emerald-500 rounded-2xl flex items-center justify-center shrink-0 active:scale-95 transition-all disabled:opacity-40 shadow-md shadow-emerald-500/20"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </form>
        <p className="text-center text-[9px] text-gray-300 font-medium mt-1.5">MARIA · RÉCEPTIONNISTE IA</p>
      </div>

      {/* ── CONFIG MODAL ── */}
      {showConfig && (
        <div className="fixed inset-0 z-[200] flex items-end" onClick={() => setShowConfig(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white w-full rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Settings className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="text-[18px] font-black text-gray-900">Configuration</h2>
              </div>
              <button onClick={() => setShowConfig(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:scale-95">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Phone Number */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <PhoneCall className="w-4 h-4 text-emerald-600" />
                  <p className="text-[13px] font-black text-gray-900">Numéro de téléphone</p>
                </div>
                <p className="text-[11px] text-gray-400 font-medium mb-3">Ce numéro sera communiqué aux clients par le réceptionniste IA</p>
                <input
                  type="tel"
                  value={configPhone}
                  onChange={e => setConfigPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-[15px] font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                />
              </div>

              {/* Salon Name */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Scissors className="w-4 h-4 text-emerald-600" />
                  <p className="text-[13px] font-black text-gray-900">Nom du salon</p>
                </div>
                <input
                  type="text"
                  value={configSalon}
                  onChange={e => setConfigSalon(e.target.value)}
                  placeholder="Mon Salon de Beauté"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-[15px] font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                />
              </div>

              {/* Address */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <p className="text-[13px] font-black text-gray-900">Ville / Adresse</p>
                </div>
                <input
                  type="text"
                  value={configAddress}
                  onChange={e => setConfigAddress(e.target.value)}
                  placeholder="Paris, France"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-[15px] font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
                />
              </div>

              {/* Info Box */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <p className="text-[12px] text-emerald-700 font-medium leading-relaxed">
                  <span className="font-black">💡 À quoi sert le numéro ?</span><br />
                  Le réceptionniste IA pourra communiquer votre numéro aux clients qui souhaitent vous appeler directement. Il gère aussi les réservations et les rappels.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <button
                onClick={saveConfig}
                disabled={!configPhone.trim() || savingConfig}
                className="w-full py-4 bg-emerald-500 text-white text-[14px] font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {savingConfig ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Enregistrement...</>
                ) : (
                  <><Save className="w-5 h-5" /> Enregistrer</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
