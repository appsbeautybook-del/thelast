import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/api/supabaseClient';

const SUPABASE_URL = 'https://vimusrczrjvefsbljtmf.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbXVzcmN6cmp2ZWZzYmxqdG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk4ODUwOSwiZXhwIjoyMDk3NTY0NTA5fQ.tZZQe1H7ZkWkv53ytqzQGDs7AJIzpQO3JArntrwMKqU';

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Helper pour obtenir ou générer l'empreinte de l'appareil
export function getDeviceId() {
  let devId = localStorage.getItem("bb_device_id");
  if (!devId) {
    devId = "dev_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem("bb_device_id", devId);
  }
  return devId;
}

// ── Supprimer définitivement un compte et toutes ses données ──────────────────
export async function deleteAccountCompletely({ userId, email }) {
  if (!userId && !email) throw new Error("ID ou Email manquant.");

  const targets = [];
  if (email) targets.push({ col: 'email', val: email }, { col: 'user_email', val: email }, { col: 'client_email', val: email }, { col: 'pro_email', val: email }, { col: 'author_email', val: email }, { col: 'sender_email', val: email }, { col: 'receiver_email', val: email });

  // List of tables to clean up
  const tables = [
    'profiles', 'ProfilPro', 'Service', 'Reservation', 'Commande',
    'Reel', 'Style', 'CommentaireStyle', 'Notification', 'MessageChat',
    'PointsFidelite', 'Annonce', 'DemandeProV2', 'ImmobilierListing',
    'LiveSession', 'LiveMessage', 'Client', 'MembreEquipe', 'RoutineBeaute'
  ];

  for (const table of tables) {
    try {
      if (userId && (table === 'profiles' || table === 'ProfilPro')) {
        await supabaseAdmin.from(table).delete().eq('id', userId);
      }
      if (email) {
        if (table === 'profiles' || table === 'ProfilPro' || table === 'PointsFidelite' || table === 'Notification' || table === 'RoutineBeaute') {
          await supabaseAdmin.from(table).delete().eq('email', email);
        }
        if (table === 'ProfilPro' || table === 'Service' || table === 'Annonce' || table === 'Client' || table === 'MembreEquipe') {
          await supabaseAdmin.from(table).delete().eq('pro_email', email);
        }
        if (table === 'Reservation' || table === 'Commande') {
          await supabaseAdmin.from(table).delete().eq('client_email', email);
        }
        if (table === 'Reel' || table === 'Style') {
          await supabaseAdmin.from(table).delete().eq('author_email', email);
        }
        if (table === 'MessageChat') {
          await supabaseAdmin.from(table).delete().or(`sender_email.eq.${email},receiver_email.eq.${email}`);
        }
      }
    } catch (e) {
      console.warn(`[DeleteAccount] Cleanup table ${table} warning:`, e);
    }
  }

  // Suppression dans auth.users Supabase
  if (userId) {
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch (e) {
      console.warn("[DeleteAccount] Supabase auth.admin.deleteUser warning:", e);
    }
  }

  return true;
}

// ── Bannir à vie un utilisateur et son appareil ────────────────────────────────
export async function banUserPermanently({ userId, email, deviceId, reason = "Bannissement administrateur à vie" }) {
  const currentDevId = deviceId || getDeviceId();

  // 1. Ajouter l'email et l'appareil à la liste noire (Banned list) dans AppConfig
  try {
    const { data: configRows } = await supabaseAdmin.from('AppConfig').select('*').eq('key', 'banned_entities');
    let bannedList = configRows?.[0]?.value || { emails: [], devices: [] };

    if (!Array.isArray(bannedList.emails)) bannedList.emails = [];
    if (!Array.isArray(bannedList.devices)) bannedList.devices = [];

    if (email && !bannedList.emails.includes(email.toLowerCase())) {
      bannedList.emails.push(email.toLowerCase());
    }
    if (currentDevId && !bannedList.devices.includes(currentDevId)) {
      bannedList.devices.push(currentDevId);
    }

    if (configRows?.[0]?.id) {
      await supabaseAdmin.from('AppConfig').update({ value: bannedList }).eq('id', configRows[0].id);
    } else {
      await supabaseAdmin.from('AppConfig').insert({ key: 'banned_entities', value: bannedList });
    }
  } catch (e) {
    console.warn("[BanUser] AppConfig banned_entities update warning:", e);
  }

  // 2. Marquer le profil comme banni
  if (userId || email) {
    try {
      const updateData = {
        role: 'banned',
        is_banned: true,
        banned_at: new Date().toISOString(),
        banned_reason: reason,
        device_id: currentDevId
      };
      if (userId) {
        await supabaseAdmin.from('profiles').update(updateData).eq('id', userId);
      } else if (email) {
        await supabaseAdmin.from('profiles').update(updateData).eq('email', email);
      }
    } catch (e) {
      console.warn("[BanUser] Profile update warning:", e);
    }
  }

  // 3. Déconnecter/Révoquer le compte Auth Supabase
  if (userId) {
    try {
      await supabaseAdmin.auth.admin.signOut(userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
    } catch (e) {
      console.warn("[BanUser] Auth revoke warning:", e);
    }
  }

  return true;
}

// ── Débannir un compte ────────────────────────────────────────────────────────
export async function unbanUser({ email, deviceId }) {
  try {
    const { data: configRows } = await supabaseAdmin.from('AppConfig').select('*').eq('key', 'banned_entities');
    if (configRows?.[0]) {
      let bannedList = configRows[0].value || { emails: [], devices: [] };
      if (email) bannedList.emails = (bannedList.emails || []).filter(e => e !== email.toLowerCase());
      if (deviceId) bannedList.devices = (bannedList.devices || []).filter(d => d !== deviceId);
      await supabaseAdmin.from('AppConfig').update({ value: bannedList }).eq('id', configRows[0].id);
    }
    if (email) {
      await supabaseAdmin.from('profiles').update({ role: 'user', is_banned: false, banned_reason: null }).eq('email', email);
    }
  } catch (e) {
    console.warn("[UnbanUser] Error:", e);
  }
}

// ── Vérifier si un email ou appareil est banni ────────────────────────────────
export async function checkIfBanned({ email, deviceId }) {
  const devId = deviceId || getDeviceId();
  try {
    const { data: configRows } = await supabase.from('AppConfig').select('*').eq('key', 'banned_entities');
    const bannedList = configRows?.[0]?.value || { emails: [], devices: [] };

    const emailBanned = email && Array.isArray(bannedList.emails) && bannedList.emails.includes(email.toLowerCase());
    const deviceBanned = devId && Array.isArray(bannedList.devices) && bannedList.devices.includes(devId);

    if (emailBanned || deviceBanned) {
      return {
        isBanned: true,
        reason: "Votre compte ou votre appareil a été banni définitivement par l'administration."
      };
    }
  } catch (e) {
    console.warn("[CheckBanned] Error:", e);
  }
  return { isBanned: false };
}
