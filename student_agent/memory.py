"""本地记忆层 - SQLite 持久化"""
import sqlite3, os

DB_PATH = os.path.join(os.path.dirname(__file__), "agent_memory.db")

class Memory:
    def __init__(self):
        self.conn = sqlite3.connect(DB_PATH)
        self._init_db()

    def _init_db(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT,
                tags TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime'))
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                deadline TEXT,
                priority TEXT DEFAULT '中',
                status TEXT DEFAULT '待办',
                created_at TEXT DEFAULT (datetime('now','localtime'))
            );
            CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(title, content, tags);
        """)

    def save_note(self, title: str, content: str, tags: str = "") -> str:
        cur = self.conn.execute(
            "INSERT INTO notes (title, content, tags) VALUES (?, ?, ?)",
            (title, content, tags)
        )
        note_id = cur.lastrowid
        self.conn.execute(
            "INSERT INTO notes_fts (rowid, title, content, tags) VALUES (?, ?, ?, ?)",
            (note_id, title, content, tags)
        )
        self.conn.commit()
        return f"已保存笔记：{title}"

    def create_task(self, title: str, deadline: str = "", priority: str = "中") -> str:
        self.conn.execute(
            "INSERT INTO tasks (title, deadline, priority) VALUES (?, ?, ?)",
            (title, deadline, priority)
        )
        self.conn.commit()
        return f"已创建任务：{title}（优先级：{priority}）"

    def list_tasks(self, status: str = None) -> str:
        if status:
            rows = self.conn.execute(
                "SELECT title, deadline, priority, status FROM tasks WHERE status = ?", (status,)
            ).fetchall()
        else:
            rows = self.conn.execute(
                "SELECT title, deadline, priority, status FROM tasks ORDER BY status"
            ).fetchall()
        if not rows:
            return "暂无任务"
        lines = ["任务列表："]
        for t, d, p, s in rows:
            lines.append(f"  [{s}] {t} | 截止：{d or '无'} | 优先级：{p}")
        return "\n".join(lines)

    def retrieve(self, query: str, limit: int = 3) -> str:
        try:
            safe = query.replace('"', '""')
            rows = self.conn.execute(
                'SELECT title, content FROM notes_fts WHERE notes_fts MATCH ? ORDER BY rank LIMIT ?',
                (safe, limit)
            ).fetchall()
            if rows:
                return "\n".join(f"[{t}] {c[:200]}" for t, c in rows)
        except:
            pass
        return ""

    def close(self):
        self.conn.close()
