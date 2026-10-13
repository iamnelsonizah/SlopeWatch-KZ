# Kazakhstan Landslide and Earthquake Atlas

A screening atlas of faults, earthquakes, slopes, mudflows and rain triggers for Kazakhstan, built with **Next.js 14**, **MapLibre GL JS** and TypeScript.
It shares its design with the Kazakhstan Water Atlas: a national border and "Focus on Kazakhstan" mask, verification levels A/B/C, trilingual names, and shareable views.

> Screening information only. This is not an official hazard map and must not be used for engineering, land-use or insurance decisions.

## Run it

```bash
npm install
cp .env.example .env.local     # optional: basemap key, ADMIN_TOKEN
npm run dev                    # http://localhost:3000
```

Without keys the basemap uses OpenFreeMap vector tiles for sharp, switchable labels and Esri raster imagery/terrain. The map needs internet access for basemap and elevation tiles, the USGS catalogue and Open-Meteo. Set `NEXT_PUBLIC_DATA_CONTACT` to an email address to enable the data-contribution contact link.

## What is on the map

| Feature | Data | How |
| --- | --- | --- |
| Active faults and folds | GEM Global Active Faults database | Bundled in `public/data/kz-faults.geojson`; colour by slip type, width by slip rate |
| Earthquakes | USGS ComCat | Live in the browser; magnitude filter, year range and playback |
| Hillshade and 3D terrain | Terrarium elevation tiles | MapLibre `raster-dem` and terrain |
| Slope angle | Same tiles | Computed in the browser by a custom `slope://` tile protocol |
| Susceptibility screening | Slope, fault proximity, wet-conditions scenario | Computed in the browser by `susc://`; weights are adjustable and shown on screen |
| Rain triggers | Open-Meteo | Model-based estimates at 11 reference points, last 7 and next 3 days; not station observations |
| Events, lakes, mitigation | Curated records | `lib/events.ts` (8 cited landmarks around Almaty); extend with the importer |
| Elevation profile | Terrarium tiles | Draw a line; shows climb, steepest step and every mapped fault crossed |
| Exposure | Natural Earth cities, faults | Distance to nearest mapped fault, quake counts |
| Community reports | Your server | Photo upload, unverified level C, moderation API |
| Share and print | URL state, canvas capture | Link restores layers, view, filters; Print sheet or PNG |

## Data limits you should know

The app shows these limits to users: a notice on first visit (reopen it with the **Limits** button on the map), a warning in the legend whenever an affected layer is on, a note under the records list, a line on printed sheets, and a full **Known limits** section on the Data and sources tab. Missing data is reported as unavailable; it is not replaced with estimated counts or elevation values. The wording lives in `lib/limits.ts`.

- **Fault coverage is incomplete.** The bundled GEM database is concentrated in the southeast and east; some well-known Almaty-area faults are missing. Add national maps with `npm run import:faults`.
- **The national landslide inventory is unavailable in this app.** The map combines a small set of cited landmark records with the Kazakhstan records returned by NASA's COOLR point-report service. COOLR is a report catalog, not a complete inventory or a mapped boundary layer; event points carry the catalog's stated location accuracy and links to the NASA record and original report where available. Empty map areas do not mean no event occurred. The World Bank's public Central Asia landslide polygon inventory is listed as a candidate source, but it is not imported until its event lineage and overlap are checked.
- **Refresh NASA COOLR report points:** run `npm run import:coolr` to fetch Kazakhstan records from the public NASA feature service and update `lib/places.imported.json`. The checked-in snapshot is used by the app, so map browsing does not depend on the NASA service being available at runtime. Confirm record-level source links and location accuracy before using an individual point.
- **National hazard data gap:** Kazakhstan's eGov catalog lists a Ministry of Emergency Situations susceptibility dataset, but its entry currently has no downloadable data URL. Request the file and methodology before adding it. The terrain profile and 3D view use open DEM tiles, which are approximate and not survey-grade.
- **The susceptibility index is a heuristic.** It has not been validated against landslide inventories. Treat it as "where to look first".
- **Rain thresholds are generic.** Calibrate them with local data before relying on them.

## Data pipeline

| Command | What it does |
| --- | --- |
| `npm run data` | Rebuilds faults, cities and the context buffer from GEM and Natural Earth (`pip install shapely`) |
| `npm run import:landslides -- glc.csv` | Imports NASA GLC records inside Kazakhstan into `lib/places.imported.json` |
| `npm run import:coolr` | Refreshes the checked-in Kazakhstan point snapshot from NASA's public COOLR feature service |
| `npm run import:faults -- faults.geojson "Source name"` | Adds fault traces to the fault layer |

Add `--dry` to preview an import.

## Community reports

`POST /api/reports` (multipart: `category`, `description`, `lat`, `lon`, optional `photo`) stores a report as level C. Checks: category list, 10 to 600 characters, location inside Kazakhstan, JPEG/PNG/WebP by file signature up to 3 MB, a honeypot field, and 5 reports per hour per IP. Photos are re-encoded in the browser, which removes EXIF and GPS data. No names or contact details are collected.

Moderation (set `ADMIN_TOKEN` to a random string of 16+ characters in `.env.local`):

```bash
curl -X PATCH localhost:3000/api/reports/<id> -H "x-admin-token: $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"verification":"B"}'
curl -X PATCH localhost:3000/api/reports/<id> -H "x-admin-token: $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"status":"hidden"}'
curl -X DELETE localhost:3000/api/reports/<id> -H "x-admin-token: $ADMIN_TOKEN"
```

Storage is a JSON file and an uploads folder under `data/`. That works on one server or a Docker volume. On serverless hosts (Vercel) the disk is not persistent: replace the functions in `lib/server/store.ts` with a database (Supabase, Neon) and object storage. Add a CAPTCHA and run behind a proxy that sets `x-forwarded-for` before opening reports to the public.

## Project layout

```
app/                      layout, page, styles, API routes (reports, uploads)
components/Atlas.tsx      state, tabs, URL sharing, tools
components/MapView.tsx    MapLibre sources, layers, popups
components/Panels.tsx     earthquake filter, susceptibility, profile panels
components/tabs/          trigger watch, exposure, earthquake stats, community, learn, data sources
lib/terrain.ts            slope and susceptibility tile protocols, elevation sampling
lib/profile.ts, usgs.ts, triggers.ts, events.ts, geo.ts, urlstate.ts
scripts/                  build-data.py and the two importers
```
# SlopeWatch-KZ
