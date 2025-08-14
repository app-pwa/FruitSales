// app.js
import { initDB, addSale, getAllSales, deleteSale, getMetadata, saveMetadata, clearAllSales, clearMetadata, importSale, updateSale } from './db.js';
import { populateDropdown, createItemEntry } from './ui.js';
import { initCharts } from './chartExt.js';

let dbReady = false;
let saleTypeOptions = []; // เก็บประเภทการขาย
let gardenOptions = []; // เก็บรายชื่อสวน

// เพิ่มตัวแปรเก็บสถานะการแก้ไข
let isEditMode = false;
let currentEditId = null;

// เมื่อหน้าเว็บโหลดเสร็จ
window.addEventListener('DOMContentLoaded', async () => {
    await initDB(); // เริ่มต้นฐานข้อมูล
    dbReady = true;
    await loadInitialData(); // โหลดข้อมูลเริ่มต้น
    setupHandlers(); // ตั้งค่าการทำงานของปุ่มต่างๆ
});
// ฟังก์ชันรีเซ็ตฟอร์ม
function resetForm() {
    isEditMode = false;
    currentEditId = null;
    document.getElementById('items-container').innerHTML = '';
    document.getElementById('sale-date').valueAsDate = new Date();
    document.getElementById('fruit-type').value = '';
    document.getElementById('save-btn-text').textContent = 'บันทึกการขาย';
    document.getElementById('save-sale-btn').classList.replace('bg-blue-600', 'bg-green-600');
    addNewItem();
}

// โหลดข้อมูลเริ่มต้น
async function loadInitialData() {
    const fruits = await getMetadata('fruits') || []; // ดึงข้อมูลผลไม้
    const saleTypes = await getMetadata('saleTypes') || []; // ดึงข้อมูลประเภทการขาย
    const gardens = await getMetadata('gardens') || []; // ดึงข้อมูลสวน
    saleTypeOptions = saleTypes;
    gardenOptions = gardens;
    populateDropdown('fruit-type', fruits); // เติมข้อมูลลงใน dropdown
    document.getElementById('sale-date').valueAsDate = new Date(); // ตั้งค่าวันที่เป็นวันปัจจุบัน
    addNewItem(); // เพิ่มรายการขายใหม่
    renderSales(await getAllSales()); // แสดงประวัติการขาย
    renderMetadataLists(); // แสดงรายการข้อมูลพื้นฐาน
    await initCharts();
}

// ตั้งค่าการทำงานของปุ่มต่างๆ
function setupHandlers() {
    // ปุ่มในแท็บบันทึกการขาย
    document.getElementById('add-item-btn').onclick = addNewItem; // เพิ่มรายการขาย
    document.getElementById('save-sale-btn').onclick = saveSale; // บันทึกการขาย
    document.getElementById('sales-tab').onclick = () => switchTab('sales'); // สลับไปแท็บขาย
    document.getElementById('manage-tab').onclick = () => switchTab('manage'); // สลับไปแท็บจัดการ

    // ปุ่มในแท็บจัดการข้อมูล
    document.getElementById('add-fruit-type-btn').onclick = () => addMetadataItem('fruits', 'new-fruit'); // เพิ่มผลไม้
    document.getElementById('add-sale-type-btn').onclick = () => addMetadataItem('saleTypes', 'new-sale-type'); // เพิ่มประเภทการขาย
    document.getElementById('add-garden-btn').onclick = () => addMetadataItem('gardens', 'new-garden'); // เพิ่มสวน
    document.getElementById('export-btn').onclick = exportData; // ส่งออกข้อมูล
    document.getElementById('import-file').addEventListener('change', handleFileImport); // นำเข้าข้อมูล
    document.getElementById('delete-all-btn').onclick = confirmDeleteAllData;

}


// เพิ่มฟังก์ชันใหม่
async function confirmDeleteAllData() {
    if (confirm('⚠️ คุณแน่ใจหรือไม่ว่าจะลบข้อมูลทั้งหมด?\n\nการกระทำนี้จะลบ:\n- ประวัติการขายทั้งหมด\n- ข้อมูลผลไม้\n- ประเภทการขาย\n- ข้อมูลสวน\n\nไม่สามารถกู้คืนข้อมูลได้!')) {
        await deleteAllData();
        alert('ลบข้อมูลทั้งหมดเรียบร้อยแล้ว');
        await loadInitialData(); // โหลดหน้าใหม่
    }
}

//async function deleteAllData() {
//    // ลบข้อมูลการขาย
//    const sales = await getAllSales();
//    for (const sale of sales) {
//        await deleteSale(sale.id);
//    }
//    
//    // ลบข้อมูลพื้นฐาน
//    await saveMetadata('fruits', []);
//    await saveMetadata('saleTypes', []);
//    await saveMetadata('gardens', []);
//}

