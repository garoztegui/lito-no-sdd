---
name: story
description: Refines one backlog story and offers to update its GitHub issue and project status to Ready. Writes no code; implementation is /pair's job.
disable-model-invocation: true
---

# Story

We refine a single story, right before building it. You propose and I decide.

## Steps

1. **Read the story** I give you (pasted text, GitHub issue, Jira ticket, etc.) and review the current code and `AGENTS.md` to understand the context.
2. **Acceptance criteria.** Propose 2–3 in Given/When/Then format. They only describe *what* the user sees or gets, never *how* it's implemented.
3. **If it needs more than 3 criteria, don't bloat it: propose splitting it.** Deliver the new stories in backlog format (`As a…, I want…, so that…`) for me to add to the tracker, and we continue with the first one.
4. **Mini plan.** 5 bullets max, no code or file names. How it cuts through the layers, with the minimum that meets the criteria.
5. **Wait for my approval.** We adjust until I say yes.
6. **Ask about GitHub.** Once the refined story is approved, ask whether I want you to update its existing GitHub issue with the refined content and set its status to `Ready` in the LITO RESERVAS project. Stop and wait for my answer. Approval of the story alone does not authorize this update.
7. **Update only on yes.** Identify the matching issue in `garoztegui/lito-no-sdd`; never assume the story number equals the GitHub issue number. Update its body with the approved story, acceptance criteria, plan, out-of-scope items, and any approved suggestions. Add the issue to the LITO RESERVAS project (`garoztegui` project 1) if necessary, then set its status to `Ready`. Report the issue link and the observed result of each action. If I decline, make no GitHub changes.

## Rules

- **Don't invent requirements.** If information is missing, ask me.
- **The simplest thing that meets the criteria.** No abstractions, layers, configuration or patterns "for the future".
- **Suggest, don't decide.** If a pattern could help (Atomic Design, middleware composition, extracting a component…), mention it under "Suggestions" with its why. Only suggest it if there's a concrete signal in the code (for example, something that already repeats), not in advance.
- **Don't write code.**
- Follow the repository's remote-authorization rules before accessing GitHub. If the issue or project cannot be identified unambiguously, or GitHub is unavailable, report the blocker rather than creating a replacement issue or claiming an update.

## Output format

A block ready to paste into the issue. `/pair` uses it as input.

```markdown
## Story
As a <actor>, I want <action>, so that <benefit>.

## Acceptance criteria
- [ ] Given <context>, when <action>, then <result>.
- [ ] ...

## Plan
- ...

## Out of scope
- <what's left out of this story, so it doesn't sneak in>

## Suggestions (your call)
- <optional>
```
