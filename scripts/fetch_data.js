import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

import { fetchAllPetitions } from './download_petitions.js';
import { main as extractTopics } from './add_topics.js';
import mainProcessPetitions from './process_petitions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');
const allPetitionsPath = path.join(dataDir, 'all_petitions.json');
const constituenciesDataPath = path.join(dataDir, 'constituencies_data.json');
const topicsByPetitionPath = path.join(dataDir, 'topics_by_petition.json');
const savedTopicsPath = path.join(dataDir, 'SAVED_topics_by_petition.json');

async function main() {
    console.log("Contains public sector information licensed under the Open Government Licence v3.0.\nContains Parliamentary information licensed under the Open Parliament Licence v3.0.");

    const args = process.argv.slice(2);
    const shouldExtractTopics = args.includes('--extract_topics');

    await fs.mkdir(dataDir, { recursive: true }).catch(() => {});
    await fetchAllPetitions(allPetitionsPath).catch(console.error);
    await mainProcessPetitions(constituenciesDataPath).catch(console.error);

    if (shouldExtractTopics) {
        console.log("Starting topic extraction...");
        await extractTopics(topicsByPetitionPath, savedTopicsPath).catch(console.error);
    }
}

main();