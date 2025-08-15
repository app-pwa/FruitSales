import { getAllSales, getMetadata } from './db.js';
const Chart = window.Chart;

let currentChart = null;

export async function initCharts() {
    await populateFilters();
    updateChart('monthly-production');
    setupChartControls();
}

export function refreshChart(forceChartType) {
    try {
        let chartType;

        if (forceChartType instanceof Event) {
            chartType = document.querySelector('.chart-tab.active')?.dataset.chart;
        } else if (typeof forceChartType === 'string') {
            chartType = forceChartType;
        } else {
            chartType = document.querySelector('.chart-tab.active')?.dataset.chart;
        }

        const validChartTypes = ['monthly-production', 'price-trend', 'yearly-income', 'price-per-kg'];
        if (!chartType || !validChartTypes.includes(chartType)) {
            chartType = 'monthly-production';
        }

        updateChart(chartType);
    } catch (error) {
        console.error('Error refreshing chart:', error);
        updateChart('monthly-production');
    }
}

async function populateFilters() {
    const sales = await getAllSales();
    const fruits = await getMetadata('fruits') || [];
    const gardens = await getMetadata('gardens') || [];
    const saleTypes = await getMetadata('saleTypes') || [];

    // เติมปี (เฉพาะปีที่มีข้อมูล)
    const yearSelect = document.getElementById('chart-year');
    yearSelect.innerHTML = '<option value="all">ทุกปี</option>';

    const uniqueYears = [...new Set(sales.map(s => new Date(s.date).getFullYear()))].sort((a, b) => b - a);
    uniqueYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

    // เติมผลไม้
    const fruitSelect = document.getElementById('chart-fruit');
    fruitSelect.innerHTML = '<option value="all">ทั้งหมด</option>';
    fruits.forEach(fruit => {
        const option = document.createElement('option');
        option.value = fruit;
        option.textContent = fruit;
        fruitSelect.appendChild(option);
    });

    // เติมสวน
    const gardenSelect = document.getElementById('chart-garden');
    gardenSelect.innerHTML = '<option value="all">ทั้งหมด</option>';
    gardens.forEach(garden => {
        const option = document.createElement('option');
        option.value = garden;
        option.textContent = garden;
        gardenSelect.appendChild(option);
    });

    // เติมประเภท
    const typeSelect = document.getElementById('chart-type');
    typeSelect.innerHTML = '<option value="all">ทั้งหมด</option>';
    saleTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
    });
}

function setupChartControls() {
    const chartTabs = document.querySelectorAll('.chart-tab');
    const yearSelect = document.getElementById('chart-year');

    chartTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // อัปเดตสถานะแท็บ
            chartTabs.forEach(t => {
                t.classList.remove('text-green-700', 'border-green-700', 'active', 'border-b-2');
                t.classList.add('text-gray-500');
            });

            tab.classList.add('text-green-700', 'border-green-700', 'active', 'border-b-2');
            tab.classList.remove('text-gray-500');

            // อัปเดตกราฟ
            const chartType = tab.dataset.chart;
            updateChart(chartType);

            // ตั้งค่าการใช้งานของ Filter ปี
            const disableYearSelect = ['yearly-income', 'price-per-kg'].includes(chartType);
            yearSelect.disabled = disableYearSelect;

            if (disableYearSelect) {
                yearSelect.value = 'all';
            }
        });
    });

    // กรองข้อมูล
    document.getElementById('chart-year').addEventListener('change', refreshChart);
    document.getElementById('chart-fruit').addEventListener('change', refreshChart);
    document.getElementById('chart-garden').addEventListener('change', refreshChart);
    document.getElementById('chart-type').addEventListener('change', refreshChart);
}

