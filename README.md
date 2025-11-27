# opendocs

<div align="center">
  <img src="resources/icon.png" alt="opendocs logo" width="200">

  <p><strong>A minimalist, modern PDF reader with AI-powered chat</strong></p>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="version">
  <img src="https://img.shields.io/badge/Electron-38.1.2-brightgreen" alt="Electron">
  <img src="https://img.shields.io/badge/Vue-3.5.21-green" alt="Vue">
</p>

A minimalist, modern PDF reader and organizer with built-in AI chat capabilities. Built with Electron, Vue 3, and Gemini AI.

## ✨ Features

### 📄 PDF Reading
- **Clean, distraction-free interface** - Minimalist design focused on reading
- **Smooth navigation** - Pan and zoom with mouse controls
- **Page tracking** - Automatic page detection and navigation
- **Document library** - Organize and access your PDFs easily
- **Starred documents** - Bookmark your favorites
- **Search** - Full-text search across all pages with result navigation

### 🤖 AI Chat
- **Multimodal AI integration** - Chat with Google's Gemini AI about your documents
- **Context-aware** - Add specific pages, page ranges, or the entire document as context
- **Streaming responses** - Real-time AI responses with markdown formatting
- **Chat history** - Automatically saves all conversations
- **Model selection** - Choose from multiple Gemini models
- **Custom models** - Add your own Gemini models in settings

### 🎨 User Experience
- **Dark mode** - System-aware dark theme
- **Responsive design** - Adapts to window size
- **Glassmorphism UI** - Modern, translucent design elements
- **Keyboard shortcuts** - Efficient navigation
- **Help modal** - Built-in quick guide

## 🛠️ Tech Stack

- **Desktop Framework**: Electron 38
- **Frontend**: Vue 3 (Composition API)
- **PDF Rendering**: vue-pdf-embed + PDF.js
- **AI**: Google Gemini API (via Vercel AI SDK)
- **Icons**: Lucide Vue
- **Markdown**: markdown-it + highlight.js
- **Build Tool**: Vite + electron-vite

## 📦 Installation

### Prerequisites
- Node.js 18 or higher
- npm or pnpm

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/opendocs.git
   cd opendocs
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Get a Gemini API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key
   - You'll add this in the app's Settings later

## 🚀 Development

### Run in development mode
```bash
npm run dev
# or
pnpm dev
```

This starts the Electron app with hot-reload enabled.

### Project Structure
```
opendocs/
├── src/
│   ├── main/           # Electron main process
│   │   └── index.js    # Main entry point, IPC handlers
│   ├── preload/        # Preload scripts
│   │   └── index.js    # IPC bridge
│   └── renderer/       # Vue app (renderer process)
│       ├── src/
│       │   ├── assets/     # CSS, images
│       │   ├── components/ # Vue components
│       │   │   ├── AIChatSidebar.vue
│       │   │   ├── DocListItem.vue
│       │   │   └── ReaderToolbar.vue
│       │   ├── views/      # Main views
│       │   │   ├── LibraryView.vue
│       │   │   ├── ReaderView.vue
│       │   │   └── SettingsView.vue
│       │   ├── router/     # Vue Router
│       │   ├── App.vue
│       │   └── index.html
├── resources/          # App icons
└── package.json
```

## 🏗️ Building

### Build for current platform
```bash
npm run build
# or
pnpm build
```

### Build for specific platforms
```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux
```

Built apps will be in the `dist/` folder.

## 📖 Usage

### First Time Setup
1. Launch opendocs
2. Click **settings** in the bottom left
3. Enter your Gemini API key
4. (Optional) Add custom AI models

### Opening PDFs
- Click **open** in the bottom right
- Or drag and drop a PDF into the library

### Using AI Chat
1. Open a PDF
2. Click the ✨ icon in the top right
3. (Optional) Click ➕ to add context:
   - **Current Page** - Just the page you're viewing
   - **Page Range** - Specify a range (e.g., 1-10)
   - **Full Document** - Entire PDF
4. Type your question and press Enter

### Search
1. Click the 🔍 icon in the toolbar
2. Type your search query
3. Use ← → arrows to navigate results

### Keyboard Shortcuts
- `Esc` - Close search or modals
- `⌘/Ctrl + F` - Search in document (when in reader)

## 🎯 Key Features Explained

### AI Context System
The AI chat uses a sophisticated context management system:
- **Current Page**: Extracts text from the visible page
- **Page Range**: Allows you to specify which pages to include
- **Full Document**: Processes the entire PDF text

Context items appear as chips in the input area and can be removed individually.

### Chat History
- Conversations are automatically saved to localStorage
- Each chat is linked to its document
- History is accessible via the 📜 icon in the chat sidebar
- You can delete individual chats

### Model Management
- Default models: Gemini 2.0 Flash Lite, 1.5 Flash, 1.5 Pro
- Add custom models in Settings → Models
- Each model requires: Model Name and Model ID

## 🔧 Configuration

### electron-builder.yml
Configure app builds for different platforms:
- App icons for macOS (.icns), Windows (.ico), Linux (.png)
- App ID, category, and bundle identifier
- Platform-specific settings

### cook.config.json
Development workflow shortcuts (if using cook):
- `dev` - Start development server
- `build` - Build for macOS
- `install` - Install dependencies

## 🐛 Troubleshooting

### PDF won't load
- Ensure the file path is valid
- Check browser console for errors
- Try a different PDF

### AI chat not working
- Verify API key is set in Settings
- Check internet connection
- Ensure the model ID is correct

### Search not finding text
- PDFs with scanned images (OCR) may not have extractable text
- Try a different PDF with native text

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **PDF.js** - Mozilla's PDF rendering library
- **Gemini AI** - Google's multimodal AI
- **Electron** - Cross-platform desktop framework
- **Vue.js** - Progressive JavaScript framework

---

**Made with ❤️ for better document reading from TheAlphaOnes**
