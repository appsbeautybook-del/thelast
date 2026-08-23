import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminReels from "@/components/admin/AdminReels";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminServices from "@/components/admin/AdminServices";
import AdminCommandes from "@/components/admin/AdminCommandes";
import AdminReservations from "@/components/admin/AdminReservations";
import AdminAnnonces from "@/components/admin/AdminAnnonces";
import AdminStats from "@/components/admin/AdminStats";
import AdminPublications from "@/components/admin/AdminPublications";
import AdminLives from "@/components/admin/AdminLives";
import AdminStyles from "@/components/admin/AdminStyles";
import AdminProsRequests from "@/components/admin/AdminProsRequests";
import AdminNotifications from "@/components/admin/AdminNotifications";
import AdminAvis from "@/components/admin/AdminAvis";
import AdminHomePage from "@/components/admin/AdminHomePage";
import AdminLivraisonExpress from "@/components/admin/AdminLivraisonExpress";
import AdminImmobilier from "@/components/admin/AdminImmobilier";
import AdminExplorer from "@/components/admin/AdminExplorer";
import AdminVendeurs from "@/components/admin/AdminVendeurs";
import AdminBoutique from "@/components/admin/AdminBoutique";
import AdminPaiement from "@/components/admin/AdminPaiement";
import AdminAppearance from "@/components/admin/AdminAppearance";
import AdminMessages from "@/components/admin/AdminMessages";
import AdminFidelite from "@/components/admin/AdminFidelite";
import {
  LayoutDashboard, Video, Users, Scissors, ShoppingBag,
  CalendarCheck, Megaphone, LogOut, Menu, X, PlusSquare,
  Radio, Palette, UserCheck, Bell, Star, Home, ChevronRight,
  BookOpen, Truck, Building2, Compass, Store, ShoppingBasket, CreditCard, Type, MessageSquare, Gift,
  Search, ShieldAlert, Sparkles
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Vue d'ensemble",
    items: [
      { id: "stats", label: "Tableau de bord & KPIs", icon: LayoutDashboard },
    ]
  },
  {
    label: "Membres & Acteurs",
    items: [
      { id: "users", label: "Clients & Comptes", icon: Users },
      { id: "pros", label: "Professionnels (Salons & Indép.)", icon: UserCheck, badge: true },
      { id: "avis", label: "Avis & Commentaires", icon: Star },
      { id: "messages", label: "Messages & Support", icon: MessageSquare, badge: true },
      { id: "notifications", label: "Push & Notifications", icon: Bell },
    ]
  },
  {
    label: "Contenu & Modération",
    items: [
      { id: "home", label: "Page d'accueil App", icon: Home },
      { id: "styles", label: "Styles & Tendances", icon: Palette },
      { id: "publications", label: "Publications & Posts", icon: PlusSquare },
      { id: "reels", label: "Modération Réels", icon: Video },
      { id: "lives", label: "Lives / Directs", icon: Radio },
      { id: "annonces", label: "Bannières & Pubs", icon: Megaphone },
      { id: "explorer", label: "Explorer (Section)", icon: Compass },
    ]
  },
  {
    label: "Services & Business",
    items: [
      { id: "services", label: "Catalogue Services", icon: Scissors },
      { id: "commandes", label: "Commandes Produits", icon: ShoppingBag },
      { id: "reservations", label: "Réservations RDV", icon: CalendarCheck },
      { id: "boutique", label: "Boutique Officielle", icon: ShoppingBasket },
      { id: "livraison_express", label: "Livraison Express", icon: Truck },
      { id: "immobilier", label: "Espaces & Immobilier", icon: Building2 },
      { id: "vendeurs", label: "Espace Vendeurs", icon: Store },
    ]
  },
  {
    label: "Fidélité & Récompenses",
    items: [
      { id: "fidelite", label: "Programme Fidélité", icon: Gift },
    ]
  },
  {
    label: "Configuration",
    items: [
      { id: "paiement", label: "Paiements & Abonnements", icon: CreditCard },
      { id: "appearance", label: "Thème & Apparence", icon: Type },
    ]
  },
];

const ALL_TABS = NAV_GROUPS.flatMap(g => g.items);

const COMPONENTS = {
  stats: AdminStats,
  home: AdminHomePage,
  styles: AdminStyles,
  publications: AdminPublications,
  reels: AdminReels,
  lives: AdminLives,
  annonces: AdminAnnonces,
  users: AdminUsers,
  pros: AdminProsRequests,
  avis: AdminAvis,
  messages: AdminMessages,
  notifications: AdminNotifications,
  services: AdminServices,
  commandes: AdminCommandes,
  reservations: AdminReservations,
  boutique: AdminBoutique,
  livraison_express: AdminLivraisonExpress,
  immobilier: AdminImmobilier,
  explorer: AdminExplorer,
  vendeurs: AdminVendeurs,
  paiement: AdminPaiement,
  appearance: AdminAppearance,
  fidelite: AdminFidelite,
};

