import { useState, useEffect, useMemo } from "react";
import { adminApi } from "@/lib/adminApiClient";
import { entities } from "@/api/entities";
import { supabase } from "@/api/supabaseClient";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Users, Calendar, Eye,
  Heart, Star, Scissors, Video, ShoppingBag, Package, Award,
  ArrowUpRight, ArrowDownRight, BarChart3, Activity, Zap,
  Target, Flame, Crown, Sparkles, ChevronDown, ChevronUp,
  Search, Filter, Download, RefreshCw
} from "lucide-react";

const COLORS = ["#E8732A", "#7C3AED", "#059669", "#DC2626", "#2563EB", "#D97706", "#EC4899", "#0EA5E9", "#8B5CF6", "#14B8A6"];
const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function MiniKpi({ icon: Icon, label, value, change, color = "primary" }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-violet-50 text-violet-600",
    red: "bg-red-50 text-red-600",
    teal: "bg-teal-50 text-teal-600",
  };
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        {change !== undefined && (
          <span className={`flex items-center gap-0.5 text-[11px] font-bold ${change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-[20px] font-black text-gray-900 leading-tight">{value}</p>
      <p className="text-[11px] text-gray-400 font-medium mt-1">{label}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 pt-4 pb-2">
        <h3 className="text-[14px] font-black text-gray-900">{title}</h3>
        {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-3 pb-4">
        {children}
      </div>
    </div>
  );
}

function UserRow({ user, rank, onClick, isSelected }) {
  const medals = ["text-amber-400", "text-gray-400", "text-orange-400"];
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
        isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-gray-50 border border-transparent"
      }`}
    >
      <span className={`w-6 text-center text-[13px] font-black ${rank < 3 ? medals[rank] : "text-gray-400"}`}>
        {rank + 1}
      </span>
      {user.avatar_url ? (
        <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-xl object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-primary text-[13px] font-black">{(user.name || "?")[0]}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-black text-gray-900 truncate">{user.name || user.salon_name || user.email}</p>
        <p className="text-[10px] text-gray-400">{user.services_count || 0} services · {user.reservations_count || 0} RDV</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[13px] font-black text-emerald-600">{user.revenue?.toLocaleString() || 0}€</p>
      </div>
    </button>
  );
}

function UserDetail({ user, data }) {
  if (!user) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <BarChart3 className="w-12 h-12 text-gray-200 mb-4" />
      <p className="text-[14px] font-black text-gray-700">Sélectionnez un utilisateur</p>
      <p className="text-[12px] text-gray-400 mt-1">Cliquez sur un profil pour voir ses analytics détaillés</p>
    </div>
  );

  const kpis = [
    { icon: DollarSign, label: "Chiffre d'affaires", value: `${(user.revenue || 0).toLocaleString()}€`, color: "green" },
    { icon: Calendar, label: "Réservations", value: user.reservations_count || 0, color: "blue" },
    { icon: Scissors, label: "Services", value: user.services_count || 0, color: "primary" },
    { icon: Star, label: "Note moyenne", value: `${(user.rating || 0).toFixed(1)}★`, color: "amber" },
    { icon: Heart, label: "Likes reçus", value: user.total_likes || 0, color: "red" },
    { icon: Eye, label: "Vues totales", value: user.total_views || 0, color: "purple" },
    { icon: Video, label: "Publications", value: user.publications_count || 0, color: "teal" },
    { icon: Package, label: "Bundles", value: user.bundles_count || 0, color: "blue" },
  ];

  const revenueByMonth = (user.revenue_by_month || []).map((v, i) => ({ month: MONTHS_FR[i], revenue: v }));
  const reservationsByMonth = (user.reservations_by_month || []).map((v, i) => ({ month: MONTHS_FR[i], reservations: v }));
  const servicesPerformance = (user.services || []).slice(0, 8).map(s => ({
    name: s.name?.slice(0, 15) || "–",
    vues: s.views || 0,
    likes: s.likes || 0,
    reservations: s.reservations_count || 0,
  }));
  const publicationsEngagement = (user.publications || []).slice(0, 10).map(p => ({
    name: p.title?.slice(0, 12) || "–",
    likes: p.likes || 0,
    commentaires: p.comments_count || 0,
    vues: p.views || 0,
  }));
  const likesByMonth = (user.likes_by_month || []).map((v, i) => ({ month: MONTHS_FR[i], likes: v }));
  const viewsByMonth = (user.views_by_month || []).map((v, i) => ({ month: MONTHS_FR[i], vues: v }));

  const conversionRate = user.reservations_count > 0 && user.services_count > 0
    ? ((user.reservations_count / (user.profile_views || 1)) * 100).toFixed(1)
    : "0.0";

  const revenueBreakdown = [
    { name: "Réservations", value: user.reservation_revenue || 0 },
    { name: "Services", value: user.service_revenue || 0 },
    { name: "Bundles", value: user.bundle_revenue || 0 },
    { name: "Produits", value: user.product_revenue || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-14 h-14 rounded-2xl object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="text-primary text-[22px] font-black">{(user.name || "?")[0]}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-[18px] font-black text-gray-900">{user.name || user.salon_name}</h2>
          <p className="text-[12px] text-gray-400">{user.email} · {user.city || "–"}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{user.role || "Pro"}</span>
            {user.abonnement && <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{user.abonnement}</span>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[24px] font-black text-emerald-600">{(user.revenue || 0).toLocaleString()}€</p>
          <p className="text-[11px] text-gray-400">CA total</p>
        </div>
      </div>

      {/* KPIs grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <MiniKpi key={i} {...kpi} />
        ))}
      </div>

      {/* Conversion & Performance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniKpi icon={Target} label="Taux conversion" value={`${conversionRate}%`} color="primary" />
        <MiniKpi icon={Zap} label="RDV ce mois" value={user.current_month_rdv || 0} color="amber" />
        <MiniKpi icon={Flame} label="Tendance" value={user.trending_score || "Stable"} color="red" />
        <MiniKpi icon={Crown} label="Rang" value={`#${user.rank || "–"}`} color="purple" />
      </div>

      {/* Charts row 1: Revenue + Reservations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Chiffre d'affaires mensuel" subtitle="Évolution du CA sur 12 mois">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueByMonth}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                formatter={(v) => [`${v}€`, "CA"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2.5} fill="url(#gradRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Réservations mensuelles" subtitle="Nombre de RDV pris par mois">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={reservationsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                formatter={(v) => [v, "Réservations"]}
              />
              <Bar dataKey="reservations" fill="#E8732A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2: Likes + Views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Likes reçus" subtitle="Likes sur les publications et styles">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={likesByMonth}>
              <defs>
                <linearGradient id="gradLikes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EC4899" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#EC4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Area type="monotone" dataKey="likes" stroke="#EC4899" strokeWidth={2.5} fill="url(#gradLikes)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Vues mensuelles" subtitle="Vues profil + publications + services">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={viewsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Line type="monotone" dataKey="vues" stroke="#7C3AED" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Revenue Breakdown Pie */}
      {revenueBreakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Répartition du CA" subtitle="Sources de revenus">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={revenueBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {revenueBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(v) => [`${v}€`]}
                />
                <Legend
                  verticalAlign="bottom"
                  formatter={(value) => <span className="text-[11px] text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Performance services" subtitle="Vues, likes et réservations par service">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={servicesPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Legend formatter={(value) => <span className="text-[11px] text-gray-600">{value}</span>} />
                <Bar dataKey="vues" fill="#2563EB" radius={[0, 4, 4, 0]} />
                <Bar dataKey="likes" fill="#EC4899" radius={[0, 4, 4, 0]} />
                <Bar dataKey="reservations" fill="#E8732A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Publications engagement */}
      {publicationsEngagement.length > 0 && (
        <ChartCard title="Engagement publications" subtitle="Likes, commentaires et vues par publication">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={publicationsEngagement}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
              <Legend formatter={(value) => <span className="text-[11px] text-gray-600">{value}</span>} />
              <Bar dataKey="likes" fill="#EC4899" radius={[4, 4, 0, 0]} />
              <Bar dataKey="commentaires" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="vues" stroke="#0EA5E9" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("revenue");

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [usersRes, reservationsRes, commandesRes, servicesRes, stylesRes, reelsRes, bundlesRes, profilsRes] = await Promise.all([
        entities.User.list("-created_at", 500).catch(() => []),
        entities.Reservation.list("-created_at", 2000).catch(() => []),
        entities.Commande.list("-created_at", 2000).catch(() => []),
        entities.Service.list("-created_at", 1000).catch(() => []),
        entities.Style.list("-created_at", 1000).catch(() => []),
        entities.Reel.list("-created_at", 1000).catch(() => []),
        entities.ServiceBundle.list("-created_at", 500).catch(() => []),
        entities.ProfilPro.list("-created_at", 500).catch(() => []),
      ]);

      const allUsers = usersRes || [];
      const allRes = reservationsRes || [];
      const allCmd = commandesRes || [];
      const allServices = servicesRes || [];
      const allStyles = stylesRes || [];
      const allReels = reelsRes || [];
      const allBundles = bundlesRes || [];
      const allProfils = profilsRes || [];

      const proEmails = [...new Set([
        ...allServices.map(s => s.pro_email).filter(Boolean),
        ...allStyles.map(s => s.author_email || s.pro_email).filter(Boolean),
        ...allProfils.map(p => p.user_email).filter(Boolean),
      ])];

      const enrichedUsers = proEmails.map(email => {
        const profile = allProfils.find(p => p.user_email === email) || {};
        const userAccount = allUsers.find(u => u.email === email) || {};

        const userRes = allRes.filter(r => r.pro_email === email);
        const userCmd = allCmd.filter(c => c.client_email === email || c.created_by_id === userAccount.id);
        const userServices = allServices.filter(s => s.pro_email === email);
        const userStyles = allStyles.filter(s => (s.author_email === email || s.pro_email === email));
        const userBundles = allBundles.filter(b => b.pro_email === email);
        const userReels = allReels.filter(r => r.author_email === email);

        const totalLikesStyles = userStyles.reduce((s, st) => s + (st.likes || 0), 0);
        const totalViewsStyles = userStyles.reduce((s, st) => s + (st.views || 0), 0);
        const totalLikesReels = userReels.reduce((s, r) => s + (r.likes || 0), 0);
        const totalViewsReels = userReels.reduce((s, r) => s + (r.views || 0), 0);

        const reservationRevenue = userRes.filter(r => r.status === "terminé" || r.status === "confirmé" || r.status === "completed")
          .reduce((s, r) => s + (r.total_price || r.service_price || 0), 0);
        const commandesRevenue = userCmd.filter(c => c.status !== "annulé" && c.status !== "rembourse")
          .reduce((s, c) => s + (c.total || 0), 0);

        const revenueByMonth = Array(12).fill(0);
        userRes.forEach(r => {
          if (r.date) {
            const d = new Date(r.date);
            const m = d.getMonth();
            revenueByMonth[m] += r.total_price || r.service_price || 0;
          }
        });
        const cmdByMonth = Array(12).fill(0);
        userCmd.forEach(c => {
          if (c.created_at) {
            const d = new Date(c.created_at);
            const m = d.getMonth();
            cmdByMonth[m] += c.total || 0;
          }
        });
        const finalRevenueByMonth = revenueByMonth.map((v, i) => v + cmdByMonth[i]);

        const reservationsByMonth = Array(12).fill(0);
        userRes.forEach(r => {
          if (r.date || r.created_at) {
            const d = new Date(r.date || r.created_at);
            reservationsByMonth[d.getMonth()]++;
          }
        });

        const likesByMonth = Array(12).fill(0);
        const viewsByMonth = Array(12).fill(0);
        [...userStyles, ...userReels].forEach(item => {
          if (item.created_at) {
            const m = new Date(item.created_at).getMonth();
            likesByMonth[m] += item.likes || 0;
            viewsByMonth[m] += item.views || 0;
          }
        });

        const servicesWithStats = userServices.map(s => ({
          name: s.name || s.title,
          views: s.views || 0,
          likes: s.likes || 0,
          reservations_count: allRes.filter(r => r.service_id === s.id).length,
          price: s.price || 0,
          rating: s.rating || 0,
        }));

        const pubs = [...userReels.map(r => ({
          title: r.title,
          likes: r.likes || 0,
          views: r.views || 0,
          comments_count: r.comments_count || 0,
          created_at: r.created_at,
        })), ...userStyles.map(s => ({
          title: s.title,
          likes: s.likes || 0,
          views: s.views || 0,
          comments_count: 0,
          created_at: s.created_at,
        }))].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const currentMonth = new Date().getMonth();
        const currentMonthRdv = userRes.filter(r => {
          const d = new Date(r.date || r.created_at);
          return d.getMonth() === currentMonth;
        }).length;

        const completedRdv = userRes.filter(r => r.status === "terminé" || r.status === "completed").length;
        const totalRdv = userRes.length;

        return {
          id: email,
          email,
          name: profile?.salon_name || userAccount?.full_name || email.split("@")[0],
          avatar_url: profile?.avatar_url || userAccount?.avatar_url || "",
          city: profile?.city || "",
          role: profile?.abonnement || "Gratuit",
          rating: profile?.rating || 0,
          abonnement: profile?.abonnement || "",
          rank: 0,
          revenue: reservationRevenue + commandesRevenue,
          reservation_revenue: reservationRevenue,
          service_revenue: 0,
          bundle_revenue: 0,
          product_revenue: commandesRevenue,
          reservations_count: userRes.length,
          services_count: userServices.length,
          bundles_count: userBundles.length,
          publications_count: pubs.length,
          total_likes: totalLikesStyles + totalLikesReels,
          total_views: totalViewsStyles + totalViewsReels,
          profile_views: totalViewsStyles + totalViewsReels,
          current_month_rdv: currentMonthRdv,
          trending_score: currentMonthRdv > 3 ? "Hausse" : currentMonthRdv === 0 ? "Baisse" : "Stable",
          conversion_rate: totalRdv > 0 ? ((completedRdv / totalRdv) * 100).toFixed(1) : "0.0",
          revenue_by_month: finalRevenueByMonth,
          reservations_by_month: reservationsByMonth,
          likes_by_month: likesByMonth,
          views_by_month: viewsByMonth,
          services: servicesWithStats,
          publications: pubs,
          created_at: profile?.created_at || userAccount?.created_at,
        };
      });

      enrichedUsers.sort((a, b) => b.revenue - a.revenue);
      enrichedUsers.forEach((u, i) => u.rank = i + 1);

      setUsers(enrichedUsers);
    } catch (err) {
      console.error("[AdminAnalytics]", err);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.city || "").toLowerCase().includes(q)
      );
    }
    if (sortBy === "revenue") result.sort((a, b) => b.revenue - a.revenue);
    else if (sortBy === "reservations") result.sort((a, b) => b.reservations_count - a.reservations_count);
    else if (sortBy === "likes") result.sort((a, b) => b.total_likes - a.total_likes);
    else if (sortBy === "views") result.sort((a, b) => b.total_views - a.total_views);
    else if (sortBy === "services") result.sort((a, b) => b.services_count - a.services_count);
    return result;
  }, [users, search, sortBy]);

  const platformKpis = useMemo(() => {
    const totalRevenue = users.reduce((s, u) => s + (u.revenue || 0), 0);
    const totalReservations = users.reduce((s, u) => s + (u.reservations_count || 0), 0);
    const totalServices = users.reduce((s, u) => s + (u.services_count || 0), 0);
    const totalLikes = users.reduce((s, u) => s + (u.total_likes || 0), 0);
    const totalViews = users.reduce((s, u) => s + (u.total_views || 0), 0);
    const avgRevenue = users.length > 0 ? Math.round(totalRevenue / users.length) : 0;
    return { totalRevenue, totalReservations, totalServices, totalLikes, totalViews, avgRevenue, userCount: users.length };
  }, [users]);

  const topRevenueChart = useMemo(() => {
    return users.slice(0, 10).map(u => ({
      name: (u.name || u.email || "").slice(0, 12),
      CA: u.revenue || 0,
      RDV: u.reservations_count || 0,
    }));
  }, [users]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Platform overview */}
      <div>
        <h2 className="text-[13px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Vue plateforme
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniKpi icon={DollarSign} label="CA total plateforme" value={`${platformKpis.totalRevenue.toLocaleString()}€`} color="green" />
          <MiniKpi icon={Users} label="Pros actifs" value={platformKpis.userCount} color="blue" />
          <MiniKpi icon={Calendar} label="Total RDV" value={platformKpis.totalReservations.toLocaleString()} color="primary" />
          <MiniKpi icon={Scissors} label="Services créés" value={platformKpis.totalServices.toLocaleString()} color="teal" />
          <MiniKpi icon={Heart} label="Likes totaux" value={platformKpis.totalLikes.toLocaleString()} color="red" />
          <MiniKpi icon={Eye} label="Vues totales" value={platformKpis.totalViews.toLocaleString()} color="purple" />
        </div>
      </div>

      {/* Top Revenue chart */}
      <ChartCard title="Top 10 — Chiffre d'affaires par pro" subtitle="Classement des revenus de la plateforme">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={topRevenueChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} formatter={(v, name) => name === "CA" ? [`${v}€`, "CA"] : [v, name]} />
            <Legend formatter={(value) => <span className="text-[11px] text-gray-600">{value}</span>} />
            <Bar dataKey="CA" fill="#E8732A" radius={[6, 6, 0, 0]} />
            <Bar dataKey="RDV" fill="#7C3AED" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* User list + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: user list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 mb-3">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un pro..."
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-gray-400"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
              {[
                { key: "revenue", label: "CA", icon: DollarSign },
                { key: "reservations", label: "RDV", icon: Calendar },
                { key: "likes", label: "Likes", icon: Heart },
                { key: "views", label: "Vues", icon: Eye },
                { key: "services", label: "Services", icon: Scissors },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => setSortBy(s.key)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                    sortBy === s.key ? "bg-primary text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  <s.icon className="w-3 h-3" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[600px] overflow-y-auto p-2 space-y-0.5">
            {filtered.length === 0 && (
              <p className="text-gray-400 text-[12px] text-center py-8">Aucun pro trouvé</p>
            )}
            {filtered.map((user, i) => (
              <UserRow
                key={user.id}
                user={user}
                rank={i}
                isSelected={selectedUser?.id === user.id}
                onClick={() => setSelectedUser(user)}
              />
            ))}
          </div>
        </div>

        {/* Right: detail */}
        <div className="lg:col-span-3">
          <UserDetail user={selectedUser} data={userData} />
        </div>
      </div>

      <p className="text-gray-400 text-[11px] text-center pt-2">
        Analytics détaillées — BeautyBook Admin · Mis à jour le {new Date().toLocaleDateString("fr-FR")} {new Date().toLocaleTimeString("fr-FR")}
      </p>
    </div>
  );
}
