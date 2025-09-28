let hmpiData = [];

// Dark/Light Mode
document.getElementById("modeToggle").addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    document.body.classList.toggle("light-mode");
});

// Sample Dataset Download
document.getElementById("downloadSampleBtn").addEventListener("click", () => {
    const sampleCSV = "Location,Latitude,Longitude,Lead,Cadmium,Arsenic\nSite1,20.3,78.2,0.02,0.01,0.003\nSite2,21.1,77.9,0.03,0.015,0.004";
    const blob = new Blob([sampleCSV], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sample_hmpi.csv";
    a.click();
    URL.revokeObjectURL(a.href);
});

// File Upload (CSV or JSON)
document.getElementById("fileInput").addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById("loadingSpinner").style.display = "inline-block";

    const reader = new FileReader();
    reader.onload = function (evt) {
        let data;
        try {
            if (file.name.endsWith(".json")) {
                data = JSON.parse(evt.target.result);
            } else {
                data = csvToArray(evt.target.result);
            }
        } catch (err) {
            alert("Invalid file format!");
            document.getElementById("loadingSpinner").style.display = "none";
            return;
        }

        document.getElementById("loadingSpinner").style.display = "none";
        document.getElementById("mainContent").style.display = "block";
        previewData(data);
        processData(data);

        // Switch to Table tab and scroll to results
        const tableTabEl = document.getElementById('tableTabLink');
        const tab = new bootstrap.Tab(tableTabEl);
        tab.show();
        tableTabEl.scrollIntoView({ behavior: "smooth" });
    };
    reader.readAsText(file);
});

// CSV to Array
function csvToArray(str, delimiter = ',') {
    const lines = str.trim().split('\n');
    const headers = lines.shift().split(delimiter).map(h => h.trim().replace(/\s+/g, ''));
    return lines.map(l => {
        const obj = {};
        l.split(delimiter).forEach((val, i) => {
            let num = parseFloat(val.trim());
            obj[headers[i]] = isNaN(num) ? val.trim() : num;
        });
        return obj;
    });
}

// Preview Table
function previewData(data) {
    const tbody = document.querySelector("#previewTable tbody");
    const thead = document.querySelector("#previewTable thead");
    tbody.innerHTML = ""; thead.innerHTML = "";
    const headers = Object.keys(data[0]);
    thead.innerHTML = "<tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr>";
    data.slice(0, 5).forEach(r => {
        tbody.innerHTML += "<tr>" + headers.map(h => `<td>${r[h]}</td>`).join("") + "</tr>";
    });
}

// HMPI Calculation
const limits = { Lead: 0.01, Cadmium: 0.003, Arsenic: 0.01 };
function calculateHMPI(row) {
    let sum = 0;
    const metals = ["Lead", "Cadmium", "Arsenic"];
    metals.forEach(m => {
        if (row[m] !== undefined && !isNaN(row[m])) sum += row[m] / limits[m];
    });
    return (sum / metals.length).toFixed(2);
}

function category(hmpi) {
    if (hmpi <= 1) return { text: "Safe", color: "#4CAF50" };
    if (hmpi <= 2) return { text: "Moderate", color: "#FFC107" };
    return { text: "Unsafe", color: "#F44336" };
}

// Process Data
function processData(data) {
    hmpiData = data.map(r => {
        const hmpi = parseFloat(calculateHMPI(r));
        const cat = category(hmpi);
        return {
            Location: r.Location || "Unknown",
            Latitude: r.Latitude || "",
            Longitude: r.Longitude || "",
            Lead: r.Lead || 0,
            Cadmium: r.Cadmium || 0,
            Arsenic: r.Arsenic || 0,
            HMPI: hmpi,
            Category: cat.text,
            Color: cat.color
        };
    });
    populateTable();
    populateCharts();
    populateDashboard();
}

