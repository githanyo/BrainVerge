from __future__ import annotations

import importlib.util
import subprocess
import sys


missing = [name for name in ("fastapi", "uvicorn", "multipart") if importlib.util.find_spec(name) is None]

if missing:
    print()
    print("BrainVerge backend cannot start because these Python packages are missing:")
    print("  " + ", ".join(missing))
    print()
    print("Install them with:")
    print("  py -3 -m pip install -r backend\\requirements.txt")
    print()
    sys.exit(1)

raise SystemExit(
    subprocess.call(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--reload",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
        ]
    )
)
