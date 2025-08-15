// sw-register.js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service_worker.js')
      .then(reg => console.log('Service Worker registered:', reg.scope))
      .catch(err => console.error('SW registration failed:', err));
  });
}
