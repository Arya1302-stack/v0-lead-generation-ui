"""
Async wrapper around the gosom/google-maps-scraper CLI.

Reference: https://github.com/gosom/google-maps-scraper
CLI uses -input (queries file), -results (CSV path), -radius (meters), etc.
"""

from __future__ import annotations

import asyncio
import csv
import os
import tempfile
import uuid
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent
_DEFAULT_RESULTS_DIR = _BACKEND_DIR / "results"
_ENV_SCRAPER_BIN = "GOOGLE_MAPS_SCRAPER_BIN"


def _resolve_scraper_binary(explicit: str | Path | None) -> str:
    if explicit is not None:
        return str(Path(explicit))
    env = os.environ.get(_ENV_SCRAPER_BIN)
    if env:
        return env
    stem = _BACKEND_DIR / "google-maps-scraper"
    if os.name == "nt":
        exe = stem.with_suffix(".exe")
        if exe.is_file():
            return str(exe)
    if stem.is_file():
        return str(stem)
    return "google-maps-scraper"


def _pick_cell(row: dict[str, str], *candidates: str) -> str:
    for key in candidates:
        if key in row and row[key] is not None:
            v = str(row[key]).strip()
            if v:
                return v
    lower_map = {k.lower().strip(): v for k, v in row.items() if k is not None}
    for key in candidates:
        lk = key.lower().strip()
        if lk in lower_map:
            v = str(lower_map[lk]).strip()
            if v:
                return v
    return ""


async def run_maps_scraper(
    keyword: str,
    city: str,
    radius: int,
    *,
    scraper_bin: str | Path | None = None,
    results_dir: str | Path | None = None,
    depth: int = 1,
    exit_on_inactivity: str = "3m",
) -> tuple[str, str, int, Path]:
    """
    Run google-maps-scraper and wait for completion.

    The upstream tool expects a query file (-input) and writes CSV to -results.
    ``radius`` is passed to ``-radius`` in **meters** (see upstream README).

    Returns (stdout, stderr, returncode, results_csv_path).
    """
    binary = _resolve_scraper_binary(scraper_bin)
    out_dir = Path(results_dir) if results_dir is not None else _DEFAULT_RESULTS_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    results_csv = out_dir / f"scrape_{uuid.uuid4().hex}.csv"
    results_csv.touch()

    query_line = f"{keyword} in {city}\n"
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        prefix="gmaps_queries_",
        suffix=".txt",
        delete=False,
    ) as tmp:
        tmp.write(query_line)
        tmp_path = tmp.name

    try:
        proc = await asyncio.create_subprocess_exec(
            binary,
            "-input",
            tmp_path,
            "-results",
            str(results_csv),
            "-radius",
            str(radius),
            "-depth",
            str(depth),
            "-exit-on-inactivity",
            exit_on_inactivity,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout_b, stderr_b = await proc.communicate()
        stdout = stdout_b.decode(errors="replace") if stdout_b else ""
        stderr = stderr_b.decode(errors="replace") if stderr_b else ""
        code = proc.returncode if proc.returncode is not None else -1
        return stdout, stderr, code, results_csv
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def read_maps_results_csv(csv_path: str | Path) -> list[dict[str, str]]:
    """
    Read a results CSV and return rows with keys Company Name, Phone, Website.

    Accepts gosom column names (title, phone, website) or human-readable headers.
    """
    path = Path(csv_path)
    rows: list[dict[str, str]] = []
    with path.open(encoding="utf-8-sig", newline="", errors="replace") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            return rows
        for raw in reader:
            row = {((k or "").strip()): (v or "").strip() for k, v in raw.items()}
            rows.append(
                {
                    "Company Name": _pick_cell(
                        row,
                        "Company Name",
                        "company_name",
                        "title",
                        "Title",
                        "Name",
                        "name",
                    ),
                    "Phone": _pick_cell(row, "Phone", "phone", "Phone Number"),
                    "Website": _pick_cell(row, "Website", "website", "URL", "url"),
                }
            )
    return rows
