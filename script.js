document.addEventListener("DOMContentLoaded", () => {
    // =================== 1. STATE MANAGEMENT ===================
    const state = {
        originalData: [], jsonData: [], adjustedData: [],
        headerData: null,
        fullJsonData: null,
        jsonOutputMode: 'full',
        finalJsonString: "", jsonFromFile: [], harvestSplitPercent: 50,
    };

    // =================== 2. DOM ELEMENT SELECTORS ===================
    const elements = {
        navTabs: document.getElementById("nav-tabs"),
        burgerMenuBtn: document.getElementById("burger-menu-btn"),
        navLinks: document.getElementById("nav-links"),
        tabs: document.querySelectorAll(".tab"),
        excelInput: document.getElementById("excelInput"),
        convertToJsonBtn: document.getElementById("convertToJsonBtn"),
        resetBtn: document.getElementById("resetBtn"),
        totalTableContainer: document.getElementById("total-table-container"),
        tablePreview1: document.getElementById("tablePreview1"),
        harvestSlider: document.getElementById("harvestSlider"),
        sliderHarvestLabel: document.getElementById("slider-harvest-label"),
        sliderImportLabel: document.getElementById("slider-import-label"),
        adjustedTableContainer: document.getElementById("adjustedTableContainer"),
        copyJsonBtn: document.getElementById("copyJsonBtn"),
        jsonOutput: document.getElementById("jsonOutput"),
        jsonFileInput: document.getElementById("jsonFileInput"),
        exportToExcelBtn: document.getElementById("exportToExcelBtn"),
        jsonFilePreview: document.getElementById("jsonFilePreview"),
        jsonInput: document.getElementById("jsonInput"),
        previewJsonBtn: document.getElementById("previewJsonBtn"),
        exportJsonToExcelBtn: document.getElementById("exportJsonToExcelBtn"),
        exportJsonToCsvBtn: document.getElementById("exportJsonToCsvBtn"),
        harvestSliderTab3: document.getElementById("harvestSliderTab3"),
        sliderHarvestLabelTab3: document.getElementById("slider-harvest-label-tab3"),
        sliderImportLabelTab3: document.getElementById("slider-import-label-tab3"),
        comprehensiveTableContainerTab3: document.getElementById("comprehensiveTableContainerTab3"),
        jsonHeaderSummary: document.getElementById("json-header-summary"),
        copyJsonBtnTab3: document.getElementById("copyJsonBtnTab3"),
        jsonOutput2: document.getElementById("jsonOutput2"),
        jsonModeSelectors: document.querySelectorAll('input[name="jsonModeTab3"]'),
    };

    // =================== 3. UTILITY FUNCTIONS ===================
    const showMessage = (msg) => {
        const div = document.createElement("div"); div.textContent = msg;
        Object.assign(div.style, { position: "fixed", bottom: "20px", right: "20px", padding: "10px 20px", background: "#333", color: "#fff", borderRadius: "6px", zIndex: 1000, boxShadow: "0 4px 15px rgba(0,0,0,0.2)", fontFamily: "var(--font-sans)", });
        document.body.appendChild(div); setTimeout(() => div.remove(), 3000);
    };
    const copyToClipboard = (text) => { navigator.clipboard.writeText(text).then(() => showMessage("Tersalin ke clipboard!")); };
    const parseNumber = (str, fallback = 0) => { if (typeof str !== 'string' || !str) return fallback; return parseFloat(str.replace(",", ".")) || fallback; };
    const cleanString = (s) => (s ?? "").replace(/^"|"$/g, "").trim();
    const customFormatNumber = (n) => {
        const num = Number(n); if (isNaN(num)) return 0; if (num % 1 === 0) return num;
        const intPart = Math.floor(num); const intLength = intPart.toString().length;
        if (intLength === 1) return parseFloat(num.toFixed(2)); if (intLength === 2) return parseFloat(num.toFixed(1)); return intPart;
    };
    const toggleOutputVisibility = (tabId, shouldShow) => {
        const tabElement = document.getElementById(tabId);
        if (!tabElement) return;
        const containers = tabElement.querySelectorAll('.output-container');
        containers.forEach(container => { container.hidden = !shouldShow; });
    };

    // =================== 4. CORE LOGIC & DATA PROCESSING ===================
    const setActiveTab = (tabId) => {
        if (!tabId) return;
        elements.tabs.forEach(tab => tab.classList.remove("active"));
        elements.navLinks.querySelectorAll("button").forEach(btn => btn.classList.remove("active"));
        const tabToShow = document.getElementById(tabId);
        const buttonToActivate = elements.navLinks.querySelector(`button[data-tab="${tabId}"]`);
        if (tabToShow) tabToShow.classList.add("active");
        if (buttonToActivate) buttonToActivate.classList.add("active");
    };
    const getTotals = (data) => {
        const totals = { harvest: 0, importKwh: 0, adjustedHarvest: 0, adjustedImport: 0, exportKwh: 0, energyMeterKwh: 0, storeKwh: 0 };
        data.forEach(row => {
            totals.harvest += row.harvest?.value ?? 0;
            totals.importKwh += row.importKwh?.value ?? 0;
            totals.adjustedHarvest += row.adjustedHarvest ?? 0;
            totals.adjustedImport += row.adjustedImport ?? 0;
            totals.exportKwh += row.exportKwh?.value ?? 0;
            totals.energyMeterKwh += row.energyMeterKwh?.value ?? 0;
            totals.storeKwh += row.storeKwh?.value ?? 0;
        });
        return totals;
    };
    const getFlattenedChart = (data) => {
        if (!data || !data.length) return [];
        return data.map((item) => ({
            dateTime: item.dateTime ?? "", harvest: customFormatNumber(item.adjustedHarvest),
            importKwh: customFormatNumber(item.adjustedImport), exportKwh: item.exportKwh?.value ?? 0,
            energyMeterKwh: item.energyMeterKwh?.value ?? 0, storeKwh: item.storeKwh?.value ?? 0,
            harvestRatio: item.harvestRatio ?? 0, unit: item.harvest?.unit ?? "kWh"
        }));
    };
    const processPastedData = (input) => {
        const lines = input.split(/\r?\n/).filter(line => line.trim()); if (lines.length < 2) return [];
        const isCSV = input.includes(";") && !input.includes("\t"); const separator = isCSV ? ";" : "\t";
        const dataRows = lines.slice(1);
        return dataRows.map(line => {
            const row = line.split(separator).map(cleanString); if (row.length < 8) return null;
            const [dateTimeRaw, harvestRaw, importKwhRaw, exportKwhRaw, energyMeterKwhRaw, storeKwhRaw, harvestRatioRaw, unitRaw] = row;
            const dateTime = cleanString(dateTimeRaw); const unit = cleanString(unitRaw) || 'kWh';
            const h = parseNumber(harvestRaw), imp = parseNumber(importKwhRaw);
            if (!dateTime || isNaN(h) || isNaN(imp)) return null;
            return {
                dateTime, harvest: { value: h, unit }, importKwh: { value: imp, unit },
                exportKwh: { value: parseNumber(exportKwhRaw), unit }, energyMeterKwh: { value: parseNumber(energyMeterKwhRaw), unit },
                storeKwh: { value: parseNumber(storeKwhRaw), unit }, harvestRatio: parseNumber(harvestRatioRaw),
            };
        }).filter(Boolean);
    };
    const processAdjustments = (sourceData) => {
        const percentHarvest = state.harvestSplitPercent; const percentImport = 100 - percentHarvest;

        state.adjustedData = sourceData.map(row => {
            const total = (row.harvest.value || 0) + (row.importKwh.value || 0);
            const adjustedHarvest = (total * percentHarvest) / 100;
            const adjustedImport = total - adjustedHarvest;
            return { ...row, adjustedHarvest, adjustedImport };
        });

        const finalChartData = state.adjustedData.map(row => ({
            ...row,
            harvest: { value: customFormatNumber(row.adjustedHarvest), unit: row.harvest.unit },
            importKwh: { value: customFormatNumber(row.adjustedImport), unit: row.importKwh.unit },
            adjustedHarvest: undefined,
            adjustedImport: undefined,
        }));

        if (state.jsonOutputMode === 'full' && state.fullJsonData) {
            const newJsonOutput = JSON.parse(JSON.stringify(state.fullJsonData));
            const totals = getTotals(state.adjustedData);

            newJsonOutput.data.header.harvest.value = customFormatNumber(totals.adjustedHarvest);
            newJsonOutput.data.header.gridPln.value = customFormatNumber(totals.adjustedImport);

            newJsonOutput.data.chart = finalChartData;
            state.finalJsonString = JSON.stringify(newJsonOutput, null, 2);
        } else {
            state.finalJsonString = `"chart": ${JSON.stringify(finalChartData, (key, value) => value === undefined ? undefined : value, 2)}`;
        }
    };

    // =================== 5. RENDERING FUNCTIONS ===================
    const renderForTab1 = () => {
        if (!state.originalData.length) return;
        processAdjustments(state.originalData);
        const totals = getTotals(state.originalData);
        renderTable(state.originalData, 'tablePreview1');
        renderTotalTable(totals, 'total-table-container');
        renderAdjustedTable(state.adjustedData, 'adjustedTableContainer');
        elements.jsonOutput.textContent = state.finalJsonString;
    };
    const renderForTab3 = () => {
        if (!state.jsonData.length) return;
        processAdjustments(state.jsonData);
        const totals = getTotals(state.adjustedData);
        if (state.headerData) {
            renderHeaderSummary(state.headerData, totals);
        }
        renderComprehensiveTable(state.adjustedData, totals, 'comprehensiveTableContainerTab3');
        elements.jsonOutput2.textContent = state.finalJsonString;
    };
    const renderTable = (data, containerId) => {
        const container = document.getElementById(containerId);
        if (!data.length) { container.innerHTML = ""; return; }
        const headers = ["dateTime", "harvest", "importKwh", "exportKwh", "energyMeterKwh", "storeKwh", "harvestRatio", "unit"];
        const headerHtml = headers.map(h => `<th>${h}</th>`).join('');
        const bodyHtml = data.map(row => `<tr><td>${row.dateTime}</td><td>${row.harvest?.value ?? 0}</td><td>${row.importKwh?.value ?? 0}</td><td>${row.exportKwh?.value ?? 0}</td><td>${row.energyMeterKwh?.value ?? 0}</td><td>${row.storeKwh?.value ?? 0}</td><td>${row.harvestRatio ?? 0}</td><td>${row.harvest?.unit ?? 'kWh'}</td></tr>`).join('');
        container.innerHTML = `<h2>Data Original</h2><div class="table-wrapper"><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
    };
    const renderTotalTable = (totals, containerId) => {
        const container = document.getElementById(containerId);
        container.innerHTML = `<h2>Total Keseluruhan</h2><div class="table-wrapper"><table><tbody>
            <tr><th>Harvest</th><td>${customFormatNumber(totals.harvest)}</td></tr>
            <tr><th>Import</th><td>${customFormatNumber(totals.importKwh)}</td></tr>
            <tr><th>Export</th><td>${customFormatNumber(totals.exportKwh)}</td></tr>
            <tr><th>EnergyMeter</th><td>${customFormatNumber(totals.energyMeterKwh)}</td></tr>
            <tr><th>Store</th><td>${customFormatNumber(totals.storeKwh)}</td></tr>
        </tbody></table></div>`;
    };
    const renderAdjustedTable = (data, containerId) => {
        const container = document.getElementById(containerId);
        const headers = ["dateTime", "adj. Harvest", "adj. Import"];
        const headerHtml = headers.map(h => `<th>${h}</th>`).join('');
        const bodyHtml = data.map(row => `<tr><td>${row.dateTime}</td><td>${customFormatNumber(row.adjustedHarvest)}</td><td>${customFormatNumber(row.adjustedImport)}</td></tr>`).join('');
        container.innerHTML = `<h2>Data Disesuaikan</h2><div class="table-wrapper"><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
    };
    const renderComprehensiveTable = (data, totals, containerId) => {
        const container = document.getElementById(containerId);
        if (!data || data.length === 0) { container.innerHTML = ""; return; }
        const headers = ["DateTime", "Harvest (Ori)", "Import (Ori)", "Harvest (Adj)", "Import (Adj)", "Export", "Energy Meter", "Store", "Unit"];
        const headerHtml = headers.map(h => `<th>${h}</th>`).join('');
        const bodyHtml = data.map(row => `<tr><td>${row.dateTime}</td><td>${customFormatNumber(row.harvest.value)}</td><td>${customFormatNumber(row.importKwh.value)}</td><td>${customFormatNumber(row.adjustedHarvest)}</td><td>${customFormatNumber(row.adjustedImport)}</td><td>${customFormatNumber(row.exportKwh.value)}</td><td>${customFormatNumber(row.energyMeterKwh.value)}</td><td>${customFormatNumber(row.storeKwh.value)}</td><td>${row.harvest?.unit ?? 'kWh'}</td></tr>`).join('');
        const footerHtml = `<tr style="font-weight: bold; background-color: #f8f9fa;"><td>TOTAL</td><td>${customFormatNumber(totals.harvest)}</td><td>${customFormatNumber(totals.importKwh)}</td><td>${customFormatNumber(totals.adjustedHarvest)}</td><td>${customFormatNumber(totals.adjustedImport)}</td><td>${customFormatNumber(totals.exportKwh)}</td><td>${customFormatNumber(totals.energyMeterKwh)}</td><td>${customFormatNumber(totals.storeKwh)}</td><td></td></tr>`;
        container.innerHTML = `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody><tfoot>${footerHtml}</tfoot></table>`;
    };
    const renderHeaderSummary = (header, totals) => {
        const container = elements.jsonHeaderSummary;
        if (!header) { container.innerHTML = ""; return; }
        const createSummaryItem = (label, data) => {
            if (data === undefined || data === null) return '';
            const value = data.value !== undefined ? data.value : data;
            const unit = data.unit || '';
            return `<div class="summary-item"><span class="label">${label}</span><span class="value">${customFormatNumber(value)} ${unit}</span></div>`;
        };
        let summaryHtml = `<h2>Ringkasan Header</h2><div class="summary-grid">`;
        summaryHtml += createSummaryItem('Harvest (Ori)', header.harvest);
        summaryHtml += createSummaryItem('Grid/PLN (Ori)', header.gridPln);
        if (totals) {
            summaryHtml += createSummaryItem('Total Harvest (Adj)', { value: totals.adjustedHarvest, unit: header.harvest.unit });
            summaryHtml += createSummaryItem('Total Import (Adj)', { value: totals.adjustedImport, unit: header.gridPln.unit });
        }
        summaryHtml += createSummaryItem('Energy Consumed', header.enjoy);
        summaryHtml += createSummaryItem('Excess Energy', header.excessEnergy);
        summaryHtml += `</div>`;
        container.innerHTML = summaryHtml;
    };

    // =================== 6. EVENT HANDLERS ===================
    const handleTabClick = (e) => {
        if (e.target.tagName !== 'BUTTON' || !e.target.dataset.tab) return;
        const tabId = e.target.dataset.tab;
        setActiveTab(tabId);
        localStorage.setItem('activeTab', tabId);
        if (window.innerWidth <= 768) { elements.navLinks.classList.remove('open'); }
    };
    const handleBurgerMenuClick = () => { elements.navLinks.classList.toggle('open'); };
    const handleConvertToJson = () => {
        const input = elements.excelInput.value.trim();
        if (!input) { showMessage("Input data Excel kosong!"); toggleOutputVisibility('importExcel', false); return; }
        state.originalData = processPastedData(input);
        if (state.originalData.length > 0) {
            renderForTab1();
            localStorage.setItem("excelInputBackup", input);
            toggleOutputVisibility('importExcel', true);
        } else { showMessage("Tidak ada data valid yang dapat diproses."); toggleOutputVisibility('importExcel', false); }
    };
    const handleSliderInput = (e) => {
        const value = parseInt(e.target.value, 10);
        state.harvestSplitPercent = value;
        if (document.getElementById('importExcel').classList.contains('active')) {
            elements.harvestSlider.value = value;
            elements.sliderHarvestLabel.textContent = value;
            elements.sliderImportLabel.textContent = 100 - value;
            renderForTab1();
        } else if (document.getElementById('pasteJsonExport').classList.contains('active')) {
            elements.harvestSliderTab3.value = value;
            elements.sliderHarvestLabelTab3.textContent = value;
            elements.sliderImportLabelTab3.textContent = 100 - value;
            renderForTab3();
        }
    };
    const handleReset = () => {
        localStorage.removeItem("excelInputBackup");
        localStorage.removeItem("jsonInputBackup");
        localStorage.removeItem("activeTab");
        location.reload();
    };
    const handleCopyJson = () => { if (state.finalJsonString) copyToClipboard(state.finalJsonString); };
    const handleJsonFileUpload = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                state.jsonFromFile = JSON.parse(event.target.result);
                elements.jsonFilePreview.textContent = JSON.stringify(state.jsonFromFile, null, 2);
                toggleOutputVisibility('jsonToExcel', true);
            } catch (error) { showMessage("Format JSON tidak valid!"); toggleOutputVisibility('jsonToExcel', false); }
        };
        reader.readAsText(file);
    };
    const handleExportToExcel = () => {
        if (!state.adjustedData.length) return showMessage("Tidak ada data untuk diekspor.");
        const flattenedData = getFlattenedChart(state.adjustedData);
        const worksheet = XLSX.utils.json_to_sheet(flattenedData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "AdjustedData");
        XLSX.writeFile(workbook, "adjusted_chart_data.xlsx");
    };
    const handleExportToCsv = () => {
        if (!state.adjustedData.length) return showMessage("Tidak ada data untuk diekspor.");
        const flattenedData = getFlattenedChart(state.adjustedData);
        const headers = Object.keys(flattenedData[0]);
        const csvRows = [headers.join(";"), ...flattenedData.map(row => headers.map(field => { const val = row[field]; return typeof val === "number" ? val.toString().replace(".", ",") : `"${val}"`; }).join(";"))];
        const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "adjusted_chart_data.csv";
        link.click();
        link.remove();
    };
    const handlePreviewJsonPaste = () => {
        const input = elements.jsonInput.value;
        localStorage.setItem("jsonInputBackup", input);

        toggleOutputVisibility('pasteJsonExport', false);
        elements.jsonHeaderSummary.innerHTML = "";

        try {
            if (!input.trim()) {
                state.jsonData = [];
                state.headerData = null;
                state.fullJsonData = null;
                return;
            }

            const fullJson = JSON.parse(input);

            const headerData = fullJson?.data?.header;
            const chartData = fullJson?.data?.chart || (Array.isArray(fullJson) ? fullJson : []);

            if (!headerData) throw new Error("Objek 'header' tidak ditemukan di dalam 'data'.");
            if (!Array.isArray(chartData) || chartData.length === 0) throw new Error("Array 'chart' tidak valid atau kosong.");

            state.fullJsonData = fullJson;
            state.headerData = headerData;
            state.jsonData = chartData;

            renderForTab3();
            toggleOutputVisibility('pasteJsonExport', true);
        } catch (e) {
            showMessage("JSON tidak valid: " + e.message);
            state.jsonData = [];
            state.headerData = null;
            state.fullJsonData = null;
            elements.comprehensiveTableContainerTab3.innerHTML = `<p style="color:red;">JSON tidak valid</p>`;
            elements.jsonOutput2.textContent = "Error: " + e.message;
            toggleOutputVisibility('pasteJsonExport', true);
        }
    };
    const handleJsonModeChange = (e) => {
        state.jsonOutputMode = e.target.value;
        if (document.getElementById('importExcel').classList.contains('active')) {
            renderForTab1();
        } else if (document.getElementById('pasteJsonExport').classList.contains('active')) {
            renderForTab3();
        }
    };

    // =================== 7. INITIALIZATION ===================
    const init = () => {
        elements.burgerMenuBtn.addEventListener('click', handleBurgerMenuClick);
        elements.navTabs.addEventListener('click', handleTabClick);
        elements.convertToJsonBtn.addEventListener('click', handleConvertToJson);
        elements.harvestSlider.addEventListener('input', handleSliderInput);
        elements.copyJsonBtn.addEventListener('click', handleCopyJson);
        elements.jsonFileInput.addEventListener('change', handleJsonFileUpload);
        elements.exportToExcelBtn.addEventListener('click', () => handleExportToExcel());
        elements.previewJsonBtn.addEventListener('click', handlePreviewJsonPaste);
        elements.harvestSliderTab3.addEventListener('input', handleSliderInput);
        elements.copyJsonBtnTab3.addEventListener('click', handleCopyJson);
        elements.exportJsonToExcelBtn.addEventListener('click', handleExportToExcel);
        elements.exportJsonToCsvBtn.addEventListener('click', handleExportToCsv);
        elements.resetBtn.addEventListener('click', handleReset);
        elements.jsonModeSelectors.forEach(radio => {
            radio.addEventListener('change', handleJsonModeChange);
        });
        const savedTabId = localStorage.getItem('activeTab');
        setActiveTab(savedTabId || 'importExcel');

        const savedExcelInput = localStorage.getItem("excelInputBackup");
        if (savedExcelInput) { elements.excelInput.value = savedExcelInput; handleConvertToJson(); }
        const savedJsonInput = localStorage.getItem("jsonInputBackup");
        if (savedJsonInput) { elements.jsonInput.value = savedJsonInput; handlePreviewJsonPaste(); }
    };
    init();
});