const TAB_DESCRIPTIONS = {
  stats: "Performances en temps réel, indicateurs clés et gestion des utilisateurs",
  home: "Personnalisez et agencez la page d'accueil mobile",
  styles: "Gérez les styles et les catalogues de tendances",
  pros: "Validation des profils professionnels (salons & particuliers)",
  users: "Consultez et gérez la base d'utilisateurs et clients",
  notifications: "Diffusion de notifications push ciblées",
  avis: "Modération et contrôle qualité des commentaires clients",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("stats");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");

  const handleLogout = () => {
    sessionStorage.removeItem("bb_admin_auth");
    sessionStorage.removeItem("bb_admin_token");
    navigate("/admin");
  };

  const ActiveComponent = COMPONENTS[activeTab] || AdminStats;
  const activeLabel = ALL_TABS.find(t => t.id === activeTab)?.label || "Tableau de bord";

  // Filter navigation items if search is entered
  const filteredGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item =>
      !filterSearch || item.label.toLowerCase().includes(filterSearch.toLowerCase())
    )
  })).filter(group => group.items.length > 0);

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50 flex font-display">

        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── Sidebar ── */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white border-r border-slate-800 flex flex-col transition-transform duration-300 shadow-2xl lg:shadow-none
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>

          {/* Logo */}
          <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white text-[16px] font-black leading-tight tracking-tight">BeautyBook</h1>
                <p className="text-orange-400 text-[10px] font-bold uppercase tracking-widest">Admin Control</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="px-4 py-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2 bg-slate-800/80 rounded-xl px-3 py-2 border border-slate-700/50 focus-within:border-orange-500 transition-colors">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                value={filterSearch}
                onChange={e => setFilterSearch(e.target.value)}
                placeholder="Filtrer les modules..."
                className="w-full bg-transparent text-white text-[12px] outline-none placeholder:text-slate-500 font-medium"
              />
            </div>
          </div>

          {/* Nav groupée */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 hide-scrollbar">
            {filteredGroups.map(group => (
              <div key={group.label}>
                <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">{group.label}</p>
                <div className="space-y-0.5 mt-1">
                  {group.items.map(({ id, label, icon: Icon, badge }) => {
                    const isActive = activeTab === id;
                    return (
                      <button
                        key={id}
                        onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12.5px] font-bold transition-all ${
                          isActive
                            ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                            : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                        <span className="flex-1 text-left truncate">{label}</span>
                        {badge && !isActive && (
                          <span className="w-2 h-2 bg-amber-400 rounded-full shrink-0 animate-pulse" />
                        )}
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer User + Logout */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40">
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white text-[13px] font-black shrink-0 shadow-sm">
                BB
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[12px] font-black truncate">BeautyBook Admin</p>
                <p className="text-slate-400 text-[10px] truncate">superadmin@beautybook.fr</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all border border-red-500/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              Déconnexion
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Topbar */}
          <header className="bg-white border-b border-gray-200 px-4 py-3.5 flex items-center justify-between lg:px-6 shrink-0 shadow-xs">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-gray-400 font-semibold hidden sm:block">Panneau d'administration</span>
                <span className="text-gray-300 hidden sm:block">/</span>
                <span className="text-gray-900 font-black">{activeLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.open("/", "_blank")}
                className="hidden sm:flex items-center gap-1.5 bg-gray-900 text-white rounded-xl px-3.5 py-2 text-[12px] font-bold hover:bg-gray-800 transition-all shadow-sm active:scale-95"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Ouvrir l'application
              </button>
              <button
                onClick={() => setActiveTab("notifications")}
                className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-all relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
              </button>
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center text-white text-[13px] font-black shadow-sm">
                BB
              </div>
            </div>
          </header>

          {/* Header title bar */}
          <div className="bg-white border-b border-gray-100 px-4 py-4 lg:px-6 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-gray-900 text-[22px] font-black tracking-tight">{activeLabel}</h1>
                {TAB_DESCRIPTIONS[activeTab] && (
                  <p className="text-gray-400 text-[12px] font-medium mt-0.5">{TAB_DESCRIPTIONS[activeTab]}</p>
                )}
              </div>
            </div>
          </div>

          {/* Main workspace */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#f8f9fa]">
            <ActiveComponent />
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}