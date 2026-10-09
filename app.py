import time
from dataclasses import dataclass
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from best_six_over import best_six_over_runs
from match_data import public_match, sample_match
from partnership_reachability import reachable_partnership_players
from player_access import save_player_note
from poll_limiter import allow_fan_poll
from rolling_rate import rolling_run_rate
from strongest_chain import chain_strength, strongest_partnership_chain

ROOT = Path(__file__).resolve().parent
app = Flask(__name__, static_folder=None)
match = sample_match()
player_note = "Play straight early; accelerate after the powerplay."


@dataclass
class Session:
    user_id: str
    role: str
    name: str


sessions = {}


class PreviewPrefixMiddleware:
    """Strip the platform preview prefix before Flask route matching."""

    def __init__(self, application):
        self.application = application

    def __call__(self, environ, start_response):
        path = environ.get("PATH_INFO", "")
        marker = "/preview/"
        if marker in path:
            prefix_end = path.index(marker) + len(marker)
            environ["SCRIPT_NAME"] = environ.get("SCRIPT_NAME", "") + path[:prefix_end - 1]
            environ["PATH_INFO"] = "/" + path[prefix_end:]
        return self.application(environ, start_response)


app.wsgi_app = PreviewPrefixMiddleware(app.wsgi_app)


def current_session():
    authorization = request.headers.get("Authorization", "")
    token = authorization.removeprefix("Bearer ")
    return sessions.get(token)


@app.get("/")
def home():
    return send_from_directory(ROOT / "web", "index.html")


@app.get("/api/state")
def state():
    return jsonify(public_match(match))


@app.get("/api/analytics")
def analytics():
    chain = strongest_partnership_chain(match, 0, 5)
    return jsonify(
        bestSixOverRuns=best_six_over_runs(match),
        rollingRunRate=rolling_run_rate(match),
        chainStrength=chain_strength(match, chain),
        chain=chain,
    )


@app.get("/api/reachable/<int:player_id>")
def reachable_players(player_id):
    return jsonify(player_id=player_id, reachable=reachable_partnership_players(match, player_id))


@app.post("/api/login")
def login():
    user = request.form.get("user", "")
    password = request.form.get("password", "")
    if user == "rohit" and password == "coverdrive":
        session = Session("player-rohit", "player", "Rohit Sharma")
    elif user == "fan" and password == "fanpass":
        session = Session("fan-101", "fan", "Aarav Mehta")
    elif user == "fan2" and password == "fanpass":
        session = Session("fan-102", "fan", "Riya Sen")
    else:
        return jsonify(ok=False, error="Invalid sign-in"), 401
    token = f"cp-{session.user_id}-{int(time.time())}"
    sessions[token] = session
    return jsonify(ok=True, token=token, user=session.name, role=session.role)


@app.post("/api/poll")
def poll():
    session = current_session()
    if session is None:
        return jsonify(ok=False, error="Sign in required"), 401
    if not allow_fan_poll(session.user_id, int(time.time() * 1000)):
        return jsonify(ok=False, error="Poll limit reached"), 429
    return jsonify(ok=True, message="Vote counted")


@app.get("/api/player-note")
def get_player_note():
    return jsonify(note=player_note)


@app.post("/api/player-note")
def update_player_note():
    global player_note
    session = current_session()
    if session is None:
        return jsonify(ok=False, error="Sign in required"), 401
    allowed, player_note = save_player_note(
        player_note, request.form.get("note", ""), session.role
    )
    if not allowed:
        return jsonify(ok=False, error="Player access required"), 403
    return jsonify(ok=True, note=player_note)


@app.get("/<path:asset>")
def web_asset(asset):
    return send_from_directory(ROOT / "web", asset)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
