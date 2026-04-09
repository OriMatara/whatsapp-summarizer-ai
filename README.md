# 🚀 WhatsApp AI Summarizer

An AI-powered Chrome Extension that intelligently summarizes unread WhatsApp messages using **Google Gemini 1.5 Flash**. Built with a modern tech stack focused on performance, clean architecture, and type safety.

---

## ✨ Key Features

* **Intelligent Extraction:** Custom DOM scraping logic designed to navigate WhatsApp Web's dynamic structure, with robust support for Emojis and mixed RTL/LTR (Hebrew/English) text.
* **AI-Driven Summaries:** Leverages the **Google Gemini 1.5 Flash** model to transform a wall of unread messages into a concise, actionable summary.
* **Contextual Grouping:** Automatically organizes messages by sender to maintain the flow and context of multiple conversations.
* **Privacy & Security:** Professional-grade architecture with secure API key management via environment variables (`.env`).

---

## 🛠 Tech Stack

* **Framework:** [Plasmo](https://www.plasmo.com/) - The modular framework for browser extensions.
* **Frontend:** React & TypeScript for a type-safe, component-based UI.
* **AI Engine:** Google Gemini API (Generative AI).
* **Source Control:** Git & GitHub for professional version management.

---

## 🚀 Getting Started

Follow these steps to get the project running locally on your machine.

### 📍 1. Prerequisites

* [Node.js](https://nodejs.org/) (LTS version recommended)
* A Google AI Studio API Key ([Get it here](https://aistudio.google.com/))

### 📍 2. Installation

Clone the repository and install the dependencies:

```bash
npm install
```

### 📍 3. Environment Variables

For security reasons, API keys are not stored in the repository. Create a `.env` file in the root directory and add your Gemini API key:

```env
PLASMO_PUBLIC_GEMINI_KEY=your_api_key_here
```
-Environment Variables (The PLASMO_PUBLIC_ prefix is required for popup access)

### 📍 4. Development

Start the development server to build the extension in real-time:

```bash
npm run dev
```

**After the build process completes:**

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the `build/chrome-mv3-dev` folder from your project directory.