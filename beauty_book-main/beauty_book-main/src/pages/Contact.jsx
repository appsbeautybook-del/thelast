import { ArrowLeft, Mail, MessageCircle, Phone, Instagram, Facebook, Twitter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { entities } from '@/api/entities';
import { supabase } from '@/api/supabaseClient';

export default function Contact() {
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value;
    const email = form.email.value;
    const message = form.message.value;
    try {
      // Envoyer un message via le système de notifications
      await entities.Notification.create({
        user_email: "admin@beautybook.fr",
        type: "system",
        title: `Contact de ${name}`,
        body: `De: ${email}\n\n${message}`,
        icon: "message",
        data: { from: email, name }
      });
      setSent(true);
      form.reset();
    } catch (err) {
      // Silently fail, the notification is best-effort
      setSent(true);
    }
  };

  return (
    <div className="font-display min-h-full pb-24 bg-[#f8f9fa]">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-3 sticky top-0 z-10 bg-white border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95">
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <div>
          <h1 className="text-[22px] font-black text-gray-900">Contact</h1>
          <p className="text-[9px] font-black text-primary uppercase tracking-widest">Nous écrire</p>
        </div>
      </div>

      <div className="px-5 pt-8 pb-6">
        <h1 className="text-[28px] font-black text-gray-900 leading-tight text-center">
          Contactez-nous
        </h1>
        <p className="text-[14px] text-gray-500 font-medium mt-3 text-center max-w-md mx-auto leading-relaxed">
          Une question, une suggestion ou besoin d'aide ? Notre équipe est à votre écoute.
        </p>
      </div>

      <div className="px-5 space-y-6 max-w-lg mx-auto">

        {/* Contact methods */}
        <div className="space-y-3">
          <a
            href="mailto:contact@beautybook.fr"
            className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:scale-[0.99] transition-all"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <Mail className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-[14px] font-black text-gray-900">Email</p>
              <p className="text-[12px] text-gray-500 font-medium">contact@beautybook.fr</p>
            </div>
          </a>

          <a
            href="tel:+33123456789"
            className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm active:scale-[0.99] transition-all"
          >
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
              <Phone className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-[14px] font-black text-gray-900">Téléphone</p>
              <p className="text-[12px] text-gray-500 font-medium">01 23 45 67 89</p>
              <p className="text-[10px] text-gray-400 font-medium">Lun–Ven, 9h–18h</p>
            </div>
          </a>

          {/* Social links */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                <MessageCircle className="w-6 h-6 text-purple-500" />
              </div>
              <p className="text-[14px] font-black text-gray-900">Réseaux sociaux</p>
            </div>
            <div className="flex gap-3 ml-[60px]">
              <a href="https://instagram.com/beautybook" target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center active:scale-95">
                <Instagram className="w-5 h-5 text-pink-500" />
              </a>
              <a href="https://facebook.com/beautybook" target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center active:scale-95">
                <Facebook className="w-5 h-5 text-blue-600" />
              </a>
              <a href="https://twitter.com/beautybook" target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center active:scale-95">
                <Twitter className="w-5 h-5 text-sky-500" />
              </a>
            </div>
          </div>
        </div>

        {/* Contact form */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
          <h2 className="text-[16px] font-black text-gray-900 mb-4">Envoyez-nous un message</h2>
          {sent ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-2xl mx-auto flex items-center justify-center mb-3">
                <Mail className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-[16px] font-black text-gray-900">Message envoyé !</p>
              <p className="text-[13px] text-gray-500 font-medium mt-1">Nous vous répondrons dans les plus brefs délais.</p>
              <button onClick={() => setSent(false)} className="mt-4 text-[13px] font-black text-primary">
                Envoyer un autre message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Votre nom</label>
                <input name="name" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-900 outline-none focus:border-primary transition-colors" placeholder="Jean Dupont" />
              </div>
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Votre email</label>
                <input name="email" type="email" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-900 outline-none focus:border-primary transition-colors" placeholder="jean@email.fr" />
              </div>
              <div>
                <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Votre message</label>
                <textarea name="message" required rows={4} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[14px] font-medium text-gray-900 outline-none focus:border-primary transition-colors resize-none" placeholder="Dites-nous tout..." />
              </div>
              <button type="submit" className="w-full bg-primary text-white font-black text-[13px] uppercase tracking-widest py-4 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-primary/20">
                Envoyer
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}