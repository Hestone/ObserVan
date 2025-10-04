# Vancouver crime dynamic heatmap (Python)

What I added

- `heatmap_vancouver.py` — loads your CSV, converts X/Y to lat/lon, classifies severity, and writes `crime_map.html` (interactive Folium map using MarkerCluster).
- `requirements.txt` — Python libs needed.

Quick setup (Windows PowerShell)

1. Create and activate a virtual environment (recommended):

```powershell
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Run the script:

```powershell
python heatmap_vancouver.py
```

This creates `crime_map.html`. Open it in your browser.

Notes & recommendations

- Projection: the script tries EPSG:3347 (BC Albers) and EPSG:26910 (NAD83 / UTM zone 10N). If neither is correct, edit `detect_transform` and add the right EPSG code for your X/Y.
- Interactivity: Folium + MarkerCluster provides the dynamic grouping behavior you described — large circles / combined clusters when zoomed out, expanding into individual markers when zoomed in. For a richer web app, consider using a JavaScript mapping library (Leaflet or Mapbox GL) and serve the data as GeoJSON; that allows client-side clustering and filters.
- Coloring: I included a basic color-by-count and per-type severity heuristics. Consider mapping official severity scores (if available) or using numeric weights per offence type.
- Performance: For large datasets (~23k rows) Folium + clusters should be okay. If you plan to show all points in a web app, consider server-side tiling or clustering (e.g., Tippecanoe to generate vector tiles, or use a PostGIS backend + ST_ClusterDBSCAN).
- Filters: For the web app you can expose filters (date range, neighbourhood, offence type) and return filtered GeoJSON. If you want, I can scaffold a small Flask or FastAPI app to serve the filtered GeoJSON and a simple front-end map.

If you'd like, next I can:

- Add a small Flask app that serves filtered endpoints and a Leaflet front-end with client-side clustering and color scales.
- Tune the severity mapping to your preferred categories and legend on the map.
- Add time-based animation (heatmap over time) or heatmap tiles for continuous intensity view.
