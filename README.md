# Music Generation Web App (Frontend)

This is a web application built with React Native and Expo. It serves as the user interface for a music generation tool, allowing users to describe a song with text prompts and/or upload a base audio track. This information is then sent to a backend API for processing.

## Features

-   **Intuitive UI**: A clean, two-panel layout for song creation and library management.
-   **Text-Based Prompts**: Describe the desired song using free text.
-   **Prompt Word Suggestions**: Clickable tags to easily add common keywords to your description.
-   **Audio File Upload**: Upload an audio file (e.g., `.mp3`) as a base for music generation.
-   **API Integration**: Communicates with a Django backend via Axios, handling CSRF tokens automatically.
-   **Song Library**: Displays a list of songs returned by the backend.

## Prerequisites

-   [Node.js](https://nodejs.org/) (LTS version, e.g., 18.x or later)
-   npm (comes with Node.js)
-   [Expo CLI](https://docs.expo.dev/get-started/installation/)

## Setup and Installation

1.  **Clone the repository:**

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in development mode using the Expo CLI. This will open a terminal interface where you can choose how to run the app.

### `npm run web`

A convenient shortcut for `expo start --web`. It starts the development server and automatically opens the app in your default web browser.

This is the primary way to run the application for web development.

### `npm run android` / `npm run ios`

(For native development) Runs the app on a connected Android device/emulator or iOS simulator. This requires additional setup, such as [Android Studio](https://developer.android.com/studio) or [Xcode](https://developer.apple.com/xcode/).

## Connecting to the Backend

This frontend application is designed to communicate with a backend server.
-   It expects the backend API to be running at **`http://localhost:8000`**.
-   Please ensure you have the backend server set up and running

## Technologies Used

-   React & React Native
-   Expo
-   Axios
