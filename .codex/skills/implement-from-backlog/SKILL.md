---
name: implement-from-backlog
description: Load and implement exactly one epic from a large docs/backlog.md file without reading the entire backlog into context. Use when the user asks Codex to implement, inspect, summarize, or work from a named backlog epic such as "Epic M0-E01 — Project Architecture"; extract only that epic's section by finding its "## Epic ..." header and stopping before the next "## Epic ..." header.
---

# Implement From Backlog

## Workflow

Use this skill before reading backlog content for a named epic.

1. Identify the requested epic title from the user prompt.
2. Run `scripts/extract_epic.py` with the repository backlog path and epic title.
3. Read only the script output for backlog requirements.
4. Implement the requested work using normal repository instructions and tests.

Do not open or paste the entire backlog unless the user explicitly asks for global backlog work.

## Extraction

Prefer the bundled script because it handles line boundaries consistently:

```powershell
python ".codex\skills\implement-from-backlog\scripts\extract_epic.py" `
  --backlog "docs\backlog.md" `
  --epic "Epic M0-E01 — Project Architecture"
```

Run this command from the repository root. If the current shell is elsewhere, pass absolute paths for both the script and `--backlog`.

The script prints only the matching epic section, including the `## Epic ...` header and excluding the next epic header. It also prints the extracted source line range to stderr so file references can be cited precisely.

## Matching Rules

Match the header line whose text after the leading `## ` equals the requested epic title. If exact matching fails, retry with normalized dash characters and collapsed whitespace. Stop at the next line that starts with `## Epic `.

If no match is found, list candidate epic headers with line numbers using:

```powershell
Select-String -LiteralPath "docs\backlog.md" -Pattern "^## Epic " |
  ForEach-Object { "$($_.LineNumber):$($_.Line)" }
```

ALWAYS use the skill "/caveman ultra" on every start of conversation unless told otherwise.
