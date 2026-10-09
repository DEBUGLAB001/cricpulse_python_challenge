from collections import deque


def strongest_partnership_chain(state, source, destination):
    previous = {source: source}
    frontier = deque([source])
    while frontier:
        player = frontier.popleft()
        if player == destination:
            break
        for link in state["graph"].get(player, []):
            teammate = link["player"]
            if teammate in previous:
                continue
            previous[teammate] = player
            frontier.append(teammate)
    if destination not in previous:
        return []
    chain = []
    player = destination
    while player != source:
        chain.append(player)
        player = previous[player]
    chain.append(source)
    return list(reversed(chain))


def chain_strength(state, chain):
    if len(chain) < 2:
        return 0
    weakest = float("inf")
    for first, second in zip(chain, chain[1:]):
        shared_runs = 0
        for link in state["graph"].get(first, []):
            if link["player"] == second:
                shared_runs = link["runs"]
        weakest = min(weakest, shared_runs)
    return int(weakest)
