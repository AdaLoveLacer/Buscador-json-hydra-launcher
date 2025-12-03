# Small utility to extract readable strings and JSON-like fragments from a possibly corrupted sqlite file.
# Writes outputs to ./salvage/ directory.

import os
import re
import sys

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db.sqlite')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'salvage')
MIN_PRINTABLE = 30  # minimum length for printable runs to keep

os.makedirs(OUT_DIR, exist_ok=True)

with open(DB_PATH, 'rb') as f:
    data = f.read()

print(f"Read {len(data)} bytes from {DB_PATH}")

# 1) Extract printable ASCII runs
printable_runs = []
run = bytearray()
for b in data:
    # consider basic printable ASCII + tab/newline/CR and some extended (0xA0-0xFF)
    if 32 <= b <= 126 or b in (9, 10, 13) or 160 <= b <= 255:
        run.append(b)
    else:
        if len(run) >= MIN_PRINTABLE:
            try:
                printable_runs.append(run.decode('utf-8', errors='replace'))
            except Exception:
                printable_runs.append(run.decode('latin-1', errors='replace'))
        run = bytearray()
if len(run) >= MIN_PRINTABLE:
    printable_runs.append(run.decode('utf-8', errors='replace'))

with open(os.path.join(OUT_DIR, 'printable_runs.txt'), 'w', encoding='utf-8', errors='replace') as out:
    out.write('\n\n---- RUN ----\n\n'.join(printable_runs))

print(f"Wrote {len(printable_runs)} printable runs to salvage/printable_runs.txt (kept runs >= {MIN_PRINTABLE} chars)")

# 2) Extract JSON-like fragments: naive search for { ... } blocks up to a reasonable size
json_like = []
for m in re.finditer(br"\{.{0,2000}?\}", data, flags=re.DOTALL):
    s = m.group(0)
    # keep only if contains quotes and colon or the word "title"
    if b'"' in s and (b':' in s or b'title' in s.lower()):
        try:
            json_like.append(s.decode('utf-8', errors='replace'))
        except Exception:
            json_like.append(s.decode('latin-1', errors='replace'))

with open(os.path.join(OUT_DIR, 'json_like_fragments.txt'), 'w', encoding='utf-8', errors='replace') as out:
    out.write('\n\n---- FRAGMENT ----\n\n'.join(json_like))

print(f"Wrote {len(json_like)} JSON-like fragments to salvage/json_like_fragments.txt")

# 3) Extract segments around keywords
keywords = [b'title', b'uploadDate', b'uploads/', b'source', b'file', b'.json', b'gog', b'sources', b'downloads']
segments = []
for kw in keywords:
    for m in re.finditer(re.escape(kw), data, flags=0):
        start = max(0, m.start() - 200)
        end = min(len(data), m.end() + 200)
        seg = data[start:end]
        try:
            seg_s = seg.decode('utf-8', errors='replace')
        except Exception:
            seg_s = seg.decode('latin-1', errors='replace')
        header = f"--- keyword: {kw.decode('latin-1', errors='replace')} at offset {m.start()} ---\n"
        segments.append(header + seg_s)

with open(os.path.join(OUT_DIR, 'keyword_segments.txt'), 'w', encoding='utf-8', errors='replace') as out:
    out.write('\n\n'.join(segments))

print(f"Wrote {len(segments)} segments to salvage/keyword_segments.txt")

# 4) Save shorter runs (>=8) for potential filenames and ids
short_runs = []
run = bytearray()
for b in data:
    if 32 <= b <= 126 or b in (9,10,13) or 160 <= b <= 255:
        run.append(b)
    else:
        if len(run) >= 8:
            short_runs.append(run.decode('utf-8', errors='replace'))
        run = bytearray()
if len(run) >= 8:
    short_runs.append(run.decode('utf-8', errors='replace'))

with open(os.path.join(OUT_DIR, 'short_printable_runs.txt'), 'w', encoding='utf-8', errors='replace') as out:
    out.write('\n'.join(short_runs))

print(f"Wrote {len(short_runs)} short runs to salvage/short_printable_runs.txt")

# 5) Quick heuristic: try to find lines that look like URL paths to uploads/
maybe_files = [s for s in short_runs if 'uploads/' in s or 'uploads\\' in s or '.json' in s]
with open(os.path.join(OUT_DIR, 'maybe_files.txt'), 'w', encoding='utf-8', errors='replace') as out:
    out.write('\n'.join(maybe_files))
print(f"Wrote {len(maybe_files)} candidate file paths to salvage/maybe_files.txt")

# Summary
print('\nSummary:')
print(f'  printable_runs: {len(printable_runs)}')
print(f'  json_like_fragments: {len(json_like)}')
print(f'  keyword_segments: {len(segments)}')
print(f'  short_runs: {len(short_runs)}')
print(f'  maybe_files: {len(maybe_files)}')
print('\nSaved files to:')
for fn in ['printable_runs.txt','json_like_fragments.txt','keyword_segments.txt','short_printable_runs.txt','maybe_files.txt']:
    print(' -', os.path.join(OUT_DIR, fn))

print('\nDone.')
