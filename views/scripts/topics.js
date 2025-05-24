// Global variables to hold the Chart.js instances for the two charts
let groupedChartInstance = null;
let individualChartInstance = null;
let allProcessedTopicData = null; // To store both petition and signature percentages, and raw topicsData
let currentChartType = 'petitionPercentages'; // Default to petition percentages
let currentIndividualChartFilter = null; // Stores the name of the currently filtered group for the individual chart

// Define a color palette for the charts
const chartColors = {
  // Updated primary colors for better contrast
  primary: '#4CAF50', // A shade of green
  primaryLight: 'rgba(76, 175, 80, 0.4)', // Lighter green for background
  // Updated secondary colors
  secondary: '#2196F3', // A shade of blue
  secondaryLight: 'rgba(33, 150, 243, 0.4)', // Lighter blue for background
  // Highlight color for individual topics
  highlight: '#FFC107', // Amber
  highlightLight: 'rgba(255, 193, 7, 0.6)', // Lighter amber for background
  // Default bar color for individual chart when not highlighted
  defaultBar: 'rgba(96, 125, 139, 0.2)', // A light grey-blue
  defaultBorder: 'rgba(96, 125, 139, 1)' // Darker grey-blue
};

async function fetchTopicsData() {
  try {
    const response = await fetch('http://localhost:3000/topicsData');
    if (!response.ok) {
      console.error('Failed to fetch topics data:', response.status);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching topics data:', error);
    return null;
  }
}

async function calculatePercentageOfPetitionsByTopic(topicsData) {
  const topicCounts = {};
  let totalPetitions = 0;

  for (const petitionId in topicsData) {
    if (topicsData.hasOwnProperty(petitionId)) {
      const topic = topicsData[petitionId];
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      totalPetitions++;
    }
  }

  const topicPercentages = {};
  for (const topic in topicCounts) {
    if (topicCounts.hasOwnProperty(topic)) {
      const percentage = (topicCounts[topic] / totalPetitions) * 100;
      topicPercentages[topic] = {
        percentage: parseFloat(percentage.toFixed(2)),
        rawCount: topicCounts[topic]
      };
    }
  }

  return topicPercentages;
}

async function calculatePercentageOfSignaturesByTopic(topicsData) {
  const rawPetitionsData = window.rawPetitionsData;
  if (!rawPetitionsData) {
    console.error('rawPetitionsData is not available on the window object.');
    return {};
  }

  const topicSignatureData = {};
  let totalSignatures = 0;

  // First, calculate the total number of signatures across all petitions
  for (const petitionId in rawPetitionsData) {
    if (rawPetitionsData.hasOwnProperty(petitionId)) {
      const petition = rawPetitionsData[petitionId];
      const signatureCount = petition?.attributes?.signature_count;
      if (typeof signatureCount !== 'number') {
        console.warn(`Petition ${petitionId} has a non-numeric signature count:`, signatureCount);
      } else {
        totalSignatures += signatureCount;
      }
    }
  }

  console.log('Total Signatures:', totalSignatures);

  // Then, sum the signatures for each topic
  for (const petitionId in rawPetitionsData) {
    if (rawPetitionsData.hasOwnProperty(petitionId)) {
      const petition = rawPetitionsData[petitionId];
      const topic = topicsData[petitionId]; // Look up topic using petition ID
      const signatures = petition?.attributes?.signature_count;

      if (topic) {
        topicSignatureData[topic] = topicSignatureData[topic] || { rawCount: 0 };
        if (typeof signatures === 'number') {
          topicSignatureData[topic].rawCount += signatures;
        }
      }
    }
  }

  const topicSignaturePercentages = {};
  for (const topic in topicSignatureData) {
    if (topicSignatureData.hasOwnProperty(topic)) {
      const rawCount = topicSignatureData[topic].rawCount;
      const percentage = totalSignatures > 0 ? (rawCount / totalSignatures) * 100 : 0;
      topicSignaturePercentages[topic] = {
        percentage: parseFloat(percentage.toFixed(2)),
        rawCount: rawCount
      };
    }
  }

  return topicSignaturePercentages;
}

async function loadAndProcessTopicData() {
  const topicsData = await fetchTopicsData(); // This is the map of petitionId -> topic
  if (!topicsData) {
    return {};
  }
  const petitionPercentages = await calculatePercentageOfPetitionsByTopic(topicsData);
  // Pass topicsData to signature calculation as well
  const signaturePercentages = await calculatePercentageOfSignaturesByTopic(topicsData);

  console.log('Percentage of Petitions by Topic:', petitionPercentages);
  console.log('Percentage of Signatures by Topic:', signaturePercentages);

  return {
    petitionPercentages,
    signaturePercentages,
    topicsData // Include the raw topicsData for lookup later
  };
}

// Topic Groups
const topicGroups = {
  'Brexit and the EU': ['brexit', 'the eu'],
  'Coronavirus': ['coronavirus'],
  'Economy, business and transport': ['business', 'economy', 'transport', 'work and incomes'],
  'Home affairs': ['communities', 'crime', 'culture', 'culture, media and sport', 'family and civil law', 'immigration', 'justice', 'security'],
  'Parliament and elections': ['devolution', 'elections', 'government', 'local government', 'parliament'],
  'Science, climate and technology': ['climate change', 'energy', 'environment', 'sciences', 'technology'],
  'Social policy': ['education', 'families and social services', 'health', 'housing and planning', 'welfare and pensions'],
  'Other': ['africa', 'americas', 'asia', 'europe', 'middle east', 'defence', 'institutions', 'other']
};

// Function to group the topic data
function groupTopicData(data, groups) {
  const groupedData = {};

  for (const groupName in groups) {
    groupedData[groupName] = { percentage: 0, rawCount: 0, topics: {} };
    for (const topic of groups[groupName]) {
      if (data[topic]) {
        groupedData[groupName].percentage += data[topic].percentage;
        groupedData[groupName].rawCount += data[topic].rawCount;
        groupedData[groupName].topics[topic] = data[topic];
      }
    }
    groupedData[groupName].percentage = parseFloat(groupedData[groupName].percentage.toFixed(2)); // Ensure percentage is rounded
  }
  return groupedData;
}

/**
 * Populates the petitions table in the detailed analysis section.
 * @param {string} targetElementId The ID of the div where the table should be rendered.
 * @param {Array<Object>} petitions An array of petition objects to display.
 */
function populatePetitionsTable(targetElementId, petitions) {
  const container = document.getElementById(targetElementId);
  if (!container) {
    console.error(`Target element with ID '${targetElementId}' not found for petitions table.`);
    return;
  }

  // Clear previous content
  container.innerHTML = '';

  if (petitions.length === 0) {
    container.innerHTML = '<p>No petitions found for this selection.</p>';
    return;
  }

  // Create a div to make the table scrollable
  const scrollContainer = document.createElement('div');
  scrollContainer.classList.add('scrollable-table-container');

  const table = document.createElement('table');
  table.classList.add('topic-petitions-table'); // Add a class for styling

  // Create table header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Petition </th>
      <th>Signatures</th>
    </tr>
  `;
  table.appendChild(thead);

  // Create table body
  const tbody = document.createElement('tbody');
  // Sort petitions by signature count descending
  petitions.sort((a, b) => (b.attributes?.signature_count || 0) - (a.attributes?.signature_count || 0));

  petitions.forEach(petition => {
    const row = document.createElement('tr');
    const petitionName = petition.attributes?.action || 'N/A';
    const signatureCount = petition.attributes?.signature_count?.toLocaleString() || 'N/A';
    const petitionUrl = `https://petition.parliament.uk/petitions/${petition.id}`;

    row.innerHTML = `
      <td><a href="${petitionUrl}" target="_blank" rel="noopener noreferrer">${petitionName}</a></td>
      <td>${signatureCount} (<a href="https://petitionmap.unboxedconsulting.com/?petition=${petition.id}" target="_blank" rel="noopener noreferrer">by constituency</a>)</td>
    `;
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  scrollContainer.appendChild(table); // Append table to the scroll container
  container.appendChild(scrollContainer); // Append scroll container to the target element
}


/**
 * Updates the detailed analysis section with a title and populates the petitions table.
 * @param {string} titleText The text for the title of the detailed analysis section.
 * @param {string} type 'group' or 'topic' to indicate what was clicked.
 * @param {string} name The actual group name or topic name to use for filtering.
 */
function updateTopicDetailsSection(titleText, type, name) {
  const topicDetailsSection = document.getElementById('topicDetailsSection');
  const topicDetailsTitle = document.getElementById('topicDetailsTitle');
  const topicDetailsLeftTop = document.getElementById('topicDetailsLeftTop'); // Get the top left element
  const topicDetailsLeftBottom = document.getElementById('topicDetailsLeftBottom'); // Get the bottom left element
  const topicDetailsRight = document.getElementById('topicDetailsRight');

  if (topicDetailsSection && topicDetailsTitle && topicDetailsLeftTop && topicDetailsLeftBottom && topicDetailsRight) {
    topicDetailsTitle.textContent = `Petitions about ${titleText}`;
    
    // Filter petitions based on type and name
    const rawPetitionsData = window.rawPetitionsData;
    const topicsData = allProcessedTopicData.topicsData; // Get the raw topics data for lookup
    let relevantPetitions = [];

    for (const petitionId in rawPetitionsData) {
      if (rawPetitionsData.hasOwnProperty(petitionId)) {
        const petition = rawPetitionsData[petitionId];
        const petitionTopic = topicsData[petitionId]; // Get topic from topicsData

        if (type === 'group') {
          // If a group was clicked, check if the petition's topic is in that group
          if (topicGroups[name] && topicGroups[name].includes(petitionTopic)) {
            relevantPetitions.push(petition);
          }
        } else if (type === 'topic') {
          // If an individual topic was clicked, check if the petition's topic matches
          if (petitionTopic === name) {
            relevantPetitions.push(petition);
          }
        }
      }
    }

    // Calculate totals for the overview
    const totalPetitionsInSelection = relevantPetitions.length;
    const totalSignaturesInSelection = relevantPetitions.reduce((sum, petition) => {
      return sum + (petition.attributes?.signature_count || 0);
    }, 0);

    // Populate the top-left overview section
    topicDetailsLeftTop.innerHTML = `
      <h3>Overview for ${titleText}</h3>
      <ul>
        <li>Total number of petitions about topic: <strong>${totalPetitionsInSelection.toLocaleString()}</strong></li>
        <li>Total number of signatures for all petitions about topic: <strong>${totalSignaturesInSelection.toLocaleString()}</strong></li>
      </ul>
    `;

    topicDetailsLeftBottom.innerHTML = `<h3>Where have petitions about ${titleText} been signed??</h3>
    <div id="mapDiv"></div>`; 
    
    // Create the map 

    var map = L.map('mapDiv').setView([55.78, -5.96], 5);
    
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    window.dispatchEvent(new Event('resize')); // Trigger a resize event to ensure the map is drawn correctly

    // this is hacky - fire a resize event to amke the map draw! 
    window.dispatchEvent(new Event('resize'));

   
    // This map shows, in each constituency, the number of signatures (not number of petitions - make this clear). 

    let signaturesInThisTopicByConstituency = {}; 
    let empties = [];
    for (const petition of relevantPetitions) {
      const signaturesInThisPetition = petition.attributes.signatures_by_constituency;
      if (signaturesInThisPetition == undefined) {
        // whoops, move on - I think some petitions don't have signatures by constituency 
        empties.push(petition.id);
      }
      else {
        for (const constituencyObj of signaturesInThisPetition) {
            const constituencyName = constituencyObj.name;
            const signatures = constituencyObj.signature_count;

            if (signaturesInThisTopicByConstituency.hasOwnProperty(constituencyName)) { 
                if (typeof(signatures) !== 'number') {
                    console.warn(`Non-numeric signature count for constituency ${constituencyName} in petition ${petition.id}:`, signatures);
                    console.log(constituencyObj)
                }
                signaturesInThisTopicByConstituency[constituencyName] += signatures;
            } else {
                signaturesInThisTopicByConstituency[constituencyName] = signatures;
            }
        }
      }
    }

    // console.log(signaturesInThisTopicByConstituency);
    
     // work out the colours by getting the range of signature values and mapping each range to a colour 
    
    
    const colourScale = ['#fff7ec','#fee8c8','#fdd49e','#fdbb84','#fc8d59','#ef6548','#d7301f','#b30000','#7f0000'];

    const maxSignatures = Math.max(...Object.values(signaturesInThisTopicByConstituency));
    const minSignatures = Math.min(...Object.values(signaturesInThisTopicByConstituency));
    const stepSize = (maxSignatures - minSignatures) / colourScale.length;

    const constituencyColours = {};

    for (const [constituency, count] of Object.entries(signaturesInThisTopicByConstituency)) {
    // Calculate the index in the colour scale
    let index = Math.floor((count - minSignatures) / stepSize);
    
    // Ensure index stays within bounds of the colourScale array
    if (index >= colourScale.length) index = colourScale.length - 1;
    
    constituencyColours[constituency] = colourScale[index];
    
    }
    


    const styleFunc = feature => {
        return {
            fillColor: constituencyColours[feature.properties.PCON24NM] || '#fff7ec', // Default color if not found
            weight: 2,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.8
        }
    }

    let geojsonLayer = L.geoJSON(window.constituencyBoundariesGeoJSON, {
        style: styleFunc
    });

    geojsonLayer.addTo(map); 

    populatePetitionsTable('topicDetailsRight', relevantPetitions);
    topicDetailsSection.style.display = 'block'; // Make the section visible
  }
}


/**
 * Creates or updates the grouped bar chart.
 * @param {string} chartId The ID of the canvas element for the chart.
 * @param {object} data The processed topic data (e.g., petitionPercentages or signaturePercentages).
 * @param {object} groups The topic grouping configuration.
 * @param {string} chartType The type of data being displayed ('petitionPercentages' or 'signaturesPercentages').
 */
function createGroupedChart(chartId, data, groups, chartType) {
  const ctx = document.getElementById(chartId).getContext('2d');

  if (groupedChartInstance) {
    groupedChartInstance.destroy();
  }

  const groupedData = groupTopicData(data, groups);
  const labels = Object.keys(groupedData);
  const percentages = labels.map(label => groupedData[label].percentage);

  groupedChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: `Percentage of ${chartType === 'petitionPercentages' ? 'Petitions' : 'Signatures'}`,
        data: percentages,
        backgroundColor: chartColors.primaryLight,
        borderColor: chartColors.primary,
        borderWidth: 1,
        barPercentage: 0.8, // Control bar thickness
        categoryPercentage: 0.8 // Control spacing between categories
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Percentage',
            font: {
              size: 14 // Increased font size
            }
          },
          ticks: {
            font: {
              size: 12 // Increased font size
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)' // Lighter grid lines
          }
        },
        x: {
          ticks: {
            autoSkip: false, // Prevent labels from being skipped
            maxRotation: 45, // Rotate labels for better readability
            minRotation: 45,
            font: {
              size: 12 // Increased font size
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)' // Lighter grid lines
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: `Grouped Topic Distribution (${chartType === 'petitionPercentages' ? 'Petitions' : 'Signatures'})`,
          font: {
            size: 18, // Increased font size
            weight: 'bold'
          },
          padding: {
            top: 10,
            bottom: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darker background for contrast
          titleFont: {
            size: 14, // Increased font size
            weight: 'bold'
          },
          bodyFont: {
            size: 12 // Increased font size
          },
          padding: 10,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              const rawCount = groupedData[context.label].rawCount;
              return `${label}: ${value}% (Raw: ${rawCount.toLocaleString()})`;
            }
          }
        }
      },
      onHover: (event, elements) => {
        if (elements.length > 0) {
          const hoveredGroupIndex = elements[0].index;
          const groupName = labels[hoveredGroupIndex];
          const topicsInGroup = groups[groupName];
          // Highlight individual topics belonging to the hovered group
          updateIndividualChartHighlight(topicsInGroup);
        } else {
          // If no bar is hovered, clear highlight
          updateIndividualChartHighlight([]);
        }
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const clickedGroupIndex = elements[0].index;
          const groupName = labels[clickedGroupIndex];
          filterAndRenderIndividualChart(groupName);
          updateTopicDetailsSection(groupName, 'group', groupName); // Pass type and name
        }
      }
    }
  });
}

