


addMdToPage(`## Hur förändrades antalet röster för de olika partierna från de olika åren?`)
addMdToPage(`Diagrammet nedan visar hur många röster de olika partierna fick i riksdagsvalen 2018 och 2022. Du kan också välja ett parti och ett år för att se hur många röster det fick i det valet.`);

//Röstresultat för varje parti i riksdagsvalen 2018 och 2022
dbQuery.use('riksdagsval-neo4j');
let electionResults =
  await dbQuery('MATCH (p:Partiresultat) RETURN "2018" AS year, p.parti AS parti, SUM(p.roster2018) AS röster UNION ALL MATCH(p: Partiresultat) RETURN "2022" AS year, p.parti AS parti,SUM(p.roster2022) AS röster ORDER BY year, parti; ');
console.log('electionResults from neo4j', electionResults);
//tableFromData({ data: electionResults });


// **Skapar diagram för att jämföra röstresultat mellan 2018 och 2022**
// Hämta data från Neo4j
// Skapa en mappning för att ändra partinamnen
const partyNameMapping = {
  "Sverigedemokraterna": "SD",
  "Socialdemokraterna": "S",
  "Moderaterna": "M",
  "Centerpartiet": "C",
  "Liberalerna": "L",
  "Kristdemokraterna": "KD",
  "Vänsterpartiet": "V",
  "Miljöpartiet de gröna": "MP",
  "Arbetarepartiet-Socialdemokraterna": "S",


};

// Hämta data från Neo4j och uppdatera partinamnen
let dataForChart = (await dbQuery(`
  MATCH (p:Partiresultat) RETURN p.parti AS parti, SUM(p.roster2018) AS röster2018, SUM(p.roster2022) AS röster2022
  ORDER BY parti;
`)).map(x => ({
  parti: partyNameMapping[x.parti] || x.parti, // Byt namn om det finns i mappningen
  röster2018: +x.röster2018, // Säkerställ att värdena är numeriska
  röster2022: +x.röster2022
}));

// Rita diagrammet med de uppdaterade namnen
drawGoogleChart({
  type: 'ColumnChart',
  data: makeChartFriendly(dataForChart, 'parti', 'röster2018', 'röster2022'),
  options: {
    height: 500,
    chartArea: { left: 80, right: 0 },
    vAxis: { title: 'Antal röster', format: '#' },
    hAxis: { title: 'Partier' },
    title: 'Jämförelse av röstresultat per parti mellan 2018 och 2022',
    legend: { position: 'bottom' },
    bar: { groupWidth: '80%' }
  }
});



// **Skapa en dropdown för att välja år och parti**
// Hämta data från Neo4j
dbQuery.use('riksdagsval-neo4j');
let electionResults1 = await dbQuery(`
  MATCH (p:Partiresultat) RETURN "2018" AS year, p.parti AS parti, SUM(p.roster2018) AS röster
  UNION ALL 
  MATCH (p:Partiresultat) RETURN "2022" AS year, p.parti AS parti, SUM(p.roster2022) AS röster 
  ORDER BY year, parti;
`);

console.log('Election Results:', electionResults1);

// **Skapa en container för dropdown-menyerna och centrera den**
let dropdownContainer = document.createElement('div');
dropdownContainer.style.display = 'flex';
dropdownContainer.style.flexDirection = 'column';
dropdownContainer.style.alignItems = 'center'; // Centrera horisontellt
dropdownContainer.style.justifyContent = 'center'; // För bättre placering
dropdownContainer.style.maxWidth = '600px'; // Anpassa bredden
dropdownContainer.style.margin = '20px auto'; // Se till att den är centrerad

// Funktion för att skapa en rad med dropdowns
function createDropdownRow(dropdowns) {
  let row = document.createElement('div');
  row.style.display = 'flex';
  row.style.justifyContent = 'center'; // Centrera dropdowns
  row.style.gap = '20px';
  dropdowns.forEach(dropdown => row.appendChild(dropdown));
  return row;
}

