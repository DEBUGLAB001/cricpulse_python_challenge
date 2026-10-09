def can_save_player_note(role):
    return role in {"player", "fan"}


def save_player_note(current_note, new_note, role):
    if not can_save_player_note(role):
        return False, current_note
    return True, new_note
