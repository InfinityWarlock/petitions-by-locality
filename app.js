import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';


const app = express();
const port = 3000;

// Get the directory name using import.meta.url for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the petitions data
const petitionsFilePath = path.join(__dirname, 'data', 'constituencies_data.json');
let petitionsDataContainer = {};

try {
    const data = fs.readFileSync(petitionsFilePath, 'utf8');
    petitionsDataContainer = JSON.parse(data);
} catch (err) {
    console.error('Error:', err);
}

// Absolute path to the 'views' directory
const viewsPath = path.join(__dirname, 'views');

// Serve static files from 'views'
app.use(express.static(viewsPath));

// Serve index.html directly when visiting "/"
app.get('/', (req, res) => {
    res.sendFile(path.join(viewsPath, 'index.html'));
});

app.get('/constituenciesData', (req, res) => {
    res.sendFile(path.join(__dirname, 'data', 'constituencies_data.json'));
});

app.get('/topicsData', (req, res) => {
    res.sendFile(path.join(__dirname, 'data', 'topics_by_petition.json'));
});

app.get('/constituencyBoundaries', (req, res) => {
    res.sendFile(path.join(__dirname, 'constant_data', 'Westminster_Parliamentary_Constituencies_July_2024_Boundaries_UK_BUC_4872633423108313063.geojson'));
})

// This is commented out because it is not needed - instead I just have the "download latest data button"

// app.get('/petition/:petitionId', (req, res) => {
//     const petitionId = req.params.petitionId;
//     res.send(rawPetitionsData[petitionId] || {});
// });

app.listen(port, () => {
    console.log(`
Petitions by Locality running on port ${port}.
See README.md or about section for acknowledgements and copyright information. 
`);
});
