const $ = (q) => document.querySelector(q);
let match = null, analytics = null, session = JSON.parse(localStorage.getItem('cricpulse-session') || 'null');
let currentReachable = null, selectedPlayerId = null;

const toast = (text) => {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
};

const authHeaders = () => session ? { Authorization: `Bearer ${session.token}` } : {};

async function load() {
  try {
    const [m, a, noteRes] = await Promise.all([
      fetch('api/state').then(r => r.json()),
      fetch('api/analytics').then(r => r.json()),
      fetch('api/player-note').then(r => r.json()).catch(() => ({ note: '' }))
    ]);
    match = m;
    analytics = a;
    if (noteRes && noteRes.note) {
      $('#player-note').value = noteRes.note;
    }
    render();
  } catch (err) {
    toast('Live score feed reconnecting…');
  }
}

function render() {
  if (!match || !analytics) return;

  // 1. Live Score & Momentum
  $('#score').innerHTML = `${match.score}<span>/${match.wickets}</span>`;
  $('#rolling-rate').innerHTML = `${analytics.rollingRunRate.toFixed(2)}<span> / over</span>`;
  $('#stretch').textContent = `BEST 6 OVERS　${analytics.bestSixOverRuns} RUNS`;

  const recent = match.overs.slice(-3).reduce((sum, o) => sum + o.runs, 0) / Math.min(3, match.overs.length);
  const innings = match.overs.reduce((sum, o) => sum + o.runs, 0) / match.overs.length;
  const delta = recent - innings;
  $('#last-three').textContent = recent.toFixed(2);
  $('#innings-average').textContent = innings.toFixed(2);
  $('#rate-delta').textContent = `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(2)} vs innings avg`;

  // 2. Bar Chart
  let bestStart = 0, bestRuns = -1;
  for (let start = 0; start + 6 <= match.overs.length; start++) {
    const runs = match.overs.slice(start, start + 6).reduce((sum, o) => sum + o.runs, 0);
    if (runs > bestRuns) {
      bestRuns = runs;
      bestStart = start;
    }
  }
  const max = Math.max(...match.overs.map(o => o.runs));
  const bars = match.overs.map((o, i) =>
    `<div class="bar-col"><span class="bar-value" style="--height:${Math.round(o.runs / max * 100)}%">${o.runs}</span><i class="bar ${i >= bestStart && i < bestStart + 6 ? 'best' : ''}" style="height:${Math.max(5, o.runs / max * 100)}%"></i><small class="bar-label">${o.number}</small></div>`
  ).join('');
  $('#chart').innerHTML = bars;
  $('#mini-bars').innerHTML = match.overs.slice(-8).map(o => `<i style="height:${Math.max(4, o.runs / 24 * 36)}px"></i>`).join('');
  $('#feed-list').innerHTML = match.overs.slice(-6, -1).reverse().map(o => `<div class="feed-row"><span>Over ${o.number}</span><b>${o.runs} runs</b></div>`).join('');

  // 3. Strongest Partnership Chain Display
  if ($('#chain-strength-display')) {
    $('#chain-strength-display').textContent = `${analytics.chainStrength} runs bottleneck`;
  }
  if ($('#chain-path-display') && analytics.chain) {
    const playerShorts = { 0: 'Rohit', 1: 'Kohli', 2: 'Gill', 3: 'Surya', 4: 'Hardik', 5: 'Jadeja' };
    const pathText = analytics.chain.map(id => playerShorts[id] || id).join(' → ');
    $('#chain-path-display').textContent = `[Path: ${pathText}]`;
  }

  // 4. Graph Rendering
  renderGraph();

  // 5. User & Session state
  if (session) {
    $('#user-badge').textContent = session.user;
    $('#login-open').textContent = 'Sign out';
    if ($('#active-user-status')) {
      $('#active-user-status').innerHTML = `Active: <b>${session.user}</b> <span class="role-badge ${session.role}">${session.role}</span>`;
    }
    if ($('#note-author-badge')) {
      $('#note-author-badge').textContent = session.role === 'player' ? 'ROHIT (PLAYER)' : `${session.user.split(' ')[0].toUpperCase()} (${session.role.toUpperCase()})`;
    }
  } else {
    $('#user-badge').textContent = 'Guest';
    $('#login-open').textContent = 'Sign in';
    if ($('#active-user-status')) {
      $('#active-user-status').textContent = 'Active: Guest (Sign in to test)';
    }
    if ($('#note-author-badge')) {
      $('#note-author-badge').textContent = 'NOT SIGNED IN';
    }
  }
}

