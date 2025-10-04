"""
Interactive dynamic crime heatmap for Greater Vancouver.

Usage: python heatmap_vancouver.py

This script reads `crimedata_csv_AllNeighbourhoods_2025.csv` in the same folder,
converts the projected coordinates to WGS84 lat/lon, assigns a severity score
based on crime TYPE, and generates an interactive folium map `crime_map.html`.

The map uses CircleMarker clustering (MarkerCluster) so when zoomed out markers
aggregate visually, and when zoomed in they separate to exact locations.

Notes:
- The CSV appears to use projected X/Y coordinates (likely BC Albers / NAD83 or
  a local Vancouver projection). We will assume they are in EPSG:26910 (NAD83 / UTM zone 10N)
  or EPSG:3347 (BC Albers). The script auto-detects plausible transforms by
  trying a couple of common EPSG codes and picking lat/lon in expected Vancouver
  bounding boxes.
"""

import os
from pathlib import Path
import pandas as pd
import numpy as np
import folium
from folium.plugins import MarkerCluster
from pyproj import Transformer


CSV_PATH = Path(__file__).parent / 'crimedata_csv_AllNeighbourhoods_2025.csv'
OUTPUT_HTML = Path(__file__).parent / 'crime_map.html'


def detect_transform(df, xcol='X', ycol='Y'):
    """Try a few candidate source CRSes and return Transformer that maps to EPSG:4326.
    We test EPSG:3347 (BC Albers) and EPSG:26910 (NAD83 / UTM zone 10N) since
    VPD data often uses a provincial Albers or UTM projection.
    """
    candidates = [3347, 26910]
    for epsg in candidates:
        try:
            transformer = Transformer.from_crs(f'epsg:{epsg}', 'epsg:4326', always_xy=True)
            lon, lat = transformer.transform(df[xcol].iloc[0], df[ycol].iloc[0])
            # Vancouver lat ~49, lon ~-123
            if 48.0 <= lat <= 50.5 and -125 <= lon <= -122:
                print(f'Detected source EPSG:{epsg} -> using transformer')
                return transformer
        except Exception:
            continue
    raise RuntimeError('Failed to detect correct source CRS. Please supply correct EPSG code.')


def classify_severity(type_str: str):
    """Return a severity score 1..5 and a color.
    This mapping is a heuristic. Adjust to match authoritative categories.
    """
    s = type_str.lower()
    if any(k in s for k in ['murder', 'homicide']):
        return 5, 'darkred'
    if any(k in s for k in ['arson']):
        return 5, 'red'
    if any(k in s for k in ['assault', 'violent', 'sex', 'robbery']):
        return 4, 'orange'
    if any(k in s for k in ['break and enter', 'theft', 'shoplifting', 'vehicle']):
        return 3, 'yellow'
    if any(k in s for k in ['drug', 'misconduct', 'public']) or len(s) < 1:
        return 2, 'blue'
    return 2, 'lightblue'


def severity_color_by_count(count):
    """Return color gradient from blue (low) to red (high) based on count.
    We'll use a simple linear interpolation over thresholds.
    """
    if count <= 1:
        return '#2b83ba'  # blue
    if count <= 3:
        return '#ffffbf'  # yellowish
    if count <= 6:
        return '#fdae61'  # orange
    return '#d7191c'    # red


def build_map(df):
    # Center on Vancouver
    center = (49.25, -123.12)
    m = folium.Map(location=center, zoom_start=11, tiles='CartoDB positron')

    # Marker cluster
    marker_cluster = MarkerCluster(name='Crimes', options={'spiderfyOnMaxZoom': False, 'showCoverageOnHover': True})
    m.add_child(marker_cluster)

    # We'll aggregate exact identical lat/lon to a count so the colour/size reflects
    grouped = df.groupby(['lat', 'lon']).agg({'TYPE': 'count', 'severity': 'max'}).reset_index()
    grouped.rename(columns={'TYPE': 'count'}, inplace=True)

    for _, row in grouped.iterrows():
        lat = float(row['lat'])
        lon = float(row['lon'])
        count = int(row['count'])
        sev = int(row['severity'])
        color = severity_color_by_count(count)
        radius = 4 + np.log1p(count) * 6  # scale marker size with count
        popup = folium.Popup(f'Count: {count}<br>Severity: {sev}', max_width=250)
        folium.CircleMarker(location=(lat, lon), radius=radius, color=color, fill=True, fill_opacity=0.7, popup=popup).add_to(marker_cluster)

    folium.LayerControl().add_to(m)
    m.save(OUTPUT_HTML)
    print(f'Wrote map to: {OUTPUT_HTML}')


def main():
    if not CSV_PATH.exists():
        print('CSV file not found:', CSV_PATH)
        return

    df = pd.read_csv(CSV_PATH)

    # Ensure X/Y numeric
    df = df.dropna(subset=['X', 'Y'])
    df = df[df['X'].apply(lambda v: str(v).replace('.', '').replace('-', '').isdigit())]
    df['X'] = df['X'].astype(float)
    df['Y'] = df['Y'].astype(float)

    transformer = detect_transform(df, xcol='X', ycol='Y')
    # Transform all
    lons, lats = transformer.transform(df['X'].values, df['Y'].values)
    df['lon'] = lons
    df['lat'] = lats

    # Filter to rough Vancouver bbox to remove far-away projections errors
    df = df[(df['lat'] > 48.0) & (df['lat'] < 50.5) & (df['lon'] > -125.0) & (df['lon'] < -122.0)]

    # severity score
    df[['severity_score', 'severity_color']] = df['TYPE'].apply(lambda x: pd.Series(classify_severity(x)))
    # We'll use severity_score as 'severity'
    df.rename(columns={'severity_score': 'severity'}, inplace=True)

    build_map(df)


if __name__ == '__main__':
    main()
