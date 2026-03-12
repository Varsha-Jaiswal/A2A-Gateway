document.addEventListener('DOMContentLoaded', () => {
    const urlDisplay = document.getElementById('api-url-display');
    const docsUrlDisplay = document.getElementById('docs-url-display');
    
    if (urlDisplay && docsUrlDisplay) {
        // trust the dynamic env or fallback to current origin
        const backendUrl = window.ENV?.BACKEND_URL || window.location.origin;
        const swaggerUrlDisplay = document.getElementById('swagger-url-display');
        
        urlDisplay.textContent = backendUrl;
        urlDisplay.href = backendUrl;

        docsUrlDisplay.textContent = backendUrl + '/api-json';
        docsUrlDisplay.href = backendUrl + '/api-json';

        if (swaggerUrlDisplay) {
            swaggerUrlDisplay.textContent = backendUrl + '/api-docs';
            swaggerUrlDisplay.href = backendUrl + '/api-docs';
        }
    }
});
