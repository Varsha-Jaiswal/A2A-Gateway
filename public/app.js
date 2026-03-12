document.addEventListener('DOMContentLoaded', () => {
    const urlDisplay = document.getElementById('api-url-display');
    const docsUrlDisplay = document.getElementById('docs-url-display');
    
    if (urlDisplay && docsUrlDisplay) {
        // Use dynamically injected local URL during testing, otherwise fallback to prod
        const backendUrl = window.ENV?.BACKEND_URL || 'https://agent.3-a.vc';
        
        // Only update the display if we are running locally to help with testing
        if (backendUrl.includes('localhost')) {
            urlDisplay.textContent = backendUrl + '/api/submissions';
            docsUrlDisplay.textContent = backendUrl + '/api-json';
        }
    }
});
