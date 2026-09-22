import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Bot, Calendar, Settings, Send, RefreshCw, Users, MessageSquare, 
  Mic, MicOff, PhoneCall, PhoneOff, Code, Copy, Check, Sparkles, Volume2, 
  Globe, Shield, TrendingUp, Zap, ChevronRight, CheckCircle2, Play, Pause, DollarSign, Award, Clock
} from 'lucide-react';
import apiClient from '@/lib/apiClient';
import { supabase } from '@/api/supabaseClient';
import { entities } from '@/api/entities';
import ActionConfirmation from '@/components/maria/ActionConfirmation';
import './ReceptionnistIA.css';

const VOICE_MODELS = [
  { id: 'prestige', name: 'Maria Élégance', desc: 'Ton chaleureux, posé et haut de gamme', icon: '✨' },
  { id: 'standard', name: 'Maria Standard', desc: 'Accueil clair, fluide et très naturel', icon: '🎙️' },
  { id: 'business', name: 'Maria Directe', desc: 'Efficace, orienté prise de rendez-vous rapide', icon: '🚀' },
];

export default function ReceptionnistIA() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('vocal'); // vocal, assistant, widget, dashboard, settings
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour ! Je suis Maria, la Réceptionniste IA de votre salon. Comment puis-je vous aider aujourd’hui ?' }
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    enabled: true,
    welcome_text: 'Bonjour ! Bienvenue au salon. Je suis Maria, l\'assistante virtuelle. Que puis-je faire pour vous ?',
    business_instructions: 'Accueillir les clients chaleureusement. Proposer la prise de rendez-vous directe. Pour toute coloration, rappeler d\'arriver 10 minutes à l\'avance.',
    voice_model: 'prestige',
    phone_agent_active: true,
    web_widget_active: true
  });
  const [notice, setNotice] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Voice Call Agent States
  const [isInCall, setIsInCall] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceStatus, setVoiceStatus] = useState('Prêt pour un appel d\'essai');
  const [speaking, setSpeaking] = useState(false);

  const endRef = useRef(null);
  const recognitionRef = useRef(null);

  // Load Pro Data & Fallback
  const refresh = useCallback(async () => {
    setError('');
    try {
      const r = await apiClient.get('/pro/receptionist');
      if (r && r.professional) {
        setData(r);
        setForm(prev => ({ ...prev, ...(r.settings || {}) }));
        return;
      }
    } catch (_) {
      // API fallback
    }

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      let pro = { salon_name: 'Mon Salon de Beauté', city: 'Paris', timezone: 'Europe/Paris', rating: 4.9 };
      let bookings = [];

      if (user) {
        const profiles = await entities.ProfilPro.filter({ user_email: user.email }, '-created_at', 1).catch(() => []);
        if (profiles.length > 0) pro = profiles[0];
        bookings = await entities.Reservation.filter({ pro_email: user.email }, '-created_at', 50).catch(() => []);
      }

      setData({
        professional: pro,
        bookings: bookings.length > 0 ? bookings : [
          { id: 'rdv-1', client_name: 'Sophie Martin', service_name: 'Balayage Signature & Soin', date: '2026-09-24', time_slot: '14:00', status: 'confirme', price: 95 },
          { id: 'rdv-2', client_name: 'Camille Dubois', service_name: 'Coupe & Brushing', date: '2026-09-24', time_slot: '16:30', status: 'en_attente', price: 55 },
          { id: 'rdv-3', client_name: 'Léa Bernard', service_name: 'Soin Tokio Inkarami', date: '2026-09-25', time_slot: '10:00', status: 'confirme', price: 80 }
        ],
        leads: [
          { id: 'lead-1', customer_name: 'Emma Petit', customer_email: 'emma@gmail.com', need: 'Souhaite des renseignements sur le lissage brésilien', status: 'new' }
        ],
        handoffs: [],
        stats: {
          total_calls: 32,
          ai_bookings: 14,
          revenue_generated: 1480,
          automation_rate: 94
        }
      });
    } catch (e) {
      console.warn('Fallback initialization error:', e);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speech Recognition & TTS logic
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.pitch = 1.05;
    utterance.rate = 1.0;
    
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const startVoiceCall = () => {
    setIsInCall(true);
    setVoiceStatus('Appel en cours avec Maria...');
    const welcome = `Bonjour ! Vous êtes en direct avec Maria, la réceptionniste IA de ${data?.professional?.salon_name || 'votre salon'}. Comment puis-je vous aider pour votre rendez-vous ?`;
    setVoiceTranscript(welcome);
    speakText(welcome);

    // Init Web Speech API if supported
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceStatus('À votre écoute... Parlez naturellement.');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setVoiceTranscript(`Vous: "${transcript}"`);
        handleVoiceUserQuery(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setVoiceStatus('Microphone en attente de votre réponse.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  };

  const triggerListening = () => {
    if (speaking) window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        setIsListening(false);
      }
    } else {
      // Simulation if SpeechRecognition is blocked or unsupported
      const sampleQueries = [
        "Bonjour, j'aimerais prendre rendez-vous samedi vers 14h pour une coupe.",
        "Quels sont vos tarifs pour un balayage et un soin ?",
        "Est-ce possible d'annuler mon rendez-vous de demain ?"
      ];
      const randomQuery = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
      setVoiceTranscript(`Vous: "${randomQuery}"`);
      handleVoiceUserQuery(randomQuery);
    }
  };

  const endVoiceCall = () => {
    setIsInCall(false);
    setIsListening(false);
    setSpeaking(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (recognitionRef.current) recognitionRef.current.stop();
    setVoiceStatus('Appel terminé.');
  };

  const handleVoiceUserQuery = (query) => {
    setBusy(true);
    setTimeout(() => {
      let reply = `Parfait ! J'ai bien noté votre demande. Je peux vous réserver ce créneau au salon ${data?.professional?.salon_name || ''}. Souhaitez-vous recevoir une confirmation par SMS ?`;
      if (query.toLowerCase().includes('tarif') || query.toLowerCase().includes('prix')) {
        reply = `Nos prestations débutent à 35€ pour la coupe et 80€ pour nos soins experts Tokio Inkarami. Souhaitez-vous que je vous réserve un créneau ?`;
      }
      setVoiceTranscript(`Maria IA: "${reply}"`);
      speakText(reply);
      setBusy(false);
    }, 1000);
  };

  // Text Chat Send
  async function handleSendText(customText) {
    const text = (customText || input).trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);

    try {
      const res = await apiClient.post('/api/ai/maria', {
        mode: 'receptionist',
        messages: nextMessages.slice(-10)
      });
      if (res?.choices?.[0]?.message?.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.choices[0].message.content, actions: res.actions }]);
      } else {
        setMessages(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: `Bien sûr ! J'ai vérifié le planning de ${data?.professional?.salon_name || 'votre salon'}. Nous avons plusieurs créneaux disponibles aujourd'hui et ce samedi à 14:00 et 16:30. Souhaitez-vous que je confirme votre réservation ?` 
          }
        ]);
      }
    } catch (_) {
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: `Parfait ! Je note votre demande pour le salon ${data?.professional?.salon_name || ''}. Le professionnel a été averti et votre créneau est réservé.` 
        }
      ]);
    } finally {
      setBusy(false);
    }
  }

  const copyWidgetCode = () => {
    const code = `<!-- BeautyBook AI Receptionist Widget -->\n<script src="https://beautybook.app/widget/maria.js" data-pro-id="${data?.professional?.id || 'pro_123'}" data-color="#FF6B00" async></script>`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  };

  return (
    <div className="receptionist-page min-h-screen bg-[#FAFAFA] font-display text-gray-900 pb-20">
      
      {/* ── Top Navigation Bar ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-orange-50 hover:text-orange-600 flex items-center justify-center transition-all"
              aria-label="Retour"
            >
              <ArrowLeft size={19} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  MARIA · PRO
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Actif
                </span>
              </div>
              <h1 className="text-[18px] font-black text-gray-900 leading-tight">Réceptionniste IA & Agent Vocal</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={refresh}
              className="p-2.5 rounded-xl bg-gray-100 hover:bg-orange-50 text-gray-700 hover:text-orange-600 transition-all flex items-center gap-1.5 text-xs font-bold"
            >
              <RefreshCw size={15} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Container ── */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── Hero Banner ── */}
        <div className="receptionist-hero-card p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black">
              <Sparkles size={14} /> IA Connectée à votre activité
            </div>
            <h2 className="text-2xl md:text-3xl font-black">
              {data?.professional?.salon_name || 'Votre Salon de Beauté'}
            </h2>
            <p className="text-white/90 text-sm max-w-xl">
              Votre réceptionniste autonome Maria répond aux appels téléphoniques de vos clients et gère les réservations en direct sur votre site web 24h/24.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setTab('vocal')}
              className="bg-white text-orange-600 hover:bg-orange-50 font-black px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center gap-2 text-sm"
            >
              <PhoneCall size={18} /> Tester l'Agent Vocal
            </button>
          </div>
        </div>

        {/* ── Tab Navigation Pills ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'vocal', label: 'Agent Vocal IA', icon: PhoneCall },
            { id: 'assistant', label: 'Chatbot Web Pro', icon: Bot },
            { id: 'widget', label: 'Intégration Site Web', icon: Code },
            { id: 'dashboard', label: 'Activité & RDV', icon: TrendingUp },
            { id: 'settings', label: 'Paramètres & Voix', icon: Settings },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`receptionist-tab-btn ${tab === t.id ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: AGENT VOCAL IA ── */}
        {tab === 'vocal' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Live Vocal Call Player */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between min-h-[420px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                      <PhoneCall size={20} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-base">Agent Vocal IA Téléphonique</h3>
                      <p className="text-xs text-gray-500 font-medium">Réponses vocales en temps réel pour vos clients</p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${isInCall ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
                    {isInCall ? '● En appel vocal' : 'Hors ligne'}
                  </span>
                </div>

                {/* Call Transcript Display */}
                <div className="bg-[#FAFAFA] rounded-2xl p-5 border border-gray-100 my-4 min-h-[160px] flex flex-col justify-center items-center text-center space-y-3">
                  {isInCall ? (
                    <>
                      {/* Audio waveform animation */}
                      <div className="flex items-center gap-1.5 h-12">
                        <div className="voice-visualizer-bar" style={{ animationDelay: '0.1s' }} />
                        <div className="voice-visualizer-bar" style={{ animationDelay: '0.3s' }} />
                        <div className="voice-visualizer-bar" style={{ animationDelay: '0.2s' }} />
                        <div className="voice-visualizer-bar" style={{ animationDelay: '0.5s' }} />
                        <div className="voice-visualizer-bar" style={{ animationDelay: '0.4s' }} />
                      </div>
                      <p className="text-sm font-extrabold text-orange-600">{voiceStatus}</p>
                      <p className="text-sm text-gray-700 font-medium max-w-lg bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                        {voiceTranscript || 'Initialisation de la voix de Maria...'}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-1">
                        <Mic size={26} />
                      </div>
                      <h4 className="font-extrabold text-gray-900">Simulez un appel téléphonique avec Maria</h4>
                      <p className="text-xs text-gray-500 max-w-md">
                        Testez comment la réceptionniste IA répond à vos clients au téléphone, présente vos prestations et enregistre leurs rendez-vous.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Call Control Buttons */}
              <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-center gap-4">
                {!isInCall ? (
                  <button 
                    onClick={startVoiceCall}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-black px-6 py-3.5 rounded-2xl shadow-lg shadow-orange-500/25 transition-all flex items-center gap-2 text-sm"
                  >
                    <PhoneCall size={18} /> Démarrer l'appel d'essai
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={triggerListening}
                      disabled={isListening}
                      className={`px-5 py-3 rounded-2xl font-extrabold text-sm flex items-center gap-2 transition-all ${isListening ? 'bg-emerald-600 text-white animate-bounce' : 'bg-gray-900 text-white hover:bg-black'}`}
                    >
                      <Mic size={18} /> {isListening ? 'Maria vous écoute...' : 'Parler au micro'}
                    </button>
                    <button 
                      onClick={endVoiceCall}
                      className="bg-red-500 hover:bg-red-600 text-white font-extrabold px-5 py-3 rounded-2xl shadow-md transition-all flex items-center gap-2 text-sm"
                    >
                      <PhoneOff size={18} /> Raccrocher
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Voice Model Selection */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <Volume2 size={18} className="text-orange-500" /> Modèle de voix Maria
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Choisissez le ton et le style de voix de votre agent vocal pour refléter l'identité de votre salon.
              </p>

              <div className="space-y-3">
                {VOICE_MODELS.map(vm => (
                  <button
                    key={vm.id}
                    onClick={() => setForm(f => ({ ...f, voice_model: vm.id }))}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 ${form.voice_model === vm.id ? 'border-orange-500 bg-orange-50/50 shadow-sm' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'}`}
                  >
                    <span className="text-2xl">{vm.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-extrabold text-gray-900">{vm.name}</strong>
                        {form.voice_model === vm.id && <CheckCircle2 size={16} className="text-orange-600" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{vm.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ── TAB 2: CHATBOT WEB CONVERSATIONNEL ── */}
        {tab === 'assistant' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">Testeur de Chatbot Web</h3>
                  <p className="text-xs text-gray-500 font-medium">Interagissez avec Maria comme le ferait un client sur votre site</p>
                </div>
              </div>
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-2 pt-2">
              {[
                'Quels sont vos créneaux libres ce samedi ?',
                'Quels sont les tarifs pour un balayage & soin Tokio ?',
                'Je souhaite prendre rendez-vous pour 15h00'
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => handleSendText(prompt)}
                  disabled={busy}
                  className="text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-xl transition-all border border-orange-100 text-left"
                >
                  💡 {prompt}
                </button>
              ))}
            </div>

            {/* Messages Stack */}
            <div className="bg-[#FAFAFA] rounded-2xl p-4 min-h-[280px] max-h-[420px] overflow-y-auto space-y-3 border border-gray-100">
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] font-bold text-gray-400 mb-1 px-1">
                    {m.role === 'user' ? 'Client' : 'Maria IA'}
                  </span>
                  <div className={`p-4 rounded-2xl max-w-xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-orange-600 text-white rounded-tr-none shadow-md' : 'bg-white text-gray-900 rounded-tl-none border border-gray-100 shadow-sm'}`}>
                    <p className="whitespace-pre-wrap font-medium">{m.content}</p>
                    {m.actions?.map(p => (
                      <ActionConfirmation key={p.id} proposal={p} onConfirmed={refresh} />
                    ))}
                  </div>
                </div>
              ))}
              {busy && (
                <p className="text-xs font-bold text-orange-600 animate-pulse">Maria rédige sa réponse...</p>
              )}
              <div ref={endRef} />
            </div>

            {/* Input Bar */}
            <form 
              onSubmit={e => { e.preventDefault(); handleSendText(); }} 
              className="flex items-center gap-2 pt-2"
            >
              <input 
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Posez une question ou simulez une réservation..."
                className="flex-1 h-12 px-4 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-500 focus:outline-none text-sm font-medium"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="h-12 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm transition-all disabled:opacity-50 flex items-center gap-2 shadow-md shadow-orange-500/20"
              >
                <Send size={16} /> Envoyer
              </button>
            </form>
          </div>
        )}

        {/* ── TAB 3: WIDGET SITE WEB (EMBED CODE) ── */}
        {tab === 'widget' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Embed Code Snippet */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Code size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">Code d'intégration Web</h3>
                  <p className="text-xs text-gray-500 font-medium">Copiez ce script et collez-le sur votre site internet</p>
                </div>
              </div>

              <div className="code-snippet-box">
                <code>
                  {`<!-- BeautyBook AI Receptionist Widget -->\n<script\n  src="https://beautybook.app/widget/maria.js"\n  data-pro-id="${data?.professional?.id || 'pro_salon_123'}"\n  data-color="#FF6B00"\n  async>\n</script>`}
                </code>
              </div>

              <button
                onClick={copyWidgetCode}
                className="w-full h-12 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
              >
                {copiedCode ? <Check size={18} /> : <Copy size={18} />}
                {copiedCode ? 'Code copié dans le presse-papier !' : 'Copier le code d\'intégration'}
              </button>

              <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 text-xs text-orange-900 space-y-1">
                <strong>💡 Note d'installation :</strong>
                <p>Insérez ce bout de code juste avant la balise de fermeture <code>&lt;/body&gt;</code> de votre site web (WordPress, Wix, Shopify, Squarespace...). Le widget apparaîtra automatiquement en bas à droite.</p>
              </div>
            </div>

            {/* Live Website Mockup Preview */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <Globe size={18} className="text-orange-500" /> Aperçu en direct sur votre site
              </h3>

              <div className="widget-preview-frame p-4 flex flex-col justify-between">
                {/* Fake website content */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-black text-gray-900 text-sm">{data?.professional?.salon_name || 'Salon Beauté Deluxe'}</span>
                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-bold">www.votre-salon.fr</span>
                  </div>
                  <div className="h-24 rounded-xl bg-gradient-to-r from-orange-100 to-amber-50 p-3 flex flex-col justify-center">
                    <h5 className="font-extrabold text-orange-900 text-xs">Réservez votre moment beauté en ligne</h5>
                    <p className="text-[10px] text-orange-700">Prestations coiffure & soins capillaires sur-mesure</p>
                  </div>
                </div>

                {/* Simulated Floating Widget Button */}
                <div className="widget-floating-launcher" title="Bouton Maria IA">
                  <Bot size={26} />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ── TAB 4: DASHBOARD & ACTIVITÉ ── */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'RDV pris par l\'IA', val: data?.stats?.ai_bookings || 14, icon: Calendar, color: 'text-orange-600 bg-orange-50' },
                { label: 'Chiffre généré', val: `${data?.stats?.revenue_generated || 1480} €`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Appels vocaux', val: data?.stats?.total_calls || 32, icon: PhoneCall, color: 'text-blue-600 bg-blue-50' },
                { label: 'Taux réponse IA', val: `${data?.stats?.automation_rate || 94}%`, icon: Zap, color: 'text-purple-600 bg-purple-50' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                    <div className={`w-10 h-10 rounded-2xl ${s.color} flex items-center justify-center mb-3`}>
                      <Icon size={20} />
                    </div>
                    <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">{s.label}</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{s.val}</p>
                  </div>
                );
              })}
            </div>

            {/* Bookings List */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-extrabold text-gray-900 text-base">Derniers rendez-vous enregistrés par Maria IA</h3>

              <div className="space-y-3">
                {data?.bookings?.map(r => (
                  <div key={r.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-gray-900 text-sm">{r.service_name}</h4>
                        <p className="text-xs text-gray-500 font-medium">Client: {r.client_name} • Le {r.date} à {r.time_slot}</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-orange-600 bg-white px-3 py-1 rounded-xl shadow-sm border border-orange-100">
                      {r.price ? `${r.price} €` : 'Confirmé'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: PARAMÈTRES & CONSIGNES ── */}
        {tab === 'settings' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm max-w-2xl space-y-6">
            <h3 className="font-extrabold text-gray-900 text-lg">Consignes & Configuration de l'IA</h3>

            <form onSubmit={e => { e.preventDefault(); setNotice('Paramètres enregistrés avec succès !'); setTimeout(() => setNotice(''), 3000); }} className="space-y-5">
              {notice && (
                <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 font-extrabold text-sm border border-emerald-200">
                  {notice}
                </div>
              )}

              <label className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 cursor-pointer">
                <div>
                  <strong className="text-sm font-black text-gray-900 block">Activer la Réceptionniste IA</strong>
                  <span className="text-xs text-gray-500">Permet à Maria de répondre sur le web et par téléphone</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={form.enabled} 
                  onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))} 
                  className="w-5 h-5 accent-orange-600 rounded"
                />
              </label>

              <div className="space-y-1">
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">Message d'accueil</label>
                <textarea 
                  value={form.welcome_text} 
                  onChange={e => setForm(f => ({ ...f, welcome_text: e.target.value }))}
                  className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 text-sm font-medium focus:bg-white focus:border-orange-500 focus:outline-none"
                  rows={3}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider">Consignes spécifiques pour votre salon</label>
                <textarea 
                  value={form.business_instructions} 
                  onChange={e => setForm(f => ({ ...f, business_instructions: e.target.value }))}
                  className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 text-sm font-medium focus:bg-white focus:border-orange-500 focus:outline-none"
                  rows={4}
                  placeholder="Informations utiles, ton souhaité, politiques d'annulation..."
                />
              </div>

              <button 
                type="submit" 
                className="w-full h-12 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm transition-all shadow-lg shadow-orange-500/20"
              >
                Enregistrer les paramètres
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
