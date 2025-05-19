const fs = require('fs');
const path = require('path');

// Path to the JSON file
const filePath = path.join(__dirname, '../data/all_petitions.json');

// Load and parse the file
function loadPetitions(file) {
  try {
    const rawData = fs.readFileSync(file, 'utf-8');
    const petitions = JSON.parse(rawData);
    if (!Array.isArray(petitions)) throw new Error('Expected an array of petitions.');
    return petitions;
  } catch (err) {
    console.error('Failed to load petitions:', err.message);
    return [];
  }
}

function getConstituencies(petition) {
    let constituencies = []
    petition.attributes.signatures_by_constituency.forEach((entry, index) => {
        constituencies.push(entry.name)
    })

    return constituencies
}

function isIterable(value) {
  return value != null && typeof value[Symbol.iterator] === 'function';
}


function processPetition(petition, index, constituenciesData) {

    const allConstituencies = petition.attributes.signatures_by_constituency;

    if (isIterable(allConstituencies)) {
        for (const constituency of allConstituencies) {
            constituenciesData[constituency.name][petition.attributes.action] = {
                "count": constituency.signature_count,
                "id": petition.id
            };
        }  
    }
   
    return constituenciesData;
}

// Main routine
function main(output_path) {
    let constituencies = [];
    let constituenciesData = {};
    let doneConstituencies = false; // this is stupid

    
    const petitions = loadPetitions(filePath);
        petitions.forEach((petition, index) => {
        if (!doneConstituencies) {
            constituencies = getConstituencies(petition);
            doneConstituencies = true;
            constituencies.forEach(c => constituenciesData[c] = {});
        }

        constituenciesData = processPetition(petition, index, constituenciesData);


    });
   
    try { fs.writeFileSync(output_path, JSON.stringify(constituenciesData, null, 2)); } catch (e) { console.error('Failed to write JSON:', e); }

}

// Run the script
main('data\\constituencies_data.json');
