---
name: implement-from-backlog
description: Load and implement exactly one named Phrok epic without reading the full backlog.
---

# Workflow

1. Identify requested epic ID or exact title.
2. Resolve ID through `docs/epics/index.md`.
3. Read only linked `docs/epics/<id>-*.md` specification.
4. Implement using normal repository instructions and scoped verification.

The migrated epic file is authoritative for new work. Do not open complete `docs/backlog.md` unless user explicitly requests historical or unmigrated content.

# Compatibility fallback

If requested epic is absent from `docs/epics/index.md`, use the bundled extraction script:

```powershell
python ".codex\skills\implement-from-backlog\scripts\extract_epic.py" `
  --backlog "docs\backlog.md" `
  --epic "Epic M0-E01 — Project Architecture"
```

Script output contains only matching epic section and source line range. If exact matching fails, normalize dash characters/whitespace and list `^## Epic ` candidates.
