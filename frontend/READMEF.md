ge '@tailwindcss/postcss'.

4) Required npm Dependencies (installed in frontend/)
Core:
- react
- react-dom
- react-router-dom

Build tooling (devDependencies):
- vite
- @vitejs/plugin-react
- tailwindcss
- @tailwindcss/postcss
- postcss
- autoprefixer

5) Files that MUST exist (frontend/)
- package.json
- index.html
- src/main.jsx
- src/App.jsx
- src/index.css
- postcss.config.cjs (or .js) configured for Tailwind v4
- tailwind.config.cjs (or .js) with correct content globs

6) Tailwind v4 minimum config (reference)
- src/index.css should contain:
  @import "tailwindcss";

- postcss.config.cjs should contain:
  module.exports = {
    plugins: {
      "@tailwindcss/postcss": {},
      autoprefixer: {},
    },
  };

- tailwind.config.cjs should contain:
  module.exports = {
    content: ["./index.html", "./src/**/*.{js,jsx}"],
    theme: { extend: {} },
    plugins: [],
  };

7) Network/Ports
- Vite dev server default: http://localhost:5173
- If port 5173 is in use, Vite will choose another port and print it in the terminal.

8) Known Common Issues (quick fixes)
- "react-router-dom could not be resolved"
  -> Run: npm install react-router-dom (inside frontend/)

- Vite cache oddities
  -> Stop dev server
  -> Delete: frontend/node_modules/.vite
  -> Restart: npm run dev

- Tailwind errors about PostCSS plugin move
  -> Ensure @tailwindcss/postcss is installed and postcss config uses it.