// Populate Table
function populateTable() {
    const tbody = document.querySelector("#resultTable tbody");
    tbody.innerHTML = "";
    hmpiData.forEach(r => {
        tbody.innerHTML += `<tr>
            <td>${r.Location}</td>
            <td>${r.HMPI}</td>
            <td><span style="background-color:${r.Color}; color:white; padding:3px 7px; border-radius:5px;">${r.Category}</span></td>
        </tr>`;
    });
}

// Populate Charts
let hmpiChart, metalChart, categoryChart, heatmapChart, gaugeChart;
function populateCharts() {
    const locations = hmpiData.map(d => d.Location);
    const hmpiValues = hmpiData.map(d => parseFloat(d.HMPI));
    const lead = hmpiData.map(d => parseFloat(d.Lead));
    const cadmium = hmpiData.map(d => parseFloat(d.Cadmium));
    const arsenic = hmpiData.map(d => parseFloat(d.Arsenic));
    const categoriesCount = { Safe: 0, Moderate: 0, Unsafe: 0 };
    hmpiData.forEach(d => categoriesCount[d.Category]++);

    // HMPI Bar Chart
    if (hmpiChart) hmpiChart.destroy();
    hmpiChart = new Chart(document.getElementById("hmpiChart"), {
        type: 'bar',
        data: { labels: locations, datasets: [{ label: "HMPI", data: hmpiValues, backgroundColor: hmpiData.map(d => d.Color), barPercentage: 0.6, categoryPercentage: 0.7 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // Metal Contribution Stacked Bar
    if (metalChart) metalChart.destroy();
    metalChart = new Chart(document.getElementById("metalChart"), {
        type: 'bar',
        data: {
            labels: locations,
            datasets: [
                { label: "Lead", data: lead, backgroundColor: "#0288d1" },
                { label: "Cadmium", data: cadmium, backgroundColor: "#FFC107" },
                { label: "Arsenic", data: arsenic, backgroundColor: "#F44336" }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }
    });

    // Category Pie Chart
    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(document.getElementById("categoryChart"), {
        type: 'pie',
        data: { labels: Object.keys(categoriesCount), datasets: [{ data: Object.values(categoriesCount), backgroundColor: ["#4CAF50", "#FFC107", "#F44336"] }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Dashboard
function populateDashboard() {
    const locations = hmpiData.map(d => d.Location);
    const hmpiValues = hmpiData.map(d => parseFloat(d.HMPI));
    const maxHmpi = Math.max(...hmpiValues);

    // Heatmap Bar
    if (heatmapChart) heatmapChart.destroy();
    heatmapChart = new Chart(document.getElementById("heatmapChart"), {
        type: 'bar',
        data: { labels: locations, datasets: [{ label: "HMPI Heatmap", data: hmpiValues, backgroundColor: hmpiData.map(d => d.Color) }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // Gauge Chart
    if (gaugeChart) gaugeChart.destroy();
    gaugeChart = new Chart(document.getElementById("gaugeChart"), {
        type: 'doughnut',
        data: { labels: ["Max HMPI", "Remaining"], datasets: [{ data: [maxHmpi, Math.max(0, 3 - maxHmpi)], backgroundColor: [maxHmpi <= 1 ? "#4CAF50" : maxHmpi <= 2 ? "#FFC107" : "#F44336", "#E0E0E0"] }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            circumference: Math.PI,
            rotation: -Math.PI,
            cutout: '70%',
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });
}
// Start Analysis Button - scroll to Upload Section
document.getElementById("startAnalysisBtn").addEventListener("click", () => {
    const uploadSection = document.getElementById("uploadSection");
    uploadSection.scrollIntoView({ behavior: "smooth" });
});


// Export CSV
document.getElementById("exportBtn").addEventListener("click", () => {
    let csv = "Location,Latitude,Longitude,Lead,Cadmium,Arsenic,HMPI,Category\n";
    hmpiData.forEach(r => {
        csv += `${r.Location},${r.Latitude},${r.Longitude},${r.Lead},${r.Cadmium},${r.Arsenic},${r.HMPI},${r.Category}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "hmpi_results.csv";
    a.click();
    URL.revokeObjectURL(a.href);
});
