/********** Kommun_Statistik: Kommungruppsindelning + Riksdagsval **********/
(async () => {
  dbQuery.use('kommun-statistik');
  let huvudgrupper = (await dbQuery(
    'SELECT DISTINCT Huvudgrupp FROM Kommungruppsindelning'
  ))?.map(x => x.Huvudgrupp) || [];

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

  // Dropdown for "Visa kolumn"
  const columnOptions = ["Huvudgrupp", "Kommungrupp"];
  let currentColumn = addDropdown('Visa kolumn', columnOptions, columnOptions[0], onColumnChange);

  function onColumnChange(val) {
    currentColumn = val;
    render();
  }

  // Initial render
  await render();

  async function getKommungrupper(huvudgrupp) {
    if (!huvudgrupp || huvudgrupp === 'Alla') {
      let all = await dbQuery('SELECT DISTINCT Kommungrupp FROM Kommungruppsindelning');
      if (!Array.isArray(all)) all = [];
      return all.map(x => x.Kommungrupp);
    }
    let res = await dbQuery(
      `SELECT DISTINCT Kommungrupp FROM Kommungruppsindelning WHERE Huvudgrupp = '${huvudgrupp}'`
    );
    if (!Array.isArray(res)) res = [];
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

  // Hjälpfunktion för att normalisera kommunnamn
  function normalizeKommunnamn(namn) {
    return (namn || '')
      .trim()
      .toLowerCase()
      .replace(/[\s\-]/g, '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // ta bort accenter
      .replace(/[^\w]/g, ''); // ta bort övriga specialtecken
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

    dbQuery.use('riksdagsval-neo4j');
    let electionResults = await dbQuery('MATCH (n:Partiresultat) RETURN n LIMIT 25');
    tableFromData({
      data: electionResults
        // egenskaper/kolumner kommer i lite konstig ordning från Neo - mappa i trevligare ordning
        .map(({ kommun, roster2018, roster2022, parti }) => ({ kommun, roster2018, roster2022, parti }))
    });
    console.log('electionResults from neo4j', electionResults);

    // Om valdata inte är en array, försök hitta arrayen i ett property
    if (!Array.isArray(valdata)) {
      if (valdata && Array.isArray(valdata.records)) {
        console.log('Antal records från Neo4j:', valdata.records.length);
        valdata = valdata.records.map(rec => ({
          kommun: rec.get('kommun'),
          parti: rec.get('parti'),
          roster2018: rec.get('roster2018'),
          roster2022: rec.get('roster2022')
        }));
      } else {
        console.log('Ingen records-egenskap eller records är tomt!');
        valdata = [];
      }
    }

    console.log('Rått svar från Neo4j:', valdata);
    console.log('Exempel på valdata:', valdata.slice(0, 5));

    // Skapa lookup-map för valdata på normaliserat kommunnamn
    const valMap = new Map();
    if (Array.isArray(valdata)) {
      valdata.forEach(row => {
        // Konvertera till lowercase innan normalisering
        const key = normalizeKommunnamn((row.kommun || '').toLowerCase());
        if (!valMap.has(key)) valMap.set(key, []);
        valMap.get(key).push(row);
      });
    }

    console.log('Alla nycklar i valMap:', Array.from(valMap.keys()));

    // Slå ihop kgi och valdata på normaliserat Kommunnamn/kommun
    let joined = [];
    if (Array.isArray(kgi)) {
      kgi.forEach(row => {
        // Konvertera till lowercase innan normalisering
        const key = normalizeKommunnamn((row.Kommunnamn || '').toLowerCase());
        console.log('Testar join:', row.Kommunnamn, '->', key, 'finns i valMap?', valMap.has(key));
        const valRows = valMap.get(key) || [];
        if (valRows.length === 0) {
          console.log('Ingen match för:', row.Kommunnamn, '->', normalizeKommunnamn((row.Kommunnamn || '').toLowerCase()));
          joined.push({
            Kommunnamn: row.Kommunnamn,
            Huvudgrupp: row.Huvudgrupp,
            Kommungrupp: row.Kommungrupp,
            parti: null,
            roster2018: null,
            roster2022: null
          });
        } else {
          valRows.forEach(val => {
            joined.push({
              Kommunnamn: row.Kommunnamn,
              Huvudgrupp: row.Huvudgrupp,
              Kommungrupp: row.Kommungrupp,
              parti: val.parti,
              roster2018: val.roster2018,
              roster2022: val.roster2022
            });
          });
        }
      });
    }

    // Sortera datan
    if (Array.isArray(joined) && joined.length > 0 && currentSort) {
      let sortKey = sortOptions.find(o => o.label === currentSort)?.value || 'Kommunnamn';
      joined.sort((a, b) => (a[sortKey] || '').localeCompare(b[sortKey] || ''));
    }

    addMdToPage(`
  ## Kommun_Statistik + Riksdagsval (join på Kommunnamn/kommun)
    `);

    if (Array.isArray(joined) && joined.length > 0) {
      tableFromData({
        data: joined,
        columnNames: ["Kommunnamn", "Huvudgrupp", "Kommungrupp", "parti", "roster2018", "roster2022"]
      });
    } else {
      addMdToPage('**Ingen data hittades för vald huvudgrupp och kommungrupp.**');
    }
  }
})();
