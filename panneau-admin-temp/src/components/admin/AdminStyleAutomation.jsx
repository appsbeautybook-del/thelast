import { useState, useEffect, useCallback } from "react";
import { entities } from "@/api/entities";
import {
  Loader2, Clock, BarChart3, Search, Database,
  CheckCircle, AlertCircle, History, Zap, Globe, Plus, X,
  ChevronDown, ChevronUp, Image as ImageIcon,
} from "lucide-react";

const OPENROUTER_KEY_B64 = "";
const OPENROUTER_KEY = atob(OPENROUTER_KEY_B64);
const GROK_MODEL = "x-ai/grok-4.3";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

const AUTO_QUERIES = [
  "coiffures afro",
  "box braids",
  "maquillage professionnel",
  "nail art",
  "coiffures mariage",
  "soins visage",
  "barbe homme",
  "massage",
  "épilation",
  "coiffures crépus",
  "coloration cheveux",
  "spa détente",
];

export default function AdminStyleAutomation() {
  const [isEnabled, setIsEnabled] = useState(() => localStorage.getItem("bb_style_auto_enabled") === "true");
  const [frequency, setFrequency] = useState(() => localStorage.getItem("bb_style_auto_frequency") || "quotidienne");
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState("");
  const [createdCount, setCreatedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [stats, setStats] = useState(() => {
    const s = localStorage.getItem("bb_style_auto_stats");
    return s ? JSON.parse(s) : { totalStyles: 0, lastSearch: null, totalSearches: 0 };
  });
  const [logs, setLogs] = useState(() => {
    const l = localStorage.getItem("bb_style_auto_log");
    return l ? JSON.parse(l) : [];
  });
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [isManualSearching, setIsManualSearching] = useState(false);
  const [isCreatingStyle, setIsCreatingStyle] = useState(false);
  const [createdStyles, setCreatedStyles] = useState(() => {
    const s = localStorage.getItem("bb_style_auto_recent");
    return s ? JSON.parse(s) : [];
  });
  const [showJournal, setShowJournal] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    const h = localStorage.getItem("bb_style_auto_history");
    return h ? JSON.parse(h) : [];
  });
  const [selectedStyles, setSelectedStyles] = useState({});
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { localStorage.setItem("bb_style_auto_enabled", isEnabled.toString()); }, [isEnabled]);
  useEffect(() => { localStorage.setItem("bb_style_auto_frequency", frequency); }, [frequency]);
  useEffect(() => { localStorage.setItem("bb_style_auto_stats", JSON.stringify(stats)); }, [stats]);
  useEffect(() => { localStorage.setItem("bb_style_auto_log", JSON.stringify(logs)); }, [logs]);
  useEffect(() => { localStorage.setItem("bb_style_auto_recent", JSON.stringify(createdStyles)); }, [createdStyles]);
  useEffect(() => { localStorage.setItem("bb_style_auto_history", JSON.stringify(searchHistory)); }, [searchHistory]);

  const grokChat = async (messages, temperature = 0.7, maxTokens = 4096) => {
    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "HTTP-Referer": "https://thelastjiren.vercel.app",
        "X-Title": "BeautyBook",
      },
      body: JSON.stringify({ model: GROK_MODEL, messages, temperature, max_tokens: maxTokens }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `API error: ${res.status}`);
    }
    return res.json();
  };

  const getRealImages = (styleTitle, category, count = 3) => {
    const keywords = [
      ...styleTitle.toLowerCase().split(/\s+/).filter(w => w.length > 2),
      ...category.toLowerCase().split(/\s+/).filter(w => w.length > 2),
      "beauty", "salon",
    ].slice(0, 4);
    const query = keywords.join(",");
    const images = [];
    for (let i = 0; i < count; i++) {
      const seed = encodeURIComponent(styleTitle.replace(/\s/g, "-").toLowerCase()) + i;
      images.push({
        url: `https://loremflickr.com/400/400/${query}?lock=${seed}`,
        thumb: `https://loremflickr.com/200/200/${query}?lock=${seed}`,
        alt: styleTitle,
      });
    }
    return images;
  };

  const generateAllStyles = async (query) => {
    const result = await grokChat([{
      role: "user",
      content: `Tu es un expert beauté mondial. Pour "${query}", liste TOUTES les variantes et sous-types qui existent VRAIMENT dans le monde. Pas de fiction, que des vrais styles connus et utilisés par les professionnels.

Inclus chaque variante, chaque technique, chaque sous-catégorie. Par exemple pour "coiffures afro": box braids, cornrows, twist out, bantu knots, faux locs, crochet braids, etc.

Retourne UNIQUEMENT ce JSON (sans markdown, sans texte) :
{
  "styles": [
    {
      "title": "Nom exact du style",
      "category": "Coiffure|Maquillage|Ongles|Soins|Barbe|Massage|Spa & Bien-être|Épilation",
      "subcategory": "Sous-catégorie pertinente",
      "description": "Description de 2-3 lignes sur ce style exact, ses caractéristiques, et qui le porte",
      "temps_moyen": "Durée réaliste",
      "niveau_difficulte": "Débutant|Intermédiaire|Avancé|Expert",
      "type_cheveux": "Type si applicable ou vide",
      "type_peau": "Type si applicable ou vide",
      "outils_utilises": ["Outil 1", "Outil 2"],
      "tags": ["tag1", "tag2"]
    }
  ]
}

Minimum 15 styles. Maximum 30 styles. TOUS les vrais styles qui existent.`,
    }], 0.7, 16000);
    const content = result?.choices?.[0]?.message?.content || "";
    const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    return JSON.parse(cleaned);
  };

  const searchStyle = async (query) => {
    let data;
    try {
      data = await generateAllStyles(query);
    } catch {
      data = { styles: [{ title: query, category: "Coiffure", subcategory: "Style", description: `Style: ${query}.`, temps_moyen: "1h", niveau_difficulte: "Intermédiaire", type_cheveux: "", type_peau: "", outils_utilises: [], tags: [] }] };
    }
    const allStyles = data.styles || [];
    if (allStyles.length === 0) throw new Error("Aucun style trouvé");
    return {
      styles: allStyles.map(style => ({
        ...style,
        images: getRealImages(style.title, style.category, 3),
      })),
      query,
    };
  };

  const handleManualSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsManualSearching(true);
    setError(null);
    setSearchResults(null);
    try {
      const data = await searchStyle(searchQuery.trim());
      setSearchResults(data);
      const allSel = {};
      data.styles.forEach((_, idx) => { allSel[idx] = true; });
      setSelectedStyles(allSel);
      setSearchHistory(prev => [{
        id: Date.now(), query: data.query, date: new Date().toISOString(),
        count: data.styles?.length || 0,
      }, ...prev].slice(0, 50));
    } catch (err) {
      setError(err.message || "Erreur lors de la recherche");
    } finally {
      setIsManualSearching(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleManualSearch(); };
  const toggleStyleSelection = (idx) => setSelectedStyles(prev => ({ ...prev, [idx]: !prev[idx] }));
  const toggleSelectAll = () => {
    if (!searchResults?.styles?.length) return;
    const allSel = Object.values(selectedStyles).every(Boolean);
    if (allSel) { setSelectedStyles({}); }
    else { const s = {}; searchResults.styles.forEach((_, i) => { s[i] = true; }); setSelectedStyles(s); }
  };
  const selectedCount = Object.values(selectedStyles).filter(Boolean).length;

  const handleAddSelectedStyles = async () => {
    if (!searchResults?.styles?.length) return;
    const indices = Object.entries(selectedStyles).filter(([, v]) => v).map(([k]) => parseInt(k));
    if (indices.length === 0) { setError("Aucun style sélectionné"); return; }
    setIsCreatingStyle(true);
    setError(null);
    let created = 0, skipped = 0;
    try {
      const existing = await entities.Style.list("-created_at", 500).catch(() => []);
      const existingTitles = new Set((existing || []).map(s => s.title?.toLowerCase()));
      for (const idx of indices) {
        const style = searchResults.styles[idx];
        if (!style || existingTitles.has(style.title?.toLowerCase())) { skipped++; continue; }
        try {
          await entities.Style.create({
            title: style.title,
            category: style.category,
            subcategory: style.subcategory || "",
            description: style.description || "",
            images: (style.images || []).map(i => i.url),
            image_url: style.images?.[0]?.url || null,
            temps_moyen: style.temps_moyen || "",
            niveau_difficulte: style.niveau_difficulte || "Intermédiaire",
            type_cheveux: style.type_cheveux || "",
            type_peau: style.type_peau || "",
            outils_utilises: style.outils_utilises || [],
            tags: style.tags || [],
            status: "publie",
            pro_email: "admin@beautybook.fr",
            likes: 0,
            views: 0,
            featured: false,
          });
          setCreatedStyles(prev => [{
            id: Date.now() + created, title: style.title, category: style.category,
            thumbnail: style.images?.[0]?.thumb || null,
            date: new Date().toISOString(),
          }, ...prev].slice(0, 50));
          created++;
          existingTitles.add(style.title.toLowerCase());
        } catch { skipped++; }
      }
      setStats(prev => ({ ...prev, totalStyles: prev.totalStyles + created, lastSearch: new Date().toISOString() }));
      setLogs(prev => [{
        id: Date.now(), date: new Date().toISOString(), status: "success",
        summary: `Créé: ${created} style(s), ${skipped} ignoré(s)`,
      }, ...prev].slice(0, 50));
      setSearchResults(null);
      setSearchQuery("");
    } catch (err) {
      setError("Erreur: " + (err.message || "inconnue"));
    } finally {
      setIsCreatingStyle(false);
    }
  };

  const simulateAutoSearch = useCallback(async () => {
    setIsSearching(true);
    setProgress(0);
    setCreatedCount(0);
    setSkippedCount(0);
    setError(null);
    try {
      const existing = await entities.Style.list("-created_at", 500).catch(() => []);
      const existingTitles = new Set((existing || []).map(s => s.title?.toLowerCase()));
      const queries = searchQuery.trim()
        ? [searchQuery.trim(), ...AUTO_QUERIES.filter(q => q !== searchQuery.trim()).sort(() => Math.random() - 0.5).slice(0, 5)]
        : [...AUTO_QUERIES].sort(() => Math.random() - 0.5).slice(0, 6);
      let created = 0, skipped = 0;
      for (let i = 0; i < queries.length; i++) {
        setProgress(Math.round(((i + 1) / queries.length) * 100));
        setCurrentAction(`"${queries[i]}" (${i + 1}/${queries.length})`);
        try {
          const data = await generateAllStyles(queries[i]);
          for (const style of (data.styles || [])) {
            if (!style?.title || existingTitles.has(style.title.toLowerCase())) { skipped++; continue; }
            try {
              const images = getRealImages(style.title, style.category, 3);
              await entities.Style.create({
                title: style.title, category: style.category, subcategory: style.subcategory || "",
                description: style.description || "", images: images.map(i => i.url),
                image_url: images[0]?.url || null, temps_moyen: style.temps_moyen || "",
                niveau_difficulte: style.niveau_difficulte || "Intermédiaire",
                type_cheveux: style.type_cheveux || "", type_peau: style.type_peau || "",
                outils_utilises: style.outils_utilises || [], tags: style.tags || [],
                status: "publie", pro_email: "admin@beautybook.fr",
                likes: 0, views: 0, featured: false,
              });
              created++;
              existingTitles.add(style.title.toLowerCase());
              setCreatedStyles(prev => [{
                id: Date.now() + created + skipped, title: style.title, category: style.category,
                thumbnail: images[0]?.thumb || null, date: new Date().toISOString(),
              }, ...prev].slice(0, 50));
            } catch { skipped++; }
          }
        } catch { skipped++; }
      }
      setProgress(100);
      setCreatedCount(created);
      setSkippedCount(skipped);
      setStats(prev => ({ ...prev, totalStyles: prev.totalStyles + created, lastSearch: new Date().toISOString(), totalSearches: prev.totalSearches + 1 }));
      setLogs(prev => [{
        id: Date.now(), date: new Date().toISOString(), status: created > 0 ? "success" : "warning",
        summary: `Auto: ${created} créé(s), ${skipped} ignoré(s)`,
      }, ...prev].slice(0, 50));
    } catch (err) {
      setError(err.message);
      setLogs(prev => [{ id: Date.now(), date: new Date().toISOString(), status: "error", summary: err.message }, ...prev].slice(0, 50));
    } finally {
      setIsSearching(false);
      setCurrentAction("");
    }
  }, [searchQuery, stats]);

  const formatDate = (d) => {
    if (!d) return "Jamais";
    return new Date(d).toLocaleDateString("fr-FR") + " " + new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-gray-900 text-[15px] font-black">Recherche & Automatisation</h3>
            <p className="text-gray-500 text-[13px] font-medium">Grok IA — Tous les vrais styles beauté du monde</p>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex-1">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ex: coiffure afro, box braids, nail art..."
              className="flex-1 bg-transparent text-gray-700 text-[13px] outline-none placeholder:text-gray-400" />
          </div>
          <button onClick={handleManualSearch} disabled={isManualSearching || isSearching || !searchQuery.trim()}
            className="bg-primary text-white px-5 py-3 rounded-xl text-[13px] font-black disabled:opacity-60 flex items-center justify-center gap-2 active:scale-95 transition-all">
            {isManualSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {isManualSearching ? "Recherche..." : "Rechercher"}
          </button>
          <button onClick={simulateAutoSearch} disabled={isSearching || isManualSearching}
            className="bg-gray-800 text-white px-5 py-3 rounded-xl text-[13px] font-black disabled:opacity-60 flex items-center justify-center gap-2 active:scale-95 transition-all">
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {isSearching ? (currentAction ? currentAction.substring(0, 20) + "..." : "...") : "Auto"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-[12px] font-medium">Activer l'auto</span>
            <button onClick={() => setIsEnabled(!isEnabled)}
              className={`relative w-10 h-5 rounded-full transition-all ${isEnabled ? "bg-primary" : "bg-gray-300"}`}>
              <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all"
                style={{ left: isEnabled ? "22px" : "2px" }} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <select value={frequency} onChange={e => setFrequency(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-2 py-1.5 text-[12px] outline-none">
              <option value="quotidienne">Quotidienne</option>
              <option value="hebdomadaire">Hebdomadaire</option>
              <option value="mensuelle">Mensuelle</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-red-600 text-[12px] font-medium">{error}</p>
          </div>
        )}

        {searchResults && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ImageIcon className="w-4 h-4 text-primary" />
                <span className="text-gray-800 text-[13px] font-black">{searchResults.styles?.length} résultat(s)</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-600 font-medium">
                  <input type="checkbox" checked={searchResults.styles?.length > 0 && Object.values(selectedStyles).every(Boolean)}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-primary" />
                  Tout
                </label>
                {selectedCount > 0 && (
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{selectedCount} sel.</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedCount > 0 && (
                  <button onClick={handleAddSelectedStyles} disabled={isCreatingStyle}
                    className="bg-primary text-white px-3 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-60 flex items-center gap-1 active:scale-95 transition-all">
                    {isCreatingStyle ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Ajouter ({selectedCount})
                  </button>
                )}
                <button onClick={() => setSearchResults(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {searchResults.styles?.map((style, idx) => (
                <div key={idx} className={`${idx > 0 ? "border-t border-gray-100 pt-6" : ""}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <input type="checkbox" checked={!!selectedStyles[idx]}
                      onChange={() => toggleStyleSelection(idx)}
                      className="w-4 h-4 mt-1 rounded border-gray-300 text-primary shrink-0" />
                    <h3 className="text-gray-900 text-[16px] font-black flex-1">
                      <span className="text-primary mr-2">{idx + 1}.</span>{style.title}
                    </h3>
                  </div>

                  {style.images?.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3 rounded-xl overflow-hidden ml-7">
                      {style.images.map((img, imgIdx) => (
                        <div key={imgIdx} className="aspect-square bg-gray-100 overflow-hidden">
                          <img src={img.thumb || img.url} alt={style.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            onError={e => { e.target.style.display = "none"; }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {style.description && (
                    <p className="text-gray-600 text-[13px] leading-relaxed mb-3 ml-7">
                      Les <strong className="text-gray-900">{style.title}</strong> {style.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 ml-7">
                    <span className="text-[10px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-bold">{style.category}</span>
                    {style.subcategory && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{style.subcategory}</span>}
                    {style.temps_moyen && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />{style.temps_moyen}
                      </span>
                    )}
                    {style.niveau_difficulte && <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{style.niveau_difficulte}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchHistory.length > 0 && !searchResults && (
          <div className="mt-3">
            <button onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-[12px] text-gray-500 hover:text-gray-700 font-medium transition-colors">
              <History className="w-3.5 h-3.5" />
              Historique ({searchHistory.length})
              {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showHistory && (
              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                {searchHistory.map((h) => (
                  <button key={h.id} onClick={() => setSearchQuery(h.query)}
                    className="w-full flex items-center justify-between p-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left">
                    <div className="flex items-center gap-2 min-w-0">
                      <Search className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="text-gray-700 text-[12px] font-medium truncate">{h.query}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-gray-400">{h.count} résultats</span>
                      <span className="text-[10px] text-gray-400">{new Date(h.date).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isSearching && (
          <div className="mt-4 border border-blue-100 bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-blue-700 text-[13px] font-bold">{currentAction}</span>
            </div>
            <div className="h-2 bg-blue-100 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex gap-4 text-[12px]">
              <span className="text-green-600 font-bold">{createdCount} créé(s)</span>
              <span className="text-amber-600 font-bold">{skippedCount} ignoré(s)</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-indigo-500" />
          </div>
          <h3 className="text-gray-900 text-[15px] font-black">Récemment créés ({createdStyles.length})</h3>
        </div>
        {createdStyles.length === 0 ? (
          <p className="text-gray-400 text-[13px] text-center py-6">Aucun style créé.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
            {createdStyles.map(s => (
              <div key={s.id} className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                <div className="aspect-square bg-gray-100">
                  {s.thumbnail ? (
                    <img src={s.thumbnail} alt={s.title} className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-gray-300" /></div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-gray-800 text-[11px] font-bold truncate">{s.title}</p>
                  <p className="text-gray-500 text-[10px]">{s.category}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-purple-500" />
          </div>
          <h3 className="text-gray-900 text-[15px] font-black">Statistiques</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-500 text-[11px] font-medium mb-1">Styles total</p>
            <p className="text-gray-900 text-[20px] font-black">{stats.totalStyles}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-500 text-[11px] font-medium mb-1">Recherches</p>
            <p className="text-gray-900 text-[20px] font-black">{stats.totalSearches}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-500 text-[11px] font-medium mb-1">Requêtes auto</p>
            <p className="text-gray-900 text-[20px] font-black">{AUTO_QUERIES.length}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-500 text-[11px] font-medium mb-1">Dernière recherche</p>
            <p className="text-gray-900 text-[13px] font-black">{formatDate(stats.lastSearch)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <button onClick={() => setShowJournal(!showJournal)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <History className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-gray-900 text-[15px] font-black">Journal</h3>
          </div>
          {showJournal ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        {showJournal && (
          <div className="space-y-3 mt-4 max-h-80 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-400 text-[13px] text-center py-4">Aucune recherche</p>
            ) : logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="shrink-0 mt-0.5">
                  {log.status === "success" ? <CheckCircle className="w-5 h-5 text-green-500" />
                    : log.status === "warning" ? <AlertCircle className="w-5 h-5 text-amber-500" />
                    : <AlertCircle className="w-5 h-5 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 text-[13px] font-medium">{log.summary}</p>
                  <p className="text-gray-500 text-[11px]">{formatDate(log.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <Database className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="text-gray-900 text-[15px] font-black">Sources</h3>
        </div>
        <div className="space-y-3">
          {[
            { name: "Grok 4.3 (xAI)", desc: "Tous les vrais styles beauté du monde" },
            { name: "LoremFlickr", desc: "Images réelles par mot-clé" },
            { name: "Supabase", desc: "Stockage et publication automatique" },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-500" />
                <div>
                  <span className="text-gray-800 text-[13px] font-medium">{s.name}</span>
                  <span className="text-gray-400 text-[11px] ml-2">{s.desc}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-500 text-[11px]">Actif</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
