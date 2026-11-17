#!/usr/bin/env python3
"""Buduje dane aplikacji Globtroter.

Wejście:
  - Natural Earth 1:50m admin 0 countries (GeoJSON, domena publiczna)
  - katalog flags/4x3 z paczki flag-icons (licencja MIT)
Wyjście (w app/):
  data/countries.json   kraje: nazwy, stolice, akceptowane odpowiedzi, kontynenty
  data/world.json       mapa świata (Equal Earth) + miniatury kontynentów
  data/maps/<id>.json   mapy kontynentów do gry (rzut azymutalny równopolowy Lamberta)
  flags/<kod>.svg       flagi
  precache.json         lista plików do pracy offline

Użycie:
  python3 -I tools/build_data.py NE_GEOJSON FLAGS_4X3_DIR [KATALOG_PODGLĄDÓW]
"""
import json
import math
import os
import re
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from countries_data import COUNTRIES, CONTINENTS  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
APP = os.path.join(ROOT, 'app')

# Fragmenty, które w grze należą do innego państwa.
MERGE = {'CYN': 'CY', 'SOL': 'SO', 'HKG': 'CN', 'MAC': 'CN', 'ALD': 'FI'}

R = 6371.0
MAP_W = 1000.0
PAD = 0.035        # margines wokół krajów kontynentu
EXPAND = 0.45      # ile tła (sąsiednich lądów) dookoła, żeby przy przesuwaniu nie było pustki
EPS_TARGET = 0.06  # uproszczenie konturów (jednostki mapy, szerokość 1000)
EPS_CONTEXT = 0.35
TINY_SIZE = 10.0   # kraj mniejszy niż tyle jednostek dostaje kółko na mapie


# ---------------------------------------------------------------- geometria

def ring_area(r):
    a = 0.0
    n = len(r)
    for i in range(n):
        x1, y1 = r[i]
        x2, y2 = r[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return a / 2.0


def bbox(points):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return min(xs), min(ys), max(xs), max(ys)


def clip_ring(pts, x0, y0, x1, y1):
    """Sutherland-Hodgman: przycięcie pierścienia do prostokąta."""
    def clip(pts, inside, inter):
        out = []
        if not pts:
            return out
        prev = pts[-1]
        pin = inside(prev)
        for cur in pts:
            cin = inside(cur)
            if cin:
                if not pin:
                    out.append(inter(prev, cur))
                out.append(cur)
            elif pin:
                out.append(inter(prev, cur))
            prev, pin = cur, cin
        return out

    def ix(a, b, x):
        t = (x - a[0]) / (b[0] - a[0])
        return (x, a[1] + t * (b[1] - a[1]))

    def iy(a, b, y):
        t = (y - a[1]) / (b[1] - a[1])
        return (a[0] + t * (b[0] - a[0]), y)

    pts = clip(pts, lambda p: p[0] >= x0, lambda a, b: ix(a, b, x0))
    pts = clip(pts, lambda p: p[0] <= x1, lambda a, b: ix(a, b, x1))
    pts = clip(pts, lambda p: p[1] >= y0, lambda a, b: iy(a, b, y0))
    pts = clip(pts, lambda p: p[1] <= y1, lambda a, b: iy(a, b, y1))
    return pts


def dp(pts, eps):
    if len(pts) < 3:
        return pts[:]
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    e2 = eps * eps
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]
        bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        l2 = dx * dx + dy * dy
        best, bi = -1.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            if l2 == 0:
                d = (px - ax) ** 2 + (py - ay) ** 2
            else:
                t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / l2))
                d = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2
            if d > best:
                best, bi = d, i
        if best > e2:
            keep[bi] = True
            stack.append((a, bi))
            stack.append((bi, b))
    return [p for p, k in zip(pts, keep) if k]


