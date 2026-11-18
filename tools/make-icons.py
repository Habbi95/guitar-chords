"""Write the app icons (dark square, amber guitar pick) with the standard library only."""
import struct, zlib, sys, os

BG = (18, 20, 24, 255)
PICK = (240, 166, 58, 255)
HOLE = (18, 20, 24, 255)

def inside_pick(x, y):
    # Reuleaux-style triangle pointing down: inside all three circles centred on the opposite corners
    corners = [(-0.8, -0.5), (0.8, -0.5), (0.0, 0.88)]
    r = 1.6
    return all((x - cx) ** 2 + (y - cy) ** 2 <= r * r for cx, cy in corners) and (x * x + (y + 0.05) ** 2) <= 0.98

def png(size, path):
    rows = []
    ss = 3  # supersampling for smooth edges
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            acc = 0
            for sy in range(ss):
                for sx in range(ss):
                    x = ((px + (sx + .5) / ss) / size) * 2 - 1
                    y = ((py + (sy + .5) / ss) / size) * 2 - 1
                    acc += inside_pick(x / 0.72, y / 0.72)
            a = acc / (ss * ss)
            c = tuple(round(BG[i] * (1 - a) + PICK[i] * a) for i in range(4))
            row += bytes(c)
        rows.append(bytes(row))
    raw = b''.join(rows)
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f: f.write(data)

out = sys.argv[1] if len(sys.argv) > 1 else 'icons'
os.makedirs(out, exist_ok=True)
for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png'), (180, 'apple-touch-icon.png'), (32, 'favicon-32.png')]:
    png(size, os.path.join(out, name))
print('icons written')
