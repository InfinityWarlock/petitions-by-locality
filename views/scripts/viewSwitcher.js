/**
 * Shows the specified content view and hides all others.
 * Updates the active class on navigation links.
 * @param {string} viewId The ID of the view to show (e.g., 'localityView', 'topicView', 'aboutView').
 */
function showView(viewId) {
    // Hide all content views by removing the 'active' class and setting display to 'none'
    document.querySelectorAll('.content-view').forEach(view => {
        view.classList.remove('active');
        view.style.display = 'none';
    });

    // Show the selected content view by adding the 'active' class and setting display to 'block'
    const activeView = document.getElementById(viewId);
    if (activeView) {
        activeView.classList.add('active');
        activeView.style.display = 'block';
    }

    // Update active class on navigation links to highlight the current page
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.dataset.view === viewId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

/**
 * Displays a custom message box with an OK button. This is a general utility function
 * that can be used across different views for user feedback.
 * @param {string} message The message to display inside the box.
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
    // Add event listener to remove the message box when OK is clicked
    messageBox.querySelector('button').addEventListener('click', () => {
        document.body.removeChild(messageBox);
    });
}


// Event listener for DOMContentLoaded to set up initial view state
document.addEventListener('DOMContentLoaded', () => {
    // Hide all content views initially (localityView, topicView, aboutView)
    document.querySelectorAll('.content-view').forEach(view => {
        view.style.display = 'none';
    });

    // Show only the initial load content (the large "Load Petition Data" button)
    const initialLoadContent = document.getElementById('initialLoadContent');
    if (initialLoadContent) {
        initialLoadContent.style.display = 'flex';
    }

    // Disable navigation links initially so user must click "Load Data" first
    const navLinksContainer = document.querySelector('.nav-links');
    if (navLinksContainer) {
        navLinksContainer.classList.add('disabled');
    }

    // Add event listeners to all navigation links.
    // The actual enabling/disabling of clicks is handled by the CSS class 'disabled'
    // and the check within the click handler itself.
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default link behavior (page reload)
            // Only allow view switching if navigation is NOT disabled
            if (!document.querySelector('.nav-links').classList.contains('disabled')) {
                const viewId = this.dataset.view; // Get the target view ID from data-view attribute
                showView(viewId); // Call the function to switch views
            }
        });
    });
});
