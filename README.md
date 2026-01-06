# NoteTake Application

A professional, responsive note-taking application engineered with Vanilla JavaScript, TailwindCSS, and Firebase. This project integrates Google Gemini AI for advanced content generation and summarization capabilities.

## Key Features

- **Authentication**: Secure user management utilizing Firebase Authentication (Email/Password).
- **Real-time Database**: Instant data synchronization across custom sessions using Cloud Firestore.
- **AI Integration**: Built-in support for Google Gemini to summarize notes and generate content via intelligent prompting.
- **Markdown Support**: Full rendering of Markdown syntax for rich text formatting.
- **Responsive Interface**: A mobile-first design system implemented with TailwindCSS.

## Project Architecture

The application follows a modular structure to separate concerns effectively:

### Core Logic (`/js`)

- **`app.js`**: Implementation of core application workflows, including state management and CRUD operations.
- **`ui.js`**: Manages DOM manipulations and view transitions, isolating presentation logic from data handling.
- **`firebase-init.js`**: Centralized configuration for initializing Firebase Authentication and Firestore services.
- **`gemini.js`**: Specialized module for interacting with the Google Generative AI API.
- **`config.js`**: Contains environment-specific configurations and API keys.
- **`textFormatter.js`**: Utilities for parsing and rendering Markdown content.

### Styling (`/css`)

- **`styles.css`**: Custom CSS overrides and design tokens extending the TailwindCSS framework.

### Entry Point

- **`index.html`**: The main entry point acting as the container for the Single Page Application (SPA) views.

## Installation and Setup

### Prerequisites

1.  A Firebase project with Authentication and Firestore enabled.
2.  A Google Gemini API Key.
3.  A modern web browser.

### Configuration

1.  **Repository Setup**
    Clone the repository to your local machine.

2.  **Environment Configuration**
    Navigate to `js/config.js` and update the `window.__firebase_config` object with your Firebase project credentials.

3.  **Security Rules**
    Ensure your Firestore Database Rules are configured to allow read/write access for authenticated users.

4.  **Running the Application**
    Serve the project using a local development server (e.g., Live Server) to ensure proper module loading and avoid CORS restrictions.
