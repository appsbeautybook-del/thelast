import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bell, Check, X, Settings,
  MessageCircle, CalendarCheck, Tag, Star, ShoppingBag,
  ShieldCheck, Scissors, User, Megaphone
} from "lucide-react";
import { supabase } from '@/api/supabaseClient';
import { entities } from '@/api/entities';
import {
  loadNotifications,
  markAsRead,
  markAllAsRead as markAllAsReadService,
} from '@/lib/notificationService';

// Détermine le type d'icône selon le type de notif + metadata expéditeur
function getNotifVisual(notif) {
  const isAdmin = notif.data?.is_admin || notif.title?.toLowerCase().includes("admin") || notif.data?.sender_role === "admin";
  const isPro   = notif.data?.sender_role === "pro" || notif.data?.is_pro;

  if (notif.type === "message") {
    if (isAdmin) return { Icon: ShieldCheck,   bg: "bg-violet-100", iconColor: "text-violet-600", border: "border-violet-200" };
    if (isPro)   return { Icon: Scissors,       bg: "bg-orange-100", iconColor: "text-orange-500", border: "border-orange-200" };
    return              { Icon: MessageCircle,  bg: "bg-sky-100",    iconColor: "text-sky-500",    border: "border-sky-200"    };
  }
  if (notif.type === "reservation") return { Icon: CalendarCheck, bg: "bg-blue-100",   iconColor: "text-blue-600",   border: "border-blue-200"   };
  if (notif.type === "promo")       return { Icon: Tag,           bg: "bg-amber-100",  iconColor: "text-amber-500",  border: "border-amber-200"  };
  if (notif.type === "avis")        return { Icon: Star,          bg: "bg-yellow-100", iconColor: "text-yellow-500", border: "border-yellow-200" };
  if (notif.type === "commande")    return { Icon: ShoppingBag,   bg: "bg-purple-100", iconColor: "text-purple-600", border: "border-purple-200" };
  if (notif.type === "system")      return { Icon: Megaphone,     bg: "bg-gray-100",   iconColor: "text-gray-500",   border: "border-gray-200"   };
  return                                   { Icon: Bell,          bg: "bg-gray-100",   iconColor: "text-gray-500",   border: "border-gray-200"   };
}

// Badge "expéditeur" sous le titre pour message admin/pro/client
function SenderBadge({ notif }) {
  const isAdmin = notif.data?.is_admin || notif.title?.toLowerCase().includes("admin") || notif.data?.sender_role === "admin";
  const isPro   = notif.data?.sender_role === "pro" || notif.data?.is_pro;
  if (notif.type !== "message") return null;
  if (isAdmin) return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full mt-1">
      <ShieldCheck className="w-2.5 h-2.5" /> Administrateur
    </span>
  );
  if (isPro) return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full mt-1">
      <Scissors className="w-2.5 h-2.5" /> Professionnel
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-sky-600 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full mt-1">
      <User className="w-2.5 h-2.5" /> Client
    </span>
  );
}

