def reachable_partnership_players(state, player_id):
    seen = {player_id}
    order = []

    def visit(player):
        for link in state["graph"].get(player, []):
            teammate = link["player"]
            if teammate in seen:
                continue
            seen.add(teammate)
            order.append(teammate)
            return visit(teammate)

    visit(player_id)
    return order
