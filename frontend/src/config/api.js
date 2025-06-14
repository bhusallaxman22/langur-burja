// API configuration for different environments
const config = {
    development: {
        API_BASE_URL: 'http://localhost:8080',
        SOCKET_URL: 'http://localhost:8080'
    },
    production: {
        // When served from the same domain, use relative URLs
        API_BASE_URL: '',
        SOCKET_URL: ''
    }
};

const environment = process.env.NODE_ENV || 'development';
export const API_CONFIG = config[environment];

console.log(`API Config loaded for ${environment}:`, API_CONFIG);

export default API_CONFIG;