

// Gör kommunLista och mergedData globalt tillgängliga
let kommunLista = [];
let mergedData = [];
let dropdownElement; // Deklarera globalt så att vi kan referera till den senare




async function fetchAndMergeData() {
  try {
    console.log("Startar datahämtning...");

    // Hämta röstdatan från Neo4j
    dbQuery.use('riksdagsval-neo4j');
    let rosterKommuner = await dbQuery(`
      MATCH (p:Partiresultat)
      RETURN p.kommun AS kommun, p.roster2022 AS roster2022;
    `);

    // Hämta arbetslöshetsdatan från SQLite
    dbQuery.use('arbetslösa_2022.db');
    let arbetslösaInfo = await dbQuery(`
      SELECT Kommun AS kommun, arbetslösaAug2022 
      FROM arbetslöshet;
    `);

    // Säkerställ att data är i arrayformat
    rosterKommuner = Array.isArray(rosterKommuner) ? rosterKommuner : Object.values(rosterKommuner);
    arbetslösaInfo = Array.isArray(arbetslösaInfo) ? arbetslösaInfo : Object.values(arbetslösaInfo);

    // Summera röster per kommun
    let rösterPerKommun = rosterKommuner.reduce((acc, row) => {
      acc[row.kommun] = (acc[row.kommun] || 0) + row.roster2022;
      return acc;
    }, {});

    // Slå ihop röstdatan med arbetslöshetsdata
    mergedData = Object.keys(rösterPerKommun).map(kommun => {
      let match = arbetslösaInfo.find(arbetslöshet => arbetslöshet.kommun === kommun);
      return {
        kommun: kommun,
        total_roster_2022: rösterPerKommun[kommun],
        arbetslösaAug2022: match ? match.arbetslösaAug2022 : null
      };
    });

    console.log("Sammanställd data:", mergedData);

    // Uppdatera kommunLista och skapa dropdown
    kommunLista = mergedData.map(d => d.kommun);
    createDropdown();

  } catch (error) {
    console.error("Fel vid hämtning eller sammanslagning av data:", error);
  }
}

// Funktion för att skapa och hantera dropdown-menyn
function createDropdown() {
  if (kommunLista.length === 0) {
    console.error("KommunLista är tom!");
    return;
  }

  let labelElement = document.createElement("label");
  labelElement.textContent = "Välj kommun:";

  dropdownElement = document.createElement("select");
  kommunLista.forEach(kommun => {
    let opt = document.createElement("option");
    opt.value = kommun;
    opt.textContent = kommun;
    dropdownElement.appendChild(opt);
  });

  document.body.appendChild(labelElement);
  document.body.appendChild(dropdownElement);

  // Kontrollera om det finns en sparad kommun i localStorage
  let sparadKommun = localStorage.getItem("valdKommun");
  if (sparadKommun && kommunLista.includes(sparadKommun)) {
    dropdownElement.value = sparadKommun;
    updatePageContent(sparadKommun);
  }

  // Lägg till event listener för att spara val och visa data, men förhindra sidladdning
  dropdownElement.addEventListener("input", (event) => {
    event.preventDefault(); // Safari-fix för att förhindra sidladdning
    let valdKommun = event.target.value;
    localStorage.setItem("valdKommun", valdKommun); // Spara kommun i localStorage
    console.log("Vald kommun sparad:", valdKommun);
    updatePageContent(valdKommun);
  });
}

// Funktion för att visa vald kommunens data med korrekt formatering
function updatePageContent(valdKommun) {
  console.log("Kör updatePageContent med kommun:", valdKommun);
  let valdData = mergedData.find(d => d.kommun === valdKommun);

  let outputElement = document.getElementById("data-output");
  if (!outputElement) {
    outputElement = document.createElement("div");
    outputElement.id = "data-output";
    document.body.appendChild(outputElement);
  }

  outputElement.innerHTML = valdData ?
    `<p>Kommun: <strong>${valdData.kommun}</strong></p>
     <p>Antal röster: <strong>${valdData.total_roster_2022.toLocaleString("sv-SE")}</strong></p>
     <p>Antal arbetslösa: <strong>${valdData.arbetslösaAug2022.toLocaleString("sv-SE")}</strong></p>`
    : "<p>Välj en kommun för att se data!</p>";
}

// Återställ vald kommun vid sidladdning
document.addEventListener("DOMContentLoaded", () => {
  let sparadKommun = localStorage.getItem("valdKommun");
  if (sparadKommun && kommunLista.includes(sparadKommun)) {
    dropdownElement.value = sparadKommun;
    updatePageContent(sparadKommun);
  }
});

// Kör funktionen för att hämta och visualisera data
fetchAndMergeData();

//nytt kodblock för att hämta och visualisera data  

