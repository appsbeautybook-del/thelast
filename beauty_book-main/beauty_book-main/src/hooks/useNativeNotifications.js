import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

/**
 * Hook pour gérer les notifications natives du téléphone
 * - Demande la permission
 * - Affiche des notifications natives pour les nouveaux messages/appels
 * - Joue une sonnerie et vibre pour les appels entrants
 */
export function useNativeNotifications(userEmail) {
  const permissionGranted = useRef(false);
  const lastChecked = useRef(Date.now());
  const checkInterval = useRef(null);

  // Demander la permission pour les notifications
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('[Notifications] API non supportée');
      return false;
    }

    if (Notification.permission === 'granted') {
      permissionGranted.current = true;
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('[Notifications] Permission refusée');
      return false;
    }

    const permission = await Notification.requestPermission();
    permissionGranted.current = permission === 'granted';
    return permissionGranted.current;
  }, []);

  // Afficher une notification native
  const showNotification = useCallback((title, options = {}) => {
    if (!permissionGranted.current || Notification.permission !== 'granted') {
      return null;
    }

    const notif = new Notification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: options.vibrate || [200, 100, 200],
      tag: options.tag || 'beautybook-' + Date.now(),
      requireInteraction: options.requireInteraction || false,
      ...options,
    });

    return notif;
  }, []);

  // Jouer une sonnerie d'appel
  const playRingtone = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      return { audioContext, oscillator, gainNode };
    } catch (e) {
      console.error('[Ringtone] Error:', e);
      return null;
    }
  }, []);

  // Vibrer le téléphone
  const vibrate = useCallback((pattern = [200, 100, 200, 100, 200]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Vérifier les nouvelles notifications
  const checkNotifications = useCallback(async () => {
    if (!userEmail) return;

    try {
      const { data: notifications } = await supabase
        .from('Notification')
        .select('*')
        .eq('user_email', userEmail)
        .eq('read', false)
        .gt('created_at', new Date(lastChecked.current).toISOString())
        .order('created_at', { ascending: false });

      if (notifications && notifications.length > 0) {
        for (const notif of notifications) {
          // Afficher la notification native
          showNotification(notif.title, {
            body: notif.body,
            tag: `notif-${notif.id}`,
            data: { url: notif.action_url || '/' },
          });

          // Si c'est un appel, vibrer et jouer la sonnerie
          if (notif.type === 'call') {
            vibrate([1000, 500, 1000, 500, 1000]);
            playRingtone();
          }
        }
      }

      lastChecked.current = Date.now();
    } catch (e) {
      console.error('[Notifications] Check error:', e);
    }
  }, [userEmail, showNotification, vibrate, playRingtone]);

  // Initialiser les notifications
  useEffect(() => {
    const init = async () => {
      const granted = await requestPermission();
      if (granted) {
        // Vérifier les notifications toutes les 5 secondes
        checkInterval.current = setInterval(checkNotifications, 5000);
        // Vérifier immédiatement
        checkNotifications();
      }
    };

    init();

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [userEmail, requestPermission, checkNotifications]);

  return {
    requestPermission,
    showNotification,
    playRingtone,
    vibrate,
    checkNotifications,
  };
}