/**
 * Creates or updates the individual topics bar chart.
 * @param {string} chartId The ID of the canvas element for the chart.
 * @param {object} data The processed topic data (e.g., petitionPercentages or signaturePercentages).
 * @param {string} chartType The type of data being displayed ('petitionPercentages' or 'signaturesPercentages').
 * @param {Array<string>} highlightedTopics An array of topic names to highlight.
 */
function createIndividualChart(chartId, data, chartType, highlightedTopics = []) {
  const ctx = document.getElementById(chartId).getContext('2d');

  if (individualChartInstance) {
    individualChartInstance.destroy();
  }

  const labels = Object.keys(data).sort(); // Sort individual topics alphabetically
  const percentages = labels.map(label => data[label].percentage);
  const backgroundColors = labels.map(label => highlightedTopics.includes(label) ? chartColors.highlightLight : chartColors.defaultBar);
  const borderColors = labels.map(label => highlightedTopics.includes(label) ? chartColors.highlight : chartColors.defaultBorder);

  individualChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: `Percentage of ${chartType === 'petitionPercentages' ? 'Petitions' : 'Signatures'}`,
        data: percentages,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
        barPercentage: 0.8, // Control bar thickness
        categoryPercentage: 0.8 // Control spacing between categories
      }]
    },
    options: {
      indexAxis: 'y', // Make it a horizontal bar chart
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Percentage',
            font: {
              size: 14 // Increased font size
            }
          },
          ticks: {
            font: {
              size: 12 // Increased font size
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)' // Lighter grid lines
          }
        },
        y: { // Y-axis for horizontal bar chart
          ticks: {
            font: {
              size: 12 // Increased font size
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)' // Lighter grid lines
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: `Individual Topic Distribution (${chartType === 'petitionPercentages' ? 'Petitions' : 'Signatures'})`,
          font: {
            size: 18, // Increased font size
            weight: 'bold'
          },
          padding: {
            top: 10,
            bottom: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darker background for contrast
          titleFont: {
            size: 14, // Increased font size
            weight: 'bold'
          },
          bodyFont: {
            size: 12 // Increased font size
          },
          padding: 10,
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.x;
              const rawCount = data[context.label].rawCount;
              return `${label}: ${value}% (Raw: ${rawCount.toLocaleString()})`;
            }
          }
        }
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const clickedTopicIndex = elements[0].index;
          const topicName = labels[clickedTopicIndex];
          updateTopicDetailsSection(topicName, 'topic', topicName); // Pass type and name
        }
      }
    }
  });
}

