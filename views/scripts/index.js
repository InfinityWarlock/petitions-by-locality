let fullData = {};
let signaturesByConstituency = {};
let rawPetitionsData = {};
let petitionTopics = {}; // To store the topics fetched from /topicsData
let currentDisplayed = [];
let currentSortColumn = 1;
let currentSortDirection = "desc";

// Updated headerCellIndexMap based on new column positions
// Table columns: Petition (0), Count (1), Local Salience Category (2), Actual:Expected Salience Ratio (3), Topic (4), UK Total (5), State (6), Written Response (7), Debated (8), Created (9), Details Button (10)
// data-sort indices:
// Petition (data-sort index 0) -> cell 0
// Count (data-sort index 1) -> cell 1
// Local Salience (data-sort index 2) -> cell 2 (sorts by data-salience attribute)
// Actual:Expected Salience (data-sort index 3) -> cell 3 (sorts by data-value attribute)
// Topic (data-sort index 4) -> cell 4
// UK Total (data-sort index 5) -> cell 5
// State (data-sort index 6) -> cell 6
// Created (data-sort index 7) -> cell 9
const headerCellIndexMap = [0, 1, 2, 3, 4, 5, 6, 9]; // Adjusted indices to reflect new Topic column at index 4

// Event listener for the new "Load Data" button
document.getElementById('loadDataBtn').addEventListener('click', async function() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex'; // Show loading overlay

    try {
        // Fetch constituency data
        const constituencyResponse = await fetch('http://localhost:3000/constituenciesData');
        if (!constituencyResponse.ok) {
            throw new Error(`HTTP error fetching constituency data! status: ${constituencyResponse.status}`);
        }
        const constituencyData = await constituencyResponse.json();

        fullData = constituencyData;
        signaturesByConstituency = constituencyData.signaturesByConstituency || {};
        rawPetitionsData = constituencyData.rawPetitionsData || {};

        if (Array.isArray(rawPetitionsData)) {
            // Convert array of petitions to an object keyed by petition ID for easier lookup
            rawPetitionsData = Object.fromEntries(rawPetitionsData.map(p => [p.id, p]));
        }

        // Fetch topics data
        const topicsResponse = await fetch('http://localhost:3000/topicsData');
        if (!topicsResponse.ok) {
            throw new Error(`HTTP error fetching topics data! status: ${topicsResponse.status}`);
        }
        petitionTopics = await topicsResponse.json();

        populateConstituencySelector(Object.keys(signaturesByConstituency));
        // Initially populate topic filter with all topics (before a constituency is selected)
        populateTopicFilter(Object.values(petitionTopics));
        document.getElementById("controlsContainer").style.display = "flex";
    } catch (err) {
        // Using a custom message box instead of alert()
        displayMessageBox(`Error loading data from API: ${err.message}. Please ensure the local server is running.`);
        console.error("Error fetching data:", err);
    } finally {
        loadingOverlay.style.display = 'none'; // Hide loading overlay
    }
});

/**
 * Displays a custom message box.
 * @param {string} message The message to display.
 */
