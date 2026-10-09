def best_six_over_runs(state):
    overs = state["overs"]
    if len(overs) < 6:
        return 0
    best = 0
    for start in range(0, len(overs) - 5, 6):
        total = sum(over["runs"] for over in overs[start : start + 6])
        best = max(best, total)
    return best
