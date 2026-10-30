// When served by the backend on :5000 use relative /api (no CORS/port issue).
// When served on another port (e.g. Live Server :3000) use localhost:5000.
const API = (window.location.port === '5000' ? '' : 'http://localhost:5000') + '/api';
const fmt = n => 'Rs ' + Number(n || 0).toLocaleString('en-PK');
const fmtDate = d => new Date(d).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });

let currentUser = JSON.parse(localStorage.getItem('eventUser') || 'null');
let events = [], categories = [], myRegs = [], activeCategory = 'All';

async function api(path, opts) {
  const r = await fetch(API + path, opts);
  if (!r.ok) { let msg = await r.text(); try { msg = JSON.parse(msg).error || msg; } catch {} throw new Error(msg); }
  return r.json();
}
function setMsg(id, text, ok) {
  const el = document.getElementById(id);
  el.textContent = text || '';
  el.className = 'msg' + (ok ? ' ok' : '');
}

// ---------- Auth: login / registration forms ----------
function showAuth(which) {
  document.getElementById('loginForm').classList.toggle('hidden', which !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', which !== 'register');
  document.getElementById('tabLoginBtn').classList.toggle('active', which === 'login');
  document.getElementById('tabRegisterBtn').classList.toggle('active', which === 'register');
  setMsg('authMsg', '');
}
function fillDemo(email, pass) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = pass;
}
async function doLogin(e) {
  e.preventDefault();
  try {
    const user = await api('/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: document.getElementById('loginEmail').value.trim(), password: document.getElementById('loginPassword').value })
    });
    enterApp(user);
  } catch (err) { setMsg('authMsg', err.message); }
}
async function doRegister(e) {
  e.preventDefault();
  const pass = document.getElementById('regPassword').value;
  if (pass !== document.getElementById('regConfirm').value) { setMsg('authMsg', 'Passwords do not match'); return; }
  try {
    const user = await api('/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: document.getElementById('regName').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        phone: document.getElementById('regPhone').value.trim(),
        role: document.getElementById('regRole').value,
        password: pass
      })
    });
    setMsg('authMsg', 'Account created! Welcome, ' + user.full_name, true);
    enterApp(user);
  } catch (err) { setMsg('authMsg', err.message); }
}
function logout() {
  localStorage.removeItem('eventUser');
  currentUser = null;
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
}
function enterApp(user) {
  currentUser = user;
  localStorage.setItem('eventUser', JSON.stringify(user));
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
  document.getElementById('userInfo').textContent = user.full_name + ' (' + user.role + ')  ';
  document.getElementById('createNote').textContent =
    (user.role === 'organizer' || user.role === 'admin')
      ? 'You can create events as ' + user.role + '.'
      : 'Only organizers and admins can create events. You are logged in as an attendee, so you can browse and register for events.';
  loadAll();
}

// ---------- Tabs ----------
function showTab(name) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'myregs') loadMyRegs();
  if (name === 'dashboard') loadDashboard();
}

// ---------- Data ----------
async function loadAll() {
  try {
    document.getElementById('connStatus').textContent = 'Connected to backend';
    [events, categories] = await Promise.all([api('/events'), api('/categories')]);
    renderFilters(); renderEvents(); loadDashboard(); loadMyRegs();
  } catch (err) {
    setMsg('appMsg', 'Could not load events: ' + err.message + ' — is the backend running on port 5000?');
  }
}
function renderFilters() {
  const cats = ['All', ...categories.map(c => c.name)];
  document.getElementById('categoryFilters').innerHTML = cats.map(c =>
    `<button class="${c === activeCategory ? 'active' : ''}" onclick="setCategory('${c}')">${c}</button>`).join('');
  document.getElementById('evCategory').innerHTML = categories.map(c =>
    `<option value="${c.id}">${c.name}</option>`).join('');
}
function setCategory(c) { activeCategory = c; renderFilters(); renderEvents(); }

function renderEvents() {
  const q = (document.getElementById('searchInput').value || '').toLowerCase();
  const list = events.filter(ev =>
    (activeCategory === 'All' || ev.category === activeCategory) &&
    (ev.title.toLowerCase().includes(q) || ev.venue.toLowerCase().includes(q)));
  document.getElementById('eventGrid').innerHTML = list.map(ev => `
    <div class="card">
      <h3>${ev.title}</h3>
      <p class="muted">${ev.category || ''} · ${ev.organizer_name || ''}</p>
      <p>📍 ${ev.venue}</p>
      <p>📅 ${fmtDate(ev.event_date)}</p>
      <p>${ev.description || ''}</p>
      <p><span class="price">${Number(ev.price) ? fmt(ev.price) : 'Free'}</span> · ${ev.seats_left} / ${ev.capacity} seats left</p>
      <label>Tickets <input type="number" id="tickets-${ev.id}" value="1" min="1" max="${Math.max(1, ev.seats_left)}" style="width:70px"></label>
      <button class="primary" onclick="registerFor(${ev.id})" ${ev.seats_left <= 0 ? 'disabled' : ''}>
        ${ev.seats_left <= 0 ? 'Sold Out' : 'Register'}
      </button>
      ${currentUser && (currentUser.role === 'admin' || currentUser.role === 'organizer')
        ? `<button onclick="viewAttendees(${ev.id}, '${ev.title.replace(/'/g, '')}')">Attendees</button>
           <button onclick="deleteEvent(${ev.id})">🗑️</button>` : ''}
      <div id="att-${ev.id}"></div>
    </div>`).join('') || '<p class="muted">No events found.</p>';
}