async function deleteAllData() {
    await clearAllSales(); // ลบข้อมูลการขายทั้งหมด
    await clearMetadata(); // ลบข้อมูลพื้นฐาน
    const sales = await getAllSales();
    for (const sale of sales) {
        await deleteSale(sale.id);
    }
}
// สลับระหว่างแท็บ
function switchTab(tab) {
    // ซ่อนแท็บทั้งหมด
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    // แสดงแท็บที่เลือก
    document.getElementById(`${tab}-section`).classList.remove('hidden');

    // เปลี่ยนสีปุ่มแท็บ
    document.querySelectorAll('.tab-button').forEach(el => el.classList.remove('text-green-700', 'border-green-700'));
    document.getElementById(`${tab}-tab`).classList.add('text-green-700', 'border-green-700');
}

// เพิ่มรายการขายใหม่
function addNewItem() {
    const container = document.getElementById('items-container');
    const entry = createItemEntry(container.children.length, saleTypeOptions, gardenOptions);
    container.appendChild(entry);

    // ปุ่มลบรายการ
    entry.querySelector('.remove-item-btn').onclick = () => {
        entry.remove();
        reindexItems();
    };
}

// เรียงลำดับรายการใหม่หลังจากลบ
function reindexItems() {
    document.querySelectorAll('#items-container .item-entry h3').forEach((h3, i) => {
        h3.textContent = `รายการที่ ${i + 1}`;
    });
}

