const fs = require('fs').promises;
const path = require('path');

const fetchAllPetitions = require('./download_petitions');
const processPetitions = require('./process_petitions');
const { main: extractTopics } = require('./add_topics'); 

const dataDir = path.join(__dirname, '../data');
const allPetitionsPath = path.join(dataDir, 'all_petitions.json');
const constituenciesDataPath = path.join(dataDir, 'constituencies_data.json');
const topicsByPetitionPath = path.join(dataDir, 'topics_by_petition.json');
const savedTopicsPath = path.join(dataDir, 'SAVED_topics_by_petition.json');

async function main() {
    console.log("Contains public sector information licensed under the Open Government Licence v3.0.");

    const args = process.argv.slice(2);
    const shouldExtractTopics = args.includes('--extract_topics');

    await fs.mkdir(dataDir, { recursive: true }).catch(() => {});
    await fetchAllPetitions(allPetitionsPath).catch(console.error);
    await processPetitions(constituenciesDataPath).catch(console.error);

    if (shouldExtractTopics) {
        console.log("Starting topic extraction...");
        await extractTopics(topicsByPetitionPath, savedTopicsPath).catch(console.error);
    }
}

main();
