from __future__ import annotations

import json
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from app import core


def parse_single_file_upload(content_type: str, body: bytes) -> tuple[str, bytes]:
    marker = "boundary="
    if marker not in content_type:
        raise ValueError("Missing multipart boundary")
    boundary = ("--" + content_type.split(marker, 1)[1].strip().strip('"')).encode()
    for part in body.split(boundary):
        if b"Content-Disposition" not in part:
            continue
        header_blob, _, file_blob = part.partition(b"\r\n\r\n")
        if not file_blob:
            continue
        headers = header_blob.decode("utf-8", errors="ignore")
        file_name = "upload.bin"
        for chunk in headers.split(";"):
            chunk = chunk.strip()
            if chunk.startswith("filename="):
                file_name = chunk.split("=", 1)[1].strip().strip('"') or file_name
        return file_name, file_blob.rstrip(b"\r\n-")
    raise ValueError("No file field found")


class Handler(BaseHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def json_response(self, data, status: int = 200) -> None:
        body = core.dumps(data)
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def parts(self) -> tuple[list[str], dict[str, list[str]]]:
        parsed = urlparse(self.path)
        return [unquote(p) for p in parsed.path.strip("/").split("/") if p], parse_qs(parsed.query)

    def do_GET(self) -> None:
        try:
            parts, qs = self.parts()
            if parts == ["api", "meta"]:
                return self.json_response({"categories": core.DEFAULT_CATEGORIES, "archiveReasons": core.ARCHIVE_REASONS, "stages": core.STAGES})
            if parts == ["api", "dashboard"]:
                return self.json_response(core.dashboard())
            if parts == ["api", "growth-items"]:
                return self.json_response(core.list_growth_items(qs.get("status", ["all"])[0], qs.get("q", [""])[0]))
            if len(parts) == 4 and parts[:2] == ["api", "growth-items"] and parts[3] == "detail":
                return self.json_response(core.growth_item_detail(parts[2]))
            if parts == ["api", "search"]:
                return self.json_response(core.search(qs.get("q", [""])[0]))
            if len(parts) == 3 and parts[:2] == ["api", "files"]:
                path, name = core.get_file(parts[2])
                data = path.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "application/octet-stream")
                self.send_header("Content-Disposition", f'attachment; filename="{name}"')
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return
            self.json_response({"error": "Not found"}, 404)
        except Exception as exc:
            self.json_response({"error": str(exc)}, 500)

    def do_POST(self) -> None:
        try:
            parts, _ = self.parts()
            if parts == ["api", "growth-items"]:
                return self.json_response(core.create_growth_item(self.read_json()), 201)
            if len(parts) == 4 and parts[:2] == ["api", "growth-items"] and parts[3] == "notes":
                return self.json_response(core.create_note(parts[2], self.read_json()), 201)
            if len(parts) == 4 and parts[:2] == ["api", "growth-items"] and parts[3] == "confidence":
                return self.json_response(core.add_confidence(parts[2], self.read_json()), 201)
            if len(parts) == 4 and parts[:2] == ["api", "growth-items"] and parts[3] == "files":
                length = int(self.headers.get("Content-Length", "0"))
                file_name, file_bytes = parse_single_file_upload(self.headers.get("Content-Type", ""), self.rfile.read(length))
                with tempfile.NamedTemporaryFile(delete=False) as tmp:
                    tmp.write(file_bytes)
                    tmp_path = Path(tmp.name)
                result = core.attach_file(parts[2], file_name, tmp_path)
                tmp_path.unlink(missing_ok=True)
                return self.json_response(result, 201)
            self.json_response({"error": "Not found"}, 404)
        except Exception as exc:
            self.json_response({"error": str(exc)}, 500)

    def do_PATCH(self) -> None:
        try:
            parts, _ = self.parts()
            if len(parts) == 3 and parts[:2] == ["api", "growth-items"]:
                return self.json_response(core.update_growth_item(parts[2], self.read_json()))
            if len(parts) == 3 and parts[:2] == ["api", "notes"]:
                return self.json_response(core.update_note(parts[2], self.read_json()))
            self.json_response({"error": "Not found"}, 404)
        except Exception as exc:
            self.json_response({"error": str(exc)}, 500)

    def do_DELETE(self) -> None:
        try:
            parts, _ = self.parts()
            if len(parts) == 3 and parts[:2] == ["api", "growth-items"]:
                return self.json_response(core.delete_growth_item(parts[2]))
            if len(parts) == 3 and parts[:2] == ["api", "notes"]:
                return self.json_response(core.delete_note(parts[2]))
            self.json_response({"error": "Not found"}, 404)
        except Exception as exc:
            self.json_response({"error": str(exc)}, 500)


if __name__ == "__main__":
    core.init_db()
    server = ThreadingHTTPServer(("127.0.0.1", 8000), Handler)
    print("BrainVerge API running on http://127.0.0.1:8000")
    server.serve_forever()
