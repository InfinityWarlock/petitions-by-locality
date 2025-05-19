// Uncomment below for Node.js v17 or lower
// const fetch = require('node-fetch');

const fs = require('fs');

const START_URL = 'https://petition.parliament.uk/petitions.json?state=all';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.json();
}

async function fetchAllPetitions(outputPath) {
  let url = START_URL;
  const allPetitions = [];
  let count = 0;

  console.log(`Fetching petitions. This may take a while.\nCounter updates every 50.`);

  while (url) {
    const listPage = await fetchJson(url);
    const petitions = listPage.data;

    for (const petition of petitions) {
      const detailUrl = petition.links?.self;
      if (!detailUrl) continue;

      try {
        const detail = await fetchJson(detailUrl);

        // todo: filtering
        allPetitions.push(detail.data);

        count++;
        if (count % 50 == 0) process.stdout.write(`\rProcessed petitions: ${count}`);
      } catch (err) {
        console.error(`Failed to fetch petition detail: ${detailUrl}`, err.message);
      }
    }

    url = listPage.links?.next || null;
  }

  process.stdout.write('\n'); // move to next line after done

  fs.writeFileSync(outputPath, JSON.stringify(allPetitions, null, 2), 'utf-8');
  console.log(`✅ All petitions saved to ${outputPath}`);
}

module.exports = fetchAllPetitions;
// Run the script
// fetchAllPetitions().catch(console.error);
