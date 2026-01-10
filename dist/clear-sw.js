// Script para limpar Service Workers antigos
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      console.log('Removendo Service Worker:', registration.scope);
      registration.unregister();
    }
  });
  
  // Limpar todos os caches
  if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('Removendo cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    });
  }
  
  console.log('Service Workers e caches limpos. Recarregue a página.');
}