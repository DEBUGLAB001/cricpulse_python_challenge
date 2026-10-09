# CricPulse

## Description

CricPulse is a Python/Flask live match center and cricket analytics application that mirrors real-time stadium telemetry and fan engagement features. It provides ball-by-ball momentum visualization, a six-over scoring stretch detector, a rolling recent run rate monitor, player-restricted strategy workspace notes, fan poll voting with rate limits, and an interactive partnership network graph.

The application runs as a lightweight Flask HTTP service with an in-memory match state store and a responsive web dashboard. The match center modules are separated into standalone Python units so each analytical and security requirement can be evaluated independently without external database dependencies.

## Repository Structure

```text
cricpulse-python-challenge/
├── challenge.json              Isolated runtime, port, install, start, and test configuration
├── requirements.txt            Python dependency requirements (Flask)
├── app.py                      Flask web service, REST API endpoints, session auth, and asset serving
├── match_data.py               Sample match state, overs log, batting roster, and partnership graph data
├── best_six_over.py            Sliding window algorithm for the highest-scoring six-over stretch
├── rolling_rate.py             Rolling run rate calculation across recent overs
├── strongest_chain.py          Maximum bottleneck path algorithm and chain strength calculator
├── partnership_reachability.py Recursive graph traversal to identify reachable batting partners
├── player_access.py            Role-based authorization checks for player workspace notes
├── poll_limiter.py             Sliding window per-user rate limiter for fan poll voting
├── web/
│   ├── index.html              Match center dashboard layout, scorecards, commentary, and modals
│   ├── style.css               Responsive dark-mode design, sports typography, and graph layout
│   └── app.js                  Live dashboard polling, chart visualization, and interactive graph
├── tests/
│   ├── run_tests.py            Telemetry test runner evaluating all six behavioral challenge cases
│   └── run_tests.sh            Shell execution wrapper returning JSON test output
└── README.md                   Project overview, quickstart run instructions, and testing guidelines
```

## Bugs and Bug Locations

These are the six behavioral bug surfaces covered by the challenge. The named locations identify the owning implementation areas for debugging and review.

### 1. Partnership reachability scan terminates prematurely

- **Bug location:** `partnership_reachability.py`, `reachable_partnership_players`
- **How to observe it:** Click Rohit Sharma's node in the "Partnership chain" section of the web dashboard, or execute `python tests/run_tests.py`.
- **Failure:** The traversal loop returns early upon visiting the first unvisited neighbor (`return visit(teammate)`), abandoning sibling branches and returning only 1 connected teammate instead of all reachable players.
- **Expected:** The traversal recursively visits all connected teammates throughout the partnership network, returning all 5 connected players for player 0.

### 2. Best six-over stretch misses overlapping windows

- **Bug location:** `best_six_over.py`, `best_six_over_runs`
- **How to observe it:** Inspect the "BEST 6 OVERS" badge on the "Run rate, over by over" card in the web dashboard, or execute `python tests/run_tests.py`.
- **Failure:** The loop iterates in step increments of 6 (`range(0, len(overs) - 5, 6)`), evaluating only discrete, non-overlapping 6-over blocks (overs 1–6 and 7–12) and yielding 86 runs instead of the true peak.
- **Expected:** Evaluates every contiguous 6-over sliding window with a step of 1, finding the peak momentum window (overs 3–8) of 108 runs.

### 3. Rolling run rate averages the full innings instead of recent overs

- **Bug location:** `rolling_rate.py`, `rolling_run_rate`
- **How to observe it:** Check the "LIVE FORM / Rolling run rate" card in the web dashboard sidebar, or execute `python tests/run_tests.py`.
- **Failure:** The calculation divides total innings runs by the entire number of overs bowled, reporting the overall match average (13.42 runs/over) rather than recent momentum.
- **Expected:** Calculates the average run rate strictly over the most recent 3 overs (overs 10–12), reporting ~11.33 runs/over.

### 4. Partnership chain selects shortest path rather than maximum bottleneck

- **Bug location:** `strongest_chain.py`, `strongest_partnership_chain`
- **How to observe it:** Check the "Strongest chain" header and highlighted route in the "Partnership chain" card, or execute `python tests/run_tests.py`.
- **Failure:** A standard Breadth-First Search (BFS) is used, selecting the path with the fewest hops (Rohit → Kohli → Jadeja with 2 hops and a bottleneck of 20 runs) instead of prioritizing connection strength.
- **Expected:** Implements a maximum bottleneck (widest path) search to identify the strongest link path (Rohit → Gill → Hardik → Jadeja), achieving a bottleneck strength of 30 runs.

### 5. Fan role is permitted to modify player focus notes

- **Bug location:** `player_access.py`, `can_save_player_note`
- **How to observe it:** Switch to a fan account (e.g. "Fan 1 (Aarav)") in the Fan Zone, enter text into the "PLAYER WORKSPACE" note, and click "Save note"; or execute `python tests/run_tests.py`.
- **Failure:** `can_save_player_note` permits both `"player"` and `"fan"` roles (`role in {"player", "fan"}`), allowing unauthorized fans to update internal team strategy notes.
- **Expected:** Only users with the `"player"` role are authorized to save player notes; fan submissions are rejected with an access denied response.

### 6. Poll rate limiter is shared globally rather than enforced per fan

- **Bug location:** `poll_limiter.py`, `allow_fan_poll`
- **How to observe it:** Vote 3 times as "Fan 1 (Aarav)", switch to "Fan 2 (Riya)", and attempt to vote; or execute `python tests/run_tests.py`.
- **Failure:** The function maintains a single global window counter and discards the user identifier (`del user_id`). When one fan exhausts their 3-vote quota, all other fans are locked out for the remainder of the 10-second window.
- **Expected:** Rate limiting is tracked independently per `user_id`, granting each fan their own allowance of 3 poll submissions per 10-second window.

## Expected Behaviour After Fixing All Bugs

- Clicking any player in the partnership network scans and highlights all connected teammates across all branches.
- The momentum stretch display shows the true maximum 6-over scoring window across all overlapping intervals (108 runs).
- The rolling run rate reflects the current batting momentum over the last 3 overs (~11.33 runs/over).
- The strongest partnership chain identifies the route that maximizes the weakest shared run partnership (30 runs bottleneck).
- Player workspace strategy notes are protected, allowing only authenticated player accounts to update them.
- Fan poll voting enforces a fair 3-vote limit per fan independently, without cross-user interference.