def simplify_ring(ring, eps):
    n = len(ring)
    if n <= 4 or eps <= 0:
        return ring
    x0, y0 = ring[0]
    far = max(range(n), key=lambda i: (ring[i][0] - x0) ** 2 + (ring[i][1] - y0) ** 2)
    a = dp(ring[:far + 1], eps)
    b = dp(ring[far:] + [ring[0]], eps)
    return a[:-1] + b[:-1]


def quantize(ring, q=10.0):
    out = []
    for x, y in ring:
        p = (round(x * q) / q, round(y * q) / q)
        if not out or out[-1] != p:
            out.append(p)
    if len(out) > 1 and out[0] == out[-1]:
        out.pop()
    return out


def point_in_rings(x, y, rings):
    inside = False
    for r in rings:
        n = len(r)
        j = n - 1
        for i in range(n):
            xi, yi = r[i]
            xj, yj = r[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                inside = not inside
            j = i
    return inside


def seg_dist2(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy
    if l2 == 0:
        return (px - ax) ** 2 + (py - ay) ** 2
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / l2))
    return (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2


def polylabel(rings, precision=0.5):
    """Najbardziej „wewnętrzny” punkt wielokąta (algorytm Mapbox polylabel)."""
    import heapq
    outer = rings[0]
    minx, miny, maxx, maxy = bbox(outer)
    w, h = maxx - minx, maxy - miny
    cell = min(w, h)
    if cell <= 0:
        return (minx + maxx) / 2, (miny + maxy) / 2

    def dist(x, y):
        inside = False
        best = float('inf')
        for r in rings:
            n = len(r)
            j = n - 1
            for i in range(n):
                ax, ay = r[i]
                bx, by = r[j]
                if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
                    inside = not inside
                d = seg_dist2(x, y, ax, ay, bx, by)
                if d < best:
                    best = d
                j = i
        return math.sqrt(best) * (1 if inside else -1)

    heap = []
    h2 = cell / 2
    y = miny
    while y < maxy:
        x = minx
        while x < maxx:
            d = dist(x + h2, y + h2)
            heapq.heappush(heap, (-(d + h2 * math.sqrt(2)), x + h2, y + h2, h2, d))
            x += cell
        y += cell
    # start: środek ciężkości
    a = ring_area(outer)
    cx = cy = 0.0
    if a != 0:
        n = len(outer)
        for i in range(n):
            x1, y1 = outer[i]
            x2, y2 = outer[(i + 1) % n]
            f = x1 * y2 - x2 * y1
            cx += (x1 + x2) * f
            cy += (y1 + y2) * f
        cx /= 6 * a
        cy /= 6 * a
    else:
        cx, cy = outer[0]
    best = (dist(cx, cy), cx, cy)
    bb = (dist(minx + w / 2, miny + h / 2), minx + w / 2, miny + h / 2)
    if bb[0] > best[0]:
        best = bb
    while heap:
        negmax, x, y, hh, d = heapq.heappop(heap)
        if d > best[0]:
            best = (d, x, y)
        if -negmax - best[0] <= precision:
            continue
        hh /= 2
        for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            nx, ny = x + sx * hh, y + sy * hh
            nd = dist(nx, ny)
            heapq.heappush(heap, (-(nd + hh * math.sqrt(2)), nx, ny, hh, nd))
    return best[1], best[2]


# ---------------------------------------------------------------- rzuty

def laea(lon0, lat0):
    l0 = math.radians(lon0)
    p0 = math.radians(lat0)
    sp0, cp0 = math.sin(p0), math.cos(p0)

    def f(lon, lat):
        lam = math.radians(lon) - l0
        phi = math.radians(lat)
        sp, cp, cl = math.sin(phi), math.cos(phi), math.cos(lam)
        d = max(1e-9, 1 + sp0 * sp + cp0 * cp * cl)
        k = math.sqrt(2 / d)
        return R * k * cp * math.sin(lam), R * k * (cp0 * sp - sp0 * cp * cl)
    return f


def angdist(lon0, lat0, lon, lat):
    p0, p1 = math.radians(lat0), math.radians(lat)
    c = math.sin(p0) * math.sin(p1) + math.cos(p0) * math.cos(p1) * math.cos(math.radians(lon - lon0))
    return math.degrees(math.acos(max(-1.0, min(1.0, c))))


def equal_earth(lon, lat):
    a1, a2, a3, a4 = 1.340264, -0.081106, 0.000893, 0.003796
    lam = math.radians(lon)
    th = math.asin(math.sqrt(3) / 2 * math.sin(math.radians(lat)))
    t2 = th * th
    t6 = t2 * t2 * t2
    x = 2 * math.sqrt(3) * lam * math.cos(th) / (3 * (9 * a4 * t6 * t2 + 7 * a3 * t6 + 3 * a2 * t2 + a1))
    y = th * (a1 + a2 * t2 + t6 * (a3 + a4 * t2))
    return x, y


# ---------------------------------------------------------------- zapis ścieżek SVG

def fmt(v):
    s = ('%.1f' % v).rstrip('0').rstrip('.')
    if s == '-0':
        s = '0'
    return s


def ring_path(ring):
    """Punkt startowy absolutnie, reszta względnie (krótszy zapis)."""
    x0, y0 = ring[0]
    parts = ['M%s %s' % (fmt(x0), fmt(y0))]
    if len(ring) > 1:
        rel = []
        px, py = x0, y0
        for x, y in ring[1:]:
            rel.append('%s %s' % (fmt(x - px), fmt(y - py)))
            px, py = x, y
        parts.append('l' + ' '.join(rel))
    return ''.join(parts) + 'z'


def rings_path(rings):
    return ''.join(ring_path(r) for r in rings if len(r) >= 3)


# ---------------------------------------------------------------- wczytanie danych

def load_geo(path):
    d = json.load(open(path, encoding='utf-8'))
    geo = {}       # kod -> {'polys': [...], 'label': (lon, lat)}
    extras = []    # terytoria bez własnego kodu w grze
    for f in d['features']:
        p = f['properties']
        g = f['geometry']
        if not g:
            continue
        a3 = p['ADM0_A3']
        if a3 == 'ATA':
            continue
        code = MERGE.get(a3)
        if not code and p.get('TYPE') != 'Dependency':
            for k in ('ISO_A2_EH', 'ISO_A2'):
                v = p.get(k) or ''
                if len(v) == 2 and v.isalpha():
                    code = v
                    break
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        polys = [[[(pt[0], pt[1]) for pt in ring[:-1]] for ring in poly] for poly in polys]
        if code:
            e = geo.setdefault(code, {'polys': [], 'label': None})
            e['polys'].extend(polys)
            if a3 not in MERGE:
                e['label'] = (p['LABEL_X'], p['LABEL_Y'])
        else:
            extras.append({'polys': polys, 'label': (p['LABEL_X'], p['LABEL_Y']), 'name': p['NAME']})
    return geo, extras


# ---------------------------------------------------------------- mapa kontynentu

def build_continent(cont, geo, extras, meta, preview_dir=None):
    cid, cname, (lon0, lat0), box = cont[:4]
    skip = cont[4] if len(cont) > 4 else []
    proj = laea(lon0, lat0)
    known = {c['code'] for c in meta}
    tcodes = [c['code'] for c in meta if cid in c['continents']]

    def nlon(lon):
        return (lon - lon0 + 180) % 360 - 180 + lon0

    # 1. kadr: wierzchołki krajów kontynentu leżące w obszarze dopasowania
    xs, ys = [], []
    for code in tcodes:
        for poly in geo[code]['polys']:
            for lon, lat in poly[0]:
                L = nlon(lon)
                if box[0] <= L <= box[2] and box[1] <= lat <= box[3] and not any(
                        b[0] <= L <= b[2] and b[1] <= lat <= b[3] for b in skip):
                    x, y = proj(L, lat)
                    xs.append(x)
                    ys.append(y)
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    pw, ph = (x1 - x0) * PAD, (y1 - y0) * PAD
    x0, x1, y0, y1 = x0 - pw, x1 + pw, y0 - ph, y1 + ph
    S = MAP_W / (x1 - x0)
    H = (y1 - y0) * S
    ex = (-EXPAND * MAP_W, -EXPAND * H, (1 + EXPAND) * MAP_W, (1 + EXPAND) * H)

    def to_units(lon, lat):
        x, y = proj(lon, lat)
        return (x - x0) * S, (y1 - y) * S

    def visible_poly(poly):
        ring = poly[0]
        step = max(1, len(ring) // 40)
        ds = [angdist(lon0, lat0, lon, lat) for lon, lat in ring[::step]]
        return min(ds) < 108 and max(ds) < 150

    def project_polys(polys, eps):
        """-> lista wielokątów (pierścienie w jednostkach mapy), przycięta do rozszerzonego kadru."""
        out = []
        ex_area = (ex[2] - ex[0]) * (ex[3] - ex[1])
        for poly in polys:
            if not visible_poly(poly):
                continue
            rings = []
            for ri, ring in enumerate(poly):
                pr = [to_units(lon, lat) for lon, lat in ring]
                pr = clip_ring(pr, *ex)
                if len(pr) < 3:
                    if ri == 0:
                        break
                    continue
                if abs(ring_area(pr)) > 0.9 * ex_area:
                    print('  ! pominięto pierścień obejmujący cały kadr', file=sys.stderr)
                    if ri == 0:
                        break
                    continue
                rings.append(pr)
            if rings:
                out.append(rings)
        return out

    items = []
    target_geom = {}
    for code, e in geo.items():
        is_t = code in tcodes
        polys = project_polys(e['polys'], 0)
        if not polys:
            continue
        if is_t:
            target_geom[code] = polys
        else:
            rings = []
            for poly in polys:
                for r in poly:
                    r = quantize(simplify_ring(r, EPS_CONTEXT))
                    if len(r) >= 3 and abs(ring_area(r)) >= 0.3:
                        rings.append(r)
            if rings:
                items.append({'c': code if code in known else None, 't': 0, 'd': rings_path(rings), '_r': rings})
    for e in extras:
        polys = project_polys(e['polys'], 0)
        rings = []
        for poly in polys:
            for r in poly:
                r = quantize(simplify_ring(r, EPS_CONTEXT))
                if len(r) >= 3 and abs(ring_area(r)) >= 0.3:
                    rings.append(r)
        if rings:
            items.append({'c': None, 't': 0, 'd': rings_path(rings), '_r': rings})

    missing = [c for c in tcodes if c not in target_geom]
    if missing:
        raise SystemExit('Brak geometrii dla %s na mapie %s' % (missing, cid))

    # 2. kraje kontynentu: kontury, podpisy, małe państwa, kolory
    view = (0.0, 0.0, MAP_W, H)
    vkeys = {}
    targets = []
    for code in tcodes:
        polys = target_geom[code]
        all_rings = []
        biggest = None
        biggest_area = -1.0
        for poly in polys:
            for r in poly:
                for p in r:
                    vkeys.setdefault((round(p[0] * 4), round(p[1] * 4)), set()).add(code)
            # największy wielokąt w kadrze (do podpisu)
            outer_v = clip_ring(poly[0], *view)
            if len(outer_v) >= 3:
                a = abs(ring_area(outer_v))
                if a > biggest_area:
                    holes = [clip_ring(h, *view) for h in poly[1:]]
                    biggest_area = a
                    biggest = [outer_v] + [h for h in holes if len(h) >= 3]
            for ri, r in enumerate(poly):
                q = quantize(simplify_ring(r, EPS_TARGET))
                if len(q) >= 3 and (abs(ring_area(q)) >= 0.02 or ri == 0):
                    all_rings.append(q)
        if biggest is None:   # kraj tylko w rozszerzonym kadrze
            biggest = max(polys, key=lambda p: abs(ring_area(p[0])))
            biggest_area = abs(ring_area(biggest[0]))
        bx0, by0, bx1, by1 = bbox(biggest[0])
        tiny = max(bx1 - bx0, by1 - by0) < TINY_SIZE
        # podpis: punkt z Natural Earth, jeśli leży w kraju i w kadrze; inaczej polylabel
        lab = None
        if geo[code]['label']:
            lx, ly = to_units(nlon(geo[code]['label'][0]), geo[code]['label'][1])
            inside_view = 0 <= lx <= MAP_W and 0 <= ly <= H
            if inside_view and (tiny or any(point_in_rings(lx, ly, p) for p in polys)):
                lab = (lx, ly)
        if lab is None:
            simp = [simplify_ring(r, 0.8) for r in biggest]
            simp = [r for r in simp if len(r) >= 3] or biggest
            lab = polylabel(simp, 0.5)
        ob = bbox([p for r in all_rings for p in r]) if all_rings else (bx0, by0, bx1, by1)
        targets.append({
            'c': code, 't': 1, 'd': rings_path(all_rings),
            'lx': round(lab[0], 1), 'ly': round(lab[1], 1),
            'tiny': 1 if tiny else 0,
            'bb': [round(v, 1) for v in ob],
            'lb': [round(bx1 - bx0, 1), round(by1 - by0, 1)],
            '_area': biggest_area,
        })

    # kolory: sąsiedzi (wspólne wierzchołki) dostają różne barwy
    nb = {t['c']: {} for t in targets}
    for codes in vkeys.values():
        if len(codes) > 1:
            for a in codes:
                for b in codes:
                    if a != b:
                        nb[a][b] = nb[a].get(b, 0) + 1
    adj = {a: {b for b, n in v.items() if n >= 2} for a, v in nb.items()}
    order = sorted(adj, key=lambda c: -len(adj[c]))
    color = {}
    for c in order:
        used = {color[n] for n in adj[c] if n in color}
        k = 0
        while k in used:
            k += 1
        color[c] = k
    for t in targets:
        t['k'] = color[t['c']] % 7

    targets.sort(key=lambda t: -t['_area'])
    for t in targets:
        del t['_area']
    for it in items:
        del it['_r']

    # siatka kartograficzna
    grat = []
    gx = (ex[0] - 20, ex[1] - 20, ex[2] + 20, ex[3] + 20)

    def add_line(pts):
        run = []
        for lon, lat in pts:
            if angdist(lon0, lat0, lon, lat) > 100:
                p = None
            else:
                p = to_units(lon, lat)
                if not (gx[0] <= p[0] <= gx[2] and gx[1] <= p[1] <= gx[3]):
                    p = None
            if p is None:
                if len(run) > 1:
                    grat.append(run)
                run = []
            else:
                run.append(p)
        if len(run) > 1:
            grat.append(run)

    for lon in range(-180, 180, 10):
        add_line([(lon, lat) for lat in range(-80, 81, 2)])
    for lat in range(-80, 81, 10):
        add_line([(lon, lat) for lon in range(-180, 181, 2)])
    gpath = ''
    for run in grat:
        run = quantize(dp(run, 0.3))
        if len(run) > 1:
            gpath += 'M%s %sl%s' % (fmt(run[0][0]), fmt(run[0][1]), ' '.join(
                '%s %s' % (fmt(b[0] - a[0]), fmt(b[1] - a[1])) for a, b in zip(run, run[1:])))

    out = {
        'id': cid, 'name': cname, 'w': MAP_W, 'h': round(H, 1),
        'ext': [round(v, 1) for v in ex], 'grat': gpath,
        'items': items + targets,
    }
    if preview_dir:
        write_preview(os.path.join(preview_dir, cid + '.svg'), out)
    return out


def write_preview(path, m):
    pal = ['#f6c26b', '#8fd3c1', '#f3a0a8', '#a9c6f5', '#c9b6ef', '#b8e08f', '#f7d6a0']
    w, h = m['w'], m['h']
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s %s %s %s" width="1200" height="%d">' % (
        -60, -60, w + 120, h + 120, int(1200 * (h + 120) / (w + 120)))]
    parts.append('<rect x="-500" y="-500" width="3000" height="3000" fill="#a8d5f7"/>')
    parts.append('<path d="%s" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width=".6"/>' % m['grat'])
    for it in m['items']:
        fill = pal[it['k']] if it['t'] else '#e3ddd0'
        parts.append('<path d="%s" fill="%s" fill-rule="evenodd" stroke="#fff" stroke-width=".7"/>' % (it['d'], fill))
    for it in m['items']:
        if it['t']:
            if it['tiny']:
                parts.append('<circle cx="%s" cy="%s" r="5" fill="none" stroke="#c0392b" stroke-width="1.2"/>' % (
                    it['lx'], it['ly']))
            parts.append('<text x="%s" y="%s" font-size="7" text-anchor="middle" font-family="Helvetica">%s</text>' % (
                it['lx'], it['ly'] + 2.5, it['c']))
    parts.append('<rect x="0" y="0" width="%s" height="%s" fill="none" stroke="#d33" stroke-dasharray="6 4"/>' % (w, h))
    parts.append('</svg>')
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts))


