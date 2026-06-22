import sqlite3
import shutil
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "data" / "brainverge.db"
conn = sqlite3.connect(str(DB))
cur = conn.cursor()
rows = cur.execute("SELECT id, file_name, file_path FROM file_attachments").fetchall()
updated = 0
for id, fname, fp in rows:
    try:
        if fname and '.' in fname:
            continue
        p = Path(fp)
        token = p.name.split('-')[-1]
        token = token.split('+')[0]
        token = ''.join(ch for ch in token if ch.isalnum())
        ext = f'.{token}' if token else ''
        new_name = f'{id}{ext}' if ext else id
        new_path = p.parent / new_name
        if p.exists():
            shutil.move(str(p), str(new_path))
        cur.execute('UPDATE file_attachments SET file_name = ?, file_path = ? WHERE id = ?', (new_name, str(new_path), id))
        updated += 1
    except Exception as e:
        print('error', id, e)
conn.commit()
print('updated', updated)