function renderGraph() {
  const players = [
    { id: 0, x: 10, y: 51, initials: 'RS', short: 'Rohit', cl: 'kohli' },
    { id: 1, x: 34, y: 24, initials: 'VK', short: 'Kohli', cl: 'kohli' },
    { id: 2, x: 34, y: 78, initials: 'SG', short: 'Gill', cl: 'other' },
    { id: 3, x: 59, y: 18, initials: 'SY', short: 'Surya', cl: 'pandya' },
    { id: 4, x: 68, y: 75, initials: 'HP', short: 'Hardik', cl: 'pandya' },
    { id: 5, x: 91, y: 48, initials: 'RJ', short: 'Jadeja', cl: 'jadeja' }
  ];

  const edges = [
    { a: 0, b: 1, r: 38 },
    { a: 0, b: 2, r: 30 },
    { a: 0, b: 3, r: 14 },
    { a: 1, b: 5, r: 20 },
    { a: 2, b: 4, r: 45 },
    { a: 3, b: 4, r: 22 },
    { a: 4, b: 5, r: 34 }
  ];

  // Check which edges are part of the active chain
  const chainEdges = new Set();
  if (analytics && analytics.chain && analytics.chain.length > 1) {
    for (let k = 0; k < analytics.chain.length - 1; k++) {
      const u = analytics.chain[k], v = analytics.chain[k + 1];
      chainEdges.add(`${Math.min(u, v)}-${Math.max(u, v)}`);
    }
  }

  let svgLines = '';
  let badges = '';
  for (const e of edges) {
    const a = players[e.a], b = players[e.b];
    const isChain = chainEdges.has(`${Math.min(e.a, e.b)}-${Math.max(e.a, e.b)}`);
    svgLines += `<line class="graph-line ${isChain ? 'chain-active' : ''}" x1="${a.x}%" y1="${a.y}%" x2="${b.x}%" y2="${b.y}%" />`;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    badges += `<div class="graph-badge ${isChain ? 'chain-active' : ''}" style="left:${midX}%;top:${midY}%">${e.r}</div>`;
  }

  let html = `<svg class="graph-svg">${svgLines}</svg>${badges}`;

  for (const p of players) {
    let stateClass = '';
    if (selectedPlayerId !== null) {
      if (p.id === selectedPlayerId) stateClass = 'selected';
      else if (currentReachable && currentReachable.includes(p.id)) stateClass = 'reachable';
      else stateClass = 'unreachable';
    }
    html += `<div class="graph-player ${stateClass}" data-player="${p.id}" style="left:${p.x}%;top:${p.y}%" title="Click to scan reachability from ${p.short}"><span class="avatar ${p.cl}">${p.initials}</span><b>${p.short}</b><small>${p.id === 0 ? 'at crease' : 'batting link'}</small></div>`;
  }

  $('#partnership-graph').innerHTML = html;

  // Click on player node to trigger reachability scan
  document.querySelectorAll('.graph-player').forEach(node => {
    node.onclick = () => scanReachability(parseInt(node.dataset.player, 10));
  });
}

