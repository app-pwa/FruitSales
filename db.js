// db.js
let db;

export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FruitSalesDB', 2);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sales')) {
        const salesStore = db.createObjectStore('sales', { keyPath: 'id' });
        salesStore.createIndex('by_date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'type' });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}
// เพิ่มฟังก์ชันนี้ใน db.js
export async function importSale(data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sales', 'readwrite');
    const store = tx.objectStore('sales');
    
    // ใช้ put แทน add เพื่ออัพเดทหากมี ID อยู่แล้ว
    const req = store.put(data);
    
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
// เพิ่มฟังก์ชัน updateSale ใน db.js
export function updateSale(data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sales', 'readwrite');
    const store = tx.objectStore('sales');
    const req = store.put(data);
    
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
export function addSale(data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sales', 'readwrite');
    const store = tx.objectStore('sales');
    const req = store.add(data);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function getAllSales() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sales', 'readonly');
    const store = tx.objectStore('sales');
    const index = store.index('by_date');
    const req = index.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function deleteSale(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sales', 'readwrite');
    const store = tx.objectStore('sales');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function getMetadata(type) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('metadata', 'readonly');
    const store = tx.objectStore('metadata');
    const req = store.get(type);
    req.onsuccess = () => resolve(req.result ? req.result.items : null);
    req.onerror = () => reject(req.error);
  });
}

export function saveMetadata(type, items) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('metadata', 'readwrite');
    const store = tx.objectStore('metadata');
    const req = store.put({ type, items });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// เพิ่มใน db.js
export function clearAllSales() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('sales', 'readwrite');
        const store = tx.objectStore('sales');
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export function clearMetadata() {
    return new Promise((resolve, reject) => {
        const tx = db.transaction('metadata', 'readwrite');
        const store = tx.objectStore('metadata');
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}