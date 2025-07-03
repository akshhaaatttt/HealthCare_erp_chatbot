# Test Documentation

## Overview
This document describes the test structure and files for the Healthcare ERP Chatbot project.

## Test Files

### 1. `api_test_suite.js`
**Purpose**: Comprehensive API testing suite
**Features**:
- Tests API connection and authentication
- Tests patient and doctor login functionality
- Validates data retrieval (doctors, appointments, prescriptions, lab tests)
- Tests appointment booking functionality
- Tests error handling scenarios
- Uses credentials from `.env` file

**Usage**:
```bash
node api_test_suite.js
```

### 2. `chatbot_login_test.js`
**Purpose**: Full chatbot login flow testing with patient credentials
**Features**:
- Authenticates patient using `.env` credentials
- Simulates complete chatbot conversation
- Tests appointment booking through chatbot
- Tests medical records retrieval
- Tests calendar and reminder features
- Validates session management

**Usage**:
```bash
node chatbot_login_test.js
```

### 3. `login_example.js`
**Purpose**: Login usage examples and demonstrations
**Features**:
- Shows how to use patient and doctor authentication
- Provides code examples for integration
- Demonstrates proper API usage patterns
- Uses actual credentials from `.env` for examples

**Usage**:
```bash
node login_example.js
```

## Environment Configuration

All test files use credentials from the `.env` file:

```env
# Test Patient Credentials
TEST_PATIENT_EMAIL=harshtiwari1303@gmail.com
TEST_PATIENT_PASSWORD=harsh321
TEST_PATIENT_ID=12

# Test Doctor Credentials
TEST_DOCTOR_EMAIL=akshatjain1507@gmail.com
TEST_DOCTOR_PASSWORD=Akshat@123
TEST_DOCTOR_ID=4

# API Configuration
HEALTH_API_KEY=w2V34VNVAGUV23xzuzkGds4dHaw2z6CJ1AhtX955QUo
HEALTH_API_URL=http://10.11.28.161:5000/api
```

## Test Execution

To run all tests:

1. **API Tests**: `node api_test_suite.js`
2. **Chatbot Tests**: `node chatbot_login_test.js`
3. **Login Examples**: `node login_example.js`

## Test Coverage

- ✅ API connectivity and authentication
- ✅ Patient login and session management
- ✅ Doctor login and session management
- ✅ Data retrieval from all endpoints
- ✅ Appointment booking functionality
- ✅ Chatbot conversation flow
- ✅ Error handling and edge cases
- ✅ Environment-based configuration

## Notes

- All test files are configured to use `.env` credentials
- Tests provide detailed console output with colored status indicators
- Failed tests include error details for debugging
- All tests are independent and can be run separately