async function scanReachability(playerId) {
  try {
    selectedPlayerId = playerId;
    const res = await fetch(`api/reachable/${playerId}`);
    const data = await res.json();
    currentReachable = data.reachable || [];
    const playerShorts = { 0: 'Rohit', 1: 'Kohli', 2: 'Gill', 3: 'Surya', 4: 'Hardik', 5: 'Jadeja' };
    const pName = playerShorts[playerId] || `Player ${playerId}`;
    const reachableNames = currentReachable.map(id => playerShorts[id] || id);

    if ($('#reachability-status')) {
      if (currentReachable.length < 5) {
        $('#reachability-status').innerHTML = `<span style="color:#ff9a57"><b>Reachable from ${pName}:</b> only ${reachableNames.join(', ') || 'none'} (${currentReachable.length}/5 teammates). Sibling branches missed!</span>`;
      } else {
        $('#reachability-status').innerHTML = `<span style="color:var(--lime)"><b>Reachable from ${pName}:</b> all ${currentReachable.length} teammates connected!</span>`;
      }
    }
    renderGraph();
    toast(`Scanned from ${pName}: ${currentReachable.length} connected`);
  } catch (err) {
    toast('Reachability scan failed');
  }
}

// Quick sign-in helper
async function quickLogin(user, password) {
  const response = await fetch('api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `user=${user}&password=${encodeURIComponent(password)}`
  });
  const result = await response.json();
  if (!result.ok) {
    toast('Sign-in failed');
    return;
  }
  session = result;
  localStorage.setItem('cricpulse-session', JSON.stringify(session));
  render();
  toast(`Switched to ${session.user} (${session.role})`);
}

// Event Listeners
$('#login-open').onclick = () => {
  if (session) {
    session = null;
    localStorage.removeItem('cricpulse-session');
    render();
    toast('Signed out');
    return;
  }
  $('#login-modal').classList.remove('hidden');
};

$('#login-close').onclick = () => $('#login-modal').classList.add('hidden');

$('#account').onchange = () => {
  const acc = $('#account').value;
  $('#password').value = acc === 'player' ? 'coverdrive' : 'fanpass';
};

$('#login-submit').onclick = async () => {
  const acc = $('#account').value;
  const user = acc === 'player' ? 'rohit' : (acc === 'fan2' ? 'fan2' : 'fan');
  await quickLogin(user, $('#password').value);
  $('#login-modal').classList.add('hidden');
};

// Quick switch buttons inside the Fan Zone card
const sFan1 = $('#switch-fan1');
if (sFan1) sFan1.onclick = () => quickLogin('fan', 'fanpass');

const sFan2 = $('#switch-fan2');
if (sFan2) sFan2.onclick = () => quickLogin('fan2', 'fanpass');

const sPlayer = $('#switch-player');
if (sPlayer) sPlayer.onclick = () => quickLogin('rohit', 'coverdrive');

// Scan Rohit Network button
const scanBtn = $('#scan-partnerships-btn');
if (scanBtn) scanBtn.onclick = () => scanReachability(0);

// Poll Voting
document.querySelectorAll('.poll-option').forEach(button => {
  button.onclick = async () => {
    if (!session) {
      $('#login-modal').classList.remove('hidden');
      toast('Sign in to cast your vote');
      return;
    }
    const r = await fetch('api/poll', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `choice=${button.dataset.choice}`
    });
    const data = await r.json();
    if (data.ok) {
      toast(`Vote counted for ${session.user}`);
    } else {
      toast(`${data.error}: Rate limit blocked ${session.user}!`);
    }
  };
});

// Player Workspace Note
$('#save-note').onclick = async () => {
  if (!session) {
    toast('Sign in required to save note');
    return;
  }
  const noteVal = $('#player-note').value;
  const r = await fetch('api/player-note', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `note=${encodeURIComponent(noteVal)}`
  });
  const result = await r.json();
  if (result.ok) {
    if (session.role === 'fan') {
      toast(`Saved! (Bug: Fan '${session.user}' was allowed to edit player note)`);
    } else {
      toast(`Player note saved by ${session.user}`);
    }
  } else {
    toast(`Access Denied: ${result.error}`);
  }
};

$('#password').onkeydown = (e) => {
  if (e.key === 'Enter') $('#login-submit').click();
};

load();
setInterval(load, 10000);
