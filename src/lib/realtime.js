// src/lib/realtime.js
// Canal de broadcast para sincronização em tempo real entre rotas/abas

const CHANNEL_NAME = 'cc_admin_updates';

class Realtime {
  constructor() {
    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      this.channel = null;
    }
    this.listeners = new Map(); // type => Set(callback)

    if (this.channel) {
      this.channel.onmessage = (ev) => {
        const { type, payload } = ev.data || {};
        this.emit(type, payload);
      };
    } else {
      // Fallback via localStorage events
      window.addEventListener('storage', (ev) => {
        if (ev.key !== '__cc_broadcast__' || !ev.newValue) return;
        try {
          const { type, payload } = JSON.parse(ev.newValue);
          this.emit(type, payload);
        } catch { /* noop */ }
      });
    }
  }

  emit(type, payload) {
    const set = this.listeners.get(type);
    if (!set || set.size === 0) return;
    for (const cb of set) {
      try { cb(payload); } catch { /* ignore listener error */ }
    }
  }

  subscribe(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(callback);
    return () => this.unsubscribe(type, callback);
  }

  unsubscribe(type, callback) {
    const set = this.listeners.get(type);
    if (!set) return;
    set.delete(callback);
  }

  publish(type, payload) {
    const msg = { type, payload };
    if (this.channel) {
      this.channel.postMessage(msg);
    } else {
      try { localStorage.setItem('__cc_broadcast__', JSON.stringify(msg)); } catch { /* noop */ }
    }
    // Loopback local
    this.emit(type, payload);
  }
}

export const realtime = new Realtime();