function displayMessageBox(message) {
    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 1000;
        text-align: center;
        max-width: 400px;
        font-family: system-ui, sans-serif;
    `;
    messageBox.innerHTML = `
        <p>${message}</p>
        <button style="
            background-color: #6366f1;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 15px;
        ">OK</button>
    `;
    document.body.appendChild(messageBox);
    messageBox.querySelector('button').addEventListener('click', () => {
        document.body.removeChild(messageBox);
    });
}

function populateConstituencySelector(constituencies) {
    const select = document.getElementById("constituencySelect");
    select.innerHTML = `<option disabled selected>Choose a constituency</option>`;
    select.style.display = "inline-block";

    select.addEventListener("change", function() {
        const selectedConstituency = this.value;
        const constituencyData = signaturesByConstituency[selectedConstituency];

        // NEW: Filter topics based on selected constituency
        const relevantTopics = new Set();
        if (constituencyData) {
            for (const petitionName in constituencyData) {
                const petitionId = constituencyData[petitionName].id;
                const topic = petitionTopics[petitionId];
                if (topic && topic !== 'N/A') {
                    relevantTopics.add(topic);
                }
            }
        }
        populateTopicFilter(Array.from(relevantTopics)); // Repopulate topic filter with relevant topics

        // Reset topic filter selection and input text when constituency changes
        const topicSearchInput = document.getElementById('filterTopicSearch');
        topicSearchInput.value = ''; // Clear search input
        topicSearchInput.setAttribute('data-selected-value', 'all'); // Reset selected value to 'all'
        document.getElementById('filterTopicOptions').style.display = 'none'; // Hide options list

        const dataTable = document.getElementById("dataTable");
        const toggleDetailsBtn = document.getElementById("toggleDetailsBtn");
        const countHeader = document.getElementById("countHeader"); // Get the count header

        countHeader.textContent = `${selectedConstituency} signatures`; // Update the header text
        dataTable.classList.remove("show-details");
        toggleDetailsBtn.textContent = "📊 Show Details";

        currentSortColumn = 1; // Default sort by Count
        currentSortDirection = "desc";

        populateTable(constituencyData);
        updateSortIndicator();

        const headers = document.querySelectorAll("th[data-sort]");
        if (headers[currentSortColumn]) {
            const sortType = headers[currentSortColumn].getAttribute("data-sort");
            sortTable(currentSortColumn, sortType, currentSortDirection);
        }
    });

    constituencies.sort().forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

/**
 * Populates the topic filter dropdown with unique topics and sets up search functionality.
 * @param {Array<string>} topics An array of topic strings.
 */
function populateTopicFilter(topics) {
    const optionsList = document.getElementById("filterTopicOptions");
    const topicSearchInput = document.getElementById('filterTopicSearch');
    const topicSelectContainer = document.getElementById('topicSelectContainer');
    const customSelectArrow = topicSelectContainer.querySelector('.custom-select-arrow');

    optionsList.innerHTML = `<li data-value="all">Topic: All</li>`; // Reset and add 'All' option
    const uniqueTopics = [...new Set(topics)].sort(); // Get unique and sort them

    uniqueTopics.forEach(topic => {
        if (topic && topic !== 'N/A') { // Avoid adding empty or 'N/A' topics as options
            const li = document.createElement("li");
            li.textContent = topic;
            li.setAttribute("data-value", topic);
            optionsList.appendChild(li);
        }
    });

    // Event listener for input field to filter options
    topicSearchInput.addEventListener('input', function() {
        const searchText = this.value.toLowerCase();
        Array.from(optionsList.children).forEach(li => {
            if (li.textContent.toLowerCase().includes(searchText) || li.dataset.value === 'all') {
                li.style.display = '';
            } else {
                li.style.display = 'none';
            }
        });
        optionsList.style.display = 'block'; // Ensure options are visible when typing
    });

    // Event listener for input field focus to open dropdown
    topicSearchInput.addEventListener('focus', function() {
        optionsList.style.display = 'block';
        // Show all options when focused
        Array.from(optionsList.children).forEach(li => li.style.display = '');
    });

    // Event listener for clicking on an option in the list
    optionsList.addEventListener('click', function(event) {
        if (event.target.tagName === 'LI') {
            topicSearchInput.value = event.target.textContent;
            topicSearchInput.setAttribute('data-selected-value', event.target.dataset.value); // Store the actual value
            optionsList.style.display = 'none';
            applyFilters(); // Apply filters when a topic is selected
        }
    });

    // Toggle dropdown visibility on arrow click (if arrow is visible)
    if (customSelectArrow) { // Check if arrow exists
        customSelectArrow.addEventListener('click', function() {
            if (optionsList.style.display === 'block') {
                optionsList.style.display = 'none';
            } else {
                optionsList.style.display = 'block';
                // Reset search and show all options when opened via arrow
                topicSearchInput.value = topicSearchInput.getAttribute('data-selected-value') === 'all' ? '' : topicSearchInput.getAttribute('data-selected-value') || '';
                Array.from(optionsList.children).forEach(li => li.style.display = '');
            }
        });
    }


    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!topicSelectContainer.contains(event.target)) {
            optionsList.style.display = 'none';
        }
    });
}

function updateSortIndicator() {
    const headers = document.querySelectorAll("th[data-sort]");
    headers.forEach(h => h.removeAttribute("data-sort-direction"));
    if (currentSortColumn >= 0 && currentSortColumn < headers.length && headers[currentSortColumn]) {
        headers[currentSortColumn].setAttribute("data-sort-direction", currentSortDirection);
    }
}

document.getElementById("toggleDetailsBtn").addEventListener("click", function() {
    const table = document.getElementById("dataTable");
    const showing = table.classList.toggle("show-details");
    this.textContent = showing ? "📊 Hide Details" : "📊 Show Details";
});

function setupSortableColumns() {
    const headers = document.querySelectorAll("th[data-sort]");
    headers.forEach((header, index) => {
        header.addEventListener("click", function() {
            const sortType = this.getAttribute("data-sort");
            if (currentSortColumn === index) {
                currentSortDirection = currentSortDirection === "desc" ? "asc" : "desc";
            } else {
                currentSortColumn = index;
                currentSortDirection = "desc";
            }
            updateSortIndicator();
            sortTable(index, sortType, currentSortDirection);
        });
    });
}

function sortTable(columnIndex, sortType, direction) {
    const tbody = document.querySelector("#dataTable tbody");
    const rows = Array.from(tbody.querySelectorAll("tr:not(.petition-details-row)")); // Exclude detail rows from sorting
    const actualCellIndex = headerCellIndexMap[columnIndex];

    if (actualCellIndex === undefined) {
        console.error("Invalid columnIndex for sorting:", columnIndex);
        return;
    }

    rows.sort((rowA, rowB) => {
        const cellA = rowA.cells[actualCellIndex];
        const cellB = rowB.cells[actualCellIndex];
        if (!cellA || !cellB) return 0;

        let valueA, valueB;
        if (sortType === "date") {
            valueA = new Date(cellA.getAttribute("data-value") || 0);
            valueB = new Date(cellB.getAttribute("data-value") || 0);
        } else if (sortType === "salience") { // For the category column, sort by the underlying salience value
            valueA = parseFloat(cellA.getAttribute("data-salience")) || 0;
            valueB = parseFloat(cellB.getAttribute("data-salience")) || 0;
        }
        else { // For number and text sorts, use data-value or textContent
            valueA = cellA.hasAttribute("data-value") ? cellA.getAttribute("data-value") : cellA.textContent.trim();
            valueB = cellB.hasAttribute("data-value") ? cellB.getAttribute("data-value") : cellB.textContent.trim();
        }

        let comparison = 0;
        if (sortType === "number") {
            const numA = parseFloat(valueA.replace(/[,]+/g, "")) || 0;
            const numB = parseFloat(valueB.replace(/[,]+/g, "")) || 0;
            comparison = numA < numB ? -1 : (numA > numB ? 1 : 0);
        } else if (sortType === "date") {
            comparison = valueA.getTime() < valueB.getTime() ? -1 : (valueA.getTime() > valueB.getTime() ? 1 : 0);
        } else if (sortType === "salience") {
            comparison = valueA < valueB ? -1 : (valueA > valueB ? 1 : 0);
        }
        else {
            comparison = valueA.localeCompare(valueB);
        }

        return direction === "asc" ? comparison : -comparison;
    });

    // Re-append rows along with their associated detail rows
    rows.forEach(row => {
        tbody.appendChild(row);
        const detailRowId = row.dataset.detailRowId;
        if (detailRowId) {
            const detailRow = document.getElementById(detailRowId);
            if (detailRow) {
                tbody.appendChild(detailRow);
            }
        }
    });
}

function applyFilters() {
    const nameFilter = document.getElementById('filterName').value.toLowerCase();
    const minSignatures = parseInt(document.getElementById('filterSignatures').value) || 0;
    const createdAfterDate = document.getElementById('filterCreatedDate').value; //YYYY-MM-DD
    const salienceCategoryFilter = document.getElementById('filterSalienceCategory').value; // 'all', 'more', 'about', 'less'
    const writtenResponseFilter = document.getElementById('filterWrittenResponse').value; // 'all', 'yes', 'no'
    const debatedFilter = document.getElementById('filterDebated').value; // 'all', 'yes', 'no'
    const topicFilter = document.getElementById('filterTopicSearch').getAttribute('data-selected-value') || 'all'; // NEW: Topic filter from custom dropdown

    const tbody = document.querySelector("#dataTable tbody");
    const rows = Array.from(tbody.querySelectorAll("tr:not(.petition-details-row)"));

    rows.forEach(row => {
        let display = true;

        // Filter by name
        const petitionCell = row.cells[0];
        const petitionName = petitionCell ? petitionCell.querySelector('a')?.textContent.toLowerCase() : '';
        if (nameFilter && !petitionName.includes(nameFilter)) {
            display = false;
        }

        // Filter by minimum signatures
        const countCell = row.cells[1];
        const signatureCount = parseInt(countCell?.textContent.replace(/,/g, '')) || 0;
        if (signatureCount < minSignatures) {
            display = false;
        }

        // Filter by created date (now at index 9)
        const createdDateCell = row.cells[9]; // Get the created date cell
        const rawCreatedDate = createdDateCell ? createdDateCell.getAttribute("data-value") : null; // Get raw ISO date
        if (createdAfterDate && rawCreatedDate) {
            if (rawCreatedDate < createdAfterDate) { // Direct string comparison works for ISO-MM-DD
                display = false;
            }
        } else if (createdAfterDate) {
            display = false; // If we can't get the created date, don't show if a date filter is active
        }

        // Filter by salience category (now in cell index 2)
        const salienceCategoryCell = row.cells[2];
        const salienceValue = parseFloat(salienceCategoryCell?.getAttribute("data-salience")) || 0;
        if (salienceCategoryFilter === 'more' && salienceValue <= 1.01) { // Adjusted buffer for "more"
            display = false;
        } else if (salienceCategoryFilter === 'less' && salienceValue >= 0.99) { // Adjusted buffer for "less"
            display = false;
        } else if (salienceCategoryFilter === 'about' && (salienceValue > 1.01 || salienceValue < 0.99)) { // Adjusted buffer for "about"
            display = false;
        }

        // Filter by written response (cell index 7)
        const writtenResponseCell = row.cells[7];
        const hasWrittenResponse = writtenResponseCell?.textContent === '✓';
        if (writtenResponseFilter === 'yes' && !hasWrittenResponse) {
            display = false;
        } else if (writtenResponseFilter === 'no' && hasWrittenResponse) {
            display = false;
        }

        // Filter by debated (cell index 8)
        const debatedCell = row.cells[8];
        const hasDebate = debatedCell?.textContent === '✓';
        if (debatedFilter === 'yes' && !hasDebate) {
            display = false;
        } else if (debatedFilter === 'no' && hasDebate) {
            display = false;
        }

        // NEW: Filter by topic (cell index 4)
        const topicCell = row.cells[4];
        const petitionTopic = topicCell ? topicCell.textContent : '';
        if (topicFilter !== 'all' && petitionTopic !== topicFilter) {
            display = false;
        }

        row.style.display = display ? '' : 'none';

        // Also hide/show the associated detail row
        const detailRowId = row.dataset.detailRowId;
        if (detailRowId) {
            const detailRow = document.getElementById(detailRowId);
            if (detailRow) {
                detailRow.style.display = 'none'; // Always hide details initially when filters are applied
            }
        }
    });
}

function formatDateUK(isoDateString) {
    if (!isoDateString) return 'N/A';
    const date = new Date(isoDateString);
    // Check if the date is valid before formatting
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }
    return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Determines the salience category and associated class.
 * @param {number} salience The calculated salience value.
 * @returns {{text: string, class: string}} An object with the category text and CSS class.
 */
function getSalienceCategory(salience) {
    if (salience > 1.01) { // A small buffer for "more salient"
        return { text: "more salient", class: "more-salient" };
    } else if (Math.abs(salience - 1.0) < 0.01) { // Approximately equal to 1
        return { text: "about as salient", class: "about-salient" };
    } else {
        return { text: "less salient", class: "less-salient" };
    }
}

function populateTable(data) {
    const tbody = document.querySelector("#dataTable tbody");
    tbody.innerHTML = "";
    currentDisplayed = [];

    if (!data || typeof data !== 'object') return;

    const sortedEntries = Object.entries(data).sort(([, a], [, b]) => b.count - a.count);
    let detailRowCounter = 0; // To create unique IDs for detail rows

    sortedEntries.forEach(([petition, details]) => {
        const row = document.createElement("tr");
        const petitionId = details.id;
        const petitionDetails = getPetitionDetails(petitionId);
        const petitionTopic = petitionTopics[petitionId] || 'N/A'; // Get the topic
        const createdDateISO = petitionDetails?.attributes?.created_at;
        const formattedCreatedDate = formatDateUK(createdDateISO);
        const detailRowId = `details-row-${petitionId}-${detailRowCounter++}`;
        row.dataset.detailRowId = detailRowId; // Link main row to its detail row

        const petitionCell = document.createElement("td");
        const link = document.createElement("a");
        link.href = `https://petition.parliament.uk/petitions/${petitionId}`;
        link.textContent = petition;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        petitionCell.appendChild(link);
        row.appendChild(petitionCell);

        const countCell = document.createElement("td");
        countCell.textContent = details.count.toLocaleString("en-UK");
        row.appendChild(countCell);

        const ukTotal = getUKTotal(petitionId);
        const expectedProportion = 1 / 650;
        const actualProportion = ukTotal > 0 ? (details.count / ukTotal) : 0;
        const salience = ukTotal > 0 ? (actualProportion / expectedProportion) : 0;
        const formattedSalience = salience.toFixed(2); // Keep for data-salience attribute

        const salienceInfo = getSalienceCategory(salience);
        const salienceCategoryCell = document.createElement("td");
        salienceCategoryCell.className = `salience-category-cell ${salienceInfo.class}`;
        salienceCategoryCell.textContent = salienceInfo.text;
        salienceCategoryCell.setAttribute("data-salience", salience); // Store actual salience for sorting
        row.appendChild(salienceCategoryCell);

        // NEW: Actual:Expected Salience Ratio cell
        const salienceRatioCell = document.createElement("td");
        salienceRatioCell.className = "salience-ratio-cell"; // New class for styling
        salienceRatioCell.textContent = formattedSalience;
        salienceRatioCell.setAttribute("data-value", salience); // Store for sorting if needed
        row.appendChild(salienceRatioCell);

        // NEW: Topic cell
        const topicCell = document.createElement("td");
        topicCell.className = "uk-wide-info-col topic-col"; // Add the topic-col class
        topicCell.textContent = petitionTopic;
        row.appendChild(topicCell);

        // UK Total cell
        const ukTotalCell = document.createElement("td");
        ukTotalCell.className = "uk-wide-info-col";
        ukTotalCell.textContent = ukTotal ? ukTotal.toLocaleString("en-UK") : "N/A";
        ukTotalCell.setAttribute("data-value", ukTotal || 0);
        row.appendChild(ukTotalCell);

        // State cell
        const stateCell = document.createElement("td");
        stateCell.className = "uk-wide-info-col";
        stateCell.textContent = petitionDetails?.attributes?.state || "N/A";
        row.appendChild(stateCell);

        // Written response? cell
        const writtenResponseCell = document.createElement("td");
        writtenResponseCell.className = "response-cell";
        const hasWrittenResponse = petitionDetails?.attributes?.government_response ? '✓' : '✗';
        writtenResponseCell.textContent = hasWrittenResponse;
        row.appendChild(writtenResponseCell);

        // Debated? cell
        const debatedCell = document.createElement("td");
        debatedCell.className = "response-cell";
        const hasDebate = petitionDetails?.attributes?.debate ? '✓' : '✗';
        debatedCell.textContent = hasDebate;
        row.appendChild(debatedCell);

        // 'Created' date cell
        const createdCell = document.createElement("td");
        createdCell.className = "details-cell";
        createdCell.textContent = formattedCreatedDate;
        createdCell.setAttribute("data-value", createdDateISO || ''); // Store ISO for sorting
        row.appendChild(createdCell);

        // Details button cell
        const detailsButtonCell = document.createElement("td");
        detailsButtonCell.className = "details-cell";
        const detailsButton = document.createElement("button");
        detailsButton.textContent = "Show Info";
        detailsButton.classList.add("show-info-btn");
        detailsButtonCell.appendChild(detailsButton);
        row.appendChild(detailsButtonCell);

        tbody.appendChild(row);

        // Create the hidden details row
        const detailsRow = document.createElement("tr");
        detailsRow.id = detailRowId;
        detailsRow.classList.add("petition-details-row");
        detailsRow.style.display = 'none'; // Initially hidden

        const detailsContentCell = document.createElement("td");
        // Total columns in the table = 11 now (10 visible + 1 hidden for details button)
        detailsContentCell.colSpan = 11; // Adjusted colspan to cover all columns
        detailsContentCell.classList.add("petition-details-grid-container"); // New class for grid layout

        // --- Box One: Petition Details ---
        let petitionInfoHTML = `<div class="detail-box"><strong>Petition Details</strong>`;
        const addPetitionDetail = (label, value, formatFn = null) => {
            if (value) {
                petitionInfoHTML += `<div class="detail-item"><strong>${label}:</strong> <p>${formatFn ? formatFn(value) : value}</p></div>`;
            }
        };
        addPetitionDetail('Action', petitionDetails?.attributes?.action);
        addPetitionDetail('Background', petitionDetails?.attributes?.background, (c) => c?.replaceAll("\r\n\r\n", "<br><br>"));
        addPetitionDetail('Additional Details', petitionDetails?.attributes?.additional_details, (c) => c?.replaceAll("\r\n\r\n", "<br><br>"));
        addPetitionDetail('Creator', petitionDetails?.attributes?.creator_name);
        addPetitionDetail('Petition Type', petitionDetails?.attributes?.petition_type);
        addPetitionDetail('Opened', petitionDetails?.attributes?.opening_at, formatDateUK);
        addPetitionDetail('Closed', petitionDetails?.attributes?.closing_at, formatDateUK);
        petitionInfoHTML += `</div>`;

        // --- Box Two: Response & Debate ---
        let responseInfoHTML = `<div class="detail-box"><strong>Response & Debate</strong>`;
        const addResponseDetail = (label, value, formatFn = null) => {
            if (value) {
                responseInfoHTML += `<div class="detail-item"><strong>${label}:</strong> <p>${formatFn ? formatFn(value) : value}</p></div>`;
            }
        };

        if (petitionDetails?.attributes?.government_response) {
            const govResponse = petitionDetails.attributes.government_response;
            responseInfoHTML += `<strong>Government Response:</strong>`;
            addResponseDetail('Responded on', govResponse.responded_on, formatDateUK);
            addResponseDetail('Summary', govResponse.summary);
            addResponseDetail('Details', govResponse.details, (c) => c?.replaceAll("\r\n\r\n", "<br><br>"));
        }

        if (petitionDetails?.attributes?.debate) {
            const debateInfo = petitionDetails.attributes.debate;
            if (petitionDetails?.attributes?.government_response) { // Add a break if there's also a government response
                responseInfoHTML += `<br>`;
            }
            responseInfoHTML += `<strong>Debate Info:</strong>`;
            addResponseDetail('Debated on', debateInfo.debated_on, formatDateUK);
            const addLink = (label, url, text) => {
                if (url && url !== "https://www.youtube.com/watch?v=a1BAM81Twgk") {
                    responseInfoHTML += `<div class="detail-item"><strong>${label}:</strong> <p><a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a></p></div>`;
                }
            };
            addLink('Transcript', debateInfo.transcript_url, 'Transcript');
            addLink('Video', debateInfo.video_url, 'Video');
            addLink('Debate Pack', debateInfo.debate_pack_url, 'Debate Pack');
        }
        responseInfoHTML += `</div>`;

        // --- Box Three: Missing Information / Rejection / Departments / Topics ---
        let missingInfoHTML = `<div class="missing-info-box"><strong>Additional Information & Missing Fields</strong>`;
        const missingFields = [];

        // Check for missing core details (if not present in Box 1)
        if (!petitionDetails?.attributes?.action) missingFields.push('Action');
        if (!petitionDetails?.attributes?.background) missingFields.push('Background');
        if (!petitionDetails?.attributes?.additional_details) missingFields.push('Additional Details');
        if (!petitionDetails?.attributes?.creator_name) missingFields.push('Creator Name');
        if (!petitionDetails?.attributes?.petition_type) missingFields.push('Petition Type');
        if (!petitionDetails?.attributes?.opening_at) missingFields.push('Opened Date');
        if (!petitionDetails?.attributes?.closing_at) missingFields.push('Closed Date');

        // Check for missing response/debate (if not present in Box 2)
        if (!petitionDetails?.attributes?.government_response) missingFields.push('Government Response');
        if (!petitionDetails?.attributes?.debate) missingFields.push('Debate Info');

        if (petitionDetails?.attributes?.rejection) {
            const rejection = petitionDetails.attributes.rejection;
            missingInfoHTML += `<div class="detail-item"><strong>Rejection Code:</strong> <p>${rejection.code}</p></div>`;
            missingInfoHTML += `<div class="detail-item"><strong>Rejection Details:</strong> <p>${rejection.details}</p></div>`;
        } else {
            missingFields.push('Rejection Info');
        }

        if (petitionDetails?.attributes?.departments && petitionDetails.attributes.departments.length > 0) {
            missingInfoHTML += `<strong>Departments:</strong> <ul>`;
            petitionDetails.attributes.departments.forEach(dept => {
                missingInfoHTML += `<li>${dept.name}</li>`;
            });
            missingInfoHTML += `</ul>`;
        } else {
            missingFields.push('Departments');
        }

        // Display topic from /topicsData if available, otherwise check rawPetitionsData, then mark as missing
        if (petitionTopic && petitionTopic !== 'N/A') {
            missingInfoHTML += `<div class="detail-item"><strong>Topic:</strong> <p>${petitionTopic}</p></div>`;
        } else if (petitionDetails?.attributes?.topics && petitionDetails.attributes.topics.length > 0) {
            missingInfoHTML += `<strong>Topics (from petition data):</strong> <ul>`;
            petitionDetails.attributes.topics.forEach(topic => {
                missingInfoHTML += `<li>${topic}</li>`;
            });
            missingInfoHTML += `</ul>`;
        } else {
            missingFields.push('Topic');
        }

        if (missingFields.length > 0) {
            missingInfoHTML += `<div class="missing-fields-list"><strong>Missing Fields:</strong> <span>${missingFields.join(', ')}</span></div>`;
        }
        missingInfoHTML += `</div>`; // Close missing-info-box

        detailsContentCell.innerHTML = petitionInfoHTML + responseInfoHTML + missingInfoHTML;
        detailsRow.appendChild(detailsContentCell);
        tbody.appendChild(detailsRow);

        // Event listener for the details button
        detailsButton.addEventListener('click', function() {
            const isHidden = detailsRow.style.display === 'none';
            detailsRow.style.display = isHidden ? '' : 'none';
            this.textContent = isHidden ? 'Hide Info' : 'Show Info';
        });

        currentDisplayed.push({
            petition,
            count: details.count,
            created: createdDateISO, // Store ISO for export
            salience: formattedSalience, // Store the raw formatted salience for CSV
            ukTotal,
            state: petitionDetails?.attributes?.state || null,
            hasWrittenResponse: petitionDetails?.attributes?.government_response ? true : false,
            hasDebate: petitionDetails?.attributes?.debate ? true : false,
            topic: petitionTopic // Add topic for export
        });
    });

    // Apply filters after populating the table
    applyFilters();
}

