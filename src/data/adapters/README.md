# Dataset adapters

This folder holds the **dataset adapters**: small modules that read an external
dataset (CSV/JSON from open data sources) and convert each row into the app's
`Reading` model (`src/models/reading.js`).

Rules:

- One file per dataset, e.g. `boneDensity.js`.
- Each adapter exports a function that returns `Reading[]` built with
  `createReading({ ..., source: 'dataset' })`.
- Adapters do not write to the database; the caller stores the readings in Dexie.
- Keep raw dataset files small (or sample them) so the PWA precache stays light.
