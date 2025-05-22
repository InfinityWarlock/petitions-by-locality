import fs from 'fs';
import dotenv from 'dotenv';
import Bottleneck from 'bottleneck';
import { GoogleGenAI } from "@google/genai";
import cliProgress from 'cli-progress';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_RATE_LIMIT = process.env.GEMINI_RATE_LIMIT;
const GEMINI_MODEL_CODE = process.env.GEMINI_MODEL_CODE;

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Rate limiter using RPM (requests per minute)
const limiter = new Bottleneck({
    minTime: Math.ceil(60000 / GEMINI_RATE_LIMIT),
    maxConcurrent: 1
});

async function makeGeminiRequest(prompt) {
    const response = await ai.models.generateContent({
        model: GEMINI_MODEL_CODE,
        contents: prompt
    });
    return response.text;
}

const filePath = './data/constituencies_data.json';

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

function loadSavedPetitionTopics(filepath) {
    try {
        const rawData = fs.readFileSync(filepath, 'utf-8');
        const petitionTopics = JSON.parse(rawData);
        return petitionTopics;
    } catch (err) {
        console.error('Failed to load saved petition topics:', err.message);
        return {};
    }
}

const LLMWrapper = limiter.wrap(async function (prompt) {
    return await makeGeminiRequest(prompt);
});

async function extractTopic(petition, savedPetitionsObject, dummyTopic = false) {
    if (petition.id in savedPetitionsObject) {
        console.log(`Petition ${petition.id} already has a topic: ${savedPetitionsObject[petition.id]}`);
        return savedPetitionsObject[petition.id];
    } else {
        if (dummyTopic) {
            const consolidatedDescriptionText =
                `Desired action:\n${petition.attributes.action}\n` +
                `Background:\n${petition.attributes.background}\n` +
                `Additional details:\n${petition.attributes.additional_details}\n`;

            const prompt = `Your job is to extract the topic of a petition from the following description. If there is only one topic, return just the topic. For example, this petition has one topic: "Action:

Shut the migrant hotels down now and deport illegal migrants housed there
Background:

The Labour Party pledged to end asylum hotels if it won power. Labour is now in power.
Additional Details:

It has transpired that the migrant hotels may stay open for at least the next 4 years. We want to see the migrant hotels shut down now and all illegal migrants housed in them deported immediately.
Creator:

Robert Barnes". The topic is "illegal immigration". If there are multiple topics, return them as a comma-separated list. You are operating in the UK context. Topics include (but are not limited to): NHS, illegal immigration, EU, cost of living, housing, education, environment, net zero, crime, police, energy, transport, defence, Gaza, foreign affairs, social care. But there might be others. Prefer to return one topic.`;

            const requestPrompt = `${prompt}\n\nHere is the description: \n\n${consolidatedDescriptionText}`;
            const petitionTopic = await LLMWrapper(requestPrompt);

            return petitionTopic;
        } else {
            return "dummy topic";
        }
    }
}

async function main(outputPath, savedPetitionTopicsPath = null) {
    let savedPetitionTopics = {};

    if (savedPetitionTopicsPath) {
        savedPetitionTopics = loadSavedPetitionTopics(savedPetitionTopicsPath);
    }

    let petitions = loadPetitions(filePath);

    let counter = 0;
    let topicsByPetition = {};

    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(Object.keys(petitions.rawPetitionsData).length, 0);

    for (const key in Object.keys(petitions.rawPetitionsData)) {
        counter += 1;
        progressBar.update(counter);

        const petition = petitions.rawPetitionsData[key];
        const petitionTopic = await extractTopic(petition, savedPetitionTopics);

        const petitionID = petitions.rawPetitionsData[key].id;
        topicsByPetition[petitionID] = petitionTopic;

        // Save topicsByPetition to file
        fs.writeFileSync(outputPath, JSON.stringify(topicsByPetition, null, 2), 'utf-8');
        console.log(`Processed petition ${petitionID}: ${petitionTopic}`);
    }
    console.log("All petitions processed.");
    progressBar.stop();
}

export { main };

// main("data/topics_by_petition.json", "data/SAVED_topics_by_petition.json");

// console.log(loadSavedPetitionTopics('./data/SAVED_topics_by_petition.json'));
