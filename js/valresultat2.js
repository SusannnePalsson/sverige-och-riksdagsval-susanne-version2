addMdToPage(`
## Valresultat för olika kommungrupperingar
  Linjediagrammet visar att valresultaten för de olika kommungruperingarna inte skiljer så särskilt mycket åt.  
  Jag trodde att det skulle vara större skillnader mellan storstadskommuner och landsbygdskommuner.
  Skilnaden mellan åren 2018 och 2022 är också liten och följs förvånansvärt nära.
  `);

dbQuery.use('riksdagsval-neo4j');
let electionResults = await dbQuery('MATCH (n:Partiresultat) RETURN n');

dbQuery.use('kommun-statistik');
let kgi = await dbQuery('SELECT * FROM Kommungruppsindelning');
console.log('kommungruppsindelning', kgi);
let kommunMap = new Map(kgi.map(row => [row.Kommunnamn, row]));
let joinedResults = electionResults.map(result => {
  let kommunData = kommunMap.get(result.kommun) || {};
  return { ...result, ...kommunData };
});
console.log('joinedResults', joinedResults);
let filteredKgi = kgi.map(({ Kommunnamn, Huvudgrupp, Kommungrupp }) => ({
  Kommunnamn,
  Huvudgrupp,
  Kommungrupp
}));
console.log('filtered kommun-statistik', filteredKgi);

// Wrap the table in a scrollable container
const container = document.createElement('div');
container.style.maxHeight = '200px';
container.style.overflowY = 'auto';
container.style.border = '1px solid #ccc';
container.style.marginTop = '1em';

// Generate the table HTML
const table = document.createElement('table');
table.style.width = '100%';
table.style.borderCollapse = 'collapse';

const headers = ['kommun', 'roster2018', 'roster2022', 'parti', 'Huvudgrupp', 'Kommungrupp'];
const thead = document.createElement('thead');
const headerRow = document.createElement('tr');
headers.forEach(h => {
  const th = document.createElement('th');
  th.textContent = h;
  th.style.border = '1px solid #ccc';
  th.style.padding = '4px';
  headerRow.appendChild(th);
});
thead.appendChild(headerRow);
table.appendChild(thead);

const tbody = document.createElement('tbody');
joinedResults.forEach(({ kommun, roster2018, roster2022, parti, Huvudgrupp, Kommungrupp }) => {
  const row = document.createElement('tr');
  [kommun, roster2018, roster2022, parti, Huvudgrupp, Kommungrupp].forEach(val => {
    const td = document.createElement('td');
    td.textContent = val !== undefined ? val : '';
    td.style.border = '1px solid #ccc';
    td.style.padding = '4px';
    row.appendChild(td);
  });
  tbody.appendChild(row);
});
table.appendChild(tbody);

container.appendChild(table);
document.body.appendChild(container);

// Make the table header sticky
const style = document.createElement('style');
style.textContent = `
  div > table thead th {
    position: sticky;
    top: 0;
    background: #f9f9f9;
    z-index: 1;
  }
`;
document.head.appendChild(style);

// Load Google Charts
google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(initChartUI);

