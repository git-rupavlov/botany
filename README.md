# Botany Lab

Static, versionable environment for botany comparisons and visualizations.

The goal is to keep plant comparisons historically traceable in Git instead of generating endless PDF/report versions like a cursed office printer ritual.

## Current scope

The first dataset compares:

- Sweet Pea / currant tomato type
- Cherry tomato
- Rozova Mechta / Розова Мечта

Visualizations included:

- Radar / spider chart
- Detailed comparison table
- Time-series chart
- Garden quadrant chart
- JSON preview
- CSV export

## File structure

```text
.
├── index.html
├── styles.css
├── app.js
└── data/
    └── comparisons/
        └── tomatoes-wild-cherry-rozova-mechta.json
```

## Run locally

Because the page loads JSON with `fetch()`, open it through a local HTTP server instead of double-clicking the HTML file.

```bash
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080
```

## GitHub Pages

Recommended simple setup:

1. Repository Settings
2. Pages
3. Source: Deploy from a branch
4. Branch: `main`
5. Folder: `/root`

The site is intentionally dependency-free: no build step, no npm install, no framework pilgrimage.

## Add a new comparison

Create a new JSON file under:

```text
data/comparisons/
```

Use the same model:

```json
{
  "id": "example-comparison",
  "title": "Example comparison",
  "updated": "2026-07-05",
  "scale": "0-10 comparative score unless raw value is provided",
  "defaultRadarAxes": ["metric_id_1", "metric_id_2"],
  "entities": [],
  "metrics": [],
  "timeline": {
    "labels": [],
    "series": {}
  }
}
```

Then change `DATASET_URL` in `app.js` or later add a dataset selector.

## Data philosophy

- Use normalized 0-10 scores for visual comparison.
- Keep raw values where they matter: kg, g/100 g, mg/100 g, plant height, root depth.
- Add notes when values are estimates.
- Commit changes instead of overwriting history.

## Next useful improvements

- Dataset selector for multiple topics.
- Source/reference field per metric.
- Separate plant profile pages.
- Export radar/table view as PNG.
- GitHub Actions validation for JSON schema.
