// service-worker.js
const SW_VERSION = 'v1.0.4'; // เปลี่ยนเวอร์ชันนี้ทุกครั้งที่อัปเดต
const CACHE_NAME = `app-cache-${SW_VERSION}`;

const ASSETS_TO_CACHE = [
    'https://cdn.jsdelivr.net/npm/chart.js',
     'chartExt.js',
    'index.html',
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
            caches.match(event.request).then(resp => resp || fetch(event.request))
            );
});
