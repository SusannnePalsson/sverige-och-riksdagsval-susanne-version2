addMdToPage(`
  
  ## Kommungruperingar i Sverige
`);

addMdToPage(`

  Källan för definitionerna av kommungrupper är SKR (Sveriges Kommuner och Regioner).
  Kan hittas på följande websida: https://skr.se/skr/tjanster/rapporterochskrifter/publikationer/kommungruppsindelning2023.67834.html

  `);

/********** Kommun_Statistik: Kommungruppsindelning **********/
(async () => {
  dbQuery.use('kommun-statistik');
  let huvudgrupper = (await dbQuery(
    'SELECT DISTINCT Huvudgrupp FROM Kommungruppsindelning'
  )).map(x => x.Huvudgrupp);

  // Add "Alla" option to huvudgrupper
  huvudgrupper.unshift('Alla');

  // Create dropdowns with event listeners
  let currentHuvudgrupp = addDropdown('Välj Huvudgrupp', huvudgrupper, huvudgrupper[0], onHuvudgruppChange);

  let kommungrupper = await getKommungrupper(currentHuvudgrupp);
  kommungrupper.unshift('Alla');
  let currentKommungrupp = addDropdown('Välj Kommungrupp', kommungrupper, kommungrupper[0], onKommungruppChange);

  // Sorteringsalternativ
  const sortOptions = [
    { label: 'Kommunnamn', value: 'Kommunnamn' },
    { label: 'Huvudgrupp', value: 'Huvudgrupp' },
    { label: 'Kommungrupp', value: 'Kommungrupp' }
  ];
  let currentSort = addDropdown('Sortera på', sortOptions.map(o => o.label), sortOptions[0].label, onSortChange);

  // Initial render
  await render();

  async function getKommungrupper(huvudgrupp) {
    if (!huvudgrupp || huvudgrupp === 'Alla') {
      let all = await dbQuery('SELECT DISTINCT Kommungrupp FROM Kommungruppsindelning');
      return all.map(x => x.Kommungrupp);
    }
    let res = await dbQuery(
      `SELECT DISTINCT Kommungrupp FROM Kommungruppsindelning WHERE Huvudgrupp = '${huvudgrupp}'`
    );
    return res.map(x => x.Kommungrupp);
  }

  async function onHuvudgruppChange(val) {
    currentHuvudgrupp = val;
    kommungrupper = await getKommungrupper(currentHuvudgrupp);
    kommungrupper.unshift('Alla');
    // Re-create kommungrupp dropdown
    currentKommungrupp = addDropdown('Kommungrupper', kommungrupper, kommungrupper[0], onKommungruppChange);
    await render();
  }

  async function onKommungruppChange(val) {
    currentKommungrupp = val;
    await render();
  }

  async function onSortChange(val) {
    currentSort = val;
    await render();
  }

  async function render() {
    dbQuery.use('kommun-statistik');
    let query = `SELECT * FROM Kommungruppsindelning`;
    let where = [];
    if (currentHuvudgrupp && currentHuvudgrupp !== 'Alla') {
      where.push(`Huvudgrupp = '${currentHuvudgrupp}'`);
    }
    if (currentKommungrupp && currentKommungrupp !== 'Alla') {
      where.push(`Kommungrupp = '${currentKommungrupp}'`);
    }
    if (where.length) {
      query += ' WHERE ' + where.join(' AND ');
    }
    let kgi = await dbQuery(query);

    // Sortera datan
    if (Array.isArray(kgi) && kgi.length > 0 && currentSort) {
      let sortKey = sortOptions.find(o => o.label === currentSort)?.value || 'Kommunnamn';
      kgi.sort((a, b) => (a[sortKey] || '').localeCompare(b[sortKey] || ''));
    }

    addMdToPage(`
  ## Kommun_Statistik: Kommungruppsindelning
    `);

    if (Array.isArray(kgi) && kgi.length > 0) {
      tableFromData({
        data: kgi,
        columnNames: ["Gruppkod", "Kommunkod", "Kommunnamn", "Huvudgrupp", "Kommungrupp"]
      });
    } else {
      addMdToPage('**Ingen data hittades för vald huvudgrupp och kommungrupp.**');
    }
  }
})();