// Funktion för att skapa en dropdown (används en gång)
function createDropdown(label, options) {
  let wrapper = document.createElement('div');
  let dropdownLabel = document.createElement('label');
  dropdownLabel.textContent = label;

  let select = document.createElement('select');
  options.forEach(option => {
    let opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    select.appendChild(opt);
  });

  wrapper.appendChild(dropdownLabel);
  wrapper.appendChild(select);

  return { wrapper, select };
}

// **Skapa dropdowns EN gång**
let year1Dropdown = createDropdown('Välj första år:', ['2018', '2022']);
let party1Dropdown = createDropdown('Välj första parti:', [...new Set(electionResults1.map(res => res.parti))]);

let year2Dropdown = createDropdown('Välj andra år:', ['2018', '2022']);
let party2Dropdown = createDropdown('Välj andra parti:', [...new Set(electionResults1.map(res => res.parti))]);

// Lägg till dropdowns i två separata rader
dropdownContainer.appendChild(createDropdownRow([year1Dropdown.wrapper, party1Dropdown.wrapper])); // Första raden
dropdownContainer.appendChild(createDropdownRow([year2Dropdown.wrapper, party2Dropdown.wrapper])); // Andra raden
document.body.appendChild(dropdownContainer);

// **Skapa resultat-container direkt under dropdown-menyerna**
let resultContainer = document.createElement('div');
resultContainer.id = 'resultContainer';
resultContainer.style.marginTop = '10px';
resultContainer.style.textAlign = 'center';
resultContainer.style.maxWidth = '600px';
resultContainer.style.margin = '10px auto'; // Centrera resultatet
document.body.appendChild(resultContainer);

// **Skapa en knapp för att jämföra resultat**
let compareButton = document.createElement('button');
compareButton.textContent = 'Jämför resultat';
compareButton.onclick = showResults;
compareButton.style.marginTop = '10px';
compareButton.style.display = 'block';
compareButton.style.margin = '0 auto'; // Centrera knappen
document.body.appendChild(compareButton);

// Funktion för att formatera siffror med tusentalsavgränsare
function formatNumber(num) {
  return num.toLocaleString('sv-SE');
}

// Funktion för att beräkna procentuell förändring
function calculatePercentageChange(oldValue, newValue) {
  if (oldValue === 0) return 'Ingen data';
  let change = ((newValue - oldValue) / oldValue) * 100;
  return change.toFixed(2) + ' %';
}

// **Funktion för att visa senaste jämförelsen utan att skapa nya dropdowns**
function showResults() {
  let selectedYear1Value = year1Dropdown.select.value;
  let selectedParty1Value = party1Dropdown.select.value;
  let selectedYear2Value = year2Dropdown.select.value;
  let selectedParty2Value = party2Dropdown.select.value;

  console.log("Valda år och partier:", selectedYear1Value, selectedParty1Value, selectedYear2Value, selectedParty2Value);

  let result1 = electionResults1.find(res => res.year === selectedYear1Value && res.parti === selectedParty1Value);
  let result2 = electionResults1.find(res => res.year === selectedYear2Value && res.parti === selectedParty2Value);

  if (result1 && result2) {
    let percentageChange = calculatePercentageChange(result1.röster, result2.röster);

    // **Rensa tidigare resultat och visa senaste jämförelsen direkt under dropdowns**
    resultContainer.innerHTML = `
      <p><strong>Jämförelse av röstresultat:</strong></p>
      <p>- ${selectedParty1Value} år ${selectedYear1Value}: ${formatNumber(result1.röster)} röster</p>
      <p>- ${selectedParty2Value} år ${selectedYear2Value}: ${formatNumber(result2.röster)} röster</p>
      <p>- Förändring: ${percentageChange}</p>
    `;
  } else {
    resultContainer.innerHTML = '<p>Inga data tillgängliga för valt år och parti.</p>';
  }
}


