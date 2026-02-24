# CS487W_Fysics_is_Phun
Fysics is Phun Classroom game

By: Wilson Quilli, Aland Adili, Colin Shields, Jonathan Alavez Reyes, Laurence Orji, Maxym Noyevoy and Matthew Wybranski

## Project Overview
Project Type: Web-based classroom game system

Primary Goal: Automate gameplay and scoring with minimal host interaction, while keeping stage progression host-controlled (Host clicks Next).

Stakeholder: Michael Kagan, PhD, Associate Professor of Physics, Pennsylvania State University.

## Team Members and Roles
- Everybody: Project Lead + Requirements Owner (shared responsibility)
- Maxym: Backend Lead (Decks/CSV Handling + Python API + Export)
- Laurence: Game Engine + Real-Time Lead (state machine + timers + session events)
- Jonathan: Frontend Lead (Host Experience, React)
- Wilson & Aland: Frontend Engineer (Player + Jury Experience, React)
- Matthew: QA Lead + Scoring Verifier
- Colin: DevOps + Integration Owner

## 1. Problem Statement
### 1.1 Objective and Deliverables
Objective:
Develop a web-based system that automates the “Fysics is Phun” classroom game for at least 4 students (typical 15–25), supporting three roles (Host, Player, Jury), two timed stages per question, host-controlled progression, and automated scoring.

Primary Deliverables:
- Web app accessible on phones/laptops
- Join-code session (no accounts), with role-specific screens/permissions
- Deck Management (CSV create/import/backup)
- Live session engine with server-side timers and host-gated stage progression
- Automated scoring with per-round breakdown and final Excel export
- Documentation: setup, test plan, demo script

### 1.2 Motivation
Manual coordination of the game disrupts pacing and instruction. A web system automates repetitive tasks, letting the host focus on discussion, explanation, and reflection.

### 1.3 Significance
- Host: smooth gameplay, pacing control, deck reuse, real-time progress, minimum players/jury enforcement
- Player: easy joining, simple interface, immediate feedback via leaderboard
- Jury: efficient voting on Best/Worst Fake, unanimous decision support
- Benefits: efficiency, consistent/fair scoring, improved classroom pacing, host control for instruction moments

## 2. Features (Requirement Specification)
### 2.1 System Overview
Waiting Room:
Host creates a session, receives join code and role-specific URLs/QR codes; students join with nicknames (duplicates rejected). Host assigns Jury; minimum 4 players and 1 jury required to start.

Round Loop:
- Stage 1: Players submit one timed fake answer (auto-submitted at timer end)
- Stage 2: Players guess the correct answer (players answer sequentially, first player 30s, others 10s; order rotates each round). When all guesses are made or the timer runs out, the correct answer is shown and removed from the pool of answers
- Stage 3: Jury votes on Best (and optionally Worst) Fake from available answers

Results:
Correct answer and per-round scoring shown; host advances via Next.

End Game:
Final leaderboard displayed; game summary exported as CSV/Excel, storing each round’s fake created, fake picked, and source team.

### 2.2 Main Features
- Deck Management: Host creates/imports decks (CSV/Excel) with prompt and answer text; decks private outside gameplay; decks can be backed up, exported, and reused
- Session Management: Host shares join code and role-specific links/QRs; duplicates rejected; game starts when minimum players and jury are present
- Role Assignment (Jury): Jury votes collectively; unanimous decision for Best/Worst Fake required; optional tie rule splits 1 point among tied teams
- Automated Timing & Host Control: Server-side timers; stages auto-end on timer or completion; host clicks Next to advance; customizable per-stage timers; optional global 30s timer for all players
- Automated Scoring & Leaderboard: Correct guesses, fake selections, and jury picks scored automatically; leaderboard updated each round; optional tie rule handled
- Export Summary: Host can export final scores (CSV) and full game summary (Excel) including per-round fakes, selections, and authors
- Display: All answer options fit on screen at once (no scrolling)

## 3. Gameplay
The system supports three roles (Host, Player, Juror) across the main game states:
Waiting Room -> Stage 1 -> Stage 2 -> Stage 3 -> Leaderboard

Host (Control & Setup):
Logs in to manage decks (create/edit/import/export CSV), configure timers (global/sequential), start sessions, generate join links, and control gameplay (skip questions, pause/extend/resume timers, advance stages/questions). Views round results, ends the game, and exports final scores via CSV/Excel.

Player (Participation & Guessing):
Joins via link/QR; Stage 1 submits one fake answer (validated, editable until timer ends); Stage 2 guesses correct answer (global or sequential timer); Stage 3 and Leaderboard view per-round results and final scores.

Juror (Evaluation & Voting):
Joins via link/QR; Stage 3 votes Best Fake (mandatory) and optionally Worst Fake, awarding or deducting fractional points. Views round results and final leaderboard.

## Tools and Tech Stack
- Frontend: React, HTML/CSS responsive design, fetch for API calls
- Backend: Python (WebSocket and server timer)
- Storage: Remote CSV decks; in-memory session state
- Deployment: External server hosting for backend and frontend using Vercel