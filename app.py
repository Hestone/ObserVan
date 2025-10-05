from flask import Flask, send_from_directory, render_template, request, jsonify
from flask_cors import CORS
import pandas as pd
from pathlib import Path
from pyproj import Transformer

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

CSV_PATH = Path(__file__).parent / 'crimedata_csv_AllNeighbourhoods_2025.csv'


def load_and_prepare():
    df = pd.read_csv(CSV_PATH)
    df = df.dropna(subset=['X', 'Y'])
    df['X'] = df['X'].astype(float)
    df['Y'] = df['Y'].astype(float)
    # Try common projections
    candidates = [3347, 26910]
    transformer = None
    for epsg in candidates:
        try:
            t = Transformer.from_crs(f'epsg:{epsg}', 'epsg:4326', always_xy=True)
            lon, lat = t.transform(df['X'].iloc[0], df['Y'].iloc[0])
            if 48.0 <= lat <= 50.5 and -125 <= lon <= -122:
                transformer = t
                break
        except Exception:
            continue
    if transformer is None:
        raise RuntimeError('Unknown source CRS; update app to use the correct EPSG for X/Y')
    lons, lats = transformer.transform(df['X'].values, df['Y'].values)
    df['lon'] = lons
    df['lat'] = lats
    df = df[(df['lat'] > 48.0) & (df['lat'] < 50.5) & (df['lon'] > -125.0) & (df['lon'] < -122.0)]
    # prepare date
    df['date'] = pd.to_datetime(df[['YEAR','MONTH','DAY']])
    return df


def load_raw_df():
    """Read the CSV without spatial filtering — used for metadata like types."""
    df = pd.read_csv(CSV_PATH)
    return df


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/data')
def get_data():
    # Returns GeoJSON filtered by query params: start, end, type, neighbourhood
    df = load_and_prepare()
    start = request.args.get('start')
    end = request.args.get('end')
    crime_type = request.args.get('type')
    neighbourhood = request.args.get('neighbourhood')
    if start:
        df = df[df['date'] >= pd.to_datetime(start)]
    if end:
        df = df[df['date'] <= pd.to_datetime(end)]
    if crime_type:
        # allow multiple comma-separated types; match any
        parts = [p.strip() for p in crime_type.split(',') if p.strip()]
        if parts:
            pattern = '|'.join([p.replace('\n',' ').replace('\r',' ') for p in parts])
            df = df[df['TYPE'].str.contains(pattern, case=False, na=False)]
    if neighbourhood:
        df = df[df['NEIGHBOURHOOD'].str.contains(neighbourhood, case=False, na=False)]

    # Build GeoJSON
    features = []
    for _, r in df.iterrows():
        props = {
            'type': r['TYPE'],
            'date': r['date'].strftime('%Y-%m-%d'),
            'hour': int(r.get('HOUR', -1)),
            'neighbourhood': r.get('NEIGHBOURHOOD', ''),
            'hundred_block': r.get('HUNDRED_BLOCK', '')
        }
        features.append({
            'type': 'Feature',
            'geometry': {'type': 'Point', 'coordinates': [float(r['lon']), float(r['lat'])]},
            'properties': props
        })
    geojson = {'type': 'FeatureCollection', 'features': features}
    return jsonify(geojson)


@app.route('/neighbourhoods')
def neighbourhoods():
    df = load_and_prepare()
    groups = df.groupby('NEIGHBOURHOOD').agg({'lat': ['min','max'], 'lon': ['min','max']})
    out = []
    for name, row in groups.iterrows():
        latmin, latmax = row[('lat','min')], row[('lat','max')]
        lonmin, lonmax = row[('lon','min')], row[('lon','max')]
        out.append({'neighbourhood': name, 'bounds': [latmin, lonmin, latmax, lonmax]})
    return jsonify(sorted(out, key=lambda x: x['neighbourhood']))


@app.route('/types')
def types():
    # Use the raw CSV so we return every TYPE present in the file
    df = load_raw_df()
    # strip whitespace and dropna, then dedupe
    types = df['TYPE'].dropna().astype(str).str.strip()
    types = sorted(types[types.map(lambda x: len(x) > 0)].unique().tolist())
    return jsonify(types)


@app.route('/date_meta')
def date_meta():
    # Return fixed months/years range as requested
    months = list(range(1, 13))
    years = list(range(2020, 2026))  # 2020..2025 inclusive
    return jsonify({'years': years, 'months': months})


if __name__ == '__main__':
    app.run(debug=True)
