---
name: grill
description: Interrogate an idea or ticket until there is shared understanding of the destination — BEFORE any spec, mock, or code. Fire at the very start of a ticket (FRA-xxx) or a raw idea, as the first gate of the harness. Asks questions one small batch at a time, assuming it does NOT understand yet; surfaces ambiguities, edge cases, and unstated decisions so the spec that follows is sharp. Adapted from Matt Pocock's grill-me technique.
metadata:
  author: francisco
  version: "0.1.0"
---

# Grill

The first gate of the MyDock harness. Before a spec is written, before a mock is iterated, before a single line of code — **interrogate the input until you and Francisco share the same picture of the destination.**

The output of a grill is not code, not a mock, not a ticket. It is **clarity**: ambiguities resolved, edge cases named, unstated decisions made explicit. A sharp spec is the *consequence* of a good grill, not part of it.

> Adapted from Matt Pocock's grill-me technique. The stance that makes it work: **start by assuming you do NOT understand.** An agent's default failure mode is to assume it gets it and rush to build. Grill is the deliberate counterweight.

## When it runs

**Always — at the very start, whether the input is a raw idea or an already-written ticket.** A FRA-xxx ticket is *input*, not final truth. The ticket says *what someone thought to write down*; the grill exists to find what it left out. Even a well-written ticket has open questions (does "View All" navigate or open a modal? what's the empty state? which platform variant?). Grill them before the spec, not inside it.

Grill sits between stage 0 (Product input) and stage 1 (Framing) of `docs/harness.md`. Stage 0 already gathered context (Linear ticket, engram, recent PRs, related specs) — grill consumes that context and interrogates it.

## The flow

### 1. Load the input and the context

By the time grill runs, stage 0 has fetched the Linear ticket, searched engram (project `mydock`), pulled recent PRs/commits for the touched surfaces, and read related specs. Read all of it. The grill is *grounded* — questions come from the gap between what the context shows and what the destination requires, not from a generic checklist.

### 2. Interrogate — one small batch at a time

Ask questions in **small batches (1–3), one round at a time**, then wait. Never dump a 10-question form. Each answer reshapes the next question. Keep going until the destination is clear — not until a fixed number of questions is hit.

Aim questions at the things that change what gets built:

- **Behavior at the edges** — empty state, error state, loading, the "what if zero / what if many" cases.
- **Navigation & surface** — new route vs modal vs inline? where does this live?
- **Scope boundaries** — what is explicitly *out*? what is the smallest version that satisfies the idea?
- **Decisions the input assumes but doesn't state** — data shape, which existing component is reused vs changed, which provider/variant applies.
- **Contradictions** — where the ticket, a linked design, and the existing code disagree. Surface them; don't pick silently.

Do NOT ask *how to build it* (that's the spec's job) or pad with questions whose answer wouldn't change the work.

### 3. Reach shared understanding and hand off

When the picture is clear, **reflect it back** in a few bullets: what's being built, the resolved decisions, what's explicitly out of scope, and any remaining open question that genuinely needs Francisco. Confirm it matches his intent.

Then route forward:

- **Needs design, none exists** → hand off to `/idea-to-feature` (the prototype lane: in-app code mock first, then ASCII, then image gen). The grill's resolved understanding is what that skill iterates against.
- **Design exists, or none needed** → straight to the spec. The grill's bullets become the spec's Context section, with open questions already answered.

### 4. Persist

Save the resolved understanding to engram (`mem_save`, project `mydock`) — destination, key decisions, out-of-scope, open questions. This makes the grill resumable if the session is cut, and keeps it consistent with parallel sessions on the same branch.

## Anti-patterns (stop yourself)

- Assuming you understand and skipping to the spec or a mock. This is the failure grill exists to prevent.
- Dumping all questions at once instead of small batches that build on each answer.
- Asking *how to build* it (spec territory) instead of *what the destination is*.
- Treating a written FRA-xxx ticket as complete truth — grill it anyway.
- Padding with questions whose answers wouldn't change a single decision.
- Silently resolving a contradiction between ticket / design / code instead of surfacing it.

## Relationship to `idea-to-feature`

They are complementary, not overlapping. `idea-to-feature` step 1 is deliberately *anti-interrogation* ("capture the idea, don't interrogate") because its job is the **prototype + lean ticket**. Grill is the interrogation that comes *before* — it owns understanding the destination; `idea-to-feature` owns shaping the UI and writing the ACs. Grill → (optionally) `idea-to-feature` → spec.
