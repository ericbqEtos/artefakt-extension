# Artefakt

A browser extension that helps students and educators capture, cite, and document their research process with visual provenance tracking.

## Features

- **One-Click Source Capture** - Save any webpage, AI conversation, or video with a single click
- **Automatic Screenshots** - Visual documentation of your research journey
- **AI Platform Support** - Extract metadata from ChatGPT, Claude, Gemini conversations
- **YouTube Integration** - Capture video metadata with timestamps
- **Local File Support** - Capture PDFs and documents opened in the browser
- **Citation Generation** - Generate APA, MLA, Chicago, IEEE, Harvard citations (coming soon)
- **Origin Trail** - Visualize your research journey on a timeline (coming soon)
- **Shareable Links** - Share your research process with examiners or collaborators (coming soon)

## Installation

### Development

```bash
# Clone the repository
git clone https://github.com/your-username/artefakt-extension.git
cd artefakt-extension

# Install dependencies
npm install

# Start development server
npm run dev
```

Then load the extension in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `.output/chrome-mv3-dev` folder

### Enabling Local File Access

To capture PDFs and other local files:
1. Go to `chrome://extensions/`
2. Find "Artefakt Extension" and click "Details"
3. Enable "Allow access to file URLs"

### Building for Production

```bash
# Build for Chrome
npm run build

# Build for Firefox
npm run build:firefox

# Build for all browsers
npm run build -- --browser chrome,firefox,edge

# Create zip for distribution
npm run zip
```

## Usage

1. **Capture a Source**: Click the Artefakt icon in your browser toolbar and click "Save This Page"
2. **View Sources**: Click "Full View" to open the side panel with all your captured sources
3. **Search & Filter**: Use the search bar and type filter to find specific sources
4. **Delete Sources**: Hover over a source card and click the delete button

### Keyboard Shortcuts

- `Alt+Shift+S` - Capture current page (configurable in browser settings)

## Supported Platforms

| Platform | Features |
|----------|----------|
| ChatGPT | Model version, conversation title |
| Claude | Model version, conversation title |
| Gemini | Model version, conversation title |
| NotebookLM | Notebook title, output type (podcast, quiz, flashcards, mind map, etc.), source references |
| Grok AI | Model version, conversation title, share links |
| YouTube | Video title, channel, timestamp |
| PDFs | Document title, author, keywords (from metadata) |
| Local files | Document, spreadsheet, presentation support |
| Any webpage | Title, description, OpenGraph data |

## Tech Stack

- **Framework**: [WXT](https://wxt.dev) (Vite-based extension framework)
- **UI**: React + Tailwind CSS
- **Storage**: IndexedDB via Dexie.js
- **Testing**: Playwright E2E

## Browser Support

- Chrome (primary)
- Firefox
- Edge

## Accessibility

Artefakt is built with accessibility in mind:
- WCAG 2.1 AA compliant
- Full keyboard navigation
- ARIA labels on all interactive elements
- High contrast color palette (4.5:1 ratio)
- Focus visible indicators

## Contributing

Contributions are welcome! Please read the development documentation in `CLAUDE.md` for architecture details and development guidelines.

## License

MIT
