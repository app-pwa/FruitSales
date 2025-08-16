// service-worker.js
const SW_VERSION = 'v2568.08.16.15'; // เปลี่ยนเวอร์ชันนี้ทุกครั้งที่อัปเดต
const CACHE_NAME = `app-cache-${SW_VERSION}`;
const OFFLINE_FALLBACK_PAGE = 'index.html';

const ASSETS_TO_CACHE = [
  OFFLINE_FALLBACK_PAGE,
  'styles.css',
  'db.js',
  'ui.js',
  'app.js',
  'chartExt.js',
  'sw_register.js',
  'manifest.json',
  // ทรัพยากรจาก CDN
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// ==================== ติดตั้ง Service Worker ====================
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing version:', SW_VERSION);
  
  // บังคับให้เวอร์ชันใหม่ทำงานทันทีโดยไม่ต้องรอ
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching assets');
        return cache.addAll(ASSETS_TO_CACHE)
          .then(() => console.log('[Service Worker] All assets cached'))
          .catch(err => console.error('[Service Worker] Cache addAll error:', err));
      })
  );
});

// ==================== เปิดใช้งาน Service Worker ====================
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating version:', SW_VERSION);
  
  event.waitUntil(
    Promise.all([
      // ลบ cache เก่าทั้งหมดที่ไม่ได้ใช้
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // ยึดครอง clients ทันที
      clients.claim()
    ]).then(() => {
      console.log('[Service Worker] Ready to handle fetches!');
    })
  );
});

// ==================== จัดการการรับส่งข้อมูล ====================
self.addEventListener('fetch', event => {
  // ข้ามการดึงข้อมูลที่ไม่ใช่ HTTP(S)
  if (!(event.request.url.startsWith('http') || event.request.url.startsWith('https'))) {
    return;
  }

  // ใช้กลยุทธ์ Cache First แล้วตามด้วย Network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // 1. ถ้ามีใน cache ให้ส่งคืน
        if (cachedResponse) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // 2. ถ้าไม่มีใน cache ให้ลองดึงจาก network
        return fetch(event.request)
          .then(networkResponse => {
            // ถ้าได้ response มาสร้าง clone เพื่อเก็บใน cache
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('[Service Worker] Caching new resource:', event.request.url);
              });
              
            return networkResponse;
          })
          .catch(async error => {
            console.log('[Service Worker] Network request failed, serving fallback:', error);
            
            // 3. ถ้าเป็น navigation request ให้ใช้ fallback page
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_FALLBACK_PAGE);
            }
            
            // 4. สำหรับ API requests อาจคืนค่าข้อมูลจาก IndexedDB
            
            // 5. สำหรับ asset อื่นๆ คืนค่า fallback
            return new Response(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>ออฟไลน์</title>
                  <style>body { font-family: sans-serif; text-align: center; padding: 2rem; }</style>
                </head>
                <body>
                  <h1>คุณกำลังทำงานในโหมดออฟไลน์</h1>
                  <p>ไม่สามารถโหลดทรัพยากรนี้ได้: ${event.request.url}</p>
                  <button onclick="window.location.reload()">ลองอีกครั้ง</button>
                </body>
              </html>
            `, {
              headers: { 'Content-Type': 'text/html' }
            });
          });
      })
  );
});

// ==================== จัดการข้อความจากแอป ====================
self.addEventListener('message', event => {
  switch (event.data.type) {
    case 'UPDATE_CACHE':
      console.log('[Service Worker] Received update command');
      self.skipWaiting();
      clients.claim()
        .then(() => {
          event.source.postMessage({ type: 'UPDATE_COMPLETE' });
        });
      break;
      
    case 'SKIP_WAITING':
      console.log('[Service Worker] Skipping waiting');
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      console.log('[Service Worker] Clearing cache');
      caches.delete(CACHE_NAME)
        .then(() => {
          event.source.postMessage({ type: 'CACHE_CLEARED' });
        });
      break;
  }
});

// ==================== Background Sync ====================
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('[Service Worker] Background sync triggered');
    // สามารถเพิ่มโค้ดสำหรับ sync ข้อมูลเมื่อกลับมาออนไลน์ได้ที่นี่
  }
});