import fs from 'fs';
import dotenv from 'dotenv';
import Bottleneck from 'bottleneck';
import { GoogleGenAI } from '@google/genai';
import cliProgress from 'cli-progress';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_RATE_LIMIT = parseInt(process.env.GEMINI_RATE_LIMIT, 10);
const GEMINI_MODEL_CODE = process.env.GEMINI_MODEL_CODE;

// Initialize the GoogleGenAI client with the API key
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Rate limiter using RPM (requests per minute)
const limiter = new Bottleneck({
  minTime: Math.ceil(60000 / GEMINI_RATE_LIMIT),
  maxConcurrent: 1,
});

/**
 * Makes a request to the Gemini API.
 * @param {Array<Object>} prompt - The prompt array for the Gemini model.
 * @returns {Promise<string>} The generated text from the Gemini model.
 */
async function makeGeminiRequest(prompt) {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_CODE,
      contents: prompt,
    });

    // Extract the generated text from response
    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("No text found in Gemini API response");
    }

    return text;
  } catch (error) {
    console.error("Error making Gemini API request:", error);
    throw error;
  }
}

const filePath = './data/constituencies_data.json';

/**
 * Loads petitions data from a specified JSON file.
 */
function loadPetitions(file) {
  try {
    const rawData = fs.readFileSync(file, 'utf-8');
    return JSON.parse(rawData);
  } catch (err) {
    console.error('Failed to load petitions:', err.message);
    return {};
  }
}

/**
 * Loads previously saved petition topics from a specified JSON file.
 */
function loadSavedPetitionTopics(filepath) {
  try {
    if (!fs.existsSync(filepath)) {
      console.warn('Saved topics file does not exist. Skipping.');
      return {};
    }
    const rawData = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(rawData);
  } catch (err) {
    console.error('Failed to load saved petition topics:', err.message);
    return {};
  }
}

// Wrap the Gemini request function with the rate limiter
const LLMWrapper = limiter.wrap(async function (prompt) {
  return await makeGeminiRequest(prompt);
});

/**
 * Extracts the topic of a petition using the Gemini LLM.
 */
async function extractTopic(petition, savedPetitionsObject) {
  if (savedPetitionsObject && petition.id in savedPetitionsObject) {
    console.log(`Petition ${petition.id} already has a topic: ${savedPetitionsObject[petition.id]}`);
    return savedPetitionsObject[petition.id];
  }

  const consolidatedDescriptionText =
    `Desired action:\n${petition.attributes.action}\n` +
    `Background:\n${petition.attributes.background}\n` +
    `Additional details:\n${petition.attributes.additional_details}\n`;

  const promptText = `Your job is to extract the topic of a petition from the following description. A petition can only have one topic. Please provide just the topic, without any additional information or context. The list of topics is: brexit, the eu, coronavirus, business, economy, transport, work and incomes, communities, crime, culture, media and sport, family and civil law, immigration, justice, security, devolution, elections, government, local government, parliament, climate change, energy, environment, sciences, technology, education, families and social services, health, housing and planning, welfare and pensions, africa, americas, asia, europe, middle east, defence, institutions, other.
Do not use any other topic. If the petition does not fit any topic, say other. Do not make up your own topics. Remember, you are working in the UK context.

Here is the description:

${consolidatedDescriptionText}

Please provide the topic:`;

  const petitionTopic = await LLMWrapper([{ text: promptText }]);
  return petitionTopic.trim();
}

/**
 * Main function to process petitions, extract topics, and save them.
 */
async function main(outputPath, savedPetitionTopicsPath = null) {
  let savedPetitionTopics = {};

  if (savedPetitionTopicsPath) {
    savedPetitionTopics = loadSavedPetitionTopics(savedPetitionTopicsPath);
  }

  const petitions = loadPetitions(filePath);
  let topicsByPetition = {};
  let counter = 0;

  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  const total = Object.keys(petitions.rawPetitionsData).length;
  progressBar.start(total, 0);

  for (const key of Object.keys(petitions.rawPetitionsData)) {
    counter += 1;
    progressBar.update(counter);

    const petition = petitions.rawPetitionsData[key];
    const petitionTopic = await extractTopic(petition, savedPetitionTopics);

    const petitionID = petition.id;
    topicsByPetition[petitionID] = petitionTopic;

    fs.writeFileSync(outputPath, JSON.stringify(topicsByPetition, null, 2), 'utf-8');
    console.log(`Processed petition ${petitionID}: ${petitionTopic}`);
  }

  progressBar.stop();
  console.log("All petitions processed.");
}

// Export the main function
export { main };

// Execute main if run directly
const outputPathForTopics = './data/topics_by_petition.json';
const savedTopicsPathForRun = './data/SAVED_topics_by_petition.json';
main(outputPathForTopics, savedTopicsPathForRun).catch(console.error);