async function updateChart(chartType) {
    const filters = getCurrentFilters();

    // กราฟที่ต้องการแสดงหลายปี (ไม่ให้เลือกปี)
    if (chartType === 'yearly-income' || chartType === 'price-per-kg') {
        filters.year = 'all'; // ใช้ข้อมูลทุกปี
        document.getElementById('chart-year').disabled = true;
        document.getElementById('chart-year').value = 'all';
    } else {
        document.getElementById('chart-year').disabled = false;
    }

    const sales = await filterSales(filters);

    // สร้างกราฟ
    const ctx = document.getElementById('main-chart').getContext('2d');
    if (currentChart) {
        currentChart.destroy();
    }

    currentChart = new Chart(ctx, getChartConfig(chartType, sales, filters));
    updateStats(sales);
}
function getCurrentFilters() {
    return {
        year: document.getElementById('chart-year').value,
        fruit: document.getElementById('chart-fruit').value,
        garden: document.getElementById('chart-garden').value,
        type: document.getElementById('chart-type').value
    };
}

async function filterSales(filters) {
    const allSales = await getAllSales();

    return allSales.map(sale => {
        const filteredSale = {...sale, items: []};

        sale.items.forEach(item => {
            let includeItem = true;

            if (filters.garden !== 'all' && item.garden !== filters.garden) {
                includeItem = false;
            }

            if (filters.type !== 'all' && item.type !== filters.type) {
                includeItem = false;
            }

            if (includeItem) {
                filteredSale.items.push(item);
            }
        });

        filteredSale.total = filteredSale.items.reduce((sum, item) =>
            sum + (item.weight * item.pricePerKg), 0);

        return filteredSale;
    })
            .filter(sale =>
                (filters.year === 'all' || new Date(sale.date).getFullYear() === Number(filters.year)) &&
                        (filters.fruit === 'all' || sale.fruit === filters.fruit) &&
                        sale.items.length > 0
            );
}

function getChartConfig(chartType, sales, filters) {
    switch (chartType) {
        case 'monthly-production':
            return getMonthlyProductionConfig(sales, filters);
        case 'price-trend':
            return getPriceTrendConfig(sales, filters);
        case 'yearly-income':
            return getYearlyIncomeConfig(sales, filters);
        case 'price-per-kg':
            return getPricePerKgConfig(sales, filters);
        default:
            return getMonthlyProductionConfig(sales, filters);
    }
}

function getMonthlyProductionConfig(sales, filters) {
    // จัดกลุ่มข้อมูลตามเดือนและสวน
    const gardens = filters.garden === 'all'
            ? [...new Set(sales.flatMap(s => s.items.map(i => i.garden)))]
            : [filters.garden];

    const colors = getNaturalFruitColors(gardens.length);
    const monthlyData = {};

    gardens.forEach(garden => {
        monthlyData[garden] = Array(12).fill(0);
    });

    sales.forEach(sale => {
        const month = new Date(sale.date).getMonth();
        sale.items.forEach(item => {
            if (filters.garden === 'all' || item.garden === filters.garden) {
                monthlyData[item.garden][month] += item.weight;
            }
        });
    });

    return {
        type: 'bar',
        data: {
            labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
            datasets: gardens.map((garden, i) => ({
                    label: garden,
                    data: monthlyData[garden],
                    backgroundColor: colors[i],
                    borderColor: colors[i],
                    borderWidth: 1,
                    borderRadius: 4,
                    barPercentage: 0.8
                }))
        },
        options: getChartOptions()
    };
}

