# Lyra - LRC Downloader

Lyra is a modern, sleek web application designed to help you download synchronized lyrics (LRC files) for your music library. Built with React and powered by AI, it offers a seamless experience for finding and managing lyrics.

## Features

- **Automated Lyric Search**: Quickly find lyrics for your songs.
- **AI-Powered**: Utilizes Google's Generative AI to enhance lyric accuracy and availability.
- **Modern UI**: A beautiful, dark-mode-ready interface built with Tailwind CSS.
- **Instant Downloads**: Get your LRC files in seconds.
- **Cross-Platform**: Works right in your browser.

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS, PostCSS
- **AI Integration**: Google Generative AI
- **Icons**: Lucide React
- **Routing**: React Router DOM

## Getting Started

### Prerequisites

Ensure you have Node.js installed on your machine.

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/asliutkarsh/lyra-lrc-downloader.git
    cd lyra-lrc-downloader
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Create a `.env.local` file in the root directory and add your API keys (if applicable):
    ```env
    VITE_GOOGLE_AI_API_KEY=your_api_key_here
    ```

4.  Start the development server:
    ```bash
    npm run dev
    ```

5.  Open your browser and navigate to `http://localhost:5173`.

## Building for Production

To create a production build, run:

```bash
npm run build
```

You can preview the build locally with:

```bash
npm run preview
```

## Contributing

We welcome contributions! Please check out our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.

## License

This project is open-source and available under the [MIT License](LICENSE.md).