async function registerFor(eventId) {
  const tickets = document.getElementById('tickets-' + eventId).value;
  try {
    await api('/registrations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id, event_id: eventId, tickets })
    });
    setMsg('appMsg', 'Registered successfully!', true);
    await loadAll(); showTab('myregs');
  } catch (err) { setMsg('appMsg', err.message); }
}
async function loadMyRegs() {
  if (!currentUser) return;
  try {
    myRegs = await api('/registrations/user/' + currentUser.id);
    document.getElementById('myRegList').innerHTML = myRegs.map(r => `
      <div class="card">
        <h3>${r.title}</h3>
        <p>📍 ${r.venue} · 📅 ${fmtDate(r.event_date)}</p>
        <p>${r.tickets} ticket(s) · <span class="price">${fmt(r.total_amount)}</span></p>
        <p>Status: ${r.status}</p>
        ${r.status === 'confirmed' ? `<button onclick="cancelReg(${r.id})">Cancel Registration</button>` : ''}
      </div>`).join('') || '<p class="muted">You have no registrations yet. Browse Events to register.</p>';
  } catch (err) { setMsg('appMsg', err.message); }
}
async function cancelReg(id) {
  await api('/registrations/' + id + '/cancel', { method: 'PUT' });
  await loadAll(); loadMyRegs();
}
async function loadDashboard() {
  try {
    const d = await api('/dashboard?userId=' + (currentUser ? currentUser.id : ''));
    document.getElementById('stats').innerHTML = `
      <div class="stat"><b>${d.total_events}</b>Total Events</div>
      <div class="stat"><b>${d.upcoming_events}</b>Upcoming</div>
      <div class="stat"><b>${d.total_registrations}</b>Registrations</div>
      <div class="stat"><b>${d.my_registrations}</b>My Registrations</div>
      <div class="stat"><b>${fmt(d.total_revenue)}</b>Total Revenue</div>`;
    document.getElementById('upcomingList').innerHTML = d.upcoming_list.map(ev => `
      <div class="card"><h3>${ev.title}</h3><p>📍 ${ev.venue} · 📅 ${fmtDate(ev.event_date)}</p>
      <p><span class="price">${Number(ev.price) ? fmt(ev.price) : 'Free'}</span> · ${ev.seats_left} seats left</p></div>`).join('');
  } catch (err) { /* dashboard stays empty if backend is down */ }
}
async function createEvent(e) {
  e.preventDefault();
  try {
    await api('/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: document.getElementById('evTitle').value.trim(),
        category_id: document.getElementById('evCategory').value,
        organizer_id: currentUser.id,
        venue: document.getElementById('evVenue').value.trim(),
        event_date: document.getElementById('evDate').value,
        capacity: document.getElementById('evCapacity').value,
        price: document.getElementById('evPrice').value,
        description: document.getElementById('evDesc').value.trim()
      })
    });
    setMsg('appMsg', 'Event created!', true);
    document.getElementById('createForm').reset();
    await loadAll(); showTab('events');
  } catch (err) { setMsg('appMsg', err.message); }
}
async function viewAttendees(eventId, title) {
  const list = await api('/registrations/event/' + eventId);
  document.getElementById('att-' + eventId).innerHTML =
    '<p class="muted">Attendees for ' + title + ': ' +
    (list.filter(r => r.status === 'confirmed').map(r => `${r.full_name} (${r.tickets})`).join(', ') || 'none yet') + '</p>';
}
async function deleteEvent(id) {
  if (!confirm('Delete this event? Its registrations will also be removed.')) return;
  await api('/events/' + id, { method: 'DELETE' });
  await loadAll();
}

// ---------- Startup ----------
(async () => {
  try {
    await api('/health');
    document.getElementById('connStatus').textContent = '✅ Connected to backend';
  } catch {
    document.getElementById('connStatus').textContent = '⚠️ Backend not running yet — log in will need the backend on port 5000. See README.';
  }
  if (currentUser) enterApp(currentUser);
})();
