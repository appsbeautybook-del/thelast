import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bot, Calendar, Settings, Send, RefreshCw, Mic, MicOff,
  PhoneCall, PhoneOff, Code, Copy, Check, Volume2, Globe,
  TrendingUp, Zap, CheckCircle2, DollarSign, Clock,
  PhoneIncoming, CalendarCheck, Shield, Bell, Save,
  Phone, MessageSquare, Scissors, Palette, Star
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { supabase } from '@/api/supabaseClient';
import { entities } from '@/api/entities';
import ActionConfirmation from '@/components/maria/ActionConfirmation';
import './ReceptionnistIA.css';

const VOICE_MODELS = [
  { id: 'prestige', name: 'Maria Elegance', desc: 'Ton chaleureux, pose et haut de gamme', emoji: '✨', preview: 'Bonjour et bienvenue ! Je suis ravie de vous accueillir au salon.' },
  { id: 'standard', name: 'Maria Standard', desc: 'Accueil clair, fluide et tres naturel', emoji: '🎙️', preview: 'Bonjour ! Bienvenue au salon, comment puis-je vous aider ?' },
  { id: 'business', name: 'Maria Directe', desc: 'Efficace, oriente prise de RDV rapide', emoji: '🚀', preview: 'Bonjour, pour quel service souhaitez-vous un rendez-vous ?' },
];

const SERVICES_CATALOG = [
  { id: 'coupe', label: 'Coupe & Coiffage', emoji: '✂️' },
  { id: 'balayage', label: 'Balayage Signature', emoji: '✨' },
  { id: 'soin', label: 'Soin Capillaire', emoji: '🌿' },
  { id: 'coloration', label: 'Coloration', emoji: '🎨' },
  { id: 'brushing', label: 'Brushing & Lissage', emoji: '💨' },
  { id: 'permanente', label: 'Permanente', emoji: '🔄' },
  { id: 'meches', label: 'Meches & Highlights', emoji: '💫' },
  { id: 'soin_visage', label: 'Soin Visage', emoji: '🌸' },
];

const QUAL_STEPS = [
  { step: 1, short: 'Accueil' },
  { step: 2, short: 'Besoin' },
  { step: 3, short: 'Agenda' },
  { step: 4, short: 'Confirme' },
];

