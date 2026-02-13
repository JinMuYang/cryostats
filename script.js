const messageElement = document.getElementById('status-message');
const tableElement = document.getElementById('data-table');

let currentSortColumn = -1;
let isAscending = true;

// Keys are lowercase to ensure CSV matching works regardless of casing
const orgConfig = {
    'alcor': {
        name: 'Alcor',
        domain: 'alcor.org',
        location: 'Scottsdale, United States',
        founded: '1972',
        logo: 'images/alcor.png'
    },
    'cryonics institute': {
        name: 'Cryonics Institute',
        domain: 'cryonics.org',
        location: 'Clinton Township, United States',
        founded: '1976',
        logo: 'images/cryonics.png'
    },
    'kriorus': {
        name: 'KrioRus',
        domain: 'kriorus.ru/en',
        location: 'Moscow, Russia',
        founded: '2003',
        logo: 'images/kriorus.png'
    },
    'southern cryonics': {
        name: 'Southern Cryonics',
        domain: 'southerncryonics.com',
        location: 'Holbrook, Australia',
        founded: '2012',
        logo: 'images/southerncryonics.jpeg'
    },
    'sparks brain preservation': {
        name: 'Sparks Brain Preservation',
        domain: 'sparksbrain.org',
        location: 'Salem, United States',
        founded: '2005',
        logo: 'images/sparksbrain.png'
    },
    'tomorrow biostasis': {
        name: 'Tomorrow Biostasis',
        domain: 'tomorrow.bio',
        location: 'Berlin, Germany & Rafz, Switzerland',
        founded: '2020',
        logo: 'images/tomorrow.png'
    },
    'yinfeng': {
        name: 'Yinfeng',
        domain: 'en.yinfenglife.org.cn',
        location: 'Jinan, China',
        founded: '2015',
        logo: 'images/yinfenglife.png'
    }
};

const defaultConfig = { location: '—', founded: '—', logo: '' };

// --- Utilities ---
// Helper to clean numbers
function getNumericValue(val) {
    // Use -Infinity for sorting logic
    if (val === null || val === undefined || val === '' || val === '—' || val === '#N/A') return -Infinity;
    // If it's already a number, return it
    if (typeof val === 'number') return val;
    // Remove commas before parsing
    return parseFloat(String(val).replace(/,/g, '')) || 0;
}

// Helper to format numbers with commas (e.g., 1000 -> 1,000)
function formatNumber(val) {
    const num = getNumericValue(val);
    if (num === -Infinity || num === 0) return '—';
    return num.toLocaleString();
}

// Minimal CSV parser to handle quoted fields like "Arizona, USA"
function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentCell += '"';
                i++;
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\n' || char === '\r') && !insideQuotes) {
            if (currentCell || currentRow.length > 0) currentRow.push(currentCell.trim());
            if (currentRow.length > 0) rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }
    return rows;
}

// --- Core Logic ---
function sortTable(columnIndex) {
    const tbody = tableElement.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const ths = tableElement.querySelectorAll('thead th');

    // Toggle Sort Direction
    if (currentSortColumn === columnIndex) {
        isAscending = !isAscending;
    } else {
        currentSortColumn = columnIndex;
        isAscending = true;
    }

    // Update Header Arrows
    ths.forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
    ths[columnIndex].classList.add(isAscending ? 'sort-asc' : 'sort-desc');

    // Check if column is numeric based on the first row's data attribute
    const firstValue = rows[0]?.children[columnIndex].dataset.value;
    const isNumericCol = firstValue !== undefined;

    rows.sort((rowA, rowB) => {
        const cellA = rowA.children[columnIndex];
        const cellB = rowB.children[columnIndex];

        if (isNumericCol) {
            // Safer parsing: if dataset.value is missing, treat as -Infinity
            const valA = cellA.dataset.value ? parseFloat(cellA.dataset.value) : -Infinity;
            const valB = cellB.dataset.value ? parseFloat(cellB.dataset.value) : -Infinity;

            // Keep "—" (Infinity) at the bottom regardless of sort direction
            if (valA === -Infinity && valB === -Infinity) return 0;
            if (valA === -Infinity) return 1;
            if (valB === -Infinity) return -1;

            return isAscending ? valA - valB : valB - valA;
        } else {
            const textA = cellA.innerText.trim();
            const textB = cellB.innerText.trim();
            return isAscending ? textA.localeCompare(textB) : textB.localeCompare(textA);
        }
    });

    // Re-append sorted rows (DOM moves them, doesn't copy)
    tbody.append(...rows);
}

