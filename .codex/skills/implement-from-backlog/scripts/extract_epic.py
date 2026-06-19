#!/usr/bin/env python3
"""Extract one epic section from a markdown backlog."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


EPIC_HEADER_RE = re.compile(r"^## Epic ")


def normalize_title(value: str) -> str:
    value = value.strip()
    value = value.replace("\u2012", "-")
    value = value.replace("\u2013", "-")
    value = value.replace("\u2014", "-")
    value = value.replace("\u2015", "-")
    return re.sub(r"\s+", " ", value)


def find_epic(lines: list[str], requested_title: str) -> tuple[int, int]:
    exact_header = f"## {requested_title.strip()}"
    normalized_requested = normalize_title(requested_title)
    fallback_start: int | None = None

    for index, line in enumerate(lines):
        if not EPIC_HEADER_RE.match(line):
            continue

        header = line.rstrip("\r\n")
        if header == exact_header:
            return index, find_end(lines, index)

        title = header.removeprefix("## ")
        if fallback_start is None and normalize_title(title) == normalized_requested:
            fallback_start = index

    if fallback_start is not None:
        return fallback_start, find_end(lines, fallback_start)

    raise ValueError(f"Could not find backlog epic: {requested_title}")


def find_end(lines: list[str], start: int) -> int:
    for index in range(start + 1, len(lines)):
        if EPIC_HEADER_RE.match(lines[index]):
            return index
    return len(lines)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Extract exactly one ## Epic section from docs/backlog.md.",
    )
    parser.add_argument("--backlog", default="docs/backlog.md", help="Path to backlog.md")
    parser.add_argument("--epic", required=True, help="Epic title, without leading ##")
    args = parser.parse_args()

    backlog_path = Path(args.backlog)
    try:
        lines = backlog_path.read_text(encoding="utf-8").splitlines(keepends=True)
        start, end = find_epic(lines, args.epic)
    except FileNotFoundError:
        print(f"Backlog file not found: {backlog_path}", file=sys.stderr)
        return 2
    except ValueError as error:
        print(str(error), file=sys.stderr)
        return 1

    print(f"{backlog_path}:{start + 1}-{end}", file=sys.stderr)
    sys.stdout.write("".join(lines[start:end]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