function getPriceTrendConfig(sales, filters) {
    // กรณีเลือกปีเดียว
    if (filters.year !== 'all') {
        const selectedYear = Number(filters.year);
        const filteredSales = sales
                .filter(s => new Date(s.date).getFullYear() === selectedYear)
                .sort((a, b) => new Date(a.date) - new Date(b.date));

        const labels = [];
        const prices = [];

        filteredSales.forEach(sale => {
            const date = new Date(sale.date);
            labels.push(`${date.getDate()}/${date.getMonth() + 1}`);

            let totalWeight = 0;
            let totalValue = 0;

            sale.items.forEach(item => {
                totalWeight += item.weight;
                totalValue += (item.weight * item.pricePerKg);
            });

            const avgPrice = totalWeight > 0 ? (totalValue / totalWeight) : 0;
            prices.push(avgPrice);
        });

        return {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                        label: `ราคาจริงปี ${selectedYear}`,
                        data: prices,
                        borderColor: '#2A9D8F',
                        backgroundColor: 'rgba(42, 157, 143, 0.1)',
                        borderWidth: 2,
                        tension: 0.1,
                        fill: false,
                        pointRadius: 3
                    }]
            },
            options: getChartOptions()
        };
    }

    // กรณีเลือกทุกปี - แสดง 3 ปีล่าสุดแบบรายเดือน
    const allYears = [...new Set(sales.map(s => new Date(s.date).getFullYear()))]
            .sort((a, b) => b - a)
            .slice(0, 3);

    // สีสำหรับแต่ละปี
    const colors = ['#2A9D8F', '#E9C46A', '#E76F51'];

    // สร้าง labels เป็นเดือน
    const monthLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    const datasets = allYears.map((year, index) => {
        // กรองข้อมูลเฉพาะปี
        const yearlySales = sales.filter(s =>
            new Date(s.date).getFullYear() === year
        );

        // จัดกลุ่มข้อมูลตามเดือน
        const monthlyData = groupByMonth(yearlySales, year);

        return {
            label: `ปี ${year}`,
            data: monthlyData.map(month => month.avgPrice),
            borderColor: colors[index],
            backgroundColor: 'rgba(0,0,0,0)',
            borderWidth: 2,
            tension: 0.2,
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderDash: index === 2 ? [5, 5] : [] // ให้ปีที่ 3 เป็นเส้นประ
        };
    });

    return {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: datasets
        },
        options: getMonthlyChartOptions(true) // ส่ง true สำหรับกรณีหลายปี
    };
}

// ฟังก์ชันจัดกลุ่มข้อมูลตามเดือน
function groupByMonth(sales, year) {
    const months = Array(12).fill().map(() => ({
            totalWeight: 0,
            totalValue: 0,
            salesDetails: [] // เก็บข้อมูลการขายรายวัน
        }));

    sales.forEach(sale => {
        const date = new Date(sale.date);
        const month = date.getMonth();

        sale.items.forEach(item => {
            months[month].totalWeight += item.weight;
            months[month].totalValue += (item.weight * item.pricePerKg);

            // เก็บข้อมูลการขายรายวัน
            const saleDate = formatDate(date);
            const existingDay = months[month].salesDetails.find(d => d.date === saleDate);

            if (existingDay) {
                existingDay.weight += item.weight;
                existingDay.value += (item.weight * item.pricePerKg);
                existingDay.count++;
            } else {
                months[month].salesDetails.push({
                    date: saleDate,
                    weight: item.weight,
                    value: (item.weight * item.pricePerKg),
                    count: 1
                });
            }
        });
    });

    return months.map(month => ({
            avgPrice: month.totalWeight > 0 ? (month.totalValue / month.totalWeight) : null,
            totalWeight: month.totalWeight,
            salesDetails: month.salesDetails.sort((a, b) => new Date(a.date) - new Date(b.date))
        }));
}

