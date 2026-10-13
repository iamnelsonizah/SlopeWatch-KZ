#!/usr/bin/env python3
"""
Builds the hazard datasets in public/data from open sources (run once; outputs are committed).

  pip install shapely
  python3 scripts/build-data.py

Sources
  GEM Global Active Faults database (GAF-DB), harmonized   https://github.com/GEMScienceTools/gem-global-active-faults
  Natural Earth populated places                           https://www.naturalearthdata.com

Outputs
  public/data/kz-faults.geojson    fault and fold traces within ~150 km of Kazakhstan, with slip type and rate
  public/data/kz-context.geojson   Kazakhstan buffered by ~100 km (used to keep nearby earthquakes)
  public/data/kz-cities.geojson    cities in Kazakhstan with population and distance to the nearest mapped active fault
"""
import json, math, os, re, urllib.request, warnings
warnings.filterwarnings('ignore')
from shapely.geometry import shape, mapping
from shapely.ops import unary_union, nearest_points

CACHE = '.cache'
GEM = 'https://raw.githubusercontent.com/GEMScienceTools/gem-global-active-faults/master/geojson/gem_active_faults_harmonized.geojson'
NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson'

def get(path, url):
    if not os.path.exists(path):
        print('downloading', url); urllib.request.urlretrieve(url, path)
    return json.load(open(path))

def rnd(g, p=4):
    try:
        from shapely import set_precision
        return set_precision(g, 10 ** -p)
    except Exception:
        return g

def write(path, feats):
    json.dump({'type': 'FeatureCollection', 'features': feats}, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'{path}: {len(feats)} features, {os.path.getsize(path)/1024:.0f} KB')

kz = shape(json.load(open('public/data/kz-border.geojson'))['features'][0]['geometry'])
adm1 = [(f['properties']['shapeName'], shape(f['geometry'])) for f in json.load(open('public/data/kz-adm1.geojson'))['features']]

# ---- context buffer ----
ctx = kz.buffer(1.0).simplify(0.02)
write('public/data/kz-context.geojson', [{'type': 'Feature', 'properties': {}, 'geometry': mapping(rnd(ctx, 3))}])

# ---- faults ----
def tup(v):
    """GEM stores values as '(best,min,max)'. Returns (best, min, max) as floats or None."""
    if not v: return (None, None, None)
    parts = v.strip('()').split(',')
    out = []
    for p in (parts + ['', '', ''])[:3]:
        try: out.append(float(p))
        except ValueError: out.append(None)
    return tuple(out)

SLIP = {'Reverse': 'Reverse (thrust)', 'Dextral': 'Strike-slip, right-lateral', 'Sinistral': 'Strike-slip, left-lateral',
        'Normal': 'Normal', 'Dextral-Reverse': 'Right-lateral reverse', 'Sinistral-Reverse': 'Left-lateral reverse',
        'Dextral-Normal': 'Right-lateral normal', 'Sinistral-Normal': 'Left-lateral normal', 'Anticline': 'Anticline (fold)', 'Syncline': 'Syncline (fold)'}
near = kz.buffer(1.5)
gem = get(f'{CACHE}/gem_faults.geojson', GEM)
faults = []
for f in gem['features']:
    if not f['geometry']: continue
    g = shape(f['geometry'])
    if not g.intersects(near): continue
    p = f['properties']; st = p.get('slip_type') or ''
    rate = tup(p.get('net_slip_rate')); dip = tup(p.get('average_dip')); up = tup(p.get('upper_seis_depth')); lo = tup(p.get('lower_seis_depth'))
    inside = g.intersects(kz)
    g = g.intersection(near)
    if g.is_empty: continue
    props = {'id': f"{p.get('catalog_name','GEM')}-{p.get('catalog_id','')}", 'catalog': p.get('catalog_name') or '', 'kind': 'fold' if st in ('Anticline', 'Syncline') else 'fault',
             'slip': st or 'Unknown', 'slipLabel': SLIP.get(st, st or 'Unknown'), 'inside': bool(inside)}
    if rate[0] is not None: props['rate'] = rate[0]
    if rate[1] is not None and rate[2] is not None: props['rateRange'] = f'{rate[1]}–{rate[2]}'
    if dip[0] is not None: props['dip'] = dip[0]
    if up[0] is not None: props['upperDepth'] = up[0]
    if lo[0] is not None: props['lowerDepth'] = lo[0]
    if p.get('epistemic_quality'): props['quality'] = p['epistemic_quality']
    faults.append({'type': 'Feature', 'properties': props, 'geometry': mapping(rnd(g.simplify(0.003, preserve_topology=True)))})
write('public/data/kz-faults.geojson', faults)
fault_geoms = unary_union([shape(f['geometry']) for f in faults if f['properties']['kind'] == 'fault'])

# ---- cities ----
def km(a, b):
    k = math.cos(math.radians((a.y + b.y) / 2))
    return math.hypot((a.x - b.x) * k * 111.32, (a.y - b.y) * 110.57)
ne = get(f'{CACHE}/ne_populated.geojson', NE)
cities = []
for f in ne['features']:
    p = f['properties']
    if p.get('adm0_a3') != 'KAZ' and p.get('iso_a2') != 'KZ': continue
    pt = shape(f['geometry'])
    if not kz.contains(pt): continue
    pop = p.get('pop_max') or 0
    if pop < 15000: continue
    reg = next((n for n, g in adm1 if g.contains(pt)), p.get('adm1name') or '')
    q = nearest_points(pt, fault_geoms)[1]
    cities.append({'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [round(pt.x, 4), round(pt.y, 4)]},
                   'properties': {'name': p.get('name'), 'pop': int(pop), 'region': reg, 'faultKm': round(km(pt, q), 1)}})
RENAME = {'Nur-Sultan': 'Astana', 'Qaraghandy': 'Karaganda', 'Aqtobe': 'Aktobe', 'Qostanay': 'Kostanay', 'Qyzylorda': 'Kyzylorda', 'Aqtau': 'Aktau', 'Oral': 'Oral', 'Shymkent': 'Shymkent'}
for c in cities: c['properties']['name'] = RENAME.get(c['properties']['name'], c['properties']['name'])
cities.sort(key=lambda c: -c['properties']['pop'])
write('public/data/kz-cities.geojson', cities)
print('nearest-fault top 8:', [(c['properties']['name'], c['properties']['faultKm']) for c in sorted(cities, key=lambda c: c['properties']['faultKm'])[:8]])