/**
 * Updates the highlight on the individual topics chart.
 * @param {Array<string>} topicsToHighlight An array of topic names to highlight.
 */
function updateIndividualChartHighlight(topicsToHighlight) {
  if (!individualChartInstance) return;

  const labels = individualChartInstance.data.labels;
  const newBackgroundColors = labels.map(label => topicsToHighlight.includes(label) ? chartColors.highlightLight : chartColors.defaultBar);
  const newBorderColors = labels.map(label => topicsToHighlight.includes(label) ? chartColors.highlight : chartColors.defaultBorder);

  individualChartInstance.data.datasets[0].backgroundColor = newBackgroundColors;
  individualChartInstance.data.datasets[0].borderColor = newBorderColors;
  individualChartInstance.update(); // Update the chart to reflect changes
}

/**
 * Filters the individual chart to show only topics from a specific group, or all topics if groupName is null.
 * @param {string|null} groupName The name of the group to filter by, or null to show all topics.
 */
function filterAndRenderIndividualChart(groupName) {
  currentIndividualChartFilter = groupName;
  const dataToUse = allProcessedTopicData[currentChartType];
  let filteredData = {};

  if (groupName && topicGroups[groupName]) {
    const topicsInGroup = topicGroups[groupName];
    topicsInGroup.forEach(topic => {
      if (dataToUse[topic]) {
        filteredData[topic] = dataToUse[topic];
      }
    });
  } else {
    // If no groupName or groupName is null, show all topics
    filteredData = dataToUse;
  }

  createIndividualChart('individualTopicChart', filteredData, currentChartType, groupName ? topicGroups[groupName] : []);

  // Update the "Show All Topics" button visibility
  const showAllTopicsBtn = document.getElementById('showAllTopicsBtn');
  if (showAllTopicsBtn) {
    showAllTopicsBtn.style.display = groupName ? 'block' : 'none';
  }
}

