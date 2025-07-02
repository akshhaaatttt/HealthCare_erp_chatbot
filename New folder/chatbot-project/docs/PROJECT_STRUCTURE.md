# Healthcare ERP Chatbot - Clean Production Version

## 📁 Project Structure

```
chatbot-project/
├── .env                    # Environment variables (API keys, URLs)
├── .env.example           # Example environment file
├── package.json           # Node.js dependencies
├── README.md             # Main project documentation
├── public/               # Web interface files
│   └── index.html        # Chatbot web UI
├── src/                  # Source code
│   ├── bot.js           # Main chatbot application
│   ├── config/          # Configuration files
│   │   └── config.js    # Environment configuration
│   └── services/        # API services
│       └── healthcareAPI.js  # Healthcare API integration
└── docs/                # Documentation
    └── PROJECT_STRUCTURE.md  # This file
```

## 🚀 Features

### ✅ Working Features:
- **Appointment Booking**: Complete flow without report sharing complications
- **Medical Records**: View patient history, reports, lab tests
- **Prescriptions**: View and download prescription PDFs
- **Lab Tests**: View test results and details
- **Report Sharing**: Standalone functionality (outside appointment booking)
- **Dashboard**: Patient and doctor dashboards
- **Authentication**: Real API integration with session management

### ❌ Removed Features:
- Report sharing during appointment booking (caused API auth issues)
- Unused boilerplate code (handlers, models, utils)
- Test files and debug scripts
- Mock data and NLP processing files

## 🔧 Technical Details

### Core Files:
- **`src/bot.js`**: Main chatbot logic, Express server, route handlers
- **`src/services/healthcareAPI.js`**: Real API integration, authentication, data fetching
- **`src/config/config.js`**: Environment variables and configuration
- **`public/index.html`**: Web interface for the chatbot

### Dependencies:
- Express.js for web server
- Axios for API calls
- Moment.js for date/time handling
- CORS for cross-origin requests
- Body-parser for request handling

## 🌐 Usage

1. **Start the server**: `node src/bot.js`
2. **Access web interface**: http://localhost:3000
3. **API endpoint**: http://localhost:3000/chat
4. **Health check**: http://localhost:3000/health

## 🎯 Clean Architecture

This version focuses on:
- **Simplicity**: Only essential files
- **Reliability**: No experimental features
- **Production-ready**: Real API integration
- **Maintainable**: Clear, focused codebase
- **Working**: All features tested and functional

## 📋 Recent Changes

- ✅ Removed report sharing from appointment booking flow
- ✅ Cleaned up unused files and directories
- ✅ Streamlined project structure
- ✅ Fixed API authentication issues
- ✅ Maintained all working functionality
