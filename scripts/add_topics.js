const fs = require('fs');

// path to the JSON file 
const filePath = './data/constituencies_data.json';

// Load and parse the file
function loadPetitions(file) {
    try {
        const rawData = fs.readFileSync(file, 'utf-8');
        const petitions = JSON.parse(rawData);
        return petitions;
    } catch (err) {
        console.error('Failed to load petitions:', err.message);
        return {};
    }
}

async function LLMWrapper(prompt) {
    
}

async function extractTopic(consolidatedDescriptionText) {

}

async function main(output_path) {
    let petitions = loadPetitions(filePath);
    for (const key in Object.keys(petitions.rawPetitionsData)) {
        
        const consolidatedDescriptionText = 
            `Desired action:\n${petitions.rawPetitionsData[key].attributes.action}\n`
            +`Background:\n${petitions.rawPetitionsData[key].attributes.background}\n`
            +`Additional details:\n${petitions.rawPetitionsData[key].attributes.additional_details}\n`
    }
}

main("");