const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;


// Load the petitions data 
const petitionsFilePath = path.join(__dirname, 'data', 'constituencies_data.json');
let petitionsDataContainer = {};

try {
    const data = fs.readFileSync(petitionsFilePath, 'utf8');
    petitionsDataContainer = JSON.parse(data);
} catch (err) {
    console.error('Error:', err);
}

const rawPetitionsData = petitionsDataContainer.rawPetitionsData.reduce((acc, petition) => {
  acc[petition.id] = petition;
  return acc;
}, {});

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

// This is commented out because it is not needed - instead I just have the "download latest data button"

// app.get('/petition/:petitionId', (req, res) => {
//     const petitionId = req.params.petitionId;
//     res.send(rawPetitionsData[petitionId] || {});
// });

app.listen(port, () => {
    console.log(`
Petitions by Locality running on port ${port}. 
Contains public sector information licensed under the Open Government Licence v3.0.
`);
});
