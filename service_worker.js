// service-worker.js
const SW_VERSION = 'v1.0.4'; // เปลี่ยนเวอร์ชันนี้ทุกครั้งที่อัปเดต
const CACHE_NAME = `app-cache-${SW_VERSION}`;

const ASSETS_TO_CACHE = [
    'index.html',
    'https://cdn.jsdelivr.net/npm/chart.js',
     'chartExt.js',
    'styles.css',
    'db.js',
    'ui.js',
    'app.js',
    'sw_register.js',
    'manifest.json',
    'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// ติดตั้งและ cache ไฟล์
self.addEventListener('install', event => {
    event.waitUntil(
            caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .catch(error => {
                console.error('Cache addAll failed:', error);
            })
            );
});

self.addEventListener('activate', event => {
    event.waitUntil(
            caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
            );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // ไฟล์พบใน Cache
        if (response) {
          return response;
        }

        // ไม่พบใน Cache -> พยายาม fetch จากเครือข่าย
        return fetch(event.request)
          .catch(error => {
            // Fallback สำหรับเมื่อออฟไลน์
            if (event.request.mode === 'navigate') {
              return caches.match('index.html');
            }
            
            // Fallback สำหรับ asset อื่นๆ
            return new Response('ออฟไลน์: ไม่สามารถโหลดทรัพยากรนี้ได้', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({'Content-Type': 'text/plain'})
            });
          });
      })
  );
});
