

/********** Counties-sqlite **********/

dbQuery.use('counties-sqlite');
let countyInfo = await dbQuery('SELECT * FROM countyInfo LIMIT 3');
console.log('countyInfo', countyInfo);

addMdToPage(`
  ## counties-sqlite
`);

tableFromData({
  data: countyInfo,
  columnNames: ["id", "lan", "grundat", "bokstav", "kod", "landytaKm2", "folkmangd2024", "invanarePerKm2", "residensstad", "kommuner", "norrTIllSoder"]
});

/********** geo-mysql **********/
dbQuery.use('geo-mysql');
let geoData = await dbQuery('SELECT * FROM geoData LIMIT 3');
console.log('geoData from mysql', geoData);

addMdToPage(`
  ## geo-mysql
`);

tableFromData({
  data: geoData,
  columnNames: ["id", "locality", "municipality", "county", "latitude", "longitude", "position"]
});

/********** kommun-info-mongodb - incomeByKommun **********/
dbQuery.use('kommun-info-mongodb');
let income = await dbQuery.collection('incomeByKommun').find({}).limit(3);
console.log('income from mongodb', income);

addMdToPage(`
  ## kommun-info-mongodb - income
`);

tableFromData({
  data: income,
  columnNames: ["_id", "kommun", "kon", "medelInkomst2018", "medelInkomst2019", "medelInkomst2020", "medelInkomst2021", "medelInkomst2022", "medianInkomst2018", "medianInkomst2019", "medianInkomst2020", "medianInkomst2021", "medianInkomst2022"]
});

/********** kommun-info-mongodb - ageByKommun **********/
dbQuery.use('kommun-info-mongodb');
let ages = await dbQuery.collection('ageByKommun').find({}).limit(3);
console.log('ages from mongodb', ages);

addMdToPage(`
  ## kommun-info-mongodb - ages
`);

tableFromData({
  data: ages,
  columnNames: ["_id", "kommun", "kon", "medelalderAr2018", "medelalderAr2019", "medelalderAr2020", "medelalderAr2021", "medelalderAr2022"]
});

/********** riksdagsval-neo4j **********/
dbQuery.use('riksdagsval-neo4j');
let electionResults = await dbQuery('MATCH (n:Partiresultat) RETURN n LIMIT 3');
console.log('electionResults from neo4j', electionResults);

addMdToPage(`
  ## riksdagsval-neo4j
`);

tableFromData({
  data: electionResults,
  columnNames: ["roster2018", "kommun", "roster2022", "parti"]
});

/********** Kommun_Statistik: Kommungruppsindelning **********/
dbQuery.use('kommun-statistik');
let kgi = await dbQuery('SELECT * FROM Kommungruppsindelning LIMIT 3');
console.log('kommungruppsindelning', kgi);

addMdToPage(`
  ## Kommun_Statistik: Kommungruppsindelning
`);

tableFromData({
  data: kgi,
  columnNames: ["Gruppkod", "Kommunkod", "Kommunnamn", "Huvudgrupp", "Kommungrupp"]
});

