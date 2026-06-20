---
name: continuous-backlog
description: Long term implementation of various items from the backlog.
---

Autonomously implement the backlog of this repository, so for each pending epic I want you to do the following:
Spawn a sub agent using the skill "implement-from-backlog" giving it the epic to work on from docs\backlog.md, for example "Epic M1-E03 — Combat Prototype", wait for this sub agent to complete its work, create a new commit with the epic tittle and finally only after all of this is done go to the next epic and repeat the process. Do this untill you complete the backlog or run out of tokens which should stop you automatically. Remember to let the sub agent work on the task and not you direclty and wait for it to finish to start the next one. That is to better use the context window.