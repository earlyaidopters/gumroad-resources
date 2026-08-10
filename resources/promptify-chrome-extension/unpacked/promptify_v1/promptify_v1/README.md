# Prompt-ify Chrome Extension (v1.0)

Prompt-ify is a Manifest V3 Chrome extension designed to help you optimise plain-language ideas into production-ready prompts for various low-code web-app builders and AI platforms.

## Features

- **Icon Injection**: Injects a purple pencil icon next to primary input fields on supported sites.
- **Overlay UI**: Clicking the icon opens an overlay to:
    - Enter your OpenAI API Key (persisted securely).
    - Select the target AI Model (GPT-4o, GPT-4 Turbo).
    - Choose the target Platform (Lovable, Bolt, Replit, Generic).
    - Edit the pre-populated System Prompt.
    - Input your rough idea (pre-filled from the current textbox).
- **OpenAI Integration**: Sends your refined request to the OpenAI API.
- **Automatic Text Replacement**: Replaces the content of the original input field with the AI-generated prompt.
- **Undo Support**: Attempts to allow native undo (Cmd/Ctrl-Z) for text replacement.
- **Customizable Templates**: System prompts are loaded from `prompt_templates.json` and can be edited (edits are saved for stretch goal).
- **Debounced Scanning**: Periodically scans the page for new input fields on SPA sites.

## Supported Sites

- `https://lovable.dev/*`
- `https://bolt.new/*`
- `https://replit.com/*`

## Tech Stack

- Manifest V3
- Vanilla JavaScript (Zero external JS libraries)
- CSS for styling
- `chrome.storage.sync` for API key and template persistence.
- Background service worker for OpenAI API calls.

## Installation (for local development)

1.  **Download/Create Files**:
    *   Ensure you have all the files (`manifest.json`, `background.js`, `content.js`, `inject.css`, `prompt_templates.json`) and the `icons` folder (with `icon16.png`, `icon48.png`, `icon128.png`) inside a single directory named `promptify_v1`.

2.  **Open Chrome Extensions**:
    *   Open Google Chrome.
    *   Navigate to `chrome://extensions`.

3.  **Enable Developer Mode**:
    *   In the top right corner of the Extensions page, toggle "Developer mode" ON.

4.  **Load Unpacked**:
    *   Click the "Load unpacked" button that appears on the top left.
    *   In the file dialog, navigate to and select the `promptify_v1` directory.

5.  **Verify**:
    *   The "Prompt-ify" extension should now appear in your list of extensions.
    *   Check for any errors by clicking the "Errors" button if it appears on the extension card.

## Usage

1.  **Navigate to a Target Site**: Go to Lovable, Bolt, or Replit.
2.  **Find the Pencil**: Look for the small purple pencil icon appearing to the right of major text input areas.
3.  **Click the Icon**: This will open the Prompt-ify overlay.
4.  **Configure**:
    *   **OpenAI API Key**: Enter your key the first time. It will be saved.
    *   **Model**: Select your preferred GPT model.
    *   **Platform**: Choose the platform you're working on. This will load the appropriate system prompt.
    *   **System Prompt**: Review and edit if needed. (Edits are saved per platform - stretch goal).
    *   **Rough Idea**: This will be pre-filled with text from the input field you clicked next to. Edit as necessary.
5.  **Prompt-ify!**: Click the "Prompt-ify" button.
6.  **Result**: The text in the original input field will be replaced with the optimized prompt from OpenAI.
7.  **Errors**: Any errors during the API call will be shown as an alert or a toast message.

## Creating the `promptify_v1.zip` file

Once you have the `promptify_v1` folder correctly set up with all the files:

1.  Navigate to the directory *containing* the `promptify_v1` folder (e.g., `/Users/marwankashef/Desktop/YouTube/Promptify/`).
2.  Right-click on the `promptify_v1` folder.
3.  Select "Compress 'promptify_v1'" (on macOS) or "Send to > Compressed (zipped) folder" (on Windows).
4.  This will create a `promptify_v1.zip` file, which is ready to be distributed or uploaded.

---
