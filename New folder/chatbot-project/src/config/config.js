require('dotenv').config();

const config = {
    // Server Configuration
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Database Configuration
    DB_URI: process.env.DB_URI || 'mongodb://localhost:27017/health_erp_chatbot',
    DB_NAME: process.env.DB_NAME || 'health_erp_chatbot',
    
    // Your Custom Healthcare API
    HEALTH_API_KEY: process.env.HEALTH_API_KEY,
    HEALTH_API_URL: process.env.HEALTH_API_URL,
    HEALTH_API_TOKEN: process.env.HEALTH_API_TOKEN,
    
    // Your Healthcare API Endpoints
    HOSPITAL_API_URL: process.env.HOSPITAL_API_URL,
    LAB_API_URL: process.env.LAB_API_URL,
    PHARMACY_API_URL: process.env.PHARMACY_API_URL,
    APPOINTMENT_API_URL: process.env.APPOINTMENT_API_URL,
    PRESCRIPTION_API_URL: process.env.PRESCRIPTION_API_URL,
    PATIENT_API_URL: process.env.PATIENT_API_URL,
    DOCTOR_API_URL: process.env.DOCTOR_API_URL,
    
    // API Authentication
    API_AUTH_TYPE: process.env.API_AUTH_TYPE || 'bearer',
    API_USERNAME: process.env.API_USERNAME,
    API_PASSWORD: process.env.API_PASSWORD,
    
    // Other configurations...
    JWT_SECRET: process.env.JWT_SECRET || 'default_secret_change_in_production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    
    // Security
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    
    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_FILE: process.env.LOG_FILE || 'logs/health_chatbot.log',
    
    // File Upload
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5242880,
    ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'application/pdf'],
    
    // Notification Settings
    ENABLE_SMS_NOTIFICATIONS: process.env.ENABLE_SMS_NOTIFICATIONS === 'true',
    ENABLE_EMAIL_NOTIFICATIONS: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
    ENABLE_PUSH_NOTIFICATIONS: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true'
};

module.exports = config;