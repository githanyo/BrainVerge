from __future__ import annotations

import json
import shutil
import sqlite3
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = BASE_DIR / "uploads"
DB_PATH = DATA_DIR / "brainverge.db"

DEFAULT_CATEGORIES = [
    "Skills",
    "Projects",
    "Academics",
    "Research",
    "Business Ideas",
    "Personal Development",
    "Books",
    "Career",
    "Other",
]

ARCHIVE_REASONS = [
    "Goal Achieved",
    "Lost Interest",
    "No Time",
    "Too Difficult",
    "Replaced By Another Interest",
    "No Longer Relevant",
    "Other",
]

STAGES = [
    ("Seed", "Seed", "Newly planted interest.", "seed"),
    ("Seedling", "Seedling", "Early signs of engagement.", "sprout"),
    ("GrowingPlant", "Growing Plant", "Consistent care is showing.", "plant"),
    ("YoungTree", "Young Tree", "Strong progress is taking root.", "tree"),
    ("StrongTree", "Strong Tree", "Long-term dedication is visible.", "pine"),
    ("AncientTree", "Ancient Tree", "Mastery-level growth.", "trophy"),
]


def now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat()


def uid() -> str:
    return str(uuid.uuid4())


def connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS growth_items (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                category TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Active',
                archived_reason TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_activity_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                growth_item_id TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (growth_item_id) REFERENCES growth_items(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS file_attachments (
                id TEXT PRIMARY KEY,
                growth_item_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                uploaded_at TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                FOREIGN KEY (growth_item_id) REFERENCES growth_items(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS activities (
                id TEXT PRIMARY KEY,
                growth_item_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (growth_item_id) REFERENCES growth_items(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS confidence_entries (
                id TEXT PRIMARY KEY,
                growth_item_id TEXT NOT NULL,
                discuss_score INTEGER NOT NULL,
                apply_score INTEGER NOT NULL,
                teach_score INTEGER NOT NULL,
                note TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (growth_item_id) REFERENCES growth_items(id) ON DELETE CASCADE
            );
            """
        )
        count = conn.execute("SELECT COUNT(*) AS count FROM growth_items").fetchone()["count"]
        if count == 0:
            seed_data(conn)


def seed_data(conn: sqlite3.Connection) -> None:
    samples = [
        ("Python Programming", "Deepen practical Python through automation, APIs, and clean architecture.", "Skills", 1, 9, 8, 7),
        ("Linux Mastery", "Build daily fluency with shell, services, permissions, and system debugging.", "Skills", 14, 7, 7, 5),
        ("Final Year Project", "Shape the research, prototype, documentation, and presentation into a finished system.", "Academics", 3, 8, 8, 6),
        ("Cybersecurity Labs", "Practice network analysis, web security basics, and defensive investigation.", "Research", 35, 6, 6, 4),
        ("Startup Idea Garden", "Collect, validate, and archive business concepts worth revisiting.", "Business Ideas", 91, 4, 4, 3),
    ]
    for title, desc, category, days_ago, discuss, apply, teach in samples:
        item_id = uid()
        created = (datetime.utcnow() - timedelta(days=days_ago + 12)).replace(microsecond=0).isoformat()
        last = (datetime.utcnow() - timedelta(days=days_ago)).replace(microsecond=0).isoformat()
        conn.execute(
            """
            INSERT INTO growth_items
            (id, title, description, category, status, archived_reason, created_at, updated_at, last_activity_at)
            VALUES (?, ?, ?, ?, 'Active', NULL, ?, ?, ?)
            """,
            (item_id, title, desc, category, created, last, last),
        )
        conn.execute(
            "INSERT INTO confidence_entries VALUES (?, ?, ?, ?, ?, ?, ?)",
            (uid(), item_id, discuss, apply, teach, "Initial self-check", last),
        )
        for offset in range(days_ago + min(9, days_ago + 4), days_ago - 1, -2):
            stamp = (datetime.utcnow() - timedelta(days=offset)).replace(microsecond=0).isoformat()
            conn.execute("INSERT INTO activities VALUES (?, ?, ?, ?)", (uid(), item_id, "Seed activity", stamp))
        conn.execute(
            "INSERT INTO notes VALUES (?, ?, ?, ?, ?, ?)",
            (uid(), item_id, "First reflection", f"Why this matters:\n\n- {desc}\n- Keep nurturing this area steadily.", last, last),
        )


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return dict(row)


def record_activity(conn: sqlite3.Connection, growth_item_id: str, action_type: str, timestamp: str | None = None) -> None:
    stamp = timestamp or now_iso()
    conn.execute("INSERT INTO activities VALUES (?, ?, ?, ?)", (uid(), growth_item_id, action_type, stamp))
    conn.execute("UPDATE growth_items SET updated_at = ?, last_activity_at = ? WHERE id = ?", (stamp, stamp, growth_item_id))


def confidence_score(conn: sqlite3.Connection, item_id: str) -> float:
    row = conn.execute(
        "SELECT discuss_score, apply_score, teach_score FROM confidence_entries WHERE growth_item_id = ? ORDER BY created_at DESC LIMIT 1",
        (item_id,),
    ).fetchone()
    if not row:
        return 0.0
    return round(((row["discuss_score"] + row["apply_score"] + row["teach_score"]) / 3) * 10, 1)


def streak_for(conn: sqlite3.Connection, item_id: str) -> tuple[int, int]:
    rows = conn.execute("SELECT DISTINCT date(timestamp) AS day FROM activities WHERE growth_item_id = ? ORDER BY day DESC", (item_id,)).fetchall()
    days = [date.fromisoformat(r["day"]) for r in rows]
    day_set = set(days)
    today = datetime.utcnow().date()
    start = today if today in day_set else today - timedelta(days=1)
    current = 0
    cursor = start
    while cursor in day_set:
        current += 1
        cursor -= timedelta(days=1)
    longest = 0
    run = 0
    previous = None
    for day in sorted(days):
        run = run + 1 if previous and day == previous + timedelta(days=1) else 1
        longest = max(longest, run)
        previous = day
    return current, longest


def stage_for(score: float) -> tuple[str, str, str, str]:
    if score >= 90:
        return STAGES[5]
    if score >= 75:
        return STAGES[4]
    if score >= 58:
        return STAGES[3]
    if score >= 38:
        return STAGES[2]
    if score >= 18:
        return STAGES[1]
    return STAGES[0]


def enrich_item(conn: sqlite3.Connection, row: sqlite3.Row) -> dict[str, Any]:
    item = row_to_dict(row)
    counts = {
        "activities": conn.execute("SELECT COUNT(*) AS c FROM activities WHERE growth_item_id = ?", (item["id"],)).fetchone()["c"],
        "notes": conn.execute("SELECT COUNT(*) AS c FROM notes WHERE growth_item_id = ?", (item["id"],)).fetchone()["c"],
        "files": conn.execute("SELECT COUNT(*) AS c FROM file_attachments WHERE growth_item_id = ?", (item["id"],)).fetchone()["c"],
    }
    current_streak, longest_streak = streak_for(conn, item["id"])
    confidence = confidence_score(conn, item["id"])
    last_activity = datetime.fromisoformat(item["last_activity_at"])
    days_inactive = max(0, (datetime.utcnow().date() - last_activity.date()).days)
    consistency = min(100, current_streak * 14 + max(0, 35 - days_inactive) * 1.6)
    commitment = min(100, counts["activities"] * 6 + counts["notes"] * 12 + counts["files"] * 10 + longest_streak * 4)
    growth = round(consistency * 0.4 + commitment * 0.3 + confidence * 0.3, 1)
    stage, label, description, icon = stage_for(growth)
    if days_inactive >= 90:
        decay = {"level": "dead", "icon": "dead", "message": "This interest may have been abandoned."}
    elif days_inactive >= 30:
        decay = {"level": "heavy", "icon": "wilt-heavy", "message": "Growth has significantly slowed."}
    elif days_inactive >= 7:
        decay = {"level": "mild", "icon": "wilt", "message": "This interest misses your attention."}
    else:
        decay = {"level": "healthy", "icon": icon, "message": "This interest is being nurtured."}
    item.update(
        {
            "growthStage": stage,
            "growthStageLabel": label,
            "stageDescription": description,
            "plantIcon": decay["icon"],
            "confidenceScore": confidence,
            "commitmentScore": round(commitment, 1),
            "consistencyScore": round(consistency, 1),
            "growthScore": growth,
            "streakDays": current_streak,
            "longestStreak": longest_streak,
            "daysInactive": days_inactive,
            "decay": decay,
            "counts": counts,
        }
    )
    return item


def list_growth_items(status: str = "all", q: str = "") -> list[dict[str, Any]]:
    with connection() as conn:
        sql = "SELECT * FROM growth_items"
        params: list[Any] = []
        clauses = []
        if status != "all":
            clauses.append("status = ?")
            params.append(status)
        if q:
            clauses.append("(title LIKE ? OR description LIKE ? OR category LIKE ?)")
            term = f"%{q}%"
            params.extend([term, term, term])
        if clauses:
            sql += " WHERE " + " AND ".join(clauses)
        sql += " ORDER BY status = 'Active' DESC, last_activity_at DESC"
        return [enrich_item(conn, row) for row in conn.execute(sql, params).fetchall()]


def create_growth_item(payload: dict[str, Any]) -> dict[str, Any]:
    stamp = now_iso()
    item_id = uid()
    with connection() as conn:
        conn.execute(
            "INSERT INTO growth_items VALUES (?, ?, ?, ?, 'Active', NULL, ?, ?, ?)",
            (item_id, payload["title"], payload.get("description", ""), payload.get("category", "Other"), stamp, stamp, stamp),
        )
        record_activity(conn, item_id, "Growth item created", stamp)
        return enrich_item(conn, conn.execute("SELECT * FROM growth_items WHERE id = ?", (item_id,)).fetchone())


def update_growth_item(item_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    with connection() as conn:
        mapping = {"title": "title", "description": "description", "category": "category", "status": "status", "archivedReason": "archived_reason"}
        updates = []
        params: list[Any] = []
        for field, column in mapping.items():
            if field in payload:
                updates.append(f"{column} = ?")
                params.append(payload[field])
        if not updates:
            updates.append("updated_at = ?")
            params.append(now_iso())
        else:
            updates.append("updated_at = ?")
            params.append(now_iso())
        params.append(item_id)
        conn.execute(f"UPDATE growth_items SET {', '.join(updates)} WHERE id = ?", params)
        record_activity(conn, item_id, f"Marked {payload['status']}" if "status" in payload else "Growth item updated")
        return enrich_item(conn, conn.execute("SELECT * FROM growth_items WHERE id = ?", (item_id,)).fetchone())


def delete_growth_item(item_id: str) -> dict[str, bool]:
    with connection() as conn:
        conn.execute("DELETE FROM growth_items WHERE id = ?", (item_id,))
    return {"ok": True}


def growth_item_detail(item_id: str) -> dict[str, Any]:
    with connection() as conn:
        row = conn.execute("SELECT * FROM growth_items WHERE id = ?", (item_id,)).fetchone()
        if not row:
            raise KeyError("Growth item not found")
        return {
            "item": enrich_item(conn, row),
            "notes": [row_to_dict(r) for r in conn.execute("SELECT * FROM notes WHERE growth_item_id = ? ORDER BY updated_at DESC", (item_id,)).fetchall()],
            "files": [row_to_dict(r) for r in conn.execute("SELECT * FROM file_attachments WHERE growth_item_id = ? ORDER BY uploaded_at DESC", (item_id,)).fetchall()],
            "activities": [row_to_dict(r) for r in conn.execute("SELECT * FROM activities WHERE growth_item_id = ? ORDER BY timestamp DESC LIMIT 80", (item_id,)).fetchall()],
            "confidence": [row_to_dict(r) for r in conn.execute("SELECT * FROM confidence_entries WHERE growth_item_id = ? ORDER BY created_at", (item_id,)).fetchall()],
        }


def create_note(item_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    stamp = now_iso()
    note_id = uid()
    with connection() as conn:
        conn.execute("INSERT INTO notes VALUES (?, ?, ?, ?, ?, ?)", (note_id, item_id, payload["title"], payload.get("content", ""), stamp, stamp))
        record_activity(conn, item_id, "Note created", stamp)
        return row_to_dict(conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone())


def update_note(note_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    stamp = now_iso()
    with connection() as conn:
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
        conn.execute("UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?", (payload["title"], payload.get("content", ""), stamp, note_id))
        record_activity(conn, row["growth_item_id"], "Note edited", stamp)
        return row_to_dict(conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone())


def delete_note(note_id: str) -> dict[str, bool]:
    with connection() as conn:
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
        if row:
            record_activity(conn, row["growth_item_id"], "Note deleted")
            conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    return {"ok": True}


def add_confidence(item_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    stamp = now_iso()
    entry_id = uid()
    with connection() as conn:
        conn.execute(
            "INSERT INTO confidence_entries VALUES (?, ?, ?, ?, ?, ?, ?)",
            (entry_id, item_id, int(payload["discussScore"]), int(payload["applyScore"]), int(payload["teachScore"]), payload.get("note", ""), stamp),
        )
        record_activity(conn, item_id, "Confidence updated", stamp)
        return row_to_dict(conn.execute("SELECT * FROM confidence_entries WHERE id = ?", (entry_id,)).fetchone())


def attach_file(item_id: str, file_name: str, source_path: Path) -> dict[str, Any]:
    stamp = now_iso()
    file_id = uid()
    safe_name = Path(file_name).name
    item_dir = UPLOAD_DIR / item_id
    item_dir.mkdir(parents=True, exist_ok=True)
    target = item_dir / f"{file_id}-{safe_name}"
    shutil.copyfile(source_path, target)
    with connection() as conn:
        conn.execute("INSERT INTO file_attachments VALUES (?, ?, ?, ?, ?, ?)", (file_id, item_id, safe_name, str(target), stamp, target.stat().st_size))
        record_activity(conn, item_id, "File uploaded", stamp)
        return row_to_dict(conn.execute("SELECT * FROM file_attachments WHERE id = ?", (file_id,)).fetchone())


def get_file(file_id: str) -> tuple[Path, str]:
    with connection() as conn:
        row = conn.execute("SELECT * FROM file_attachments WHERE id = ?", (file_id,)).fetchone()
        if not row:
            raise KeyError("File not found")
        return Path(row["file_path"]), row["file_name"]


def search(q: str = "") -> dict[str, Any]:
    term = f"%{q}%"
    with connection() as conn:
        return {
            "items": [enrich_item(conn, r) for r in conn.execute("SELECT * FROM growth_items WHERE title LIKE ? OR description LIKE ? OR category LIKE ? LIMIT 20", (term, term, term)).fetchall()],
            "notes": [row_to_dict(r) for r in conn.execute("SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? LIMIT 20", (term, term)).fetchall()],
            "files": [row_to_dict(r) for r in conn.execute("SELECT * FROM file_attachments WHERE file_name LIKE ? LIMIT 20", (term,)).fetchall()],
        }


def dashboard() -> dict[str, Any]:
    with connection() as conn:
        items = [enrich_item(conn, r) for r in conn.execute("SELECT * FROM growth_items ORDER BY last_activity_at DESC").fetchall()]
        active = [i for i in items if i["status"] == "Active"]
        recent = [row_to_dict(r) for r in conn.execute("SELECT a.*, g.title FROM activities a JOIN growth_items g ON g.id = a.growth_item_id ORDER BY timestamp DESC LIMIT 20").fetchall()]
        today = datetime.utcnow().date()
        heatmap = []
        for offset in range(89, -1, -1):
            day = today - timedelta(days=offset)
            count = conn.execute("SELECT COUNT(*) AS c FROM activities WHERE date(timestamp) = ?", (day.isoformat(),)).fetchone()["c"]
            heatmap.append({"date": day.isoformat(), "count": count})
        categories = []
        for category in sorted(set(i["category"] for i in items)):
            cats = [i for i in active if i["category"] == category]
            if cats:
                categories.append({"category": category, "count": len(cats), "avgGrowth": round(sum(i["growthScore"] for i in cats) / len(cats), 1)})
        return {
            "items": items,
            "active": active,
            "top": sorted(active, key=lambda i: i["growthScore"], reverse=True)[:5],
            "atRisk": sorted([i for i in active if i["daysInactive"] >= 5], key=lambda i: i["daysInactive"], reverse=True)[:6],
            "recent": recent,
            "heatmap": heatmap,
            "categories": categories,
            "insights": build_insights(active),
            "summary": {
                "activeCount": len(active),
                "archivedCount": len([i for i in items if i["status"] == "Archived"]),
                "abandonedCount": len([i for i in items if i["status"] == "Abandoned"]),
                "currentStreak": max([i["streakDays"] for i in active], default=0),
                "longestStreak": max([i["longestStreak"] for i in active], default=0),
                "avgGrowth": round(sum(i["growthScore"] for i in active) / len(active), 1) if active else 0,
            },
        }


def build_insights(active: list[dict[str, Any]]) -> list[str]:
    if not active:
        return ["Plant your first Growth Item to begin building your forest."]
    insights = [f"{max(active, key=lambda i: i['growthScore'])['title']} has your highest growth score."]
    stale = sorted([i for i in active if i["daysInactive"] >= 7], key=lambda i: i["daysInactive"], reverse=True)
    if stale:
        insights.append(f"{stale[0]['title']} has not been updated in {stale[0]['daysInactive']} days.")
    confident = max(active, key=lambda i: i["confidenceScore"])
    insights.append(f"{confident['title']} is your strongest confidence area at {confident['confidenceScore']}%.")
    return insights


def dumps(data: Any) -> bytes:
    return json.dumps(data).encode("utf-8")
