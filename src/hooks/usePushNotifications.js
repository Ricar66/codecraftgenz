import { useState, useEffect, useCallback } from 'react';
import { subscribeToNotifications, unsubscribeFromNotifications } from '../services/notificationsAPI.js';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  const [permission, setPermission] = useState(
    isSupported ? Notification.permission : 'denied',
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);

  // Check existing subscription on mount
  useEffect(() => {
    if (!isSupported) return;

    setPermission(Notification.permission);

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) {
          setSubscription(sub);
          setIsSubscribed(true);
        }
      })
      .catch(() => {});
  }, [isSupported]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    if (!VAPID_PUBLIC_KEY) {
      console.warn('VITE_VAPID_PUBLIC_KEY not set');
      return false;
    }

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const p256dh = btoa(
        String.fromCharCode(...new Uint8Array(sub.getKey('p256dh'))),
      );
      const auth = btoa(
        String.fromCharCode(...new Uint8Array(sub.getKey('auth'))),
      );

      await subscribeToNotifications({ endpoint: sub.endpoint, keys: { p256dh, auth } });

      setSubscription(sub);
      setIsSubscribed(true);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;

    setLoading(true);
    try {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await unsubscribeFromNotifications(endpoint);
      setSubscription(null);
      setIsSubscribed(false);
    } catch {
      // silencia — estado local já limpo
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    requestPermission,
    unsubscribe,
  };
}
