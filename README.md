# Event Management System — 3-Tier Web App

A complete event system with registration + login, a Node.js API, and MySQL — built the same way as the restaurant management system.

## Architecture (3-Tier)

```
Tier 1 — Presentation (Frontend)
  frontend/index.html, styles.css, app.js
  Login form, Registration form, Dashboard, Events, My Registrations, Create Event

Tier 2 — Application (Backend API)
  backend/server.js + backend/routes/*.js
  Node.js + Express, REST API on http://localhost:5000/api

Tier 3 — Data (Database)
  database/schema.sql
  MySQL database: event_db
```

## Folder Structure

```
event-management-system/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── .gitignore
│   ├── config/db.js
│   ├── setup.js
│   ├── check.js
│   └── routes/
│       ├── auth.js          (register + login)
│       ├── events.js
│       ├── registrations.js
│       ├── dashboard.js
│       └── categories.js
├── database/
│   └── schema.sql
├── run.bat
└── README.md
```

## What You Need Before Running

1. **Node.js 18+** — check with `node -v`
2. **MySQL 8+** — running locally (the same MySQL you used for the restaurant project)
3. A code editor (VS Code recommended)

## Quick Start (Windows — easiest)

1. Unzip this folder anywhere, e.g. `D:\OneDrive\Desktop\event-management-system`
2. Copy `backend\.env.example` to `backend\.env` and set your real MySQL password:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=event_db
   DB_PORT=3307
   PORT=5000
   ```
   **DB_PORT:** this defaults to 3307, the port your restaurant project used.
   Change it to 3306 ONLY if your MySQL actually runs on 3306 (e.g. XAMPP).
   If backend and MySQL use different ports they talk to different servers —
   that was the restaurant bug. Backend, setup and check all read this one `.env`.
3. Double-click `run.bat` — it installs packages, checks the database,
   creates/seeds it, and starts the server.
4. Open `http://localhost:5000/` in your browser. The backend serves the frontend,
   so there is no separate frontend server to run.

## Manual Start (same steps, by hand)

```bash
cd backend
npm install
copy .env.example .env
# edit .env, set DB_PASSWORD
npm run check     # tells you if event_db exists on your port, and fixes the port hint
npm run setup     # creates event_db + 3 users, 6 categories, 8 events (safe to re-run)
npm start
```

Then open `http://localhost:5000/` and test `http://localhost:5000/api/health`.

## Login / Registration

**Register:** on the first screen, click **Register** and fill in full name,
email, password (min 6 characters), phone (optional) and role:
Attendee (join events) or Organizer (create events).
You cannot self-register as admin — the admin account is seeded only.

**Log in:** use the account you just registered, or a demo account:

| Role | Email | Password |
|---|---|---|
| Admin | admin@events.com | admin123 |
| Organizer | organizer@events.com | organizer123 |
| Attendee | user@events.com | user123 |

Passwords are stored as bcrypt hashes, never as plain text.

## How to Use It

1. **Dashboard** — total events, upcoming events, registrations, your registrations, revenue
2. **Events** — search by title/venue, filter by category, see seats left, choose tickets and Register
3. **My Registrations** — your confirmed bookings, cancel to free the seats again
4. **Create Event** — organizers/admins only: title, category, venue, date/time, capacity, price, description
5. Organizers/admins can also see the attendee list for an event and delete an event.

Registration is capacity-safe: the backend locks the event row in a transaction
while it checks seats, so two people registering at once cannot overbook it,
and you cannot register twice for the same event while confirmed.

## API Endpoints

| Method | Endpoint | What it does |
|---|---|---|
| POST | /api/auth/register | Create an account (attendee / organizer) |
| POST | /api/auth/login | Log in |
| GET | /api/events | All events (filter: ?category= &search= &status=) |
| GET | /api/events/:id | One event, with seats left |
| POST | /api/events | Create an event (organizer/admin only) |
| PUT | /api/events/:id/status | Change event status |
| DELETE | /api/events/:id | Delete an event |
| POST | /api/registrations | Register for an event (capacity-checked) |
| GET | /api/registrations/user/:userId | My registrations |
| GET | /api/registrations/event/:eventId | Attendee list for an event |
| PUT | /api/registrations/:id/cancel | Cancel a registration |
| GET | /api/categories | All categories |
| GET | /api/dashboard?userId= | Stats + upcoming events |

## Common Problems

**"Cannot connect to database" / ER_ACCESS_DENIED**
Your `.env` password is wrong. Check it, restart the backend after editing `.env`.

**"Unknown database 'event_db'"**
You skipped setup. From `backend/`, run `npm run setup`.

**"Backend not running yet" on the login screen**
The backend is not running on port 5000. Run `npm start` in `backend/` and refresh.
Open `http://localhost:5000/` (not a Live Server port) — the backend serves the frontend.

**Port 5000 already in use**
The frontend is written for port 5000 (same as the restaurant project).
Free port 5000 first (close the other app using it), rather than changing `PORT`.

**"Only X seat(s) left" / "already registered"**
That is the capacity/duplicate check working as intended, not an error.