function NotifItem({ notif, onRead, onNavigate, onDelete }) {
  const { Icon, bg, iconColor, border } = getNotifVisual(notif);
  const date = new Date(notif.created_at);
  const now = new Date();
  const diffMin = Math.floor((now - date) / 60000);
  let timeLabel;
  if (diffMin < 1) timeLabel = "À l'instant";
  else if (diffMin < 60) timeLabel = `${diffMin}min`;
  else if (diffMin < 1440) timeLabel = `${Math.floor(diffMin / 60)}h`;
  else timeLabel = date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  const handleClick = () => {
    onRead(notif.id);
    if (notif.type === "message" && notif.data?.conversation_id) {
      const senderEmail = notif.data?.sender_email;
      const isAdmin = notif.data?.is_admin || notif.title?.toLowerCase().includes("admin");
      if (senderEmail) {
        const nameParam = notif.data?.sender_name
          ? `&name=${encodeURIComponent(notif.data.sender_name)}`
          : `&name=${encodeURIComponent(senderEmail)}`;
        const adminParam = isAdmin ? "&readonly=1" : "";
        onNavigate(`/messages?to=${senderEmail}${nameParam}${adminParam}`);
      } else {
        onNavigate("/messages");
      }
    } else if (notif.type === "reservation") {
      onNavigate("/rendez-vous");
    } else if (notif.type === "commande") {
      onNavigate("/rendez-vous");
    } else if (notif.type === "avis") {
      onNavigate("/rendez-vous");
    } else if (notif.action_url) {
      onNavigate(notif.action_url);
    } else if (notif.link) {
      onNavigate(notif.link);
    }
  };

  return (
    <div className={`flex items-start gap-3 px-4 py-4 border-b border-gray-50 transition-all ${!notif.read && !notif.is_read ? "bg-primary/[0.03]" : ""}`}>
      <button onClick={handleClick} className="flex items-start gap-3 flex-1 text-left active:scale-[0.99] transition-all min-w-0">
        <div className={`w-11 h-11 ${bg} ${border} border rounded-2xl flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-[13px] leading-snug ${!notif.read && !notif.is_read ? "font-black text-gray-900" : "font-bold text-gray-700"}`}>
              {notif.title}
            </p>
            <span className="text-[10px] text-gray-400 shrink-0 mt-0.5 font-medium">{timeLabel}</span>
          </div>
          <p className="text-[12px] text-gray-500 font-medium mt-0.5 leading-snug">{notif.body || notif.message}</p>
          <SenderBadge notif={notif} />
        </div>
        {!notif.read && !notif.is_read && (
          <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
        )}
      </button>
      {/* Bouton supprimer */}
      <button
        onClick={() => onDelete(notif.id)}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-400 active:scale-95 transition-all shrink-0 mt-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const userEmailRef = useRef(null);

  useEffect(() => {
    fetchNotifs();
  }, []);

  // Realtime subscription for new notifications
  useEffect(() => {
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "Notification" },
        (payload) => {
          const newNotif = payload.new;
          if (userEmailRef.current && newNotif.user_email === userEmailRef.current) {
            setNotifications(prev => [newNotif, ...prev]);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn("[Notifications] No authenticated user found");
        setLoading(false);
        return;
      }
      userEmailRef.current = user.email;
      
      // Try loading notifications with error handling
      const notifs = await loadNotifications(user.email, 50);
      console.log("[Notifications] Loaded notifications:", notifs?.length || 0);
      setNotifications(notifs || []);
    } catch (e) {
      console.error("[Notifications] Load error:", e);
      setNotifications([]);
    }
    setLoading(false);
  };

  const markRead = async (id) => {
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, is_read: true } : n));
  };

  const markAllRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await markAllAsReadService(user.email);
    } catch (e) {
      console.error("Mark all read error:", e);
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true, is_read: true })));
  };

  const deleteNotif = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await entities.Notification.delete(id);
    } catch {
      await supabase.from("Notification").delete().eq("id", id);
    }
  };

  const unreadCount = notifications.filter(n => !n.read && !n.is_read).length;

  return (
    <div className="font-display bg-white min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 bg-white sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <button onClick={() => navigate(-1)} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4 text-primary" />
        </button>
        <div className="flex-1">
          <h1 className="text-[20px] font-black text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-[11px] text-primary font-bold">{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 text-[11px] font-black text-primary active:scale-95 transition-all">
              <Check className="w-3.5 h-3.5" />
              Tout lire
            </button>
          )}
          <button
            onClick={() => navigate("/parametres/notifications")}
            className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center active:scale-95 transition-all"
            title="Préférences de notifications"
          >
            <Settings className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-11 h-11 bg-gray-100 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded-full w-2/3" />
                <div className="h-3 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Bell className="w-12 h-12 text-gray-200" />
          <p className="text-[14px] font-bold text-gray-400">Aucune notification</p>
          <p className="text-[12px] text-gray-300 font-medium">Vous êtes à jour !</p>
        </div>
      ) : (
        <div>
          {notifications.map(notif => (
            <NotifItem
              key={notif.id}
              notif={notif}
              onRead={markRead}
              onNavigate={navigate}
              onDelete={deleteNotif}
            />
          ))}
        </div>
      )}
    </div>
  );
}