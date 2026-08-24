import { useState, useEffect } from "react";
import { adminApi } from '@/lib/adminApiClient';
import { Plus, X, Check, Pencil, Loader2, Settings, Folder, Tag, ChevronRight } from "lucide-react";

export const CONFIG_KEY = "boutique_categories";

export const DEFAULT_BOUTIQUE_CATS = [
  { id: "tout",      label: "Tout",      subs: ["Vêtements", "Chaussures", "Accessoires", "Sport", "Livraison Express"] },
  { id: "homme",     label: "Homme",     subs: ["Vêtements", "Chaussures", "Accessoires", "Sacs", "Sport"] },
  { id: "femme",     label: "Femme",     subs: ["Vêtements", "Chaussures", "Sacs", "Bijoux", "Lingerie"] },
  { id: "enfant",    label: "Enfant",    subs: ["Fille", "Garçon", "Chaussures", "Jouets"] },
  { id: "beaute",    label: "Beauté",    subs: ["Maquillage", "Soins Visage", "Cheveux", "Parfums", "Outils"] },
  { id: "bebe",      label: "Bébé",      subs: ["Vêtements", "Éveil", "Sommeil", "Repas", "Hygiène"] },
  { id: "grossiste", label: "Grossiste", subs: ["Beauté", "Vêtements", "Accessoires", "Hygiène", "Alimentaire", "Divers"] },
];

