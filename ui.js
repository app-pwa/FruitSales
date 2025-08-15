// ui.js

export function populateDropdown(selectId, items) {
  const select = typeof selectId === 'string' ? document.getElementById(selectId) : selectId;
  if (!select) return;
  while (select.options.length > 1) select.remove(1);
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });
}

export function createItemEntry(index, saleTypeOptions = [], gardenOptions = []) {
  const div = document.createElement('div');
  div.className = 'item-entry border border-gray-200 rounded-lg p-4 mb-4';
  div.innerHTML = `
    <div class="flex justify-between items-center mb-3">
      <h3 class="font-medium text-gray-700">รายการที่ ${index + 1}</h3>
      <button class="remove-item-btn text-red-500">
        <i class="fas fa-trash"></i>
      </button>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">เกรด หรือประเภทสินค้า</label>
        <select class="item-type w-full p-2 border border-gray-300 rounded-md">
          <option value="">เลือกเกรด หรือประเภทสินค้า</option>
          ${saleTypeOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">สวน</label>
        <select class="garden w-full p-2 border border-gray-300 rounded-md">
          <option value="">เลือกสวน</option>
          ${gardenOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">น้ำหนัก (กก.)</label>
        <input type="number" class="weight w-full p-2 border border-gray-300 rounded-md" step="0.01" min="0">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">ราคาต่อกิโล (บาท)</label>
        <input type="number" class="price-per-kg w-full p-2 border border-gray-300 rounded-md" step="0.01" min="0">
      </div>
    </div>
  `;
  return div;
}
