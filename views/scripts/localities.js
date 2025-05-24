// Global variables to store data and state
let fullData = {}; // Stores the full dataset from the API
let signaturesByConstituency = {}; // Stores signature data organized by constituency
let rawPetitionsData = {}; // Stores raw petition details keyed by ID
let petitionTopics = {}; // Stores topics fetched from /topicsData, keyed by petition ID
let currentDisplayed = []; // Stores the currently displayed and filtered data for export
let currentSortColumn = 1; // Default column index for sorting (Signatures)
let currentSortDirection = "desc"; // Default sort direction

// headerCellIndexMap: Maps the data-sort index (from HTML header) to the actual cell index in the table row.
// This is crucial because some columns might be hidden or their order might change.
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
const headerCellIndexMap = [0, 1, 2, 3, 4, 5, 6, 9]; // Adjusted indices to reflect new Topic column at index 4 and Created at 9


// Event listener for the "Load Data" button
document.getElementById('loadDataBtn').addEventListener('click', async function() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const initialLoadContent = document.getElementById('initialLoadContent');
    const controlsContainer = document.getElementById('controlsContainer');
    const navLinks = document.querySelector('.nav-links');

    loadingOverlay.style.display = 'flex'; // Show loading overlay

    try {
        // Fetch constituency data from the local server
        const constituencyResponse = await fetch('http://localhost:3000/constituenciesData');
        if (!constituencyResponse.ok) {
            throw new Error(`HTTP error fetching constituency data! status: ${constituencyResponse.status}`);
        }
        const constituencyData = await constituencyResponse.json();

        // Store fetched data in global variables
        fullData = constituencyData;
        signaturesByConstituency = constituencyData.signaturesByConstituency || {};
        rawPetitionsData = constituencyData.rawPetitionsData || {};

        // Convert rawPetitionsData from array to an object keyed by petition ID for efficient lookup
        if (Array.isArray(rawPetitionsData)) {
            rawPetitionsData = Object.fromEntries(rawPetitionsData.map(p => [p.id, p]));
        }

        // Fetch topics data from the local server
        const topicsResponse = await fetch('http://localhost:3000/topicsData');
        if (!topicsResponse.ok) {
            throw new Error(`HTTP error fetching topics data! status: ${topicsResponse.status}`);
        }
        petitionTopics = await topicsResponse.json();

        // Once data is loaded, hide the initial load content
        initialLoadContent.style.display = 'none';

        // Enable navigation links
        navLinks.classList.remove('disabled');

        // Show the locality view and its controls
        showView('localityView'); // Use the showView function from viewSwitcher.js
        controlsContainer.style.display = "flex";

        // Populate the constituency selector dropdown
        populateConstituencySelector(Object.keys(signaturesByConstituency));
        // Initially populate topic filter with all topics (before a constituency is selected)
        populateTopicFilter(Object.values(petitionTopics));

    } catch (err) {
        // Display a custom error message box instead of a native alert
        displayMessageBox(`Error loading data from API: ${err.message}. Please ensure the local server is running.`);
        console.error("Error fetching data:", err);
    } finally {
        loadingOverlay.style.display = 'none'; // Hide loading overlay regardless of success or failure
    }
});


/**
 * Populates the constituency selection dropdown with available constituencies.
 * Sets up an event listener for when a constituency is selected.
 * @param {Array<string>} constituencies An array of constituency names.
 */
