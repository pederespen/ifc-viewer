# IFC Viewer

A simple, modern web application for viewing IFC (Industry Foundation Classes) files. Built with SvelteKit and [ThatOpen Components](https://github.com/ThatOpen/engine_components).

## Features

- 📁 Drag & drop or click to upload IFC files
- 🎨 Clean, modern UI with dark theme
- 🖱️ Interactive 3D navigation (orbit, pan, zoom)
- 📦 Fully static - no backend required
- ⚡ Fast and lightweight

## Tech Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/) with static adapter
- **IFC Processing**: [@thatopen/components](https://github.com/ThatOpen/engine_components)
- **3D Rendering**: [Three.js](https://threejs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Language**: TypeScript
- **Code Quality**: ESLint + Prettier

## Getting Started

### Prerequisites

- Node.js 18+ (or compatible package manager)

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

The static site will be generated in the `build` directory.

### Preview Production Build

```bash
npm run preview
```

## Code Quality

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

### Type Checking

```bash
npm run check
```

## Deployment

Since this is a static site, you can deploy it to any static hosting service:

- **Netlify**: Drag and drop the `build` folder
- **Vercel**: Connect your git repository
- **GitHub Pages**: Push the `build` folder to a `gh-pages` branch
- **Cloudflare Pages**: Connect your repository

## Project Structure

```
ifc-viewer/
├── src/
│   ├── lib/
│   │   └── components/
│   │       └── IFCViewer.svelte    # Main IFC viewer component
│   ├── routes/
│   │   ├── +layout.svelte          # Root layout
│   │   ├── +layout.ts              # Layout config (prerender + ssr: false)
│   │   └── +page.svelte            # Home page
│   ├── app.css                     # Global styles
│   └── app.html                    # HTML template
├── static/                         # Static assets
├── svelte.config.js                # SvelteKit configuration
├── vite.config.ts                  # Vite configuration
├── tsconfig.json                   # TypeScript configuration
├── eslint.config.js                # ESLint configuration
├── .prettierrc                     # Prettier configuration
└── package.json                    # Dependencies and scripts
```

## Usage

1. Open the application in your browser
2. Click the "Upload IFC File" button or drag and drop an IFC file onto the viewer
3. The 3D model will load and you can interact with it:
   - **Left click + drag**: Rotate camera
   - **Right click + drag**: Pan camera
   - **Scroll**: Zoom in/out

## License

MIT

## Acknowledgments

- Built with [ThatOpen Components](https://github.com/ThatOpen/engine_components)
- Powered by [Three.js](https://threejs.org/)