/**
 * Resets the individual chart to show all topics.
 */
function resetIndividualChart() {
  filterAndRenderIndividualChart(null);
}


/**
 * Initializes the topic view by loading data and creating both charts.
 */
async function initializeTopicView() {
  // Only load data once
  if (!allProcessedTopicData) {
    allProcessedTopicData = await loadAndProcessTopicData();
  }

  if (allProcessedTopicData) {
    // Initial rendering: Grouped chart (vertical bars) and Individual chart (horizontal bars)
    // Use petition percentages by default
    createGroupedChart('groupedTopicChart', allProcessedTopicData.petitionPercentages, topicGroups, 'petitionPercentages');
    filterAndRenderIndividualChart(null); // Initially show all individual topics
  }

  // Set up event listeners for the data type toggle (if implemented in HTML)
  document.querySelectorAll('input[name="topicDataType"]').forEach(radio => {
    radio.addEventListener('change', (event) => {
      currentChartType = event.target.value;
      // Re-render both charts with the new data type
      createGroupedChart('groupedTopicChart', allProcessedTopicData[currentChartType], topicGroups, currentChartType);
      // Re-apply the current filter (or no filter) to the individual chart
      filterAndRenderIndividualChart(currentIndividualChartFilter);
    });
  });

  // Set up event listener for the "Show All Topics" button
  const showAllTopicsBtn = document.getElementById('showAllTopicsBtn');
  if (showAllTopicsBtn) {
    showAllTopicsBtn.addEventListener('click', resetIndividualChart);
  }
}

// Ensure Chart.js is loaded before attempting to create charts
// This function will be called by viewSwitcher.js when the topic view is activated.