function initChartUI() {
  // Create UI controls
  const controlsDiv = document.createElement('div');
  controlsDiv.style.margin = '1em 0';

  // Chart type selector
  const chartTypeLabel = document.createElement('label');
  chartTypeLabel.textContent = 'Chart type: ';
  const chartTypeSelect = document.createElement('select');
  ['BarChart', 'LineChart', 'ColumnChart', 'AreaChart'].forEach(type => {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type.replace('Chart', '');
    chartTypeSelect.appendChild(opt);
  });

  // Group by selector
  const groupByLabel = document.createElement('label');
  groupByLabel.textContent = ' Group by: ';
  const groupBySelect = document.createElement('select');
  [
    { value: 'Huvudgrupp', text: 'Huvudgrupp' },
    { value: 'Kommungrupp', text: 'Kommungrupp' }
  ].forEach(({ value, text }) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = text;
    groupBySelect.appendChild(opt);
  });

  controlsDiv.appendChild(chartTypeLabel);
  controlsDiv.appendChild(chartTypeSelect);
  controlsDiv.appendChild(groupByLabel);
  controlsDiv.appendChild(groupBySelect);

  // Chart container
  const chartDiv = document.createElement('div');
  chartDiv.id = 'google_chart_div';
  chartDiv.style.width = '100%';
  chartDiv.style.height = '200px';
  chartDiv.style.marginTop = '1em';

  document.body.appendChild(controlsDiv);
  document.body.appendChild(chartDiv);

  // Draw chart on change
  function drawChart() {
    const chartType = chartTypeSelect.value;
    const groupBy = groupBySelect.value;

    // Group data
    const grouped = {};
    joinedResults.forEach(row => {
      const groupKey = row[groupBy] || 'Okänd';
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push(row);
    });

    // Prepare dataTable
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Kommun');
    data.addColumn('string', 'Parti');
    data.addColumn('number', 'Röster 2018');
    data.addColumn('number', 'Röster 2022');
    data.addColumn('string', groupBy);

    Object.entries(grouped).forEach(([group, rows]) => {
      rows.forEach(({ kommun, parti, roster2018, roster2022 }) => {
        data.addRow([
          kommun || '',
          parti || '',
          Number(roster2018) || 0,
          Number(roster2022) || 0,
          group
        ]);
      });
    });

    // Chart options
    const options = {
      title: `Valresultat per kommun, grupperat på ${groupBy}`,
      hAxis: { title: 'Kommun' },
      vAxis: { title: 'Röster' },
      legend: { position: 'top' },
      height: 500,
      width: '100%'
    };

    // Draw chart
    let chart;
    switch (chartType) {
      case 'BarChart':
        chart = new google.visualization.BarChart(chartDiv);
        break;
      case 'LineChart':
        chart = new google.visualization.LineChart(chartDiv);
        break;
      case 'ColumnChart':
        chart = new google.visualization.ColumnChart(chartDiv);
        break;
      case 'AreaChart':
        chart = new google.visualization.AreaChart(chartDiv);
        break;
      default:
        chart = new google.visualization.BarChart(chartDiv);
    }

    // Use DataView to show kommun, parti, röster2018, röster2022, group
    chart.draw(data, options);
  }

  chartTypeSelect.addEventListener('change', drawChart);
  groupBySelect.addEventListener('change', drawChart);

  drawChart();
}

function drawSummaryCharts() {
  const groupBy = document.querySelector('select').nextSibling.nextSibling.value; // crude, but works for this context
  // Group data by groupBy
  const grouped = {};
  joinedResults.forEach(row => {
    const groupKey = row[groupBy] || 'Okänd';
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(row);
  });

  // Remove previous charts
  const chartDiv = document.getElementById('google_chart_div');
  chartDiv.innerHTML = '';

  Object.entries(grouped).forEach(([group, rows]) => {
    // Summarize per parti
    const partiMap = {};
    rows.forEach(({ parti, roster2018, roster2022 }) => {
      if (!partiMap[parti]) partiMap[parti] = { roster2018: 0, roster2022: 0 };
      partiMap[parti].roster2018 += Number(roster2018) || 0;
      partiMap[parti].roster2022 += Number(roster2022) || 0;
    });

    // Prepare DataTable
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Parti');
    data.addColumn('number', 'Röster 2018');
    data.addColumn('number', 'Röster 2022');
    Object.entries(partiMap).forEach(([parti, { roster2018, roster2022 }]) => {
      data.addRow([parti, roster2018, roster2022]);
    });

    // Chart options
    const options = {
      title: `${groupBy}: ${group}`,
      hAxis: { title: 'Parti' },
      vAxis: { title: 'Röster' },
      legend: { position: 'top' },
      height: 350,
      width: '100%'
    };

    // Create chart container
    const groupChartDiv = document.createElement('div');
    groupChartDiv.style.marginBottom = '2em';
    chartDiv.appendChild(groupChartDiv);

    // Draw chart (ColumnChart for comparison)
    const chart = new google.visualization.ColumnChart(groupChartDiv);
    chart.draw(data, options);
  });
}

