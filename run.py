"""Run the Product Automation API, worker, and frontend locally.

Usage:
    python run.py
    python run.py --no-worker
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the Product Automation project")
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="host used by the API and frontend (default: 0.0.0.0 for LAN access)",
    )
    parser.add_argument("--api-port", type=int, default=8010, help="FastAPI port (default: 8010)")
    parser.add_argument("--frontend-port", type=int, default=5173, help="Vite port (default: 5173)")
    parser.add_argument("--no-worker", action="store_true", help="do not start the Celery worker")
    parser.add_argument("--no-reload", action="store_true", help="disable FastAPI auto-reload")
    return parser.parse_args()


def fail(message: str) -> None:
    print(f"Error: {message}", file=sys.stderr)
    raise SystemExit(1)


def check_prerequisites(start_worker: bool) -> str:
    required_modules = ["alembic", "anthropic", "uvicorn"]
    if start_worker:
        required_modules.append("celery")

    missing_modules = [name for name in required_modules if importlib.util.find_spec(name) is None]
    if missing_modules:
        fail(
            f"missing Python package(s): {', '.join(missing_modules)}. "
            "Install them with: python -m pip install -e ./backend"
        )

    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if npm is None:
        fail("npm was not found. Install Node.js 22 or newer and try again.")
    if not (FRONTEND / "node_modules").is_dir():
        fail("frontend dependencies are missing. Run: npm install --prefix frontend")
    if not (ROOT / ".env").is_file():
        fail(".env is missing. Copy .env.example to .env and configure it first.")

    return npm


def start_process(name: str, command: list[str], cwd: Path) -> subprocess.Popen[bytes]:
    print(f"Starting {name}...")
    options: dict[str, object] = {"cwd": cwd, "env": {**os.environ, "PYTHONUNBUFFERED": "1"}}
    if os.name == "nt":
        options["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        options["start_new_session"] = True
    return subprocess.Popen(command, **options)


def stop_process(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is not None:
        return

    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    else:
        import signal

        os.killpg(process.pid, signal.SIGTERM)


def main() -> int:
    args = parse_args()
    npm = check_prerequisites(start_worker=not args.no_worker)
    processes: list[tuple[str, subprocess.Popen[bytes]]] = []

    print("Applying database migrations...")
    migration = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=BACKEND,
        check=False,
    )
    if migration.returncode != 0:
        fail("database migration failed; services were not started")

    api_command = [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        args.host,
        "--port",
        str(args.api_port),
    ]
    if not args.no_reload:
        api_command.append("--reload")

    try:
        processes.append(("API", start_process("API", api_command, BACKEND)))

        if not args.no_worker:
            worker_command = [
                sys.executable,
                "-m",
                "celery",
                "-A",
                "app.workers.celery_app:celery_app",
                "worker",
                "--loglevel=info",
            ]
            if os.name == "nt":
                worker_command.append("--pool=solo")
            processes.append(("Celery worker", start_process("Celery worker", worker_command, BACKEND)))

        frontend_command = [
            npm,
            "run",
            "dev",
            "--",
            "--host",
            args.host,
            "--port",
            str(args.frontend_port),
        ]
        processes.append(("frontend", start_process("frontend", frontend_command, FRONTEND)))

        print(f"\nFrontend: http://{args.host}:{args.frontend_port}")
        print(f"API:      http://{args.host}:{args.api_port}")
        print("Press Ctrl+C to stop everything.\n")

        while True:
            for name, process in processes:
                return_code = process.poll()
                if return_code is not None:
                    print(f"{name} stopped unexpectedly (exit code {return_code}).", file=sys.stderr)
                    return return_code or 1
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping services...")
        return 0
    finally:
        for _, process in reversed(processes):
            stop_process(process)


if __name__ == "__main__":
    raise SystemExit(main())