// บันทึกการขาย
// ฟังก์ชันบันทึกทั่วไป (แก้ไขแล้ว)
async function saveSale() {
    const date = document.getElementById('sale-date').value;
    const fruit = document.getElementById('fruit-type').value;

    if (!date || !fruit) {
        alert('กรุณาเลือกวันที่และผลไม้');
        return;
    }

    const items = [...document.querySelectorAll('.item-entry')].map(entry => ({
            type: entry.querySelector('.item-type').value,
            garden: entry.querySelector('.garden').value,
            weight: parseFloat(entry.querySelector('.weight').value),
            pricePerKg: parseFloat(entry.querySelector('.price-per-kg').value)
        })).filter(item => item.type && item.garden && !isNaN(item.weight) && !isNaN(item.pricePerKg));

    if (!items.length) {
        alert('กรุณากรอกข้อมูลรายการให้ครบ');
        return;
    }

    const total = items.reduce((sum, i) => sum + (i.weight * i.pricePerKg), 0);

    if (isEditMode) {
        // โหมดแก้ไข - อัพเดทข้อมูลเดิม
        await updateSale({
            id: currentEditId,
            date,
            fruit,
            items,
            total
        });
    } else {
        // โหมดเพิ่มใหม่
        await addSale({
            id: Date.now(),
            date,
            fruit,
            items,
            total
        });
    }

    // รีเซ็ตฟอร์ม
    resetForm();
    renderSales(await getAllSales());
}
// แก้ไขฟังก์ชัน renderSales
function renderSales(sales) {
    const tbody = document.getElementById('sales-history-body');
    tbody.innerHTML = '';

    sales.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(sale => {
        const tr = document.createElement('tr');
        const items = sale.items.map(i => `${i.type} ${i.weight}กก. x ${i.pricePerKg}฿`).join('<br>');

        tr.innerHTML = `
      <td class="px-6 py-4 text-sm text-gray-500">${sale.date}</td>
      <td class="px-6 py-4 text-sm">${sale.fruit}</td>
      <td class="px-6 py-4 text-sm">${items}</td>
      <td class="px-6 py-4 text-sm text-green-700">${sale.total.toFixed(2)} ฿</td>
      <td class="px-6 py-4">
        <div class="flex space-x-2">
          <button data-id="${sale.id}" class="edit-sale text-blue-500 hover:text-blue-700" title="แก้ไข">
            <i class="fas fa-edit"></i>
          </button>
          <button data-id="${sale.id}" class="delete-sale text-red-500 hover:text-red-700" title="ลบ">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;

        tr.querySelector('.edit-sale').addEventListener('click', () => enterEditMode(sale));
        tr.querySelector('.delete-sale').addEventListener('click', deleteSaleHandler);
        tbody.appendChild(tr);
    });
}

// เพิ่มฟังก์ชันนี้ใน app.js
async function deleteSaleHandler(event) {
    const saleId = Number(event.currentTarget.getAttribute('data-id'));

    if (confirm('คุณแน่ใจหรือไม่ที่จะลบรายการนี้?')) {
        try {
            await deleteSale(saleId);
            renderSales(await getAllSales());

            // ถ้าลบรายการที่กำลังแก้ไขอยู่ ให้รีเซ็ตฟอร์ม
            if (isEditMode && currentEditId === saleId) {
                resetForm();
            }
        } catch (error) {
            alert('เกิดข้อผิดพลาดในการลบ: ' + error.message);
        }
    }
}
// ฟังก์ชันเข้าสู่โหมดแก้ไข
function enterEditMode(sale) {
  isEditMode = true;
  currentEditId = sale.id;
  
  // เติมข้อมูลลงฟอร์ม
  document.getElementById('sale-date').value = sale.date;
  document.getElementById('fruit-type').value = sale.fruit;
  
  // ล้างและเติมรายการ
  const container = document.getElementById('items-container');
  container.innerHTML = '';
  
  sale.items.forEach((item, index) => {
    const entry = createItemEntry(index, saleTypeOptions, gardenOptions);
    container.appendChild(entry);
    
    entry.querySelector('.item-type').value = item.type;
    entry.querySelector('.garden').value = item.garden;
    entry.querySelector('.weight').value = item.weight;
    entry.querySelector('.price-per-kg').value = item.pricePerKg;
    
    entry.querySelector('.remove-item-btn').onclick = () => {
      entry.remove();
      reindexItems();
    };
  });
  
  // เปลี่ยนข้อความปุ่มบันทึก
  document.getElementById('save-btn-text').textContent = 'บันทึกการแก้ไข';
  document.getElementById('save-sale-btn').classList.replace('bg-green-600', 'bg-blue-600');
  
  // สลับไปแท็บขาย
  switchTab('sales');
  
  // Scroll ไปที่ฟอร์ม
  document.getElementById('sales-section').scrollIntoView({ behavior: 'smooth' });
}

// แสดงรายการข้อมูลพื้นฐาน (ผลไม้, ประเภทการขาย, สวน)
async function renderMetadataLists() {
    // ผลไม้
    const fruits = await getMetadata('fruits') || [];
    renderMetadataList('fruit-list', fruits, 'fruits');

    // ประเภทการขาย
    const saleTypes = await getMetadata('saleTypes') || [];
    renderMetadataList('sale-type-list', saleTypes, 'saleTypes');

    // สวน
    const gardens = await getMetadata('gardens') || [];
    renderMetadataList('garden-list', gardens, 'gardens');
}

// แสดงรายการข้อมูลพื้นฐานในรูปแบบลิสต์
function renderMetadataList(listId, items, metadataType) {
    const listElement = document.getElementById(listId);
    listElement.innerHTML = '';

    items.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'py-3 flex justify-between items-center';
        li.innerHTML = `
      <span>${item}</span>
      <button class="delete-item-btn text-red-500" data-type="${metadataType}" data-index="${index}">
        <i class="fas fa-trash"></i>
      </button>
    `;

        // ปุ่มลบรายการ
        li.querySelector('.delete-item-btn').onclick = async () => {
            if (confirm(`ลบ ${item}?`)) {
                items.splice(index, 1); // ลบออกจากอาร์เรย์
                await saveMetadata(metadataType, items); // บันทึกการเปลี่ยนแปลง
                renderMetadataLists(); // โหลดข้อมูลใหม่
            }
        };
        listElement.appendChild(li);
    });
}

// เพิ่มข้อมูลพื้นฐานใหม่ (ผลไม้, ประเภทการขาย, สวน)
async function addMetadataItem(metadataType, inputId) {
    const inputElement = document.getElementById(inputId);
    const newItem = inputElement.value.trim();

    if (!newItem)
        return alert('กรุณากรอกข้อมูล');

    const currentItems = await getMetadata(metadataType) || [];
    if (currentItems.includes(newItem))
        return alert('มีรายการนี้อยู่แล้ว');

    currentItems.push(newItem);
    await saveMetadata(metadataType, currentItems);

    inputElement.value = ''; // ล้างช่อง input
    renderMetadataLists(); // โหลดข้อมูลใหม่

    // อัปเดต dropdown ถ้าเป็นผลไม้
    if (metadataType === 'fruits') {
        populateDropdown('fruit-type', currentItems);
        saleTypeOptions = currentItems;
    }
}

// ส่งออกข้อมูล
async function exportData() {
    const sales = await getAllSales();
    const fruits = await getMetadata('fruits') || [];
    const saleTypes = await getMetadata('saleTypes') || [];
    const gardens = await getMetadata('gardens') || [];

    const data = {
        sales,
        metadata: {fruits, saleTypes, gardens}
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `fruit-sales-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

// นำเข้าข้อมูล
async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file)
        return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // แสดงข้อมูลตัวอย่างและปุ่มยืนยัน
            document.getElementById('test-mode-alert').classList.remove('hidden');
            document.getElementById('confirm-import-btn').onclick = async () => {
                await importData(data);
                document.getElementById('test-mode-alert').classList.add('hidden');
                event.target.value = ''; // รีเซ็ต input file
            };
        } catch (error) {
            alert('ไฟล์ไม่ถูกต้อง: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// นำเข้าข้อมูลจริง
async function importData(data) {
    try {
        // ล้างข้อมูลเดิมก่อนนำเข้าใหม่ (optional)
        await clearAllSales();

        // นำเข้าข้อมูลการขาย
        for (const sale of data.sales) {
            // สร้าง ID ใหม่เพื่อป้องกันการซ้ำ
            sale.id = Date.now() + Math.floor(Math.random() * 1000);
            await importSale(sale); // ใช้ฟังก์ชันใหม่ที่สร้างไว้
        }

        // อัพเดท metadata
        if (data.metadata) {
            await saveMetadata('fruits', data.metadata.fruits || []);
            await saveMetadata('saleTypes', data.metadata.saleTypes || []);
            await saveMetadata('gardens', data.metadata.gardens || []);
        }

        await loadInitialData();
        alert('นำเข้าข้อมูลสำเร็จ');
    } catch (error) {
        alert('เกิดข้อผิดพลาด: ' + error.message);
    }
}