// ฟังก์ชันตั้งค่ากราฟสำหรับ Monthly view
function getMonthlyChartOptions(isMultiYear = false) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    font: {
                        family: "'Kanit', sans-serif",
                        size: 11
                    },
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            tooltip: {
                callbacks: {
                    title: function (context) {
                        return `${context[0].label} ${isMultiYear ? '' : context[0].dataset.label.replace('ราคาเฉลี่ย', '')}`;
                    },
                    label: function (context) {
                        if (isMultiYear) {
                            const year = context.dataset.label.replace('ปี ', '');
                            const value = context.parsed.y;
                            return `${year}: ${value ? value.toFixed(2) + ' บาท/กก.' : 'ไม่มีข้อมูล'}`;
                        }
                        return null;
                    },
                    afterLabel: function (context) {
                        const monthData = context.dataset.data[context.dataIndex];
                        if (!monthData || !monthData.salesDetails)
                            return null;

                        let tooltipContent = [];
                        const monthSales = monthData.salesDetails;

                        tooltipContent.push(`จำนวนการขาย: ${monthSales.length} ครั้ง`);
                        tooltipContent.push('------------------');

                        monthSales.forEach(sale => {
                            const avgPrice = sale.weight > 0 ? (sale.value / sale.weight) : 0;
                            tooltipContent.push(
                                    `วันที่: ${sale.date}`,
                                    `- น้ำหนัก: ${sale.weight.toFixed(2)} กก.`,
                                    `- ราคา: ${avgPrice.toFixed(2)} บาท/กก.`,
                                    `- มูลค่า: ${sale.value.toFixed(2)} บาท`,
                                    '------------------'
                                    );
                        });

                        return tooltipContent;
                    }
                },
                bodyFont: {
                    family: "'Kanit', sans-serif",
                    size: 12
                },
                titleFont: {
                    family: "'Kanit', sans-serif",
                    size: 14,
                    weight: 'bold'
                },
                padding: 12,
                backgroundColor: 'rgba(0,0,0,0.85)',
                usePointStyle: true,
                boxWidth: 10,
                boxHeight: 10,
                displayColors: false
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    callback: function (value) {
                        return value.toFixed(2);
                    }
                },
                title: {
                    display: true,
                    text: 'ราคาเฉลี่ย (บาท/กก.)',
                    font: {
                        family: "'Kanit', sans-serif"
                    }
                }
            },
            x: {
                grid: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'เดือน',
                    font: {
                        family: "'Kanit', sans-serif"
                    }
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    };
}

// ฟังก์ชันช่วยเหลือจัดรูปแบบวันที่
function formatDate(date) {
    const d = new Date(date);
    return `${d.getDate()} ${['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][d.getMonth()]} ${d.getFullYear() + 543}`;
}

function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function getYearlyIncomeConfig(sales, filters) {
    // ไม่สนใจ filter ปี เพราะต้องการแสดงทุกปี
    const allYears = [...new Set(sales.map(s => new Date(s.date).getFullYear()))]
            .sort((a, b) => b - a) // เรียงจากปีล่าสุดไปเก่าสุด
            .slice(0, 5); // เลือกเพียง 5 ปีล่าสุด

    const yearlyData = {};
    allYears.forEach(year => {
        yearlyData[year] = 0;
    });

    // คำนวณรายได้รวมแต่ละปี
    sales.forEach(sale => {
        const year = new Date(sale.date).getFullYear();
        if (allYears.includes(year)) {
            yearlyData[year] += sale.total;
        }
    });

    return {
        type: 'bar',
        data: {
            labels: allYears.map(y => `ปี ${y}`),
            datasets: [{
                    label: 'รายได้รวม (บาท)',
                    data: allYears.map(year => yearlyData[year]),
                    backgroundColor: allYears.map((_, i) =>
                        i % 2 === 0 ? '#8BAB4E' : '#E9C46A' // สลับสีคู่-คี่
                    ),
                    borderColor: '#ffffff',
                    borderWidth: 1,
                    borderRadius: 4
                }]
        },
        options: {
            ...getChartOptions(),
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.parsed.y.toLocaleString()} บาท (ปี ${allYears[ctx.dataIndex]})`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => value.toLocaleString()
                    }
                }
            }
        }
    };
}

function getPricePerKgConfig(sales, filters) {
    // ไม่สนใจ filter ปี เพราะต้องการแสดงทุกปี
    const allYears = [...new Set(sales.map(s => new Date(s.date).getFullYear()))]
            .sort((a, b) => b - a) // เรียงจากปีล่าสุดไปเก่าสุด
            .slice(0, 3); // เลือกเพียง 3 ปีล่าสุด

    const yearlyPriceData = {};
    allYears.forEach(year => {
        yearlyPriceData[year] = {totalWeight: 0, totalValue: 0};
    });

    // คำนวณน้ำหนักและมูลค่ารวมแต่ละปี
    sales.forEach(sale => {
        const year = new Date(sale.date).getFullYear();
        if (allYears.includes(year)) {
            sale.items.forEach(item => {
                yearlyPriceData[year].totalWeight += item.weight;
                yearlyPriceData[year].totalValue += (item.weight * item.pricePerKg);
            });
        }
    });

    // คำนวณราคาเฉลี่ยต่อกก.
    const avgPrices = allYears.map(year => {
        const data = yearlyPriceData[year];
        return data.totalWeight > 0 ? (data.totalValue / data.totalWeight) : 0;
    });

    return {
        type: 'line',
        data: {
            labels: allYears.map(y => `ปี ${y}`),
            datasets: [{
                    label: 'ราคาเฉลี่ย (บาท/กก.)',
                    data: avgPrices,
                    borderColor: '#E76F51',
                    backgroundColor: 'rgba(231, 111, 81, 0.1)',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true
                }]
        },
        options: {
            ...getChartOptions(),
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.parsed.y.toFixed(2)} บาท/กก. (ปี ${allYears[ctx.dataIndex]})`
                    }
                }
            }
        }
    };
}
function getChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    font: {
                        family: "'Kanit', sans-serif",
                        size: 11
                    },
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            tooltip: {
                bodyFont: {
                    family: "'Kanit', sans-serif"
                },
                titleFont: {
                    family: "'Kanit', sans-serif"
                },
                padding: 10,
                backgroundColor: 'rgba(0,0,0,0.8)'
            }
        },