// Replace the original chart drawing with the summary version
google.charts.setOnLoadCallback(() => {
  // Remove previous chart UI if any
  const chartDiv = document.getElementById('google_chart_div');
  if (chartDiv) chartDiv.innerHTML = '';
  drawSummaryCharts();

  // Listen to UI changes
  const selects = document.querySelectorAll('select');
  selects.forEach(sel => sel.addEventListener('change', drawSummaryCharts));
});

/**
 * Draws a Google LineChart comparing "Huvudgrupp" or "Kommungrupp" for each parti from 2018 to 2022.
 * The chart shows, for each group, the total votes per party for 2018 and 2022.
 */
function drawGroupComparisonLineChart() {
  // Get selected groupBy (Huvudgrupp or Kommungrupp)
  const groupBySelect = document.querySelector('select[name="groupBy"]') ||
    Array.from(document.querySelectorAll('select')).find(sel =>
      Array.from(sel.options).some(opt => opt.value === 'Huvudgrupp' || opt.value === 'Kommungrupp')
    );
  const groupBy = groupBySelect ? groupBySelect.value : 'Huvudgrupp';

  // Get all unique parties
  const allParties = Array.from(new Set(joinedResults.map(r => r.parti))).sort();

  // Group and sum votes per group and party
  const groupPartyVotes = {};
  joinedResults.forEach(({ parti, roster2018, roster2022, Huvudgrupp, Kommungrupp }) => {
    const group = groupBy === 'Huvudgrupp' ? Huvudgrupp : Kommungrupp;
    if (!groupPartyVotes[group]) groupPartyVotes[group] = {};
    if (!groupPartyVotes[group][parti]) groupPartyVotes[group][parti] = { roster2018: 0, roster2022: 0 };
    groupPartyVotes[group][parti].roster2018 += Number(roster2018) || 0;
    groupPartyVotes[group][parti].roster2022 += Number(roster2022) || 0;
  });

  // Prepare DataTable: columns = ['Parti', 'Group1 2018', 'Group1 2022', 'Group2 2018', ...]
  const data = new google.visualization.DataTable();
  data.addColumn('string', 'Parti');
  const groupNames = Object.keys(groupPartyVotes);
  groupNames.forEach(group => {
    data.addColumn('number', `${group} 2018`);
    data.addColumn('number', `${group} 2022`);
  });

  allParties.forEach(parti => {
    const row = [parti];
    groupNames.forEach(group => {
      const votes = groupPartyVotes[group][parti] || { roster2018: 0, roster2022: 0 };
      row.push(votes.roster2018, votes.roster2022);
    });
    data.addRow(row);
  });

  // Draw chart
  let chartDiv = document.getElementById('group_comparison_chart');
  if (!chartDiv) {
    chartDiv = document.createElement('div');
    chartDiv.id = 'group_comparison_chart';
    chartDiv.style.width = '100%';
    chartDiv.style.height = '500px';
    chartDiv.style.marginTop = '2em';
    document.body.appendChild(chartDiv);
  } else {
    chartDiv.innerHTML = '';
  }

  const options = {
    title: `Partiernas röster per ${groupBy} (2018 och 2022)`,
    hAxis: { title: 'Parti' },
    vAxis: { title: 'Röster' },
    legend: { position: 'top' },
    height: 500,
    width: '100%',
    pointSize: 5
  };

  const chart = new google.visualization.LineChart(chartDiv);
  chart.draw(data, options);
}

// Optionally, add a button to trigger the comparison chart
const compareBtn = document.createElement('button');
compareBtn.textContent = 'Visa gruppjämförelse (linjediagram)';
compareBtn.style.margin = '1em';
compareBtn.onclick = drawGroupComparisonLineChart;
document.body.appendChild(compareBtn);

const chartTypeSelect = document.querySelector('select'); // assumes first select is chart type
const groupBySelect = document.querySelectorAll('select')[1]; // assumes second select is group by

function handleChartChange() {
  drawSummaryCharts(chartTypeSelect.value, groupBySelect.value);
}

chartTypeSelect.addEventListener('change', handleChartChange);
groupBySelect.addEventListener('change', handleChartChange);