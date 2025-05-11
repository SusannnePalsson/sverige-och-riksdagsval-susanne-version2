addMdToPage(`
  ### I version 8 av mallen har vi fixat följande
  * Vissa Neo4j-frågor fungerade inte, p.g.a. av ett fel med hur mallen använde databasdrivern för Neo4j. Detta är åtgärdat!
  * När man la till mer på en sida, efter ett diagram så slutade diagrammet vara interaktivt. Nu fungerar detta - diagrammet går fortfrarande att peka på för att se detaljinfo även när mer data läggs till!

  ### I övrigt samma som version 7 - vi kan ha många databaser inkopplade!
  Läs mer om hur databaser kopplas in [i den inbyggda dokumentationen](/docs/#mappen-databases). Nu kan du ha hur många databaser inkopplade som helst (nästan)!

  #### Visste du det här om våra län?
  Den här datan kommer från SQLite-databasen **counties**, medan annan data (på andra sidor) kommer från SQLite-databasen **smhi-temp-and-rainfall-malmo**. Men vi hade absolut kunnat blanda data från flera databaser på en sida!
`);

dbQuery.use('counties-sqlite');
let countyInfo = await dbQuery('SELECT * FROM countyInfo');
tableFromData({ data: countyInfo });