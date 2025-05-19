// Uncomment below for Node.js v17 or lower
// const fetch = require('node-fetch');

const fs = require('fs');
const path = require('path');
const cliProgress = require('cli-progress');

const START_URL = 'https://petition.parliament.uk/petitions.json?state=all';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.json();
}

async function fetchAllPetitions() {
  let url = START_URL;
  const allPetitions = [];
  const progress = new cliProgress.SingleBar({
    format: 'Progress |{bar}| {percentage}% | {value} petitions fetched',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });

  let totalCount = 0;
  progress.start(0, 0);

  while (url) {
    const listPage = await fetchJson(url);
    const petitions = listPage.data;

    for (const petition of petitions) {
      const detailUrl = petition.links?.self;
      if (!detailUrl) continue;

      try {
        const detail = await fetchJson(detailUrl);
        allPetitions.push(detail.data);
        totalCount++;
        progress.update(totalCount);
      } catch (err) {
        console.error(`Failed to fetch petition detail: ${detailUrl}`, err.message);
      }
    }

    url = listPage.links?.next || null;
  }

  progress.stop();

  const filePath = path.join(__dirname, 'all_petitions.json');
  fs.writeFileSync(filePath, JSON.stringify(allPetitions, null, 2), 'utf-8');
  console.log(`✅ All petitions saved to ${filePath}`);
}

// Run the script
fetchAllPetitions().catch(console.error);
