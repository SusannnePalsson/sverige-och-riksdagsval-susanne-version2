let years = (await dbQuery(
  'SELECT DISTINCT year FROM dataWithMonths'
)).map(x => x.year);

let year1 = addDropdown('År 1', years, 1961);
let year2 = addDropdown('År 2', years, 2024);

// if year1 > year2 then switch the years
if (year1 > year2) {
  [year1, year2] = [year2, year1];
}

addMdToPage(`
  ## Hitta trender, från år ${year1} till år ${year2}
`);

let dataForChart = (await dbQuery(`
  SELECT year, AVG(temperatureC) AS avgTemperature
  FROM dataWithMonths
  WHERE year >= '${year1}' AND year <= '${year2}'
  GROUP BY year
`)).map(x => ({ ...x, year: +x.year })); // map to make year a number

drawGoogleChart({
  type: 'LineChart',
  data: makeChartFriendly(dataForChart, 'månad', `°C`),
  options: {
    height: 500,
    chartArea: { left: 50, right: 0 },
    curveType: 'function',
    pointSize: 5,
    pointShape: 'circle',
    vAxis: { format: '# °C' },
    title: `Medeltemperatur per år i Malmö, trend mellan åren ${year1} och ${year2} (°C)`,
    trendlines: { 0: { color: 'green', pointSize: 0 } },
    hAxis: { format: "#" } // prevents years to be displayed as numbers
  }
});

