def sample_match():
    overs = [7, 7, 18, 18, 18, 18, 18, 18, 5, 5, 5, 24]
    players = [
        {"id": 0, "name": "Rohit Sharma", "role": "Opener"},
        {"id": 1, "name": "Virat Kohli", "role": "Batter"},
        {"id": 2, "name": "Shubman Gill", "role": "Batter"},
        {"id": 3, "name": "Suryakumar Yadav", "role": "Batter"},
        {"id": 4, "name": "Hardik Pandya", "role": "All-rounder"},
        {"id": 5, "name": "Ravindra Jadeja", "role": "All-rounder"},
    ]
    graph = {player["id"]: [] for player in players}

    def partnership(first, second, runs):
        graph[first].append({"player": second, "runs": runs})
        graph[second].append({"player": first, "runs": runs})

    partnership(0, 1, 38)
    partnership(0, 2, 30)
    partnership(0, 3, 14)
    partnership(1, 5, 20)
    partnership(2, 4, 45)
    partnership(3, 4, 22)
    partnership(4, 5, 34)
    return {
        "overs": [{"number": index + 1, "runs": runs} for index, runs in enumerate(overs)],
        "players": players,
        "graph": graph,
        "score": 161,
        "wickets": 3,
        "target": 211,
        "currentOver": 12,
    }


def public_match(state):
    partnerships = []
    for first, links in state["graph"].items():
        partnerships.extend(
            {"from": int(first), "to": link["player"], "runs": link["runs"]}
            for link in links
        )
    return {
        "score": state["score"],
        "wickets": state["wickets"],
        "target": state["target"],
        "currentOver": state["currentOver"],
        "overs": state["overs"],
        "players": state["players"],
        "partnerships": partnerships,
    }