# ---------------------------------------------------------------- mapa świata

def build_world(geo, extras, meta, maps):
    known = {c['code'] for c in meta}
    W = MAP_W
    xmax = equal_earth(180, 0)[0]
    ytop = equal_earth(0, 84)[1]
    ybot = equal_earth(0, -57)[1]
    S = W / (2 * xmax)
    H = (ytop - ybot) * S

    def to_units(lon, lat):
        x, y = equal_earth(lon, lat)
        return (x + xmax) * S, (ytop - y) * S

    items = []

    def add(code, polys, label):
        rings = []
        biggest, ba = None, -1.0
        for poly in polys:
            for ri, ring in enumerate(poly):
                pr = [to_units(lon, max(-57, min(84, lat))) for lon, lat in ring]
                if ri == 0:
                    a = abs(ring_area(pr))
                    if a > ba:
                        ba, biggest = a, pr
                q = quantize(simplify_ring(pr, 0.45))
                if len(q) >= 3 and abs(ring_area(q)) >= 0.15:
                    rings.append(q)
        if not rings and code not in known:
            return
        it = {'c': code if code in known else None, 'd': rings_path(rings)}
        if it['c']:
            if label:
                lx, ly = to_units(*label)
            else:
                b = bbox(biggest)
                lx, ly = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            it['lx'], it['ly'] = round(lx, 1), round(ly, 1)
            b = bbox([p for r in rings for p in r]) if rings else (lx, ly, lx, ly)
            it['bb'] = [round(v, 1) for v in b]
        items.append(it)

    for code, e in geo.items():
        add(code, e['polys'], e['label'])
    for e in extras:
        add(None, e['polys'], None)

    # miniatury kontynentów: kształt mapy z gry, mocno uproszczony
    thumbs = {}
    for m in maps:
        t_rings, c_rings = [], []
        for it in m['items']:
            rings = parse_path(it['d'])
            for r in rings:
                r = clip_ring(r, 0, 0, m['w'], m['h'])
                if len(r) < 3:
                    continue
                r = quantize(simplify_ring(r, 1.6 if it['t'] else 2.4), 1)
                if len(r) >= 3 and abs(ring_area(r)) >= (2 if it['t'] else 6):
                    (t_rings if it['t'] else c_rings).append(r)
        thumbs[m['id']] = {'w': m['w'], 'h': m['h'], 't': rings_path(t_rings), 'x': rings_path(c_rings)}
    return {'w': W, 'h': round(H, 1), 'items': items, 'thumbs': thumbs}


