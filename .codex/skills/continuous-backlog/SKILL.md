---
name: continuous-backlog
description: Implement a finite, user-specified batch of Phrok backlog epics.
---

# Finite backlog workflow

Use only when user explicitly supplies one or more epic IDs. Default unit is one epic.

1. Resolve each ID through `docs/epics/index.md`.
2. Read only the matching `docs/epics/<id>-*.md` file.
3. Implement and verify that epic using scoped commands.
4. Stop after requested batch; do not continue until token exhaustion.

Do not autonomously select later epics. Do not require unrelated skills. Commit only when user requests commits or repository workflow explicitly requires them.
