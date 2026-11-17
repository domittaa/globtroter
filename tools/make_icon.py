#!/usr/bin/env python3
"""Ikona aplikacji: globus (prawdziwe kontury z Natural Earth) z polską flagą wbitą w Polskę.

Użycie: python3 -I tools/make_icon.py NE_GEOJSON
Tworzy app/icons/icon.svg oraz PNG (180, 192, 512, maskable-512) przez qlmanage i sips (macOS).
"""
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_data import simplify_ring  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(ROOT, 'app', 'icons')

LON0, LAT0 = 14, 30
CX, CY, R = 500, 560, 318


def ortho(lon, lat):
    lam = math.radians(lon - LON0)
    phi = math.radians(lat)
    p0 = math.radians(LAT0)
    cosc = math.sin(p0) * math.sin(phi) + math.cos(p0) * math.cos(phi) * math.cos(lam)
    x = math.cos(phi) * math.sin(lam)
    y = math.cos(p0) * math.sin(phi) - math.sin(p0) * math.cos(phi) * math.cos(lam)
    if cosc < 0:   # tył kuli: punkt na krawędź
        n = math.hypot(x, y) or 1
        x, y = x / n, y / n
    return CX + R * x, CY - R * y, cosc


def land_path(ne_path):
    d = json.load(open(ne_path, encoding='utf-8'))
    parts = []
    for f in d['features']:
        g = f['geometry']
        if not g or f['properties']['ADM0_A3'] == 'ATA':
            continue
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in polys:
            for ring in poly[:1]:
                pts = [ortho(lon, lat) for lon, lat in ring]
                if all(p[2] < 0 for p in pts) or len(pts) < 4:
                    continue
                pts = simplify_ring([(p[0], p[1]) for p in pts], 1.1)
                if len(pts) < 3:
                    continue
                parts.append('M' + 'L'.join('%d %d' % (round(p[0]), round(p[1])) for p in pts) + 'Z')
    return ''.join(parts)


def art(land):
    bx, by, _ = ortho(19.4, 52.1)          # Polska
    tx, ty = bx + 70, by - 300              # szczyt masztu
    fw, fh = 230, 150                       # flaga
    x0, y0 = tx, ty + 6

    def wave(y, k=1.0):
        return 'C%.1f %.1f %.1f %.1f %.1f %.1f' % (x0 + fw * .33, y - 26 * k, x0 + fw * .66, y + 26 * k, x0 + fw, y)

    def wave_back(y, k=1.0):
        return 'C%.1f %.1f %.1f %.1f %.1f %.1f' % (x0 + fw * .66, y + 26 * k, x0 + fw * .33, y - 26 * k, x0, y)

    white = 'M%.1f %.1f %s L%.1f %.1f %s Z' % (x0, y0, wave(y0), x0 + fw, y0 + fh / 2, wave_back(y0 + fh / 2))
    red = 'M%.1f %.1f %s L%.1f %.1f %s Z' % (x0, y0 + fh / 2, wave(y0 + fh / 2), x0 + fw, y0 + fh, wave_back(y0 + fh))
    return f'''
  <ellipse cx="{CX}" cy="{CY + R + 34}" rx="{R * .78:.0f}" ry="34" fill="#2a1a6e" opacity=".22"/>
  <circle cx="{CX}" cy="{CY}" r="{R + 14}" fill="#fff" opacity=".22"/>
  <circle cx="{CX}" cy="{CY}" r="{R}" fill="url(#ocean)"/>
  <g clip-path="url(#globe)">
    <path d="{land}" fill="url(#land)" stroke="#2a9d5c" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="{CX}" cy="{CY}" r="{R}" fill="url(#shade)"/>
  </g>
  <ellipse cx="{CX - R * .38:.0f}" cy="{CY - R * .45:.0f}" rx="{R * .34:.0f}" ry="{R * .2:.0f}" fill="#fff" opacity=".28"
    transform="rotate(-32 {CX - R * .38:.0f} {CY - R * .45:.0f})"/>
  <line x1="{bx:.1f}" y1="{by:.1f}" x2="{tx:.1f}" y2="{ty:.1f}" stroke="#5b4636" stroke-width="15" stroke-linecap="round"/>
  <line x1="{bx - 3:.1f}" y1="{by:.1f}" x2="{tx - 3:.1f}" y2="{ty:.1f}" stroke="#8d6e57" stroke-width="5" stroke-linecap="round"/>
  <g filter="url(#fs)">
    <path d="{white}" fill="#ffffff"/>
    <path d="{red}" fill="#e8213f"/>
  </g>
  <circle cx="{tx:.1f}" cy="{ty - 4:.1f}" r="17" fill="url(#gold)"/>
  <ellipse cx="{bx:.1f}" cy="{by + 3:.1f}" rx="20" ry="8" fill="#1b5e3a" opacity=".45"/>'''


def svg(land, scale=1.0):
    t = '' if scale == 1 else f' transform="translate({512 * (1 - scale):.1f} {512 * (1 - scale):.1f}) scale({scale})"'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5a78ff"/><stop offset=".52" stop-color="#7c5cff"/><stop offset="1" stop-color="#ff6fa2"/>
    </linearGradient>
    <radialGradient id="ocean" cx=".36" cy=".3" r=".8">
      <stop offset="0" stop-color="#8ee3ff"/><stop offset=".55" stop-color="#2f9bf0"/><stop offset="1" stop-color="#1957c9"/>
    </radialGradient>
    <linearGradient id="land" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#9af0a0"/><stop offset="1" stop-color="#3cc874"/>
    </linearGradient>
    <radialGradient id="shade" cx=".38" cy=".32" r=".75">
      <stop offset=".6" stop-color="#0b2a7a" stop-opacity="0"/><stop offset="1" stop-color="#0b2a7a" stop-opacity=".42"/>
    </radialGradient>
    <radialGradient id="gold" cx=".35" cy=".3" r=".8">
      <stop offset="0" stop-color="#fff2a8"/><stop offset="1" stop-color="#f2a400"/>
    </radialGradient>
    <clipPath id="globe"><circle cx="{CX}" cy="{CY}" r="{R}"/></clipPath>
    <filter id="fs" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#1a0b4d" flood-opacity=".35"/>
    </filter>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <circle cx="860" cy="150" r="260" fill="#fff" opacity=".12"/>
  <g{t}>{art(land)}
  </g>
</svg>'''


def rasterize(svg_path, size, out_png):
    tmp = tempfile.mkdtemp()
    subprocess.run(['qlmanage', '-t', '-s', '1024', '-o', tmp, svg_path], check=True, capture_output=True)
    big = os.path.join(tmp, os.path.basename(svg_path) + '.png')
    subprocess.run(['sips', '-z', str(size), str(size), big, '--out', out_png], check=True, capture_output=True)
    shutil.rmtree(tmp)


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    os.makedirs(OUT, exist_ok=True)
    land = land_path(sys.argv[1])
    main_svg = os.path.join(OUT, 'icon.svg')
    with open(main_svg, 'w', encoding='utf-8') as f:
        f.write(svg(land))
    mask_svg = os.path.join(tempfile.mkdtemp(), 'icon-maskable.svg')
    with open(mask_svg, 'w', encoding='utf-8') as f:
        f.write(svg(land, 0.8))
    for n in (180, 192, 512):
        rasterize(main_svg, n, os.path.join(OUT, 'icon-%d.png' % n))
    rasterize(mask_svg, 512, os.path.join(OUT, 'icon-maskable-512.png'))
    print('Ikony gotowe:', sorted(os.listdir(OUT)))


if __name__ == '__main__':
    main()
