const fs = require('fs').promises;

const fetchAllPetitions = require('./scripts/download_petitions');
const processPetitions = require('./scripts/process_petitions');

async function main() {
    console.log("Contains public sector information licensed under the Open Government Licence v3.0.")

    await fs.mkdir('./data', { recursive: true }).catch(() => {});
    await fetchAllPetitions('./data/all_petitions.json').catch(console.error)
    await processPetitions('./data/constituencies_data.json');

}

main();