// Ladda Google Charts
google.charts.load('current', { packages: ['corechart'], language: 'sv' });
google.charts.setOnLoadCallback(initCorrelationChart);

// Kontrollera och initiera diagrammet när data är tillgängligt
function initCorrelationChart() {
  console.log("Startar initCorrelationChart...");

  if (!mergedData || mergedData.length === 0) {
    console.error("Data är inte tillgänglig ännu, väntar...");
    setTimeout(initCorrelationChart, 1000);
    return;
  }

  console.log("Data finns, ritar diagram...");
  drawCorrelationChart();
}

// Ny beräkning av R²-värdet
function calculateRSquared(data) {
  console.log("Beräknar R²...");

  let röster = [];
  let arbetslösa = [];

  data.forEach(d => {
    if (d.total_roster_2022 && d.arbetslösaAug2022) {
      röster.push(d.total_roster_2022);
      arbetslösa.push(d.arbetslösaAug2022);
    }
  });

  if (röster.length !== arbetslösa.length || röster.length === 0) {
    console.error("Felaktig data – kan inte beräkna R²!");
    return null;
  }

  let meanX = arbetslösa.reduce((sum, val) => sum + val, 0) / arbetslösa.length;
  let meanY = röster.reduce((sum, val) => sum + val, 0) / röster.length;

  // Beräkna SS_total och SS_res
  let ssTotal = röster.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
  let ssRes = arbetslösa.reduce((sum, x, i) => sum + Math.pow(röster[i] - (meanY + (x - meanX)), 2), 0);

  let rSquared = 1 - (ssRes / ssTotal);

  // Visa R² på sidan
  let rSquaredElement = document.getElementById("rSquaredOutput");
  if (!rSquaredElement) {
    rSquaredElement = document.createElement("div");
    rSquaredElement.id = "rSquaredOutput";
    rSquaredElement.style.fontSize = "18px";
    rSquaredElement.style.marginTop = "10px";
    document.body.appendChild(rSquaredElement);
  }
  rSquaredElement.innerHTML = `<strong>R²-värde:</strong> ${rSquared.toFixed(3)}`;

  console.log(`R²-värde beräknat: ${rSquared.toFixed(3)}`);
  return rSquared.toFixed(3);
}

// Konvertera data till Google Charts-format med tooltip
function makeCorrelationFriendly() {
  console.log("Konverterar data till Google Charts-format...");

  let chartData = [['Antal röster 2022', 'Antal arbetslösa Aug 2022', { role: 'tooltip' }]];

  mergedData.forEach(d => {
    if (d.total_roster_2022 && d.arbetslösaAug2022) {
      let tooltipText = `${d.kommun}\nRöster: ${d.total_roster_2022.toLocaleString("sv-SE")}\nArbetslösa: ${d.arbetslösaAug2022.toLocaleString("sv-SE")}`;
      chartData.push([d.total_roster_2022, d.arbetslösaAug2022, tooltipText]);
    }
  });

  console.log("chartData:", chartData);
  return chartData.length > 1 ? chartData : [['Antal röster 2022', 'Antal arbetslösa Aug 2022', { role: 'tooltip' }], [0, 0, 'Ingen data']];
}

// Rita korrelationsdiagrammet med regressionslinje och R²-värde
function drawCorrelationChart() {
  console.log("Startar ritning av korrelationsdiagram...");

  if (!mergedData || mergedData.length === 0) {
    console.error("Data är inte tillgänglig ännu!");
    return;
  }

  let data = google.visualization.arrayToDataTable(makeCorrelationFriendly());
  let rSquaredValue = calculateRSquared(mergedData);

  let options = {
    title: `Korrelation mellan röster och arbetslöshet (R² = ${rSquaredValue})`,
    hAxis: { title: 'Antal röster 2022', minValue: 0 },
    vAxis: { title: 'Antal arbetslösa Aug 2022', minValue: 0 },
    legend: 'none',
    pointSize: 5,
    tooltip: { isHtml: true },
    colors: ['#d95f02'],
    trendlines: {
      0: {
        type: 'linear',
        color: '#1b9e77',
        lineWidth: 3,
        opacity: 0.7,
        showR2: true
      }
    }
  };


  let chartElement = document.getElementById('correlationChart');
  if (!chartElement) {
    console.log("Skapar correlationChart-element...");
    chartElement = document.createElement("div");
    chartElement.id = "correlationChart";
    chartElement.style.width = "1000px";
    chartElement.style.height = "500px";
    chartElement.style.position = "relative";


    document.body.appendChild(chartElement);
  }

  console.log("Ritar diagrammet...");
  let chart = new google.visualization.ScatterChart(chartElement);
  chart.draw(data, options);
}

// Se till att diagrammet ritas när data hämtas
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(initCorrelationChart, 1000);
});

