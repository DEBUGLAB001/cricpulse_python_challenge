def rolling_run_rate(state):
    overs = state["overs"]
    if not overs:
        return 0.0
    innings_runs = sum(over["runs"] for over in overs)
    return innings_runs / len(overs)
