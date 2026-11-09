# Pokémon TCG Pokédex

A responsive, browser-based Pokémon TCG-inspired Pokédex built with HTML, CSS, JavaScript ES modules, Bootstrap 5, and PokeAPI. It is a static website: it does not require a backend, database, package installation, or build step.

## Features

- Search Pokémon by name or numeric ID, with case-insensitive, partial, and fuzzy matching
- Supported alternate Pokémon IDs and form searches, including Deoxys forms
- Previous/Next navigation and random Pokémon selection
- Touch and mouse swipe navigation
- Interactive Pokémon card with stats, abilities, and card-flip behavior
- Type-themed card styling and Legendary, Mythical, and special prismatic finishes
- Region and type filters
- Evolution-chain modal
- Pokémon Forms modal
- Artwork fallbacks: main card and evolution artwork use Dream World artwork first, then Official Artwork; forms use form-specific Dream World artwork, base Dream World artwork, then Official Artwork
- Collection dashboard showing discovered Pokémon and Pokédex completion
- Responsive desktop, tablet, and mobile layouts
- Reduced-motion support and keyboard focus styles

## Requirements

- A modern browser with JavaScript modules enabled
- Internet access for PokeAPI, Pokémon artwork, and Bootstrap CDN assets
- A local static web server for development (for example, VS Code Live Server)

No Node.js installation, `npm install`, build command, or environment variables are required for this static version.

## Run locally

1. Download and extract this project.
2. Open the extracted `pokemon-tcg-pokedex` folder in Visual Studio Code.
3. Open `index.html`.
4. Start **Live Server** from VS Code.
5. Open the local URL provided by Live Server.

Do not open `index.html` directly using a `file://` URL. JavaScript ES modules should be served over HTTP by a local development server.

## Deploy to Vercel

### Option A: Deploy from a GitHub repository (recommended)

1. Create a new GitHub repository.
2. Upload the contents of the `pokemon-tcg-pokedex` folder to the repository root. The repository root should contain `index.html`, `css/`, `js/`, `assets/`, and `favicon.svg`.
3. Sign in to Vercel and choose **Add New → Project**.
4. Import the GitHub repository and select the repository containing `index.html`.
5. Set **Framework Preset** to **Other**.
6. If `index.html` is at the repository root, leave **Root Directory** as `./`.
7. Leave **Build Command** and **Install Command** empty.
8. Set **Output Directory** to `.` (the repository root).
9. Deploy.

If you uploaded the project folder itself as a subfolder inside the repository, set Vercel's **Root Directory** to that subfolder instead. The selected root must be the directory containing `index.html`.

### Option B: Deploy with the Vercel CLI

This is optional. The GitHub import workflow above does not require the CLI or a local build.

1. Install and sign in to the Vercel CLI according to Vercel's official documentation.
2. Run the deployment command from the project directory containing `index.html`.
3. Follow the CLI prompts for a static project; no build command is needed.

### After deployment

- Open the deployed URL and test search, navigation, filters, card flipping, Evolution and Forms modals, and the collection dashboard.
- Check the browser console and Network panel for failed requests.
- Test on mobile and desktop widths.
- Confirm that direct page refreshes load correctly.

No custom `vercel.json` is required for this root-level static site. If the project later adds client-side routes, server functions, or a build system, revisit the deployment configuration.

## Data, storage, and privacy

- Pokémon data is retrieved from the public [PokeAPI](https://pokeapi.co/).
- Pokémon artwork is loaded from the [PokeAPI sprites repository](https://github.com/PokeAPI/sprites).
- Bootstrap assets are loaded from the jsDelivr CDN.
- Discovered Pokémon and collection progress are stored in the current browser's `localStorage`.
- API responses are cached in memory and, when browser storage is available, in `localStorage`. Identical in-flight requests are deduplicated; stale cached data may be used when a request fails.
- Collection progress is local to that browser and origin. It does not synchronize automatically across browsers or devices.
- Clearing site data, using private browsing, or restricting browser storage may reset or prevent persistence of collection progress and cached responses.
- The application depends on the availability of the external services listed above. Their outages or rate limits can affect data and artwork loading.

## Project structure

```text
pokemon-tcg-pokedex/
├── index.html
├── favicon.svg
├── README.md
├── assets/
│   └── backgrounds/
├── css/
│   ├── styles.css
│   ├── cards.css
│   ├── animations.css
│   └── responsive.css
└── js/
    ├── app.js
    ├── api/
    ├── components/
    ├── features/
    └── utils/
```

- `index.html` — application markup and stylesheet/module entry points
- `css/` — base styles, card styles, animations, and responsive rules
- `js/app.js` — application entry point and event wiring
- `js/api/` — PokeAPI client and data services
- `js/components/` — Pokémon card and modal rendering
- `js/features/` — navigation, collection, dashboard, card flip, and swipe behavior
- `js/utils/` — formatting helpers
- `assets/backgrounds/` — local Pokémon type environments and evolution modal background
- `favicon.svg` — browser tab icon

## Troubleshooting

- **The page is blank or modules fail to load:** serve the project with Live Server or another local HTTP server; do not use `file://`.
- **Pokémon data does not load:** check the internet connection, PokeAPI availability, and browser Network/Console panels.
- **Artwork is missing:** some Pokémon forms do not have unique Dream World artwork; the app attempts the configured fallback artwork sources.
- **Collection progress is missing:** check whether browser site data was cleared or storage is restricted. Collection progress is not account-based or cloud-synced.

## Project notes

This is an unofficial fan-made project and is not affiliated with or endorsed by Nintendo, Game Freak, or The Pokémon Company. Pokémon names and related assets belong to their respective owners. Review the terms of the external data and asset providers before redistribution or commercial use.
