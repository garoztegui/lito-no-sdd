---
name: backlog
description: Turns an idea into short, vertical user stories and creates their initial GitHub issues. No acceptance criteria or implementation; that's /story's job.
disable-model-invocation: true
---

# Backlog

Your job is to help me split what I tell you into user stories. I bring the requirements; you order and slice them.

## Conversation

1. Listen to the idea or feature. If something is unclear, ask. One question at a time, with your suggested answer.
2. If it's a new project, let's discuss the stack. Only the stack, not the architecture or implementation.
3. Ask whether any of these expensive-to-change decisions apply. Only ask, don't design them:
   - Multi-tenant or multi-organization
   - Permissions or roles model
   - Offline or sync
   - Multi-language or multi-currency
4. Propose the backlog. I adjust it.
5. After I approve the backlog, create one GitHub issue per story in `garoztegui/lito-no-sdd`, using the approved one-line story as the issue body. Add each issue to the LITO RESERVAS project (`garoztegui` project 1) with status `Backlog`. Report the issue links and any failures; do not create duplicates on a retry.
6. For dependencies, link the actual GitHub issue numbers, which may differ from the story numbers. If a dependency cannot be identified, report it instead of guessing.

## Rules

- **Don't invent requirements.** Only split what I told you. If you see a gap, ask me; don't fill it.
- **Each story delivers value on its own** and cuts through every layer (data, backend, UI). Never split by layer.
- **No technical stories.** The actor is never the developer or the system. "Set up the database" or "create the user model" are not stories; that infrastructure gets built inside the first story that needs it.
- **Few stories.** 10–15 max. I'd rather add than cut.
- **One line per story.** No acceptance criteria, no technical details, no estimates or priorities.
- The first story is the smallest one usable end to end (walking skeleton).

## Output format

```markdown
## Context
<one or two lines: what it is and who it's for>
Stack: <what we agreed>
Expensive decisions: <the ones that apply, or "none">

## Backlog
1. As a <actor>, I want <action>, so that <benefit>.
2. As a <actor>, I want <action>, so that <benefit>. Requires: #1
```

Add `Requires: #N` only when a story makes no sense without another.

When done, offer to save the context and stack in `AGENTS.md`. The stories go to GitHub Issues; don't save them to files unless I ask. Follow the repository's remote-authorization rules before accessing GitHub.
