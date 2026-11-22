# Pokémon TCG Pokédex — Vue 3

A browser-based, Pokémon TCG-inspired Pokédex built with **Vue 3**, **Vite**, **Bootstrap 5**, and the public **PokeAPI**.

This is the Vue migration of the original Pokémon TCG Pokédex. The Vue application lives in the `vue-app/` directory; the original HTML/CSS/JavaScript version remains in the parent project directory.

## Features

- Search Pokémon by name or Pokédex ID
- Search suggestions and keyboard interaction
- Previous and Next Pokémon navigation
- Random Pokémon selection
- Swipe navigation
- Interactive Pokémon card with front/back views
- Pokémon artwork fallback handling
- Pokémon types, height, weight, abilities, and base stats
- Type-themed card styling and special card finishes
- Region and type filtering
- Evolution-chain modal
- Alternate Pokémon Forms modal
- Collection overview with discovered Pokémon and completion progress
- Browser `localStorage` persistence for collection data
- Responsive layout for desktop, tablet, and mobile
- Reduced-motion styling

Pokémon data and artwork are retrieved from external services, primarily PokeAPI and the PokeAPI sprites repository.

## Requirements

- Node.js compatible with the installed Vite version
- npm
- Internet connection for Pokémon data and remote artwork

## Run locally

1. Open a terminal.
2. Change to the Vue application directory:

   ```bash
   cd vue-app
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the Vite development server:

   ```bash
   npm run dev
   ```

5. Open the local URL printed in the terminal.

## Production build

Run from the `vue-app/` directory:

```bash
npm run build
```

Vite writes the production output to:

```text
vue-app/dist/
```

To preview the production build locally:

```bash
npm run preview
```

## Deploy to Vercel

When importing the repository into Vercel, configure the Vue application directory:

- **Root Directory:** `vue-app`
- **Framework Preset:** Vite
- **Install Command:** `npm install`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

Deploy the `vue-app` directory as the project root. Do not use the parent folder as the Vercel root unless you intentionally configure the build commands and output path for that layout.

## Project structure

```text
vue-app/
├── public/
│   └── assets/
│       └── backgrounds/
├── src/
│   ├── components/
│   │   ├── modals/
│   │   └── pokemon/
│   ├── composables/
│   ├── services/
│   ├── styles/
│   ├── utils/
│   ├── App.vue
│   └── main.js
├── index.html
├── package.json
├── package-lock.json
└── README.md
```

### Main directories

- `src/components/` — Vue components for Pokémon cards, filters, and modals
- `src/composables/` — reusable state and interaction logic for navigation, search, card interactions, and collection tracking
- `src/services/` — API access and Pokémon, species, region, type, evolution, forms, and collection-related data operations
- `src/styles/` — application, card, animation, and responsive styles
- `src/utils/` — formatting and Pokémon card utility functions
- `public/assets/` — static artwork and background assets

## Data, storage, and privacy

- Pokémon data is retrieved from the public PokeAPI.
- Pokémon artwork is loaded from remote PokeAPI sprite assets.
- Collection progress is stored in the browser's `localStorage`.
- Collection progress is local to the browser and site origin; it does not automatically synchronize across browsers or devices.
- Clearing browser site data, using private browsing, or restricting browser storage may reset or prevent collection persistence.
- The application depends on external API and artwork availability. Service outages, network failures, or rate limits may affect data and image loading.

## Troubleshooting

- **Dependencies fail to install:** confirm that Node.js and npm are installed and compatible with the Vite version in `package.json`.
- **The development server does not start:** make sure the terminal is inside `vue-app/` and run `npm install` before `npm run dev`.
- **Pokémon data does not load:** check your internet connection and the browser's developer console and Network panel.
- **Artwork is missing:** some Pokémon forms may not have unique artwork; the application uses available fallback artwork candidates.
- **Collection progress is missing:** check whether browser site data was cleared or storage is restricted.

## Credits and disclaimer

- Pokémon data: [PokeAPI](https://pokeapi.co/)
- Pokémon sprites: [PokeAPI Sprites](https://github.com/PokeAPI/sprites)
- UI framework: [Bootstrap](https://getbootstrap.com/)
- Frontend framework: [Vue.js](https://vuejs.org/)
- Build tool: [Vite](https://vite.dev/)

This is an unofficial fan-made project and is not affiliated with, endorsed by, or sponsored by Nintendo, Game Freak, or The Pokémon Company. Pokémon names and related assets belong to their respective owners. Review the terms of external data and asset providers before redistribution or commercial use.
