# NOIR — Eau de Parfum

The original NOIR storefront has been separated into source files without
redesigning its interface or replacing its interactions.

## Start

```sh
npm install
npm run dev
```

For a production build, run `npm run build`; use `npm run preview` to preview
that build.

## Source layout

- `src/template.html` — original page markup and interactive template
- `src/app/NoirLogic.js` — original React component logic, including cart,
  collection, motion, and scene interactions
- `src/styles/original.css` — original font and page styles
- `src/main.jsx` — connects the original template, logic, and local runtime
- `public/runtime/` — local React, animation, rendering, CTA, and page-runtime files
- `public/images/` and `public/fonts/` — extracted original media assets

The original generated HTML file is retained as the untouched source reference.
