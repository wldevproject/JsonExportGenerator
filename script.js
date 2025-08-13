// Muat library Google Charts dan paket 'sankey' di awal
google.charts.load('current', {
    'packages': ['sankey']
});

document.addEventListener("DOMContentLoaded", () => {
    // =================== 1. STATE MANAGEMENT ===================
    const state = {
        originalData: [],
        jsonData: [],
        adjustedData: [],
        headerData: null,
        fullJsonData: null,
        jsonOutputMode: 'full',
        finalJsonString: "",
        jsonFromFile: [],
        // State untuk slider
        harvestSplitPercent: 50,
        enjoySplitPercent: 50,
        exportStoreSplitPercent: 100, // Default 100% ke export
    };

    let resizeTimer; // Variabel untuk debouncing resize

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
        // Slider Tab 3
        slidersTab3: document.querySelectorAll(".slider-tab3"),
        harvestSliderTab3: document.getElementById("harvestSliderTab3"),
        sliderHarvestLabelTab3: document.getElementById("slider-harvest-label-tab3"),
        sliderImportLabelTab3: document.getElementById("slider-import-label-tab3"),
        enjoySliderTab3: document.getElementById("enjoySliderTab3"),
        sliderEnjoyLabelTab3: document.getElementById("slider-enjoy-label-tab3"),
        sliderExcessLabelTab3: document.getElementById("slider-excess-label-tab3"),
        exportStoreSliderTab3: document.getElementById("exportStoreSliderTab3"),
        sliderExportLabelTab3: document.getElementById("slider-export-label-tab3"),
        sliderStoreLabelTab3: document.getElementById("slider-store-label-tab3"),
        comprehensiveTableContainerTab3: document.getElementById("comprehensiveTableContainerTab3"),
        jsonHeaderSummary: document.getElementById("json-header-summary"),
        sankeyChartContainer: document.getElementById("sankey-chart-container"),
        copyJsonBtnTab3: document.getElementById("copyJsonBtnTab3"),
        jsonOutput2: document.getElementById("jsonOutput2"),
        jsonModeSelectors: document.querySelectorAll('input[name="jsonMode"], input[name="jsonModeTab3"]'),
    };

    // =================== 3. UTILITY FUNCTIONS ===================
    const showMessage = (msg) => {
        const div = document.createElement("div");
        div.textContent = msg;
        Object.assign(div.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            padding: "10px 20px",
            background: "#333",
            color: "#fff",
            borderRadius: "6px",
            zIndex: 1000,
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
            fontFamily: "var(--font-sans)",
        });
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    };
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => showMessage("Tersalin ke clipboard!"));
    };
    const parseNumber = (str, fallback = 0) => {
        if (typeof str !== 'string' || !str) return fallback;
        return parseFloat(str.replace(",", ".")) || fallback;
    };
    const cleanString = (s) => (s ?? "").replace(/^"|"$/g, "").trim();
    const customFormatNumber = (n) => {
        const num = Number(n);
        if (isNaN(num)) return 0;
        if (num % 1 === 0) return num;
        const intPart = Math.floor(num);
        const intLength = intPart.toString().length;
        if (intLength <= 2) return parseFloat(num.toFixed(2));
        if (intLength <= 3) return parseFloat(num.toFixed(1));
        return intPart;
    };
    const toggleOutputVisibility = (tabId, shouldShow) => {
        const tabElement = document.getElementById(tabId);
        if (!tabElement) return;
        const containers = tabElement.querySelectorAll('.output-container');
        containers.forEach(container => {
            container.hidden = !shouldShow;
        });
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
        const totals = {
            harvest: 0,
            importKwh: 0,
            adjustedHarvest: 0,
            adjustedImport: 0,
            exportKwh: 0,
            energyMeterKwh: 0,
            storeKwh: 0
        };
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
            dateTime: item.dateTime ?? "",
            harvest: customFormatNumber(item.adjustedHarvest),
            importKwh: customFormatNumber(item.adjustedImport),
            exportKwh: item.exportKwh?.value ?? 0,
            energyMeterKwh: item.energyMeterKwh?.value ?? 0,
            storeKwh: item.storeKwh?.value ?? 0,
            harvestRatio: item.harvestRatio ?? 0,
            unit: item.harvest?.unit ?? "kWh"
        }));
    };

    const processPastedData = (input) => {
        const lines = input.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) return [];
        const isCSV = input.includes(";") && !input.includes("\t");
        const separator = isCSV ? ";" : "\t";
        const dataRows = lines.slice(1);
        return dataRows.map(line => {
            const row = line.split(separator).map(cleanString);
            if (row.length < 8) return null;
            const [dateTimeRaw, harvestRaw, importKwhRaw, exportKwhRaw, energyMeterKwhRaw, storeKwhRaw, harvestRatioRaw, unitRaw] = row;
            const dateTime = cleanString(dateTimeRaw);
            const unit = cleanString(unitRaw) || 'kWh';
            const h = parseNumber(harvestRaw),
                imp = parseNumber(importKwhRaw);
            if (!dateTime || isNaN(h) || isNaN(imp)) return null;
            return {
                dateTime,
                harvest: {
                    value: h,
                    unit
                },
                importKwh: {
                    value: imp,
                    unit
                },
                exportKwh: {
                    value: parseNumber(exportKwhRaw),
                    unit
                },
                energyMeterKwh: {
                    value: parseNumber(energyMeterKwhRaw),
                    unit
                },
                storeKwh: {
                    value: parseNumber(storeKwhRaw),
                    unit
                },
                harvestRatio: parseNumber(harvestRatioRaw),
            };
        }).filter(Boolean);
    };

    const processAllAdjustments = (sourceData) => {
        // Step 1: Adjust Harvest vs Import on each row
        state.adjustedData = sourceData.map(row => {
            const totalInput = (row.harvest.value || 0) + (row.importKwh.value || 0);
            const adjustedHarvest = (totalInput * state.harvestSplitPercent) / 100;
            const adjustedImport = totalInput - adjustedHarvest;
            return {
                ...row,
                adjustedHarvest,
                adjustedImport
            };
        });

        const chartTotals = getTotals(state.adjustedData);
        let adjustedHeader = JSON.parse(JSON.stringify(state.headerData));

        // Step 2: Adjust Enjoy vs Excess on the header totals
        // Kalkulasi total output harus menyertakan semua komponen: enjoy, excessEnergy (export), dan storeKwh.
        const totalOriginalOutput = (state.headerData.enjoy.value || 0) + (state.headerData.excessEnergy.value || 0) + (state.headerData.storeKwh.value || 0);

        // Step 2: Adjust Enjoy vs Surplus (Export + Store)
        adjustedHeader.enjoy.value = totalOriginalOutput * (state.enjoySplitPercent / 100);
        const surplusTotal = totalOriginalOutput - adjustedHeader.enjoy.value;

        // Step 3: Adjust Export vs Store from the Surplus
        const adjustedExport = surplusTotal * (state.exportStoreSplitPercent / 100);
        const adjustedStore = surplusTotal - adjustedExport;

        // Update header with new values
        adjustedHeader.export = adjustedExport;
        adjustedHeader.excessEnergy.value = adjustedExport; // Aturan: excessEnergy adalah export
        adjustedHeader.storeKwh.value = adjustedStore;
        adjustedHeader.store = adjustedStore;

        // Step 4: Generate Final JSON
        const finalChartData = state.adjustedData.map(row => ({
            ...row,
            harvest: {
                value: customFormatNumber(row.adjustedHarvest),
                unit: row.harvest.unit
            },
            importKwh: {
                value: customFormatNumber(row.adjustedImport),
                unit: row.importKwh.unit
            },
            adjustedHarvest: undefined,
            adjustedImport: undefined,
        }));

        if (state.jsonOutputMode === 'full' && state.fullJsonData) {
            const newJsonOutput = JSON.parse(JSON.stringify(state.fullJsonData));
            newJsonOutput.data.header = adjustedHeader;
            newJsonOutput.data.header.harvest.value = chartTotals.adjustedHarvest;
            newJsonOutput.data.header.gridPln.value = chartTotals.adjustedImport;
            newJsonOutput.data.chart = finalChartData;
            state.finalJsonString = JSON.stringify(newJsonOutput, null, 2);
        } else {
            state.finalJsonString = `"chart": ${JSON.stringify(finalChartData, (key, value) => value === undefined ? undefined : value, 2)}`;
        }

        return adjustedHeader; // Return the calculated header
    };


    // =================== 5. RENDERING FUNCTIONS ===================
    const renderForTab1 = () => {
        if (!state.originalData.length) return;
        // Simple adjustment for Tab 1
        state.adjustedData = state.originalData.map(row => {
            const total = (row.harvest.value || 0) + (row.importKwh.value || 0);
            const adjustedHarvest = (total * state.harvestSplitPercent) / 100;
            const adjustedImport = total - adjustedHarvest;
            return {
                ...row,
                adjustedHarvest,
                adjustedImport
            };
        });
        const finalChartData = getFlattenedChart(state.adjustedData);

        state.finalJsonString = `"chart": ${JSON.stringify(finalChartData, (key, value) => value === undefined ? undefined : value, 2)}`;

        const totals = getTotals(state.originalData);
        renderTable(state.originalData, 'tablePreview1');
        renderTotalTable(totals, 'total-table-container');
        renderAdjustedTable(state.adjustedData, 'adjustedTableContainer');
        elements.jsonOutput.textContent = state.finalJsonString;
    };

    const renderForTab3 = () => {
        if (!state.jsonData.length) return;
        const adjustedHeader = processAllAdjustments(state.jsonData);
        const totals = getTotals(state.adjustedData);

        renderHeaderSummary(adjustedHeader, totals);
        renderSankeyChart(adjustedHeader, totals);
        renderComprehensiveTable(state.adjustedData, totals, 'comprehensiveTableContainerTab3');
        elements.jsonOutput2.textContent = state.finalJsonString;
    };

    const renderTable = (data, containerId) => {
        const container = document.getElementById(containerId);
        if (!data.length) {
            container.innerHTML = "";
            return;
        }
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
        if (!data || data.length === 0) {
            container.innerHTML = "";
            return;
        }
        const headers = ["DateTime", "Harvest (Ori)", "Import (Ori)", "Harvest (Adj)", "Import (Adj)", "Export", "Energy Meter", "Store", "Unit"];
        const headerHtml = headers.map(h => `<th>${h}</th>`).join('');
        const bodyHtml = data.map(row => `<tr><td>${row.dateTime}</td><td>${customFormatNumber(row.harvest.value)}</td><td>${customFormatNumber(row.importKwh.value)}</td><td>${customFormatNumber(row.adjustedHarvest)}</td><td>${customFormatNumber(row.adjustedImport)}</td><td>${customFormatNumber(row.exportKwh.value)}</td><td>${customFormatNumber(row.energyMeterKwh.value)}</td><td>${customFormatNumber(row.storeKwh.value)}</td><td>${row.harvest?.unit ?? 'kWh'}</td></tr>`).join('');
        const footerHtml = `<tr style="font-weight: bold; background-color: #f8f9fa;"><td>TOTAL</td><td>${customFormatNumber(totals.harvest)}</td><td>${customFormatNumber(totals.importKwh)}</td><td>${customFormatNumber(totals.adjustedHarvest)}</td><td>${customFormatNumber(totals.adjustedImport)}</td><td>${customFormatNumber(totals.exportKwh)}</td><td>${customFormatNumber(totals.energyMeterKwh)}</td><td>${customFormatNumber(totals.storeKwh)}</td><td></td></tr>`;
        container.innerHTML = `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody><tfoot>${footerHtml}</tfoot></table>`;
    };

    const renderHeaderSummary = (header, totals) => {
        const container = elements.jsonHeaderSummary;
        if (!header) {
            container.innerHTML = "";
            return;
        }
        const createSummaryItem = (label, data) => {
            if (data === undefined || data === null) return '';
            const value = data.value !== undefined ? data.value : data;
            const unit = data.unit || '';
            return `<div class="summary-item"><span class="label">${label}</span><span class="value">${customFormatNumber(value)} ${unit}</span></div>`;
        };
        let summaryHtml = `<h2>Ringkasan Header (Disesuaikan)</h2><div class="summary-grid">`;
        summaryHtml += createSummaryItem('Total Harvest', {
            value: totals.adjustedHarvest,
            unit: header.harvest.unit
        });
        summaryHtml += createSummaryItem('Total Import', {
            value: totals.adjustedImport,
            unit: header.gridPln.unit
        });
        summaryHtml += createSummaryItem('Energy Consumed', header.enjoy);
        summaryHtml += createSummaryItem('Excess Energy', header.excessEnergy);
        summaryHtml += createSummaryItem('Stored', header.storeKwh);
        summaryHtml += `</div>`;
        container.innerHTML = summaryHtml;
    };

    const renderSankeyChart = (header, totals) => {
        const container = elements.sankeyChartContainer;
        if (!header || !totals || !container) {
            container.innerHTML = "";
            return;
        }

        google.charts.setOnLoadCallback(() => {
            const data = new google.visualization.DataTable();
            data.addColumn('string', 'From');
            data.addColumn('string', 'To');
            data.addColumn('number', 'Value');

            const flows = [
                ['Harvest (Adj)', 'Total Available', customFormatNumber(totals.adjustedHarvest)],
                ['Grid/PLN (Adj)', 'Total Available', customFormatNumber(totals.adjustedImport)],
                ['Total Available', 'Consumed', customFormatNumber(header.enjoy.value)],
                ['Total Available', 'Exported', customFormatNumber(header.export)],
                ['Total Available', 'Stored', customFormatNumber(header.storeKwh.value)]
            ];

            const validFlows = flows.filter(flow => flow[2] > 0);
            if (validFlows.length === 0) {
                container.innerHTML = '<h2>Alur Energi Disesuaikan (Sankey)</h2><p>Tidak ada data alur energi untuk ditampilkan.</p>';
                return;
            }
            data.addRows(validFlows);

            const containerWidth = container.offsetWidth;
            const options = {
                sankey: {
                    node: {
                        colors: ['#26a69a', '#2979ff', '#f57c00', '#d32f2f', '#7b1fa2', '#c2185b'],
                        label: {
                            fontName: 'Poppins',
                            fontSize: containerWidth < 500 ? 11 : 14
                        }
                    },
                    link: {
                        colorMode: 'gradient',
                        colors: ['#26a69a', '#2979ff', '#f57c00', '#d32f2f', '#7b1fa2']
                    }
                }
            };
            container.innerHTML = '<h2>Alur Energi Disesuaikan (Sankey)</h2>';
            const chartDiv = document.createElement('div');
            container.appendChild(chartDiv);

            const chart = new google.visualization.Sankey(chartDiv);
            chart.draw(data, options);
        });
    };

    // =================== 6. EVENT HANDLERS ===================
    const handleResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const pasteJsonTab = document.getElementById('pasteJsonExport');
            if (pasteJsonTab && pasteJsonTab.classList.contains('active') && state.headerData && state.adjustedData.length > 0) {
                renderForTab3();
            }
        }, 250);
    };

    const handleTabClick = (e) => {
        if (e.target.tagName !== 'BUTTON' || !e.target.dataset.tab) return;
        const tabId = e.target.dataset.tab;
        setActiveTab(tabId);
        localStorage.setItem('activeTab', tabId);
        if (window.innerWidth <= 768) {
            elements.navLinks.classList.remove('open');
        }
    };

    const handleBurgerMenuClick = () => {
        elements.navLinks.classList.toggle('open');
    };

    const handleConvertToJson = () => {
        const input = elements.excelInput.value.trim();
        if (!input) {
            showMessage("Input data Excel kosong!");
            toggleOutputVisibility('importExcel', false);
            return;
        }
        state.originalData = processPastedData(input);
        if (state.originalData.length > 0) {
            state.harvestSplitPercent = 50;
            elements.harvestSlider.value = 50;
            renderForTab1();
            localStorage.setItem("excelInputBackup", input);
            toggleOutputVisibility('importExcel', true);
        } else {
            showMessage("Tidak ada data valid yang dapat diproses.");
            toggleOutputVisibility('importExcel', false);
        }
    };

    const handleSliderInput = (e) => {
        const value = parseInt(e.target.value, 10);
        state.harvestSplitPercent = value;
        elements.sliderHarvestLabel.textContent = value;
        elements.sliderImportLabel.textContent = 100 - value;
        renderForTab1();
    };

    const handleTab3SliderInput = (e) => {
        const { id, value } = e.target;
        const numValue = parseInt(value, 10);

        if (id === 'harvestSliderTab3') {
            state.harvestSplitPercent = numValue;
            elements.sliderHarvestLabelTab3.textContent = numValue;
            elements.sliderImportLabelTab3.textContent = 100 - numValue;
        } else if (id === 'enjoySliderTab3') {
            state.enjoySplitPercent = numValue;
            elements.sliderEnjoyLabelTab3.textContent = numValue;
            elements.sliderExcessLabelTab3.textContent = 100 - numValue;
        } else if (id === 'exportStoreSliderTab3') {
            state.exportStoreSplitPercent = numValue;
            elements.sliderExportLabelTab3.textContent = numValue;
            elements.sliderStoreLabelTab3.textContent = 100 - numValue;
        }

        renderForTab3();
    };

    const handleReset = () => {
        localStorage.removeItem("excelInputBackup");
        localStorage.removeItem("jsonInputBackup");
        localStorage.removeItem("activeTab");
        location.reload();
    };

    const handleCopyJson = () => {
        const activeTab = document.querySelector('.tab.active').id;
        if (activeTab === 'pasteJsonExport') {
            if (state.finalJsonString) copyToClipboard(state.finalJsonString);
        } else {
            if (elements.jsonOutput.textContent) copyToClipboard(elements.jsonOutput.textContent);
        }
    };

    const handleJsonFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                state.jsonFromFile = JSON.parse(event.target.result);
                elements.jsonFilePreview.textContent = JSON.stringify(state.jsonFromFile, null, 2);
                toggleOutputVisibility('jsonToExcel', true);
            } catch (error) {
                showMessage("Format JSON tidak valid!");
                toggleOutputVisibility('jsonToExcel', false);
            }
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
        const csvRows = [headers.join(";"), ...flattenedData.map(row => headers.map(field => {
            const val = row[field];
            return typeof val === "number" ? val.toString().replace(".", ",") : `"${val}"`;
        }).join(";"))];
        const blob = new Blob([csvRows.join("\n")], {
            type: "text/csv;charset=utf-8;"
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "adjusted_chart_data.csv";
        link.click();
        link.remove();
    };

    const handlePreviewJsonPaste = () => {
        const input = elements.jsonInput.value;
        localStorage.setItem("jsonInputBackup", input);

        // Hide all output containers initially
        document.querySelectorAll('#pasteJsonExport .output-container').forEach(c => c.hidden = true);

        try {
            if (!input.trim()) {
                state.jsonData = [];
                state.headerData = null;
                state.fullJsonData = null;
                return;
            }

            let fullJson = JSON.parse(input);

            // Fungsi untuk normalisasi JSON
            const normalizeJsonData = (json) => {
                if (!json.data) return json;

                const header = json.data.header;
                const chart = json.data.chart;
                const defaultUnit = header?.harvest?.unit || 'kWh';

                // Normalisasi Header
                if (header) {
                    if (typeof header.gridPln === 'undefined' && typeof header.import !== 'undefined') {
                        header.gridPln = {
                            value: header.import,
                            unit: defaultUnit
                        };
                    }
                    if (typeof header.storeKwh === 'undefined') {
                        header.storeKwh = {
                            value: 0,
                            unit: defaultUnit
                        };
                    }
                    if (typeof header.excessEnergy === 'undefined') {
                        header.excessEnergy = {
                            value: (header.export || 0) + (header.store || 0) + (header.storeKwh?.value || 0),
                            unit: defaultUnit
                        };
                    }
                }

                // Normalisasi item di dalam Chart
                if (chart && Array.isArray(chart)) {
                    chart.forEach(item => {
                        if (typeof item.storeKwh === 'undefined') {
                            item.storeKwh = {
                                value: 0,
                                unit: defaultUnit
                            };
                        }
                    });
                }
                return json;
            };

            fullJson = normalizeJsonData(fullJson);

            const headerData = fullJson?.data?.header;
            const chartData = fullJson?.data?.chart || (Array.isArray(fullJson) ? fullJson : []);

            if (!headerData) throw new Error("Objek 'header' tidak ditemukan di dalam 'data'.");
            if (!Array.isArray(chartData) || chartData.length === 0) throw new Error("Array 'chart' tidak valid atau kosong.");

            state.fullJsonData = fullJson;
            state.headerData = headerData;
            state.jsonData = chartData;

            initializeSliders(headerData);
            renderForTab3();

            // Show all output containers after processing
            document.querySelectorAll('#pasteJsonExport .output-container').forEach(c => c.hidden = false);

        } catch (e) {
            showMessage("JSON tidak valid: " + e.message);
            state.jsonData = [];
            state.headerData = null;
            state.fullJsonData = null;
            elements.comprehensiveTableContainerTab3.innerHTML = `<p style="color:red;">JSON tidak valid</p>`;
            elements.jsonOutput2.textContent = "Error: " + e.message;
            // Show only the relevant containers on error
            document.getElementById('adjustment-controls').hidden = false;
            document.getElementById('json-output-container').hidden = false;

        }
    };

    const initializeSliders = (header) => {
        const { harvest, gridPln, enjoy, excessEnergy, storeKwh } = header;

        const totalInput = (harvest?.value || 0) + (gridPln?.value || 0);
        state.harvestSplitPercent = totalInput > 0 ? Math.round(((harvest?.value || 0) / totalInput) * 100) : 50;

        // *** PERBAIKAN DI SINI ***
        const totalOutput = (enjoy?.value || 0) + (excessEnergy?.value || 0) + (storeKwh?.value || 0);
        state.enjoySplitPercent = totalOutput > 0 ? Math.round(((enjoy?.value || 0) / totalOutput) * 100) : 50;

        const surplusTotal = (excessEnergy?.value || 0) + (storeKwh?.value || 0);
        state.exportStoreSplitPercent = surplusTotal > 0 ? Math.round(((excessEnergy?.value || 0) / surplusTotal) * 100) : 100;

        // Update slider positions and labels
        elements.harvestSliderTab3.value = state.harvestSplitPercent;
        elements.sliderHarvestLabelTab3.textContent = state.harvestSplitPercent;
        elements.sliderImportLabelTab3.textContent = 100 - state.harvestSplitPercent;
        elements.enjoySliderTab3.value = state.enjoySplitPercent;
        elements.sliderEnjoyLabelTab3.textContent = state.enjoySplitPercent;
        elements.sliderExcessLabelTab3.textContent = 100 - state.enjoySplitPercent;
        elements.exportStoreSliderTab3.value = state.exportStoreSplitPercent;
        elements.sliderExportLabelTab3.textContent = state.exportStoreSplitPercent;
        elements.sliderStoreLabelTab3.textContent = 100 - state.exportStoreSplitPercent;
    };

    const handleJsonModeChange = (e) => {
        state.jsonOutputMode = e.target.value;
        const activeTab = document.querySelector('.tab.active').id;
        if (activeTab === 'importExcel') {
            renderForTab1();
        } else if (activeTab === 'pasteJsonExport') {
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
        elements.copyJsonBtnTab3.addEventListener('click', handleCopyJson);
        elements.jsonFileInput.addEventListener('change', handleJsonFileUpload);
        elements.exportToExcelBtn.addEventListener('click', () => handleExportToExcel());
        elements.previewJsonBtn.addEventListener('click', handlePreviewJsonPaste);

        // Single handler for all sliders on Tab 3
        elements.slidersTab3.forEach(slider => {
            slider.addEventListener('input', handleTab3SliderInput);
        });

        elements.exportJsonToExcelBtn.addEventListener('click', handleExportToExcel);
        elements.exportJsonToCsvBtn.addEventListener('click', handleExportToCsv);
        elements.resetBtn.addEventListener('click', handleReset);
        elements.jsonModeSelectors.forEach(radio => {
            radio.addEventListener('change', handleJsonModeChange);
        });

        window.addEventListener('resize', handleResize);

        const savedTabId = localStorage.getItem('activeTab');
        setActiveTab(savedTabId || 'importExcel');

        const savedExcelInput = localStorage.getItem("excelInputBackup");
        if (savedExcelInput) {
            elements.excelInput.value = savedExcelInput;
            handleConvertToJson();
        }
        const savedJsonInput = localStorage.getItem("jsonInputBackup");
        if (savedJsonInput) {
            elements.jsonInput.value = savedJsonInput;
            handlePreviewJsonPaste();
        }
    };

    init();
});