def parse_path(d):
    rings = []
    for sub in re.findall(r'M[^M]+', d):
        sub = sub.rstrip('z')
        head, _, rel = sub[1:].partition('l')
        x, y = map(float, head.split())
        ring = [(x, y)]
        nums = [float(v) for v in rel.split()] if rel else []
        for i in range(0, len(nums) - 1, 2):
            x += nums[i]
            y += nums[i + 1]
            ring.append((x, y))
        rings.append(ring)
    return rings


# ---------------------------------------------------------------- flagi

BAD_SVG = re.compile(r'<script|<foreignObject|\son[a-z]+\s*=|javascript:|href\s*=\s*["\'](?!#)', re.I)


def copy_flags(src_dir, meta):
    out_dir = os.path.join(APP, 'flags')
    os.makedirs(out_dir, exist_ok=True)
    files = []
    for c in meta:
        name = c['code'].lower() + '.svg'
        with open(os.path.join(src_dir, name), encoding='utf-8') as f:
            svg = f.read()
        if BAD_SVG.search(svg):
            raise SystemExit('Podejrzana zawartość w %s' % name)
        svg = re.sub(r'>\s+<', '><', svg.strip())
        svg = re.sub(r'\s{2,}', ' ', svg)
        with open(os.path.join(out_dir, name), 'w', encoding='utf-8') as f:
            f.write(svg)
        files.append('flags/' + name)
    lic = os.path.join(src_dir, '..', '..', 'LICENSE')
    if os.path.exists(lic):
        shutil.copyfile(lic, os.path.join(out_dir, 'LICENSE'))
    return files


