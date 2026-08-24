import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, MessageCircle, Phone, Mail, CheckCircle } from "lucide-react";
import { useThemeBg } from "@/hooks/useTheme";

const SUBJECTS = ["Question générale", "Problème technique", "Remboursement", "Compte professionnel", "Signaler un problème", "Autre"];

export default function Contactez() {
  const navigate = useNavigate();
  const themeBg = useThemeBg();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!subject || !message || loading) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="font-display min-h-screen flex flex-col" style={{ background: themeBg }}>
        <div className="bg-white px-5 pt-12 pb-4 flex items-center gap-3 shadow-sm">
          <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all">
            <ArrowLeft className="w-4 h-4 text-primary" />
          </button>
          <h1 className="text-[20px] font-black text-gray-900">Contactez-nous</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <div>
            <h2 className="text-[28px] font-black text-gray-900 mb-2">Message envoyé !</h2>
            <p className="text-[14px] text-gray-400 font-medium leading-relaxed max-w-[280px]">
              Notre équipe vous répondra dans les 24h ouvrées. Merci pour votre message.
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-4 rounded-full font-black text-[14px] uppercase tracking-widest text-white active:scale-95 transition-all mt-4"
            style={{ background: "#E8732A" }}
          >
            Retour aux paramètres
          </button>
        </div>
      </div>
    );
  }

  const inputClass = "w-full bg-gray-100 rounded-2xl px-4 py-3.5 text-[14px] font-medium text-gray-800 outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-gray-400";

  return (
    <div className="font-display min-h-screen" style={{ background: themeBg }}>
      <div className="bg-white px-5 pt-12 pb-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4 text-primary" />
        </button>
        <h1 className="text-[20px] font-black text-gray-900">Contactez-nous</h1>
      </div>

      <div className="px-4 pb-20 pt-5 space-y-5">

        {/* Hero */}
        <div className="relative rounded-3xl overflow-hidden h-32">
          <img src="" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center px-5">
            <p className="text-white text-[20px] font-black leading-tight">On est là<br />pour vous 💬</p>
          </div>
        </div>

        {/* Canaux rapides */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: MessageCircle, label: "Chat", sub: "< 5 min", color: "bg-green-50", iconColor: "text-green-500" },
            { icon: Phone, label: "Appel", sub: "Lun-Ven", color: "bg-blue-50", iconColor: "text-blue-500" },
            { icon: Mail, label: "Email", sub: "< 24h", color: "bg-orange-50", iconColor: "text-primary" },
          ].map(({ icon: Icon, label, sub, color, iconColor }, i) => (
            <button key={i} className={`${color} rounded-2xl py-3.5 flex flex-col items-center gap-1 active:scale-95 transition-all`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
              <p className="text-[12px] font-black text-gray-900">{label}</p>
              <p className="text-[9px] text-gray-400 font-medium">{sub}</p>
            </button>
          ))}
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-3xl p-5 space-y-4">
          <p className="text-[16px] font-black text-gray-900">Envoyer un message</p>

          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Sujet</p>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map(s => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className="px-3 py-2 rounded-xl border-2 text-[11px] font-black transition-all active:scale-95"
                  style={{
                    borderColor: subject === s ? "#E8732A" : "#e5e7eb",
                    background: subject === s ? "#E8732A" : "white",
                    color: subject === s ? "white" : "#374151",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Message</p>
            <textarea
              className={inputClass + " resize-none h-28"}
              placeholder="Décrivez votre problème ou question..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!subject || !message || loading}
            className="w-full py-4 rounded-2xl font-black text-[14px] uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "#E8732A" }}
          >
            {loading ? "Envoi..." : (<><Send className="w-4 h-4" /> Envoyer</>)}
          </button>
        </div>

      </div>
    </div>
  );
}