# Type Tool - Font Playground

An interactive font experimentation playground built with Next.js and opentype.js. This tool allows you to visualize fonts in vector form and will support advanced typography experiments.

## Features

- 🎨 **Font Selector**: Choose from available fonts in the `fonts/` directory
- ✍️ **Text Input**: Type any text to render
- 🖼️ **Vector Rendering**: Real-time SVG rendering using opentype.js
- 📺 **Fullscreen Mode**: Focus on your typography work
- 🔄 **Hot Reload**: Automatically detects new fonts added to the `fonts/` directory

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn

### Installation

```bash
npm install
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Adding Fonts

1. Place `.ttf` or `.otf` font files in the `fonts/` directory
2. Organize them in subdirectories by font family (e.g., `fonts/Montserrat/`)
3. The server will automatically detect and list them

## Project Structure

```
type-tool/
├── app/
│   ├── api/
│   │   └── fonts/          # API routes for font management
│   │       ├── route.ts    # Lists all available fonts
│   │       └── [...path]/  # Serves individual font files
│   ├── components/
│   │   └── FontRenderer.tsx # SVG renderer using opentype.js
│   ├── page.tsx            # Main UI page
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── fonts/                  # Font files directory
└── public/                 # Static assets
```

## API Endpoints

### GET `/api/fonts`
Returns a list of all available fonts with their paths and families.

**Response:**
```json
{
  "fonts": [
    {
      "name": "Montserrat-Regular.ttf",
      "path": "Montserrat/static/Montserrat-Regular.ttf",
      "family": "Montserrat"
    }
  ]
}
```

### GET `/api/fonts/[...path]`
Serves a font file from the `fonts/` directory.

**Example:** `/api/fonts/Montserrat/static/Montserrat-Regular.ttf`

## Technology Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **opentype.js** - Font parsing and rendering
- **Tailwind CSS** - Styling
- **SVG** - Vector graphics rendering

## Roadmap

Future features planned:
- ⚖️ Weight slider for variable fonts
- 🌊 Distortion effects along font curvature
- 📏 Advanced typography controls (kerning, tracking, leading)
- 🎨 Color and gradient fills
- 💾 Export rendered text as SVG
- 🔍 Glyph inspector
- 📐 Grid and alignment guides

## Development

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## License

MIT