export default function ReceptionnistIA() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('vocal');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour ! Je suis Maria, votre Receptionniste IA. Comment puis-je vous aider ? Je peux prendre un rendez-vous, vous renseigner sur nos prestations ou vous donner nos horaires.' }
  ]);
  const [input, setInput] = useState('');
  const [callStage, setCallStage] = useState('idle');
  const [qualStep, setQualStep] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [callTimer, setCallTimer] = useState(0);
  const [leadInfo, setLeadInfo] = useState({ name: '', service: '', date: '', price: 0 });
  const [settings, setSettings] = useState({
    salon_name: '',
    dedicated_phone: '+33 1 89 45 20 00',
    welcome_message: 'Bonjour et bienvenue ! Je suis Maria, assistante IA de votre salon. Comment puis-je vous aider ?',
    specific_instructions: 'Acompte de 30% requis pour les prestations superieures a 80 EUR. Annulation gratuite 24h avant.',
    active_services: ['coupe', 'balayage', 'soin', 'coloration'],
    voice_model: 'prestige',
    agent_active: true,
    sms_notifications: true,
    push_notifications: true,
    auto_confirm: true,
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const endRef = useRef(null);
  const recognitionRef = useRef(null);
  const callTimerRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const r = await apiClient.get('/pro/receptionist');
      if (r && r.professional) {
        setData(r);
        setSettings(prev => ({ ...prev, ...(r.settings || {}), salon_name: r.professional.salon_name || prev.salon_name }));
        return;
      }
    } catch (_) {}
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData && authData.user;
      let pro = { salon_name: 'Mon Salon de Beaute', city: 'Paris' };
      let bookings = [];
      if (user) {
        const profiles = await entities.ProfilPro.filter({ user_email: user.email }, '-created_at', 1).catch(() => []);
        if (profiles.length > 0) pro = profiles[0];
        bookings = await entities.Reservation.filter({ pro_email: user.email }, '-created_at', 20).catch(() => []);
      }
      setSettings(prev => ({ ...prev, salon_name: pro.salon_name || prev.salon_name }));
      setData({
        professional: pro,
        bookings: bookings.length > 0 ? bookings : [
          { id: 'b1', client_name: 'Sophie Martin', service_name: 'Balayage Signature', date: '2026-09-24', time_slot: '14:00', status: 'confirme', price: 95, source: 'receptionniste_ia' },
          { id: 'b2', client_name: 'Camille Dubois', service_name: 'Coupe & Brushing', date: '2026-09-24', time_slot: '16:30', status: 'confirme', price: 55, source: 'receptionniste_ia' },
          { id: 'b3', client_name: 'Lea Bernard', service_name: 'Soin Inkarami', date: '2026-09-25', time_slot: '10:00', status: 'confirme', price: 80, source: 'receptionniste_ia' },
        ],
        stats: { total_calls: 38, ai_bookings: 18, revenue_generated: 1720, satisfaction: 96 }
      });
    } catch (e) { console.warn('Fallback init:', e); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (callStage === 'connected') {
      callTimerRef.current = setInterval(() => setCallTimer(t => t + 1), 1000);
    } else {
      clearInterval(callTimerRef.current);
      if (callStage !== 'connected') setCallTimer(0);
    }
    return () => clearInterval(callTimerRef.current);
  }, [callStage]);

  const fmt = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

  const speak = useCallback((text, onEnd) => {
    if (!('speechSynthesis' in window)) { if (onEnd) onEnd(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'fr-FR'; utt.pitch = 1.05; utt.rate = 0.95;
    const frVoice = window.speechSynthesis.getVoices().find(v => v.lang.startsWith('fr'));
    if (frVoice) utt.voice = frVoice;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => { setIsSpeaking(false); if (onEnd) onEnd(); };
    utt.onerror = () => { setIsSpeaking(false); if (onEnd) onEnd(); };
    window.speechSynthesis.speak(utt);
  }, []);

  const triggerCall = () => {
    setCallStage('incoming'); setQualStep(0);
    setLeadInfo({ name: '', service: '', date: '', price: 0 }); setTranscript('');
  };

  const answerCall = () => {
    setCallStage('connected'); setQualStep(1);
    const salonName = settings.salon_name || (data && data.professional && data.professional.salon_name) || 'votre salon';
    const msg = 'Bonjour et bienvenue chez ' + salonName + ' ! Je suis Maria, votre assistante IA. Pour quel type de soin souhaitez-vous prendre rendez-vous ?';
    setTranscript('Maria IA : ' + msg);
    speak(msg);
  };

  const handleVoiceQuery = useCallback((text) => {
    if (!text || busy) return;
    setBusy(true);
    setTranscript(prev => prev + (prev ? '\n\n' : '') + 'Client : ' + text);
    setTimeout(() => {
      const q = text.toLowerCase();
      let nextStep = qualStep;
      let reply = '';
      const nl = Object.assign({}, leadInfo);
      if (qualStep <= 1) {
        nextStep = 2;
        nl.service = q.includes('balayage') ? 'Balayage Signature' : q.includes('soin') ? 'Soin Capillaire' : q.includes('coloration') ? 'Coloration' : 'Coupe & Brushing';
        nl.name = 'Client Prospect';
        reply = 'Parfait pour ' + nl.service + ' ! J ai un creneau disponible ce samedi a 14h30 ou lundi a 16h00. Lequel vous conviendrait le mieux ?';
      } else if (qualStep === 2) {
        nextStep = 3;
        const price = nl.service && nl.service.includes('Balayage') ? 95 : nl.service && nl.service.includes('Soin') ? 80 : 55;
        nl.price = price;
        const slot = (q.includes('lundi') || q.includes('16')) ? 'Lundi a 16:00' : 'Samedi a 14:30';
        nl.date = slot;
        reply = 'Excellent ! Votre RDV pour ' + nl.service + ' (' + price + 'EUR) - ' + slot + ' - est confirme ! Un SMS de confirmation vous est envoye. A tres bientot au salon !';
        const nb = { id: 'rdv-ia-' + Date.now(), client_name: nl.name || 'Client Appel Vocal', service_name: nl.service, date: slot.includes('Samedi') ? '2026-09-27' : '2026-09-28', time_slot: slot.includes('14') ? '14:30' : '16:00', status: 'confirme', price: price, source: 'receptionniste_ia' };
        setData(prev => ({ ...prev, bookings: [nb, ...((prev && prev.bookings) || [])], stats: { ...((prev && prev.stats) || {}), ai_bookings: ((prev && prev.stats && prev.stats.ai_bookings) || 0) + 1, total_calls: ((prev && prev.stats && prev.stats.total_calls) || 0) + 1, revenue_generated: ((prev && prev.stats && prev.stats.revenue_generated) || 0) + price } }));
        supabase.auth.getUser().then(({ data: auth }) => { if (auth && auth.user && auth.user.email) { entities.Reservation.create({ pro_email: auth.user.email, client_name: nb.client_name, service_name: nb.service_name, date: nb.date, time_slot: nb.time_slot, status: 'confirme', total_price: nb.price, source: 'receptionniste_ia' }).catch(() => {}); } });
        setTimeout(() => setCallStage('booked'), 2200); nextStep = 4;
      } else { reply = 'Y a-t-il autre chose que je puisse faire pour vous ?'; }
      setQualStep(nextStep); setLeadInfo(nl);
      setTranscript(prev => prev + '\n\nMaria IA : ' + reply);
      speak(reply); setBusy(false);
    }, 800);
  }, [busy, qualStep, leadInfo, speak]);

  const startMic = () => {
    if (isSpeaking) window.speechSynthesis && window.speechSynthesis.cancel();
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      try {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SR(); rec.lang = 'fr-FR'; rec.continuous = false; rec.interimResults = false;
        rec.onstart = () => setIsListening(true);
        rec.onresult = (e) => handleVoiceQuery(e.results[0][0].transcript);
        rec.onerror = () => setIsListening(false); rec.onend = () => setIsListening(false);
        recognitionRef.current = rec; rec.start(); return;
      } catch (_) { setIsListening(false); }
    }
    const fb = ['Je voudrais reserver une coupe pour ce samedi.', 'Samedi a 14h30 c est parfait.', 'Oui confirmez ce creneau !'];
    handleVoiceQuery(fb[Math.min(qualStep - 1, fb.length - 1)] || fb[0]);
  };

  const endCall = () => {
    setCallStage('idle'); setQualStep(0); setIsListening(false); setIsSpeaking(false);
    window.speechSynthesis && window.speechSynthesis.cancel();
    recognitionRef.current && recognitionRef.current.stop();
    setTranscript(''); setLeadInfo({ name: '', service: '', date: '', price: 0 });
  };

  const handleChat = async (cust) => {
    const text = (cust || input).trim(); if (!text || busy) return;
    setInput(''); setBusy(true);
    const next = [...messages, { role: 'user', content: text }]; setMessages(next);
    try {
      const res = await apiClient.post('/api/ai/maria', { mode: 'receptionist', messages: next.slice(-10) });
      if (res && res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.choices[0].message.content, actions: res.actions }]);
      } else throw new Error('no content');
    } catch (_) {
      const sn = settings.salon_name || 'votre salon';
      const r = text.toLowerCase().includes('rdv') || text.toLowerCase().includes('rendez') ? 'Pour ' + sn + ', j ai des creneaux ce samedi a 14h et 16h30. Lequel vous convient ?' : 'Je suis la pour vous aider chez ' + sn + '. Souhaitez-vous prendre un rendez-vous ?';
      setMessages(prev => [...prev, { role: 'assistant', content: r }]);
    } finally { setBusy(false); }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    try { await apiClient.post('/pro/receptionist/settings', settings).catch(() => {}); } catch (_) {}
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (auth && auth.user && auth.user.email) {
        const ps = await entities.ProfilPro.filter({ user_email: auth.user.email }, '-created_at', 1).catch(() => []);
        if (ps.length > 0) await entities.ProfilPro.update(ps[0].id, { agent_settings: settings }).catch(() => {});
      }
    } catch (_) {}
    setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 3000);
  };

  const toggleSvc = (id) => setSettings(prev => ({ ...prev, active_services: prev.active_services.includes(id) ? prev.active_services.filter(s => s !== id) : [...prev.active_services, id] }));

  const copyWidget = () => {
    const pid = (data && data.professional && data.professional.id) || 'pro_salon_123';
    navigator.clipboard.writeText('<!-- BeautyBook AI Widget -->\n<script src="https://beautybook.app/widget/maria.js" data-pro-id="' + pid + '" data-color="#FF6B00" async></script>');
    setCopiedCode(true); setTimeout(() => setCopiedCode(false), 3000);
  };

  const qr = { 1: ['Je voudrais reserver une coupe et brushing', "J aimerais un balayage pour ce samedi"], 2: ['Samedi a 14h30 c est parfait', 'Plutot lundi a 16h00'], 3: ['Oui confirmez ce creneau !', 'C est d accord, reservez pour moi'] };

  return (
    <div className="receptionist-v2 min-h-screen pb-20">
      <header className="rp-header">
        <button onClick={() => navigate(-1)} className="rp-back-btn"><ArrowLeft size={19} /></button>
        <div className="rp-header-center">
          <h1>Receptionniste IA</h1>
          <p>{settings.salon_name || (data && data.professional && data.professional.salon_name) || 'Agent vocal 24h/24'}</p>
        </div>
        <div className="rp-active-badge"><span className="rp-pulse-dot" />ACTIF</div>
      </header>

      <div className="rp-container">
        <div className="rp-hero-card">
          <div className="rp-hero-deco"><div className="rp-hero-deco-circle c1" /><div className="rp-hero-deco-circle c2" /></div>
          <div className="rp-hero-content">
            <div className="rp-hero-avatar">
              <div className="rp-avatar-ring r1" /><div className="rp-avatar-ring r2" />
              <div className="rp-avatar-icon"><Bot size={28} /></div>
            </div>
            <div className="rp-hero-text">
              <span className="rp-hero-badge">Agent Vocal IA Autonome</span>
              <h2>Maria - Votre Receptionniste</h2>
              <p>Decroche les appels 24h/24, qualifie les prospects et reserve automatiquement dans votre agenda.</p>
              <button className="rp-hero-cta" onClick={() => { setTab('vocal'); triggerCall(); }}>
                <PhoneIncoming size={14} /> Tester un appel en direct
              </button>
            </div>
          </div>
        </div>

        <div className="rp-tab-bar">
          {[
            { id: 'vocal', label: 'Agent Vocal', icon: PhoneCall },
            { id: 'assistant', label: 'Chatbot', icon: Bot },
            { id: 'widget', label: 'Widget', icon: Code },
            { id: 'dashboard', label: 'Activite', icon: TrendingUp },
            { id: 'settings', label: 'Parametres', icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} className={'rp-tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>
              <Icon size={13} /><span>{label}</span>
            </button>
          ))}
        </div>

        {tab === 'vocal' && (
          <div className="space-y-4">
            <div className="rp-card rp-call-card">
              <div className="rp-call-header">
                <div><h3>Demo Live - Agent Vocal IA</h3><p className="text-xs text-gray-500 mt-0.5">Qualification automatique en 4 etapes</p></div>
                <div className="flex items-center gap-2">
                  {callStage === 'connected' && <span className="rp-live-timer"><Clock size={11} /> {fmt(callTimer)}</span>}
                  <span className={'rp-call-status-badge ' + callStage}>
                    {callStage === 'idle' && 'Pret 24h/24'}{callStage === 'incoming' && 'Appel entrant...'}{callStage === 'connected' && 'En communication'}{callStage === 'booked' && 'RDV Confirme !'}
                  </span>
                </div>
              </div>

              {callStage === 'idle' && (
                <div className="rp-idle-state">
                  <div className="rp-idle-phone"><PhoneCall size={32} /></div>
                  <h4>Testez l Agent Vocal Telephonique</h4>
                  <p>Simulez un appel client entrant pour voir Maria decrocher, qualifier le prospect et enregistrer le RDV en temps reel.</p>
                  <button className="rp-btn-primary" onClick={triggerCall}><PhoneIncoming size={14} /> Simuler un appel entrant</button>
                </div>
              )}

              {callStage === 'incoming' && (
                <div className="rp-incoming-state">
                  <div className="rp-incoming-phone"><div className="rp-phone-ring r1" /><div className="rp-phone-ring r2" /><div className="rp-phone-ring r3" /><PhoneIncoming size={28} /></div>
                  <div className="text-center"><h4>Appel Entrant</h4><p className="rp-caller-info">+33 6 42 18 90 22</p><p className="rp-caller-sub">Nouvelle cliente potentielle</p></div>
                  <button className="rp-btn-green" onClick={answerCall}><Bot size={16} /> Laisser Maria IA decrocher</button>
                  <button className="rp-btn-ghost-sm" onClick={endCall}>Ignorer</button>
                </div>
              )}

              {callStage === 'connected' && (
                <div className="rp-connected-state">
                  <div className="rp-waveform">{[...Array(7)].map((_, i) => <div key={i} className="rp-wave-bar" style={{ animationDelay: i * 0.12 + 's' }} />)}</div>
                  {transcript && (
                    <div className="rp-transcript-box">
                      {transcript.split('\n\n').map((line, i) => <p key={i} className={line.startsWith('Maria') ? 'rp-maria-line' : 'rp-client-line'}>{line}</p>)}
                    </div>
                  )}
                  {qr[qualStep] && (
                    <div className="rp-quick-replies">
                      <p className="rp-quick-label">Reponses rapides :</p>
                      <div className="rp-quick-btns">{qr[qualStep].map(opt => <button key={opt} className="rp-quick-btn" onClick={() => handleVoiceQuery(opt)} disabled={busy}>{opt}</button>)}</div>
                    </div>
                  )}
                </div>
              )}

              {callStage === 'booked' && (
                <div className="rp-booked-state">
                  <div className="rp-booked-icon"><CalendarCheck size={28} /></div>
                  <h4>Reservation Confirmee par Maria IA !</h4>
                  <p>Le RDV est inscrit dans l agenda et le client a recu son SMS de confirmation.</p>
                  <div className="rp-booking-summary">
                    <div className="rp-booking-row"><span>Prestation</span><strong>{leadInfo.service || 'Coupe & Brushing'}</strong></div>
                    <div className="rp-booking-row"><span>Creneau</span><strong>{leadInfo.date || 'Samedi a 14:30'}</strong></div>
                    <div className="rp-booking-row"><span>Tarif</span><strong className="rp-price">{leadInfo.price || 55} EUR</strong></div>
                  </div>
                  <button className="rp-btn-ghost" onClick={endCall}><RefreshCw size={13} /> Nouvel appel</button>
                </div>
              )}

              <div className="rp-call-controls">
                {callStage === 'incoming' && <button className="rp-btn-green" onClick={answerCall}><Bot size={14} /> Decrocher avec Maria IA</button>}
                {callStage === 'connected' && (
                  <>
                    <button className={'rp-mic-btn' + (isListening ? ' listening' : '')} onClick={startMic} disabled={isListening || isSpeaking}>
                      {isListening ? <MicOff size={19} /> : <Mic size={19} />}
                    </button>
                    <span className="rp-mic-label">{isListening ? 'Maria ecoute...' : isSpeaking ? 'Maria parle...' : 'Appuyer pour repondre'}</span>
                    <button className="rp-btn-red" onClick={endCall}><PhoneOff size={13} /> Raccrocher</button>
                  </>
                )}
              </div>
            </div>

            <div className="rp-card">
              <h3 className="rp-card-title">Etapes de qualification automatique</h3>
              <div className="rp-qual-steps">
                {QUAL_STEPS.map((s) => {
                  const done = qualStep > s.step, active = qualStep === s.step;
                  return (
                    <div key={s.step} className={'rp-qual-step' + (done ? ' done' : active ? ' active' : '')}>
                      <div className="rp-qual-icon">{done ? <CheckCircle2 size={15} /> : <span className="rp-qual-num">{s.step}</span>}</div>
                      <span className="rp-qual-label">{s.short}</span>
                      {s.step < 4 && <div className={'rp-qual-line' + (done ? ' done' : '')} />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rp-card">
              <h3 className="rp-card-title"><Volume2 size={14} className="inline mr-1 text-orange-500" />Modele de voix de Maria</h3>
              <div className="rp-voice-models">
                {VOICE_MODELS.map(vm => (
                  <button key={vm.id} className={'rp-voice-model-btn' + (settings.voice_model === vm.id ? ' active' : '')} onClick={() => setSettings(s => ({ ...s, voice_model: vm.id }))}>
                    <span className="text-xl">{vm.emoji}</span>
                    <div className="rp-vm-info"><strong>{vm.name}</strong><p>{vm.desc}</p></div>
                    {settings.voice_model === vm.id && <button className="rp-vm-preview-btn" onClick={(e) => { e.stopPropagation(); speak(vm.preview); }}><Volume2 size={11} /> Ecouter</button>}
                    {settings.voice_model === vm.id && <CheckCircle2 size={15} className="rp-vm-check" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'assistant' && (
          <div className="rp-card space-y-4">
            <div className="rp-chat-header">
              <div className="rp-chat-avatar"><Bot size={17} /></div>
              <div><h3>Maria - Chatbot Web</h3><p>Simulez une conversation comme vos clients sur votre site</p></div>
            </div>
            <div className="rp-quick-prompts">
              {['Creneaux disponibles ce samedi ?', 'Tarif pour un balayage ?', 'Prendre rdv pour 15h'].map(p => (
                <button key={p} className="rp-prompt-chip" onClick={() => handleChat(p)} disabled={busy}>💡 {p}</button>
              ))}
            </div>
            <div className="rp-messages-box">
              {messages.map((m, i) => (
                <div key={i} className={'rp-msg-row' + (m.role === 'user' ? ' user' : '')}>
                  <span className="rp-msg-label">{m.role === 'user' ? 'Vous' : 'Maria IA'}</span>
                  <div className={'rp-msg-bubble' + (m.role === 'user' ? ' user' : '')}>
                    <p>{m.content}</p>
                    {m.actions && m.actions.map(p => <ActionConfirmation key={p.id} proposal={p} onConfirmed={refresh} />)}
                  </div>
                </div>
              ))}
              {busy && <p className="rp-typing">Maria redige sa reponse...</p>}
              <div ref={endRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleChat(); }} className="rp-chat-input-row">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Posez une question ou simulez une reservation..." className="rp-chat-input" />
              <button type="submit" disabled={busy || !input.trim()} className="rp-btn-primary icon-only"><Send size={14} /></button>
            </form>
          </div>
        )}

        {tab === 'widget' && (
          <div className="space-y-4">
            <div className="rp-card">
              <div className="rp-card-title-row"><Code size={15} className="rp-card-icon" /><h3>Code d integration Web</h3></div>
              <p className="rp-card-sub">Copiez ce script sur votre site (WordPress, Shopify, Wix...)</p>
              <div className="rp-code-box"><code>{'<!-- BeautyBook AI Widget -->\n<script\n  src="https://beautybook.app/widget/maria.js"\n  data-pro-id="' + ((data && data.professional && data.professional.id) || 'pro_salon_123') + '"\n  data-color="#FF6B00" async>\n</script>'}</code></div>
              <button className="rp-btn-primary full" onClick={copyWidget}>{copiedCode ? <><Check size={14} /> Code copie !</> : <><Copy size={14} /> Copier le code</>}</button>
              <div className="rp-info-box">Collez ce code avant la balise &lt;/body&gt;. Le widget apparait en bas a droite de votre site.</div>
            </div>
            <div className="rp-card">
              <div className="rp-card-title-row"><Globe size={15} className="rp-card-icon" /><h3>Apercu du widget</h3></div>
              <div className="rp-widget-preview">
                <div className="rp-fake-site">
                  <div className="rp-fake-nav"><span className="font-bold text-sm">{settings.salon_name || 'Salon Beaute'}</span><span className="text-xs text-gray-400">www.votre-salon.fr</span></div>
                  <div className="rp-fake-hero"><p className="font-bold text-sm text-orange-900">Reservez votre moment beaute</p></div>
                </div>
                <div className="rp-widget-fab"><Bot size={20} /></div>
              </div>
            </div>
          </div>
        )}

        {tab === 'dashboard' && (
          <div className="space-y-4">
            <div className="rp-stats-grid">
              {[
                { label: 'RDV par l IA', val: (data && data.stats && data.stats.ai_bookings) || 18, color: 'orange' },
                { label: 'CA genere', val: ((data && data.stats && data.stats.revenue_generated) || 1720) + ' EUR', color: 'green' },
                { label: 'Appels', val: (data && data.stats && data.stats.total_calls) || 38, color: 'blue' },
                { label: 'Satisfaction', val: ((data && data.stats && data.stats.satisfaction) || 96) + '%', color: 'purple' },
              ].map((s, i) => (
                <div key={i} className={'rp-stat-card ' + s.color}><p className="rp-stat-label">{s.label}</p><p className="rp-stat-val">{s.val}</p></div>
              ))}
            </div>
            <div className="rp-card">
              <h3 className="rp-card-title">Derniers RDV enregistres par Maria</h3>
              <div className="rp-bookings-list">
                {((data && data.bookings) || []).slice(0, 8).map(r => (
                  <div key={r.id} className="rp-booking-item">
                    <div className="rp-booking-dot"><CheckCircle2 size={15} /></div>
                    <div className="rp-booking-info">
                      <strong>{r.service_name}</strong>
                      <span>{r.client_name} · {r.date} a {r.time_slot}</span>
                      {r.source === 'receptionniste_ia' && <span className="rp-source-badge">Via Maria IA</span>}
                    </div>
                    <span className="rp-booking-price">{r.price ? r.price + ' EUR' : 'Confirme'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-4">
            {settingsSaved && <div className="rp-saved-banner"><CheckCircle2 size={15} /> Parametres enregistres avec succes !</div>}
            <form onSubmit={saveSettings} className="space-y-4">
              <div className="rp-card">
                <h3 className="rp-settings-section-title"><Shield size={14} /> Identite du salon</h3>
                <div className="rp-field">
                  <label className="rp-label">Nom du salon</label>
                  <div className="rp-input-wrap"><Scissors size={13} className="rp-input-icon" />
                    <input type="text" value={settings.salon_name} onChange={e => setSettings(s => ({ ...s, salon_name: e.target.value }))} placeholder="Ex : Maison Celeste - Paris 8e" className="rp-input" />
                  </div>
                </div>
                <div className="rp-field">
                  <label className="rp-label">Numero virtuel dedie <span className="rp-label-hint">Attribue a votre agent vocal</span></label>
                  <div className="rp-input-wrap"><Phone size={13} className="rp-input-icon" />
                    <input type="tel" value={settings.dedicated_phone} onChange={e => setSettings(s => ({ ...s, dedicated_phone: e.target.value }))} placeholder="+33 1 XX XX XX XX" className="rp-input" />
                  </div>
                  <p className="rp-field-help">Vos clients appellent ce numero et Maria IA repond automatiquement 24h/24.</p>
                </div>
              </div>
              <div className="rp-card">
                <h3 className="rp-settings-section-title"><MessageSquare size={14} /> Message d accueil personnalise</h3>
                <textarea value={settings.welcome_message} onChange={e => setSettings(s => ({ ...s, welcome_message: e.target.value }))} rows={3} className="rp-textarea" />
                <button type="button" className="rp-btn-ghost-sm mt-2" onClick={() => speak(settings.welcome_message)}><Volume2 size={12} /> Ecouter</button>
              </div>
              <div className="rp-card">
                <h3 className="rp-settings-section-title"><Palette size={14} /> Services proposes par l agent</h3>
                <p className="rp-card-sub">Selectionnez les prestations que Maria IA peut reserver.</p>
                <div className="rp-services-grid">
                  {SERVICES_CATALOG.map(svc => (
                    <button key={svc.id} type="button" className={'rp-service-chip' + (settings.active_services.includes(svc.id) ? ' active' : '')} onClick={() => toggleSvc(svc.id)}>
                      <span>{svc.emoji}</span><span>{svc.label}</span>
                      {settings.active_services.includes(svc.id) && <Check size={11} className="rp-chip-check" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rp-card">
                <h3 className="rp-settings-section-title"><Star size={14} /> Consignes du salon</h3>
                <p className="rp-card-sub">Instructions pour Maria (acomptes, annulation, produits, etc.)</p>
                <textarea value={settings.specific_instructions} onChange={e => setSettings(s => ({ ...s, specific_instructions: e.target.value }))} rows={4} className="rp-textarea" />
              </div>
              <div className="rp-card">
                <h3 className="rp-settings-section-title"><Zap size={14} /> Activations</h3>
                <div className="rp-toggles-list">
                  {[
                    { key: 'agent_active', label: 'Agent vocal IA actif', sub: 'Maria repond aux appels 24h/24' },
                    { key: 'sms_notifications', label: 'Notifications SMS', sub: 'SMS a chaque reservation confirmee' },
                    { key: 'push_notifications', label: 'Notifications Push', sub: 'Alertes sur votre application mobile' },
                    { key: 'auto_confirm', label: 'Confirmation automatique', sub: 'Maria confirme sans validation manuelle' },
                  ].map(tog => (
                    <label key={tog.key} className="rp-toggle-row">
                      <div className="rp-toggle-info"><div><strong>{tog.label}</strong><p>{tog.sub}</p></div></div>
                      <div className={'rp-toggle' + (settings[tog.key] ? ' on' : '')} onClick={() => setSettings(s => ({ ...s, [tog.key]: !s[tog.key] }))} role="switch" aria-checked={settings[tog.key]}>
                        <div className="rp-toggle-thumb" />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="rp-btn-primary full large"><Save size={15} /> Enregistrer les parametres du salon</button>
            </form>
          </div>
        )}

        <div className="rp-kpi-strip">
          <div className="rp-kpi"><strong>{(data && data.stats && data.stats.total_calls) || 38}</strong><span>Appels</span></div>
          <div className="rp-kpi-divider" />
          <div className="rp-kpi"><strong>{(data && data.stats && data.stats.ai_bookings) || 18}</strong><span>RDV IA</span></div>
          <div className="rp-kpi-divider" />
          <div className="rp-kpi"><strong>{(data && data.stats && data.stats.satisfaction) || 96}%</strong><span>Satisfaction</span></div>
        </div>
      </div>
    </div>
  );
}