function buildTable(headers, dataRows, totalRowData) {
    tableElement.innerHTML = '';

    // Create Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach((text, index) => {
        const th = document.createElement('th');
        th.innerHTML = `<div class="th-content">${text}</div>`;
        th.onclick = () => sortTable(index);
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    tableElement.appendChild(thead);

    // Create Body
    const tbody = document.createElement('tbody');
    dataRows.forEach(rowData => {
        const row = document.createElement('tr');

        // rowData structure: [orgName (string), location (string), founded (string), patients (RAW number), members (RAW number)]

        rowData.forEach((cellData, index) => {
            const td = document.createElement('td');

            // Look up config using the stored config object (which now has display names)
            // Note: The first column data in 'dataRows' is the raw CSV name
            if (index === 0) {
                const lookupKey = String(cellData).toLowerCase().trim();
                const conf = orgConfig[lookupKey] || { ...defaultConfig, name: cellData };
                const logoPath = conf.logo || 'images/default.png';

                // Use innerHTML for structure, but cellData is text content
                td.innerHTML = `
                            <div class="org-cell">
                            ${conf.logo
                        ?
                        `<a href="https://${conf.domain}" target="_blank" rel="noopener noreferrer">
                                        <img src="${logoPath}" alt="${conf.name} logo" loading="lazy">
                                        <span>${conf.name}</span>
                                </a>`
                        :
                        `<span>${cellData}</span>`} 
                            </div>
                        `;
            }
            // Numeric Columns (Index 3 & 4)
            else if (index >= 3) {
                // STORE RAW VALUE FOR SORTING
                td.setAttribute('data-value', cellData);
                td.textContent = formatNumber(cellData);
            }
            // Text Columns
            else {
                td.textContent = cellData;
                if (cellData === '—') td.classList.add('na-cell');
            }
            row.appendChild(td);
        });
        tbody.appendChild(row);
    });
    tableElement.appendChild(tbody);

    // Create Footer (The Total Row)
    if (totalRowData) {
        const tfoot = document.createElement('tfoot');
        const totalRow = document.createElement('tr');
        totalRowData.forEach((cellData, index) => {
            const td = document.createElement('td');
            if (index === 0) {
                td.innerHTML = `<div class="org-cell"><span>${cellData}</span></div>`;
            } else {
                td.textContent = cellData;
            }
            totalRow.appendChild(td);
        });
        tfoot.appendChild(totalRow);
        tableElement.appendChild(tfoot);
    }
}

async function loadData() {
    try {
        messageElement.textContent = 'Loading...';
        // Cache busting to ensure fresh data if file changes often
        const response = await fetch('data.csv?t=' + new Date().getTime());
        if (!response.ok) throw new Error(`Response was not OK: ${response.status}`);

        const text = await response.text();
        const rows = parseCSV(text.trim());

        if (!rows || rows.length < 2) throw new Error('No data found');

        // --- Aggregation Logic ---
        // Logic: Group by Quarter -> Get Latest -> Sum
        const history = {};

        // Start from index 1 to skip header
        rows.slice(1).forEach(row => {
            if (row.length < 2) return; // skip malformed lines
            const quarter = row[0].trim(); // e.g., "2025-Q4"
            if (!quarter) return;

            if (!history[quarter]) history[quarter] = [];
            history[quarter].push(row);
        });

        // Get Latest Quarter safely
        const sortedQuarters = Object.keys(history).sort();
        if (sortedQuarters.length === 0) throw new Error('No quarterly data found');

        const latestQuarter = sortedQuarters.pop();
        const rawData = history[latestQuarter];

        let totalPatients = 0;
        let totalMembers = 0;
        const displayRows = [];

        rawData.forEach(row => {
            const [_, rawOrgName, rawPatients, rawMembers] = row;

            // Skip if someone manually added a 'Total' row to CSV
            if (!rawOrgName || rawOrgName.toLowerCase() === 'total') return;

            // Normalize name for lookup
            const lookupKey = rawOrgName.toLowerCase().trim();
            const config = orgConfig[lookupKey] || defaultConfig;

            const pNum = getNumericValue(rawPatients);
            const mNum = getNumericValue(rawMembers);

            // Add to totals (only if valid positive number)
            if (pNum > 0 && pNum !== -Infinity) totalPatients += pNum;
            if (mNum > 0 && mNum !== -Infinity) totalMembers += mNum;

            // Pass RAW numbers to buildTable, formatting happens there
            // [Organisation, Location, Founded, Patients, Members]
            displayRows.push([
                rawOrgName, // Keep original CSV name for the table generation logic
                config.location,
                config.founded,
                pNum === -Infinity ? 0 : pNum, // Store 0 or value for processing
                mNum === -Infinity ? 0 : mNum
            ]);
        });

        // Update DOM
        const dateSpan = document.querySelector('.last-updated strong');
        if (dateSpan) dateSpan.textContent = latestQuarter;

        messageElement.classList.add('hidden');
        tableElement.classList.remove('hidden');

        buildTable(
            ['Organisation', 'Location', 'Founded', 'Patients', 'Members'],
            displayRows,
            ['Total', '—', '—', formatNumber(totalPatients), formatNumber(totalMembers)]
        );

    } catch (err) {
        console.error('Error loading data:', err);
        messageElement.innerHTML = `Unable to load data.<br><small>${err.message}</small>`;
        messageElement.style.color = 'var(--text-muted)';
    }
}

// Init
document.getElementById('year').textContent = new Date().getFullYear();
loadData();