function populateConstituencySelector(constituencies) {
    const select = document.getElementById("constituencySelect");
    select.innerHTML = `<option disabled selected>Choose a constituency</option>`; // Reset options
    select.style.display = "inline-block"; // Ensure the select is visible

    // Event listener for constituency selection change
    select.addEventListener("change", function() {
        const selectedConstituency = this.value;
        const constituencyData = signaturesByConstituency[selectedConstituency];

        // Filter topics based on the selected constituency's petitions
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
        dataTable.classList.remove("show-details"); // Hide details columns by default
        toggleDetailsBtn.textContent = "📊 Show Details"; // Reset button text

        currentSortColumn = 1; // Default sort by Count (Signatures)
        currentSortDirection = "desc"; // Default sort direction

        populateTable(constituencyData); // Populate the main table
        updateSortIndicator(); // Update sort arrow on header

        // Apply initial sort after population
        const headers = document.querySelectorAll("th[data-sort]");
        if (headers[currentSortColumn]) {
            const sortType = headers[currentSortColumn].getAttribute("data-sort");
            sortTable(currentSortColumn, sortType, currentSortDirection);
        }
    });

    // Populate the dropdown with sorted constituency names
    constituencies.sort().forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

/**
 * Populates the custom topic filter dropdown with unique topics and sets up search functionality.
 * @param {Array<string>} topics An array of topic strings.
 */
function populateTopicFilter(topics) {
    const optionsList = document.getElementById("filterTopicOptions");
    const topicSearchInput = document.getElementById('filterTopicSearch');
    const topicSelectContainer = document.getElementById('topicSelectContainer');
    const customSelectArrow = topicSelectContainer.querySelector('.custom-select-arrow');

    optionsList.innerHTML = `<li data-value="all">Topic: All</li>`; // Reset and add 'All' option
    const uniqueTopics = [...new Set(topics)].sort(); // Get unique and sort them alphabetically

    // Add unique topics to the options list
    uniqueTopics.forEach(topic => {
        if (topic && topic !== 'N/A') { // Avoid adding empty or 'N/A' topics as options
            const li = document.createElement("li");
            li.textContent = topic;
            li.setAttribute("data-value", topic);
            optionsList.appendChild(li);
        }
    });

    // Event listener for input field to filter options based on search text
    topicSearchInput.addEventListener('input', function() {
        const searchText = this.value.toLowerCase();
        Array.from(optionsList.children).forEach(li => {
            // Show options that match search text or are the "All" option
            if (li.textContent.toLowerCase().includes(searchText) || li.dataset.value === 'all') {
                li.style.display = '';
            } else {
                li.style.display = 'none';
            }
        });
        optionsList.style.display = 'block'; // Ensure options are visible when typing
    });

    // Event listener for input field focus to open dropdown and show all options
    topicSearchInput.addEventListener('focus', function() {
        optionsList.style.display = 'block';
        Array.from(optionsList.children).forEach(li => li.style.display = ''); // Show all options
    });

    // Event listener for clicking on an option in the list
    optionsList.addEventListener('click', function(event) {
        if (event.target.tagName === 'LI') {
            topicSearchInput.value = event.target.textContent; // Set input text to selected option
            topicSearchInput.setAttribute('data-selected-value', event.target.dataset.value); // Store the actual value
            optionsList.style.display = 'none'; // Hide options
            applyFilters(); // Apply filters when a topic is selected
        }
    });

    // Toggle dropdown visibility on arrow click (if arrow is visible)
    if (customSelectArrow) { // Check if arrow element exists
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

    // Close dropdown when clicking outside the custom select container
    document.addEventListener('click', function(event) {
        if (!topicSelectContainer.contains(event.target)) {
            optionsList.style.display = 'none';
        }
    });
}

/**
 * Updates the sort indicator (arrow) on the table header based on current sort column and direction.
 */
function updateSortIndicator() {
    const headers = document.querySelectorAll("th[data-sort]");
    headers.forEach(h => h.removeAttribute("data-sort-direction")); // Clear all existing indicators
    if (currentSortColumn >= 0 && currentSortColumn < headers.length && headers[currentSortColumn]) {
        // Set indicator for the currently sorted column
        headers[currentSortColumn].setAttribute("data-sort-direction", currentSortDirection);
    }
}

// Event listener for the "Toggle Details" button
document.getElementById("toggleDetailsBtn").addEventListener("click", function() {
    const table = document.getElementById("dataTable");
    const showing = table.classList.toggle("show-details"); // Toggle the 'show-details' class on the table
    this.textContent = showing ? "📊 Hide Details" : "📊 Show Details"; // Update button text
});

/**
 * Sets up click event listeners for all sortable table headers.
 */
function setupSortableColumns() {
    const headers = document.querySelectorAll("th[data-sort]");
    headers.forEach((header, index) => {
        header.addEventListener("click", function() {
            const sortType = this.getAttribute("data-sort"); // Get the sort type (text, number, date, salience)
            if (currentSortColumn === index) {
                // If clicking the same column, toggle sort direction
                currentSortDirection = currentSortDirection === "desc" ? "asc" : "desc";
            } else {
                // If clicking a new column, set it as current and default to descending
                currentSortColumn = index;
                currentSortDirection = "desc";
            }
            updateSortIndicator(); // Update the visual sort indicator
            sortTable(index, sortType, currentSortDirection); // Perform the sort
        });
    });
}

/**
 * Sorts the table rows based on the specified column, sort type, and direction.
 * @param {number} columnIndex The index of the column to sort by (based on headerCellIndexMap).
 * @param {string} sortType The type of data to sort (e.g., "number", "text", "date", "salience").
 * @param {string} direction The sort direction ("asc" or "desc").
 */
function sortTable(columnIndex, sortType, direction) {
    const tbody = document.querySelector("#dataTable tbody");
    // Get all main rows, excluding the expanded detail rows
    const rows = Array.from(tbody.querySelectorAll("tr:not(.petition-details-row)"));
    const actualCellIndex = headerCellIndexMap[columnIndex]; // Get the actual cell index from the map

    if (actualCellIndex === undefined) {
        console.error("Invalid columnIndex for sorting:", columnIndex);
        return;
    }

    rows.sort((rowA, rowB) => {
        const cellA = rowA.cells[actualCellIndex];
        const cellB = rowB.cells[actualCellIndex];
        if (!cellA || !cellB) return 0; // Handle cases where cells might be missing

        let valueA, valueB;
        if (sortType === "date") {
            // For date sorting, use the 'data-value' attribute which stores the ISO date string
            valueA = new Date(cellA.getAttribute("data-value") || 0);
            valueB = new Date(cellB.getAttribute("data-value") || 0);
        } else if (sortType === "salience") {
            // For salience category, sort by the underlying numerical salience value
            valueA = parseFloat(cellA.getAttribute("data-salience")) || 0;
            valueB = parseFloat(cellB.getAttribute("data-salience")) || 0;
        } else {
            // For number and text sorts, use 'data-value' if present, otherwise textContent
            valueA = cellA.hasAttribute("data-value") ? cellA.getAttribute("data-value") : cellA.textContent.trim();
            valueB = cellB.hasAttribute("data-value") ? cellB.getAttribute("data-value") : cellB.textContent.trim();
        }

        let comparison = 0;
        if (sortType === "number") {
            // Convert to number, removing commas for correct parsing
            const numA = parseFloat(String(valueA).replace(/[,]+/g, "")) || 0;
            const numB = parseFloat(String(valueB).replace(/[,]+/g, "")) || 0;
            comparison = numA < numB ? -1 : (numA > numB ? 1 : 0);
        } else if (sortType === "date") {
            comparison = valueA.getTime() < valueB.getTime() ? -1 : (valueA.getTime() > valueB.getTime() ? 1 : 0);
        } else if (sortType === "salience") {
            comparison = valueA < valueB ? -1 : (valueA > valueB ? 1 : 0);
        } else {
            // Default to locale-aware string comparison for text
            comparison = String(valueA).localeCompare(String(valueB));
        }

        return direction === "asc" ? comparison : -comparison; // Apply sort direction
    });

    // Re-append rows to the tbody in the new sorted order,
    // ensuring each main row is followed by its associated detail row.
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

/**
 * Applies all active filters to the table rows, hiding rows that don't match.
 * Also hides any open detail rows when filters are applied.
 */
function applyFilters() {
    const nameFilter = document.getElementById('filterName').value.toLowerCase();
    const minSignatures = parseInt(document.getElementById('filterSignatures').value) || 0;
    const createdAfterDate = document.getElementById('filterCreatedDate').value; //YYYY-MM-DD format
    const salienceCategoryFilter = document.getElementById('filterSalienceCategory').value; // 'all', 'more', 'about', 'less'
    const writtenResponseFilter = document.getElementById('filterWrittenResponse').value; // 'all', 'yes', 'no'
    const debatedFilter = document.getElementById('filterDebated').value; // 'all', 'yes', 'no'
    // Get the selected topic value from the custom dropdown's data-selected-value attribute
    const topicFilter = document.getElementById('filterTopicSearch').getAttribute('data-selected-value') || 'all';

    const tbody = document.querySelector("#dataTable tbody");
    const rows = Array.from(tbody.querySelectorAll("tr:not(.petition-details-row)")); // Get main rows

    rows.forEach(row => {
        let display = true; // Assume row should be displayed unless a filter hides it

        // Filter by petition name (cell index 0)
        const petitionCell = row.cells[0];
        const petitionName = petitionCell ? petitionCell.querySelector('a')?.textContent.toLowerCase() : '';
        if (nameFilter && !petitionName.includes(nameFilter)) {
            display = false;
        }

        // Filter by minimum signatures (cell index 1)
        const countCell = row.cells[1];
        const signatureCount = parseInt(countCell?.textContent.replace(/,/g, '')) || 0;
        if (signatureCount < minSignatures) {
            display = false;
        }

        // Filter by created date (cell index 9)
        const createdDateCell = row.cells[9];
        const rawCreatedDate = createdDateCell ? createdDateCell.getAttribute("data-value") : null; // Get raw ISO date
        if (createdAfterDate && rawCreatedDate) {
            if (rawCreatedDate < createdAfterDate) { // Direct string comparison works for ISO-MM-DD
                display = false;
            }
        } else if (createdAfterDate && !rawCreatedDate) {
            display = false; // If filter is active but no date data, hide
        }

        // Filter by salience category (cell index 2)
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

        // Filter by topic (cell index 4)
        const topicCell = row.cells[4];
        // Remove the "(AI-generated, may not be accurate)" note before comparison
        const petitionTopic = topicCell ? topicCell.textContent.replace(/\s*\(AI-generated, may not be accurate\)/, '') : '';
        if (topicFilter !== 'all' && petitionTopic !== topicFilter) {
            display = false;
        }

        row.style.display = display ? '' : 'none'; // Set display style for the main row

        // Also hide the associated detail row if the main row is hidden or filters are applied
        const detailRowId = row.dataset.detailRowId;
        if (detailRowId) {
            const detailRow = document.getElementById(detailRowId);
            if (detailRow) {
                detailRow.style.display = 'none'; // Always hide details initially when filters are applied
                // Reset the "Show Info" button text if its detail row is hidden
                const detailsButton = row.querySelector('.show-info-btn');
                if (detailsButton) {
                    detailsButton.textContent = 'Show Info';
                }
            }
        }
    });
}

/**
 * Formats an ISO date string into a UK-friendly date format (e.g., "1 January 2023").
 * @param {string} isoDateString The date string in ISO format (e.g., "YYYY-MM-DDTHH:mm:ssZ").
 * @returns {string} The formatted date string, or 'N/A' if invalid.
 */
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
 * Retrieves full petition details from the rawPetitionsData global object.
 * @param {string} petitionId The ID of the petition.
 * @returns {object|null} The petition details object, or null if not found.
 */
function getPetitionDetails(petitionId) {
    return rawPetitionsData[petitionId] || null;
}

/**
 * Retrieves the total UK signature count for a given petition ID.
 * @param {string} petitionId The ID of the petition.
 * @returns {number|null} The UK total signature count, or null if not found.
 */
function getUKTotal(petitionId) {
    return rawPetitionsData[petitionId]?.attributes?.signature_count || null;
}

/**
 * Determines the salience category (more, about, less salient) and associated CSS class
 * based on the calculated salience value.
 * @param {number} salience The calculated salience value (actual_proportion / expected_proportion).
 * @returns {{text: string, class: string}} An object with the category text and CSS class.
 */
function getSalienceCategory(salience) {
    if (salience > 1.01) { // A small buffer for "more salient"
        return { text: "more salient", class: "more-salient" };
    } else if (Math.abs(salience - 1.0) < 0.01) { // Approximately equal to 1, with a small buffer
        return { text: "about as salient", class: "about-salient" };
    } else {
        return { text: "less salient", class: "less-salient" };
    }
}

/**
 * Populates the main data table with petition information for the selected constituency.
 * Creates main rows and hidden detail rows for each petition.
 * @param {object} data The petition data for the selected constituency.
 */
function populateTable(data) {
    const tbody = document.querySelector("#dataTable tbody");
    tbody.innerHTML = ""; // Clear existing table rows
    currentDisplayed = []; // Reset currently displayed data for export

    if (!data || typeof data !== 'object') {
        console.warn("No data provided to populateTable or data is not an object.");
        return;
    }

    // Sort petitions by count in descending order by default
    const sortedEntries = Object.entries(data).sort(([, a], [, b]) => b.count - a.count);
    let detailRowCounter = 0; // Used to create unique IDs for detail rows

    sortedEntries.forEach(([petitionName, details]) => {
        const row = document.createElement("tr");
        const petitionId = details.id;
        const petitionDetails = getPetitionDetails(petitionId); // Get full petition details
        const petitionTopic = petitionTopics[petitionId] || 'N/A'; // Get the topic from the fetched topics data
        const createdDateISO = petitionDetails?.attributes?.created_at; // ISO date for created_at
        const formattedCreatedDate = formatDateUK(createdDateISO); // Formatted date for display
        const detailRowId = `details-row-${petitionId}-${detailRowCounter++}`; // Unique ID for the detail row
        row.dataset.detailRowId = detailRowId; // Link main row to its detail row

        // Petition Name cell (Column 0)
        const petitionCell = document.createElement("td");
        const link = document.createElement("a");
        link.href = `https://petition.parliament.uk/petitions/${petitionId}`;
        link.textContent = petitionName;
        link.target = "_blank"; // Open link in new tab
        link.rel = "noopener noreferrer"; // Security best practice for target="_blank"
        petitionCell.appendChild(link);
        row.appendChild(petitionCell);

        // Signatures (Count) cell (Column 1)
        const countCell = document.createElement("td");
        countCell.textContent = details.count.toLocaleString("en-UK"); // Format with commas
        row.appendChild(countCell);

        // Calculate salience ratio
        const ukTotal = getUKTotal(petitionId);
        const expectedProportion = 1 / 650; // Assuming 650 constituencies
        const actualProportion = ukTotal > 0 ? (details.count / ukTotal) : 0;
        const salience = ukTotal > 0 ? (actualProportion / expectedProportion) : 0;
        const formattedSalience = salience.toFixed(2); // Format to 2 decimal places

        // Local Salience Category cell (Column 2)
        const salienceInfo = getSalienceCategory(salience);
        const salienceCategoryCell = document.createElement("td");
        salienceCategoryCell.className = `salience-category-cell ${salienceInfo.class}`;
        salienceCategoryCell.textContent = salienceInfo.text;
        salienceCategoryCell.setAttribute("data-salience", salience); // Store actual salience for sorting
        row.appendChild(salienceCategoryCell);

        // Actual:Expected Salience Ratio cell (Column 3)
        const salienceRatioCell = document.createElement("td");
        salienceRatioCell.className = "salience-ratio-cell"; // New class for styling
        salienceRatioCell.textContent = formattedSalience;
        salienceRatioCell.setAttribute("data-value", salience); // Store for sorting if needed
        row.appendChild(salienceRatioCell);

        // Topic cell (Column 4) - NEW
        const topicCell = document.createElement("td");
        topicCell.className = "uk-wide-info-col topic-col"; // Add the topic-col class
        // Add a note if the topic is AI-generated
        topicCell.textContent = petitionTopic !== 'N/A' ? `${petitionTopic} (AI-generated, may not be accurate)` : 'N/A';
        row.appendChild(topicCell);

        // UK Total signatures cell (Column 5)
        const ukTotalCell = document.createElement("td");
        ukTotalCell.className = "uk-wide-info-col";
        ukTotalCell.textContent = ukTotal ? ukTotal.toLocaleString("en-UK") : "N/A";
        ukTotalCell.setAttribute("data-value", ukTotal || 0); // Store numerical value for sorting
        row.appendChild(ukTotalCell);

        // State cell (Column 6)
        const stateCell = document.createElement("td");
        stateCell.className = "uk-wide-info-col";
        stateCell.textContent = petitionDetails?.attributes?.state || "N/A";
        row.appendChild(stateCell);

        // Written response? cell (Column 7)
        const writtenResponseCell = document.createElement("td");
        writtenResponseCell.className = "response-cell";
        const hasWrittenResponse = petitionDetails?.attributes?.government_response ? '✓' : '✗';
        writtenResponseCell.textContent = hasWrittenResponse;
        row.appendChild(writtenResponseCell);

        // Debated? cell (Column 8)
        const debatedCell = document.createElement("td");
        debatedCell.className = "response-cell";
        const hasDebate = petitionDetails?.attributes?.debate ? '✓' : '✗';
        debatedCell.textContent = hasDebate;
        row.appendChild(debatedCell);

        // 'Created' date cell (Column 9)
        const createdCell = document.createElement("td");
        createdCell.className = "details-cell";
        createdCell.textContent = formattedCreatedDate;
        createdCell.setAttribute("data-value", createdDateISO || ''); // Store ISO for sorting
        row.appendChild(createdCell);

        // Details button cell (Column 10)
        const detailsButtonCell = document.createElement("td");
        detailsButtonCell.className = "details-cell";
        const detailsButton = document.createElement("button");
        detailsButton.textContent = "Show Info";
        detailsButton.classList.add("show-info-btn");
        detailsButtonCell.appendChild(detailsButton);
        row.appendChild(detailsButtonCell);

        tbody.appendChild(row); // Append the main row to the table body

        // Create the hidden details row for expanded information
        const detailsRow = document.createElement("tr");
        detailsRow.id = detailRowId; // Assign the unique ID
        detailsRow.classList.add("petition-details-row");
        detailsRow.style.display = 'none'; // Initially hidden

        const detailsContentCell = document.createElement("td");
        // Colspan should cover all visible columns in the table
        detailsContentCell.colSpan = 11; // Adjusted colspan to cover all 11 columns
        detailsContentCell.classList.add("petition-details-grid-container"); // New class for grid layout

        // --- Box One: Petition Details (Left column on desktop) ---
        let petitionInfoHTML = `<div class="detail-box"><strong>Petition Details</strong>`;
        // Helper function to add detail items to the HTML string
        const addPetitionDetail = (label, value, formatFn = null) => {
            if (value) {
                // Replace double newlines with <br><br> for proper paragraph breaks in HTML
                const formattedValue = formatFn ? formatFn(value) : value;
                petitionInfoHTML += `<div class="detail-item"><strong>${label}:</strong> <p>${formattedValue}</p></div>`;
            }
        };
        addPetitionDetail('Action', petitionDetails?.attributes?.action);
        addPetitionDetail('Background', petitionDetails?.attributes?.background, (c) => c?.replaceAll("\r\n\r\n", "<br><br>"));
        addPetitionDetail('Additional Details', petitionDetails?.attributes?.additional_details, (c) => c?.replaceAll("\r\n\r\n", "<br><br>"));
        addPetitionDetail('Creator', petitionDetails?.attributes?.creator_name);
        addPetitionDetail('Petition Type', petitionDetails?.attributes?.petition_type);
        addPetitionDetail('Opened', petitionDetails?.attributes?.opening_at, formatDateUK);
        addPetitionDetail('Closed', petitionDetails?.attributes?.closing_at, formatDateUK);
        petitionInfoHTML += `</div>`; // Close petition-details box

        // --- Box Two: Response & Debate (Right column on desktop) ---
        let responseInfoHTML = `<div class="detail-box"><strong>Response & Debate</strong>`;
        const addResponseDetail = (label, value, formatFn = null) => {
            if (value) {
                const formattedValue = formatFn ? formatFn(value) : value;
                responseInfoHTML += `<div class="detail-item"><strong>${label}:</strong> <p>${formattedValue}</p></div>`;
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
            // Helper to add links with target="_blank"
            const addLink = (label, url, text) => {
                if (url) { // Only add if URL is truthy
                    responseInfoHTML += `<div class="detail-item"><strong>${label}:</strong> <p><a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a></p></div>`;
                }
            };
            addLink('Transcript', debateInfo.transcript_url, 'Transcript');
            addLink('Video', debateInfo.video_url, 'Video');
            addLink('Debate Pack', debateInfo.debate_pack_url, 'Debate Pack');
        }
        responseInfoHTML += `</div>`; // Close response-debate box

        // --- Box Three: Missing Information / Rejection / Departments / Topics (Full width on desktop) ---
        let missingInfoHTML = `<div class="missing-info-box"><strong>Additional Information & Missing Fields</strong>`;
        const missingFields = []; // Array to collect names of missing fields

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

        // Add rejection information if available, otherwise mark as missing
        if (petitionDetails?.attributes?.rejection) {
            const rejection = petitionDetails.attributes.rejection;
            missingInfoHTML += `<div class="detail-item"><strong>Rejection Code:</strong> <p>${rejection.code}</p></div>`;
            missingInfoHTML += `<div class="detail-item"><strong>Rejection Details:</strong> <p>${rejection.details}</p></div>`;
        } else {
            missingFields.push('Rejection Info');
        }

        // Add departments if available, otherwise mark as missing
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
            missingInfoHTML += `<div class="detail-item"><strong>Topic:</strong> <p>${petitionTopic} <small>(AI-generated, may not be accurate)</small></p></div>`; // Added AI-generated note
        } else if (petitionDetails?.attributes?.topics && petitionDetails.attributes.topics.length > 0) {
            missingInfoHTML += `<strong>Topics (from petition data):</strong> <ul>`;
            petitionDetails.attributes.topics.forEach(topic => {
                missingInfoHTML += `<li>${topic}</li>`;
            });
            missingInfoHTML += `</ul>`;
        } else {
            missingFields.push('Topic');
        }

        // Display the list of missing fields if any
        if (missingFields.length > 0) {
            missingInfoHTML += `<div class="missing-fields-list"><strong>Missing Fields:</strong> <span>${missingFields.join(', ')}</span></div>`;
        }
        missingInfoHTML += `</div>`; // Close missing-info-box

        // Combine all detail boxes into the content cell
        detailsContentCell.innerHTML = petitionInfoHTML + responseInfoHTML + missingInfoHTML;
        detailsRow.appendChild(detailsContentCell);
        tbody.appendChild(detailsRow); // Append the detail row to the table body

        // Event listener for the details button to toggle visibility of the detail row
        detailsButton.addEventListener('click', function() {
            const isHidden = detailsRow.style.display === 'none';
            detailsRow.style.display = isHidden ? '' : 'none'; // Toggle display
            this.textContent = isHidden ? 'Hide Info' : 'Show Info'; // Update button text
        });

        // Store data for the current row in currentDisplayed for CSV export
        currentDisplayed.push({
            petition: petitionName,
            count: details.count,
            created: createdDateISO, // Store ISO for export
            salience: formattedSalience, // Store the raw formatted salience for CSV
            ukTotal: ukTotal,
            state: petitionDetails?.attributes?.state || null,
            hasWrittenResponse: petitionDetails?.attributes?.government_response ? true : false,
            hasDebate: petitionDetails?.attributes?.debate ? true : false,
            topic: petitionTopic // Add topic for export
        });
    });

    // Apply filters after populating the table to ensure initial display is correct
    applyFilters();
}

// Initial setup for sortable columns when the script loads
setupSortableColumns();

// Event listeners for filter controls to trigger applyFilters on change/input
document.getElementById('filterName').addEventListener('input', applyFilters);
document.getElementById('filterSignatures').addEventListener('input', applyFilters);
document.getElementById('filterCreatedDate').addEventListener('change', applyFilters);
document.getElementById('filterSalienceCategory').addEventListener('change', applyFilters);
document.getElementById('filterWrittenResponse').addEventListener('change', applyFilters);
document.getElementById('filterDebated').addEventListener('change', applyFilters);
// The topic filter already calls applyFilters on selection within populateTopicFilter