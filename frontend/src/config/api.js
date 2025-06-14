// API configuration for different environments
const config = {
    development: {
        API_BASE_URL: 'http://localhost:8080',
        SOCKET_URL: 'http://localhost:8080'
    },
    production: {
        API_BASE_URL: 'https://langur-burja-backend.vercel.app',
        SOCKET_URL: 'https://langur-burja-backend.vercel.app'
    }
};

const environment = process.env.NODE_ENV || 'development';
export const API_CONFIG = config[environment];

export default API_CONFIG;