---
name: idea-to-feature
description: Take a raw feature idea from a one-line spark to a UI direction to a lean ticket/issue — without padding scope. Fire when the user says "I have an idea", "let's turn this into a feature", "let's mock this and make a ticket", or starts from a loose concept they want to shape into something buildable. Iterates UI through a chosen lane (ChatGPT/Images, Stitch, in-app code, terminal ASCII) then writes a ticket whose acceptance criteria follow the idea ONLY — no invented ACs.
metadata:
  author: francisco
  version: "0.1.0"
---

# Idea to Feature

Turn a raw idea into a buildable feature in three moves: **capture → iterate UI → write a lean ticket.** The whole point is *restraint* — you follow the idea and nothing more. No gold-plating, no invented acceptance criteria, no scope the user didn't ask for.

## The flow

### 1. Capture the idea (don't interrogate)

Take the user's idea as one prompt. Reflect it back in 1–3 sentences to confirm you understood it. Ask **at most one** clarifying question, and only if the idea is genuinely ambiguous about *what* it is (not *how* to build it). If it's clear, move on. Do not run a requirements interview.

### 2. Iterate the UI — pick a lane

Ask which lane the user wants (or use their stated preference). Stay in that lane; don't jump to building real code if they picked a mockup lane.

- **ChatGPT + Images 2.0** — the user iterates the visual externally and brings back images/screens. Your job is to react and refine direction, not to build.
- **Stitch** — generate/iterate the UI in Stitch; capture the direction.
- **In-app with real code** — build a throwaway/preview component in the actual app to feel the interaction. Only this lane writes code at this stage.
- **Terminal ASCII / wireframe** — sketch the layout as an ASCII wireframe in the terminal for a fast, low-fidelity shape. (If the `visual-explainer` skill is available and the user wants something richer than ASCII, offer an HTML mock instead.)

Iterate until the user says the direction is right. Capture the chosen direction in a sentence or two — that becomes the basis for the ticket.

### 3. Write the ticket / issue — LEAN

Create the ticket (Jira/Linear/GitHub — match the user's project). The hard rules:

- **ACs follow the idea ONLY.** Every acceptance criterion must trace directly to something the user actually expressed. If you can't point to where the idea says it, don't write it.
- **No invented/padded ACs.** No "should be accessible", "should handle errors gracefully", "should be responsive" boilerplate unless the user raised it. Padding is the failure mode this skill exists to prevent.
- **No invented template structure.** If the project has existing tickets, source the structure from a real one — do not infer a template. (Verify markup renders: next-gen Jira projects use Atlassian Document Format, not wiki markup.)
- **Title + concise description + the UI direction** from step 2 + the minimal AC list. That's it.
- **No AI attribution.**

Before creating, show the user the draft ticket and the AC list so they can confirm nothing was padded.

## Anti-patterns (stop yourself)

- Turning "capture the idea" into a 10-question interrogation.
- Jumping to real code when the user chose a mockup lane, or jumping to a mockup when they're still discussing.
- Adding ACs for things the idea never mentioned because they're "best practice."
- Inventing a ticket template instead of copying a real one from the project.