export default function AdminBoutiqueCategories({ onSaved }) {
  const [cats, setCats] = useState(DEFAULT_BOUTIQUE_CATS);
  const [configId, setConfigId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("categories"); // "categories" | "subcategories"
  const [selectedCatId, setSelectedCatId] = useState("homme");
  const [newCatLabel, setNewCatLabel] = useState("");
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatLabel, setEditingCatLabel] = useState("");
  const [newSubInput, setNewSubInput] = useState("");

  useEffect(() => {
    adminApi.getConfig(CONFIG_KEY)
      .then(res => {
        const data = Array.isArray(res) ? res : res?.data || res;
        const rows = data?.results || data || [];
        if (rows[0]?.value?.categories?.length > 0) {
          setCats(rows[0].value.categories);
          setConfigId(rows[0].id);
          if (rows[0].value.categories[0]?.id) {
            setSelectedCatId(rows[0].value.categories[0].id);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = async (newCats) => {
    setSaving(true);
    try {
      if (configId) {
        await adminApi.updateConfig(configId, { value: { categories: newCats }, description: "Catégories boutique" });
      } else {
        const { data } = await adminApi.createConfig({ key: CONFIG_KEY, value: { categories: newCats }, description: "Catégories boutique" });
        if (data?.result?.id) setConfigId(data.result.id);
      }
      setDirty(false);
      onSaved?.();
    } catch (e) {
      alert("Erreur de sauvegarde : " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const update = (newCats) => { setCats(newCats); setDirty(true); };

  const addCat = () => {
    if (!newCatLabel.trim()) return;
    const id = newCatLabel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "_");
    if (cats.find(c => c.id === id)) return;
    const nextCats = [...cats, { id, label: newCatLabel.trim(), subs: [] }];
    update(nextCats);
    setSelectedCatId(id);
    setNewCatLabel("");
  };

  const deleteCat = (id) => {
    if (!confirm("Supprimer cette catégorie et ses sous-catégories ?")) return;
    const nextCats = cats.filter(c => c.id !== id);
    update(nextCats);
    if (selectedCatId === id && nextCats[0]) setSelectedCatId(nextCats[0].id);
  };

  const renameCat = (id) => {
    if (!editingCatLabel.trim()) return;
    update(cats.map(c => c.id === id ? { ...c, label: editingCatLabel.trim() } : c));
    setEditingCatId(null);
  };

  const addSub = () => {
    if (!newSubInput.trim() || !selectedCatId) return;
    const subVal = newSubInput.trim();
    update(cats.map(c => c.id === selectedCatId ? { ...c, subs: [...(c.subs || []).filter(s => s !== subVal), subVal] } : c));
    setNewSubInput("");
  };

  const deleteSub = (catId, subToDelete) => {
    update(cats.map(c => c.id === catId ? { ...c, subs: c.subs.filter(s => s !== subToDelete) } : c));
  };

  const selectedCategory = cats.find(c => c.id === selectedCatId) || cats[0];

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-5 bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">

      {/* Header avec bouton enregistrer */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <h3 className="text-[16px] font-black text-gray-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" /> Catégories &amp; sous-catégories boutique
          </h3>
          <p className="text-[11px] text-gray-400 font-medium">Synchronisées avec l'application principale</p>
        </div>
        {dirty && (
          <button
            onClick={() => persist(cats)}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-[12px] font-black shadow-md shadow-primary/20 disabled:opacity-50 active:scale-95 transition-all"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Enregistrer les modifications
          </button>
        )}
      </div>

      {/* ── Deux Onglets : Catégories et Sous-catégories ── */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("categories")}
          className={`flex-1 py-2.5 rounded-lg text-[13px] font-black flex items-center justify-center gap-2 transition-all ${
            activeTab === "categories"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Folder className="w-4 h-4 text-primary" /> Catégories ({cats.length})
        </button>
        <button
          onClick={() => setActiveTab("subcategories")}
          className={`flex-1 py-2.5 rounded-lg text-[13px] font-black flex items-center justify-center gap-2 transition-all ${
            activeTab === "subcategories"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Tag className="w-4 h-4 text-orange-500" /> Sous-catégories ({selectedCategory?.subs?.length || 0})
        </button>
      </div>

      {/* ── ONGLET 1 : CATÉGORIES UNIQUEMENT ── */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          {/* Formulaire ajout catégorie */}
          <div className="flex gap-2">
            <input
              value={newCatLabel}
              onChange={e => setNewCatLabel(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCat()}
              placeholder="Nouvelle catégorie (ex: Électronique, Sport…)"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-primary"
            />
            <button
              onClick={addCat}
              disabled={!newCatLabel.trim()}
              className="bg-primary text-white px-5 rounded-xl flex items-center gap-1.5 text-[13px] font-black active:scale-95 disabled:opacity-40 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Ajouter la catégorie
            </button>
          </div>

          {/* Liste propre des catégories uniquement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cats.map(cat => (
              <div
                key={cat.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                  selectedCatId === cat.id
                    ? "bg-orange-50/60 border-orange-200 shadow-sm"
                    : "bg-gray-50/60 border-gray-200 hover:border-gray-300"
                }`}
              >
                {editingCatId === cat.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      value={editingCatLabel}
                      onChange={e => setEditingCatLabel(e.target.value)}
                      autoFocus
                      onKeyDown={e => e.key === "Enter" && renameCat(cat.id)}
                      className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-[13px] outline-none"
                    />
                    <button onClick={() => renameCat(cat.id)} className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingCatId(null)} className="w-8 h-8 bg-gray-200 text-gray-500 rounded-lg flex items-center justify-center">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-[14px] font-black text-gray-900">{cat.label}</p>
                    <p className="text-[11px] text-gray-400 font-semibold">{cat.subs?.length || 0} sous-catégorie(s)</p>
                  </div>
                )}

                {editingCatId !== cat.id && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedCatId(cat.id);
                        setActiveTab("subcategories");
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-200 hover:border-primary text-primary rounded-xl text-[11px] font-black flex items-center gap-1 active:scale-95 transition-all"
                    >
                      Sous-catégories <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => { setEditingCatId(cat.id); setEditingCatLabel(cat.label); }}
                      className="w-8 h-8 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-blue-500 hover:bg-blue-50"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteCat(cat.id)}
                      className="w-8 h-8 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ONGLET 2 : SOUS-CATÉGORIES DYNAMIQUES ── */}
      {activeTab === "subcategories" && (
        <div className="space-y-5">
          {/* Sélection de la catégorie parent */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">
              Sélectionnez la catégorie parent
            </label>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {cats.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCatId(c.id)}
                  className={`px-4 py-2 rounded-xl text-[12px] font-black transition-all shrink-0 ${
                    selectedCatId === c.id
                      ? "bg-primary text-white shadow-sm shadow-primary/30"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {c.label} ({c.subs?.length || 0})
                </button>
              ))}
            </div>
          </div>

          {/* Gestion des sous-catégories pour la catégorie choisie */}
          {selectedCategory && (
            <div className="bg-orange-50/40 rounded-2xl p-5 border border-orange-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-black text-gray-900">
                    Sous-catégories de <span className="text-primary">{selectedCategory.label}</span>
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium">
                    {selectedCategory.subs?.length || 0} sous-catégorie(s) associée(s)
                  </p>
                </div>
              </div>

              {/* Badges des sous-catégories avec suppression */}
              <div className="flex flex-wrap gap-2">
                {(!selectedCategory.subs || selectedCategory.subs.length === 0) && (
                  <p className="text-[12px] text-gray-400 italic">Aucune sous-catégorie pour {selectedCategory.label}.</p>
                )}
                {selectedCategory.subs?.map(sub => (
                  <span
                    key={sub}
                    className="flex items-center gap-1.5 bg-white border border-orange-200 text-[12px] font-black text-gray-800 px-3 py-1.5 rounded-full shadow-sm"
                  >
                    {sub}
                    <button
                      onClick={() => deleteSub(selectedCategory.id, sub)}
                      className="w-4 h-4 rounded-full bg-gray-100 hover:bg-red-500 hover:text-white text-gray-400 flex items-center justify-center transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Formulaire ajout sous-catégorie */}
              <div className="flex gap-2 pt-2">
                <input
                  value={newSubInput}
                  onChange={e => setNewSubInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addSub()}
                  placeholder={`Ajouter une sous-catégorie à ${selectedCategory.label}…`}
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-primary"
                />
                <button
                  onClick={addSub}
                  disabled={!newSubInput.trim()}
                  className="bg-gray-900 text-white px-5 rounded-xl flex items-center gap-1.5 text-[12px] font-black active:scale-95 disabled:opacity-40 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}