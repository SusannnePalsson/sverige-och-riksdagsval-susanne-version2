addMdToPage(`
  ## Medelinkomst grupperat på Kommungrupp
  <label for="groupby-select">Gruppera på:</label>
  <select id="groupby-select">
    <option value="Huvudgrupp">Huvudgrupp</option>
    <option value="Kommungrupp" selected>Kommungrupp</option>
  </select>
  <div id="medelinkomst-chart"></div>
`);

addMdToPage(`

  Diagrammet nedan visar medelinkomster för de olika Kommungrupperna.  
  Min hypotes att Storstadskommuner har högre medelinkomst än Landsbyggdskommuner visar sig korrekt.
  Löneutvecklingen och löneskillnaderna mellan grupperna följs åt under åren.
  `);

/********** Kommun_Statistik: Kommungruppsindelning **********/
dbQuery.use('kommun-statistik');
let kgi = await dbQuery('SELECT Huvudgrupp, Kommungrupp, Kommunnamn FROM Kommungruppsindelning');

/********** kommun-info-mongodb - incomeByKommun **********/
dbQuery.use('kommun-info-mongodb');
let income = await dbQuery
  .collection('incomeByKommun')
  .find({}, { projection: { kommun: 1, kon: 1, medelInkomst2018: 1, medelInkomst2019: 1, medelInkomst2020: 1, medelInkomst2021: 1, medelInkomst2022: 1, medianInkomst2018: 1, medianInkomst2019: 1, medianInkomst2020: 1, medianInkomst2021: 1, medianInkomst2022: 1, _id: 1 } })
  .limit(1234567890);

/********** Join kommun-statistik and kommun-info-mongodb on Kommunnamn/kommun **********/
// Create a map from income data for quick lookup by kommun name (normalized)
const incomeMap = new Map();
income.forEach(item => {
  if (item.kommun) {
    incomeMap.set(item.kommun.trim().toLowerCase(), item);
  }
});

// Merge kgi and income data where Kommunnamn matches kommun (normalized)
const joinedData = kgi
  .map(row => {
    const key = (row.Kommunnamn || '').trim().toLowerCase();
    const incomeRow = incomeMap.get(key);
    if (incomeRow) {
      return {
        Huvudgrupp: row.Huvudgrupp ?? null,
        Kommungrupp: row.Kommungrupp ?? null,
        Kommunnamn: row.Kommunnamn ?? null,
        _id: incomeRow._id ?? null,
        kommun: incomeRow.kommun ?? null,
        kon: incomeRow.kon ?? null,
        medelInkomst2018: incomeRow.medelInkomst2018 ?? null,
        medelInkomst2019: incomeRow.medelInkomst2019 ?? null,
        medelInkomst2020: incomeRow.medelInkomst2020 ?? null,
        medelInkomst2021: incomeRow.medelInkomst2021 ?? null,
        medelInkomst2022: incomeRow.medelInkomst2022 ?? null,
        medianInkomst2018: incomeRow.medianInkomst2018 ?? null,
        medianInkomst2019: incomeRow.medianInkomst2019 ?? null,
        medianInkomst2020: incomeRow.medianInkomst2020 ?? null,
        medianInkomst2021: incomeRow.medianInkomst2021 ?? null,
        medianInkomst2022: incomeRow.medianInkomst2022 ?? null
      };
    }
    return null;
  })
  .filter(Boolean);

// Hjälpfunktion för att extrahera unika värden
function unique(arr) {
  return Array.from(new Set(arr)).filter(x => x != null);
}

const groupBySelect = document.getElementById('groupby-select');

function drawChart() {
  const groupBy = groupBySelect.value;
  const groupField = groupBy;
  const grupper = {};
  joinedData.forEach(row => {
    let key = row[groupField];
    if (key === undefined || key === null || key === '') {
      key = '(okänd grupp)';
    }
    if (!grupper[key]) {
      grupper[key] = {
        count: 0,
        sum2018: 0,
        sum2019: 0,
        sum2020: 0,
        sum2021: 0,
        sum2022: 0
      };
    }
    grupper[key].count += 1;
    grupper[key].sum2018 += Number(row.medelInkomst2018) || 0;
    grupper[key].sum2019 += Number(row.medelInkomst2019) || 0;
    grupper[key].sum2020 += Number(row.medelInkomst2020) || 0;
    grupper[key].sum2021 += Number(row.medelInkomst2021) || 0;
    grupper[key].sum2022 += Number(row.medelInkomst2022) || 0;
  });

  const groupKeys = Object.keys(grupper).sort();
  const chartData = [
    ['År', ...groupKeys]
  ];
  ['2018', '2019', '2020', '2021', '2022'].forEach(year => {
    const row = [year];
    groupKeys.forEach(g => {
      row.push(grupper[g][`sum${year}`] / grupper[g].count);
    });
    chartData.push(row);
  });

  let colors, title;
  if (groupBy === 'Huvudgrupp') {
    colors = ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6'];
    title = 'Medelinkomst per Huvudgrupp (2018–2022)';
  } else {
    colors = ['#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6', '#dd4477', '#66aa00', '#b82e2e', '#316395'];
    title = 'Medelinkomst per Kommungrupp (2018–2022)';
  }

  drawGoogleChart({
    type: 'LineChart',
    data: chartData,
    elementId: 'medelinkomst-chart',
    options: {
      height: 500,
      chartArea: { left: 60, right: 20 },
      title: title,
      vAxis: { title: 'Medelinkomst (kr)', format: '#,##0' },
      hAxis: { title: 'År' },
      pointSize: 5,
      curveType: 'function',
      colors: colors.slice(0, groupKeys.length)
    }
  });
}

groupBySelect.addEventListener('change', drawChart);
drawChart();
