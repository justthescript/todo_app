// API Configuration
// This file determines which backend API URL to use based on the environment

const CONFIG = {
  // Development: Running locally
  development: {
    API_URL: 'https://todo-app-backend-sa96.onrender.com'
  },

  // Production: Frontend on GitHub Pages, Backend on Render
  production: {
    // Replace this with your actual Render backend URL after deployment
    API_URL: 'https://your-app-name.onrender.com/api'
  }
};

// Auto-detect environment
// If running on localhost, use development config
// Otherwise, use production config
function getAPIUrl() {
  const isLocalhost = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname === '';

  return isLocalhost ? CONFIG.development.API_URL : CONFIG.production.API_URL;
}

// Export the API URL
const API_URL = getAPIUrl();
