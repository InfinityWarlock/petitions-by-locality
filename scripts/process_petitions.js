import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the JSON file
const filePath = path.join(__dirname, '../data/all_petitions.json');

/**
 * Loads and parses petition data from a specified JSON file.
 * @param {string} file - The path to the JSON file containing petitions data.
 * @returns {Array<Object>} An array of parsed petitions, or an empty array if loading fails.
 */
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

/**
 * Extracts a list of constituency names from a petition object.
 * @param {Object} petition - The petition object.
 * @returns {Array<string>} An array of constituency names.
 */
function getConstituencies(petition) {
    let constituencies = [];
    if (petition.attributes && petition.attributes.signatures_by_constituency) {
        petition.attributes.signatures_by_constituency.forEach((entry) => {
            constituencies.push(entry.name);
        });
    }
    return constituencies;
}

/**
 * Checks if a value is iterable.
 * @param {*} value - The value to check.
 * @returns {boolean} True if the value is iterable, false otherwise.
 */
function isIterable(value) {
    return value != null && typeof value[Symbol.iterator] === 'function';
}

/**
 * Processes a single petition and updates the constituencies data structure.
 * @param {Object} petition - The petition object to process.
 * @param {number} index - The index of the petition (currently unused but kept for signature consistency).
 * @param {Object} constituenciesData - The data structure to update with petition signatures by constituency.
 * @returns {Object} The updated constituenciesData object.
 */
function processPetition(petition, index, constituenciesData) {
    const allConstituencies = petition.attributes?.signatures_by_constituency;

    if (isIterable(allConstituencies)) {
        for (const constituency of allConstituencies) {
            // Ensure the constituency name exists in the signaturesByConstituency object
            if (!constituenciesData.signaturesByConstituency[constituency.name]) {
                constituenciesData.signaturesByConstituency[constituency.name] = {};
            }
            // Add or update the petition's signature count for this constituency
            constituenciesData.signaturesByConstituency[constituency.name][petition.attributes.action] = {
                "count": constituency.signature_count,
                "id": petition.id
            };
        }
    }

    return constituenciesData;
}

/**
 * Main function to load, process, and save constituencies data from petitions.
 * @param {string} output_path - The file path where the processed constituencies data will be saved.
 */
async function main(output_path) {
    let constituencies = [];
    let constituenciesData = {
        signaturesByConstituency: {},
        rawPetitionsData: {}
    };

    let doneConstituencies = false; // Flag to ensure constituencies are initialized once

    const petitions = loadPetitions(filePath);

    petitions.forEach((petition, index) => {
        if (!doneConstituencies) {
            // Get all unique constituencies from the first petition to initialize the structure
            constituencies = getConstituencies(petition);
            doneConstituencies = true;
            // Initialize each constituency name as an empty object in signaturesByConstituency
            constituencies.forEach(c => constituenciesData.signaturesByConstituency[c] = {});
        }

        // Process each petition to populate the signatures by constituency
        constituenciesData = processPetition(petition, index, constituenciesData);
    });

    // Store the raw petitions data for reference
    constituenciesData.rawPetitionsData = petitions;

    try {
        fs.writeFileSync(output_path, JSON.stringify(constituenciesData, null, 2));
    } catch (e) {
        console.error('Failed to write JSON:', e);
    }
    console.log(`Constituencies data output to ${output_path}. \n Select this file in the browser.`);
}

// Export the main function as the default export for ES Modules
export default main;

// Run the script (example usage, uncomment to run directly)
// main('data/constituencies_data.json').catch(console.error);