//        animation: {
//    duration: 0 // ปิด animation สำหรับข้อมูลมากๆ
//},
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    callback: function (value) {
                        return value.toLocaleString();
                    }
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        }
    };
}

function updateStats(sales) {
    const statsContainer = document.getElementById('chart-stats');

    const totalWeight = sales.reduce((sum, sale) =>
        sum + sale.items.reduce((s, i) => s + i.weight, 0), 0);

    const totalIncome = sales.reduce((sum, sale) => sum + sale.total, 0);
    const avgPrice = totalIncome / totalWeight || 0;

    statsContainer.innerHTML = `
        <div class="bg-blue-50 p-4 rounded-lg">
            <h3 class="font-medium text-blue-800">น้ำหนักรวม</h3>
            <p class="text-2xl font-bold">${totalWeight.toFixed(2)} <span class="text-sm">กก.</span></p>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
            <h3 class="font-medium text-green-800">รายได้รวม</h3>
            <p class="text-2xl font-bold">${totalIncome.toFixed(2)} <span class="text-sm">บาท</span></p>
        </div>
        <div class="bg-purple-50 p-4 rounded-lg">
            <h3 class="font-medium text-purple-800">ราคาเฉลี่ย</h3>
            <p class="text-2xl font-bold">${avgPrice.toFixed(2)} <span class="text-sm">บาท/กก.</span></p>
        </div>
    `;
}

function getNaturalFruitColors(count) {
    const naturalPalettes = [
        ['#8BAB4E', '#F4A259', '#E76F51', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51', '#264653', '#2A9D8F', '#E9C46A'],
        ['#C8E6C9', '#F5E6B8', '#D4E6B5', '#B5D8EB', '#E6D4B5', '#D4B5E6', '#B5E6D4', '#E6B5C8', '#B5C8E6', '#E6C8B5'],
        ['#6B8E23', '#CD853F', '#DAA520', '#556B2F', '#8FBC8F', '#BDB76B', '#F0E68C', '#EEE8AA', '#98FB98', '#AFEEEE']
    ];
    return naturalPalettes[0].slice(0, count);
}