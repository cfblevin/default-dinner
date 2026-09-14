"""Draws the home-screen icon (the app's bowl illustration) as PNGs, no dependencies."""
import math, struct, sys, zlib, pathlib

def hexrgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
INK, BOWL, RIM = hexrgb('#141714'), hexrgb('#FFFFFF'), hexrgb('#E3E5E0')
SEGS = [(hexrgb('#EEE8D8'), 0.42), (hexrgb('#7B4A34'), 0.34), (hexrgb('#5A8A4A'), 0.24)]
SCALLION = hexrgb('#3C7631')
DOTS = [(44, 44), (55, 40), (50, 55), (40, 52), (58, 50), (47, 36), (62, 43)]

def color_at(u, v, pad):
    # map to the app's 100-unit bowl coordinates, leaving a safe-zone margin
    x = (u - pad) / (1 - 2 * pad) * 100
    y = (v - pad) / (1 - 2 * pad) * 100
    dx, dy = x - 50, y - 50
    d = math.hypot(dx, dy)
    if d > 48: return INK
    if d > 39.6: return BOWL
    if d > 38.9: return RIM
    for cx, cy in DOTS:  # green onion rings
        if abs(math.hypot(x - cx, y - cy) - 2.1) < 0.75: return SCALLION
    a = math.atan2(dy, dx)
    start = -math.pi / 2 - SEGS[0][1] * math.pi
    t = (a - start) % (2 * math.pi)
    acc = 0
    for col, frac in SEGS:
        end = acc + frac * 2 * math.pi
        if t < end:
            # thin white separator on the wedge edges
            if min(t - acc, end - t) * d < 0.9: return BOWL
            return col
        acc = end
    return SEGS[-1][0]

def render(size, pad, ss=3):
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            r = g = b = 0
            for sy in range(ss):
                for sx in range(ss):
                    c = color_at((px + (sx + .5) / ss) / size, (py + (sy + .5) / ss) / size, pad)
                    r += c[0]; g += c[1]; b += c[2]
            n = ss * ss
            row += bytes((r // n, g // n, b // n))
        rows.append(bytes(row))
    raw = b''.join(rows)
    def chunk(tag, data): return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')

out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else 'site/icons')
out.mkdir(parents=True, exist_ok=True)
for size, pad, name in [(180, 0.12, 'icon-180.png'), (192, 0.12, 'icon-192.png'), (512, 0.12, 'icon-512.png'), (512, 0.2, 'icon-maskable-512.png')]:
    (out / name).write_bytes(render(size, pad))
    print('wrote', name)
