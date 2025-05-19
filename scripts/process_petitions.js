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

// Placeholder for your custom processing logic
function processPetition(petition, index) {
  // TODO: Replace this with your actual processing
 
}

// Main routine
function main() {
  const petitions = loadPetitions(filePath);
  petitions.forEach((petition, index) => {
    processPetition(petition, index);
  });
}

// Run the script
main();