# ---------------------------------------------------------------- main

def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    ne_path, flags_dir = sys.argv[1], sys.argv[2]
    preview_dir = sys.argv[3] if len(sys.argv) > 3 else None
    if preview_dir:
        os.makedirs(preview_dir, exist_ok=True)

    codes = [c['code'] for c in COUNTRIES]
    dup = {c for c in codes if codes.count(c) > 1}
    if dup:
        raise SystemExit('Powtórzone kody: %s' % dup)

    geo, extras = load_geo(ne_path)
    miss = [c for c in codes if c not in geo]
    if miss:
        raise SystemExit('Brak w Natural Earth: %s' % miss)

    os.makedirs(os.path.join(APP, 'data', 'maps'), exist_ok=True)
    written = []

    def dump(rel, obj):
        p = os.path.join(APP, rel)
        with open(p, 'w', encoding='utf-8') as f:
            json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        written.append(rel)
        print('  %-28s %7.1f KB' % (rel, os.path.getsize(p) / 1024))

    dump('data/countries.json', {
        'continents': [{'id': c[0], 'name': c[1]} for c in CONTINENTS],
        'countries': COUNTRIES,
    })
    maps = []
    for cont in CONTINENTS:
        m = build_continent(cont, geo, extras, COUNTRIES, preview_dir)
        n_t = sum(1 for it in m['items'] if it['t'])
        n_tiny = sum(1 for it in m['items'] if it['t'] and it['tiny'])
        print('%s: %d krajów (%d małych), kadr 1000 x %.0f' % (cont[1], n_t, n_tiny, m['h']))
        dump('data/maps/%s.json' % cont[0], m)
        maps.append(m)
    dump('data/world.json', build_world(geo, extras, COUNTRIES, maps))
    written += copy_flags(flags_dir, COUNTRIES)
    with open(os.path.join(APP, 'precache.json'), 'w', encoding='utf-8') as f:
        json.dump(written, f, ensure_ascii=False, indent=0)
    print('Gotowe: %d plików' % len(written))


if __name__ == '__main__':
    main()