function getUKTotal(id) {
    const details = getPetitionDetails(id);
    return details?.attributes?.signature_count;
}

function getPetitionDetails(id) {
    return rawPetitionsData[id];
}

document.getElementById("exportCsvBtn").addEventListener("click", function() {
    if (currentDisplayed.length === 0) return;

    // Updated CSV header to include Topic
    const csvHeader = "Petition,Count,Local Salience,Actual:Expected Salience,Topic,UK Total,State,Written Response?,Debated?,Created\n";
    const csvRows = currentDisplayed.map(item => {
        // Use the getSalienceCategory function to get the text for CSV
        const salienceCategoryText = getSalienceCategory(parseFloat(item.salience)).text;
        // Ensure topic is quoted and escaped if it contains commas or quotes
        const topicCsv = item.topic ? `"${item.topic.replace(/"/g, '""')}"` : 'N/A';
        return `"${item.petition.replace(/"/g, '""')}",${item.count},"${salienceCategoryText}",${item.salience},${topicCsv},${item.ukTotal ?? "N/A"},${item.state ?? "N/A"},${item.hasWrittenResponse ? 'Yes' : 'No'},${item.hasDebate ? 'Yes' : 'No'},"${formatDateUK(item.created)}"`
    }).join("\n");

    const csvString = csvHeader + csvRows;
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "petition_data.csv");
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

document.addEventListener("DOMContentLoaded", function() {
    setupSortableColumns();

    const filterNameInput = document.getElementById('filterName');
    const filterSignaturesInput = document.getElementById('filterSignatures');
    const filterCreatedDateInput = document.getElementById('filterCreatedDate');
    const filterSalienceCategoryInput = document.getElementById('filterSalienceCategory');
    const filterWrittenResponseInput = document.getElementById('filterWrittenResponse');
    const filterDebatedInput = document.getElementById('filterDebated');
    // Removed direct reference to filterTopicInput as it's now handled by custom logic
    // const filterTopicInput = document.getElementById('filterTopic'); 

    filterNameInput.addEventListener('input', applyFilters);
    filterSignaturesInput.addEventListener('input', applyFilters);
    filterCreatedDateInput.addEventListener('input', applyFilters);
    filterSalienceCategoryInput.addEventListener('change', applyFilters); // Use 'change' for select elements
    filterWrittenResponseInput.addEventListener('change', applyFilters);
    filterDebatedInput.addEventListener('change', applyFilters);
    // filterTopicInput.addEventListener('change', applyFilters); // Removed, handled by custom logic
});
