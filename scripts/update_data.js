const fs = require('fs').promises;
const path = require('path');

const fetchAllPetitions = require('./download_petitions');
const processPetitions = require('./process_petitions');

const dataDir = path.join(__dirname, '../data');
const allPetitionsPath = path.join(dataDir, 'all_petitions.json');
const constituenciesDataPath = path.join(dataDir, 'constituencies_data.json');

async function main() {
    console.log("Contains public sector information licensed under the Open Government Licence v3.0.");

    await fs.mkdir(dataDir, { recursive: true }).catch(() => {});
    await fetchAllPetitions(allPetitionsPath).catch(console.error);
    await processPetitions(constituenciesDataPath);
}

main();
