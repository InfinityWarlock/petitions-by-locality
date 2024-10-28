import fs from 'fs';

// TODO: make these configurable
const PARLIAMENT = 4; // 2019-2024
const STATE = 'with_response'; // Only petitions with response
const DATA_DIR = 'data/petitions/';

async function fetchData(url) {
  return await (await fetch(url)).json();
}

async function fetchPetition(petitionId) {
  const url = `https://petition.parliament.uk/petitions/${petitionId}.json`;
  return await fetchData(url);
}

async function getPetitionIds() {
  console.log(`Fetching petitions with state: ${STATE}`);

  const inititialURL = `https://petition.parliament.uk/archived/petitions.json?page=1&parliament=${PARLIAMENT}&state=${STATE}`;
  let petitionsData = await fetchData(inititialURL);
  let petitionsIds = petitionsData.data.map(petition => petition.id);

  while (petitionsData.links.next) {
    const nextURL = petitionsData.links.next;
    petitionsData = await fetchData(nextURL);
    petitionsIds = [
      ...petitionsIds,
      ...petitionsData.data.map(petition => petition.id)
    ];
  }

  console.log(`Found ${petitionsIds.length} petitions`);

  return petitionsIds;
}

const downloadPetitionsToFile = async () => {
  const petitionIds = await getPetitionIds();

  const now = new Date().toISOString();

  const directory = `${DATA_DIR}/${now}`;

  console.log(`Downloading ${petitionIds.length} petitions to ${directory}`);

  fs.mkdirSync(directory, { recursive: true });

  let petitionsDownloaded = 0;
  for (const petitionId of petitionIds) {
    const petition = await fetchPetition(petitionId);

    fs.writeFileSync(
      `${directory}/${petitionId}.json`,
      JSON.stringify(petition)
    );

    petitionsDownloaded += 1;

    if (petitionsDownloaded % 100 === 0) {
      console.log(`Downloaded ${petitionsDownloaded} petitions`);
    }
  }

  console.log(`Downloaded ${petitionIds.length} petitions`);
};

downloadPetitionsToFile();
