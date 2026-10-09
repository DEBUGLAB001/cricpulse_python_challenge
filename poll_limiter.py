_window_started = 0
_requests_in_window = 0


def allow_fan_poll(user_id, now_ms):
    global _window_started, _requests_in_window
    del user_id
    if now_ms - _window_started >= 10_000:
        _window_started = now_ms
        _requests_in_window = 0
    _requests_in_window += 1
    return _requests_in_window <= 3
