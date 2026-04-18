import { apiRequest } from '../lib/apiConfig.js';

export async function subscribeToNotifications(subscription) {
  return apiRequest('/api/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    }),
  });
}

export async function unsubscribeFromNotifications(endpoint) {
  return apiRequest('/api/notifications/unsubscribe', {
    method: 'DELETE',
    body: JSON.stringify({ endpoint }),
  });
}

export async function sendPushNotification({ title, body, url, userIds }) {
  return apiRequest('/api/notifications/send', {
    method: 'POST',
    body: JSON.stringify({ title, body, url, userIds }),
  });
}
