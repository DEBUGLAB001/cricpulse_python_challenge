import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from best_six_over import best_six_over_runs
from match_data import sample_match
from partnership_reachability import reachable_partnership_players
from player_access import save_player_note
from poll_limiter import allow_fan_poll
from rolling_rate import rolling_run_rate
from strongest_chain import chain_strength, strongest_partnership_chain


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def test_recursive_partnership_scan_visits_all_connected_players():
    state = {
        "players": [{"id": i} for i in range(4)],
        "graph": {
            0: [{"player": 1, "runs": 10}, {"player": 2, "runs": 9}],
            1: [{"player": 0, "runs": 10}],
            2: [{"player": 0, "runs": 9}, {"player": 3, "runs": 8}],
            3: [{"player": 2, "runs": 8}],
        },
    }
    check(3 in reachable_partnership_players(state, 0), "Partnership scan missed the second branch")


def test_best_six_over_stretch_includes_overlapping_windows():
    actual = best_six_over_runs(sample_match())
    check(actual == 108, f"Expected best six-over stretch of 108 runs, got {actual}")


def test_rolling_run_rate_uses_recent_overs():
    actual = rolling_run_rate(sample_match())
    check(11.3 < actual < 11.4, f"Expected recent three-over rate near 11.33, got {actual:.6f}")


def test_partnership_chain_maximizes_minimum_link():
    state = sample_match()
    chain = strongest_partnership_chain(state, 0, 5)
    actual = chain_strength(state, chain)
    check(actual == 30, f"Expected strongest chain bottleneck of 30 runs, got {actual}")


def test_fan_cannot_edit_player_focus_note():
    allowed, _ = save_player_note("Keep strike rotating", "Target the short boundary", "fan")
    check(not allowed, "Fan role must not edit a player-only focus note")


def test_poll_rate_limit_is_per_fan():
    first_fan = all(allow_fan_poll("fan-a", 50_000) for _ in range(3))
    second_fan = allow_fan_poll("fan-b", 50_000)
    check(first_fan and second_fan, "A second fan should have an independent poll allowance")


TESTS = [
    test_recursive_partnership_scan_visits_all_connected_players,
    test_best_six_over_stretch_includes_overlapping_windows,
    test_rolling_run_rate_uses_recent_overs,
    test_partnership_chain_maximizes_minimum_link,
    test_fan_cannot_edit_player_focus_note,
    test_poll_rate_limit_is_per_fan,
]


def main():
    results = {}
    passed = 0
    failed = 0
    total_ms = 0
    for test in TESTS:
        started = time.perf_counter()
        error = None
        try:
            test()
            status = "passed"
            passed += 1
        except Exception as exc:  # Keep one failing test from hiding the rest.
            status = "failed"
            failed += 1
            error = str(exc)
        elapsed = int((time.perf_counter() - started) * 1000)
        total_ms += elapsed
        result = {"Status": status, "Execution time": f"{elapsed}ms"}
        if error is not None:
            result["Error"] = error
        results[test.__name__] = result
    results.update(
        Passed=passed,
        Failed=failed,
        **{"Total bugs": failed, "Total Execution time": f"{total_ms}ms"},
    )
    print(json.dumps(results, separators=(",", ":")))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
