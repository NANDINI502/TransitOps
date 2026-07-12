# TransitOps Backend

REST API for TransitOps — an Odoo-style transport operations platform (fleet, driver, trip, maintenance, and fuel/expense management). Built with FastAPI + Firebase (Auth + Firestore). This is API-only; the frontend is a separate React app that consumes this contract.

## 1. Create a Firebase project + service account

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project (or reuse one).
2. Enable **Authentication** → Sign-in method → **Email/Password**.
3. Enable **Firestore Database** (start in production or test mode — either works for a hackathon demo; test mode is easiest since all access goes through this backend using the Admin SDK, which bypasses Firestore security rules anyway).
4. Go to **Project Settings → Service Accounts → Generate new private key**. This downloads a JSON file.
5. Save that file somewhere in (or near) `backend/`, e.g. `backend/serviceAccountKey.json`. **Do not commit this file** — add it to `.gitignore` if not already ignored.

## 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

```
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
FIREBASE_PROJECT_ID=your-firebase-project-id
FRONTEND_ORIGIN=http://localhost:5173
```

- `FIREBASE_SERVICE_ACCOUNT_PATH` — path to the JSON key downloaded above.
- `FIREBASE_PROJECT_ID` — your Firebase project ID (visible in Project Settings).
- `FRONTEND_ORIGIN` — the origin the React frontend runs on, used for CORS.

## 3. Install dependencies and run

It's recommended to use a virtual environment:

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

The API will be live at `http://localhost:8000`. Interactive docs (Swagger UI) are at `http://localhost:8000/docs`.

Health check: `GET http://localhost:8000/api/health` → `{"status": "ok"}`

## 4. Seed demo accounts

`POST /api/auth/register` is **not auth-gated** — it's a dev/seed helper for quickly creating demo users during the hackathon. It creates both a Firebase Auth user and the matching `users/{uid}` Firestore profile document (with `role` and `name`).

Seed one account per role, all with password `Demo@123`:

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "fleetmanager@transitops.demo",
    "password": "Demo@123",
    "name": "Fiona Fleet",
    "role": "fleet_manager"
  }'
```

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dispatcher@transitops.demo",
    "password": "Demo@123",
    "name": "Derek Dispatcher",
    "role": "dispatcher"
  }'
```

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "safety@transitops.demo",
    "password": "Demo@123",
    "name": "Sasha Safety",
    "role": "safety_officer"
  }'
```

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "finance@transitops.demo",
    "password": "Demo@123",
    "name": "Frank Finance",
    "role": "financial_analyst"
  }'
```

After seeding, the frontend (or any client using the Firebase Web SDK) signs in with email/password to get an ID token, then calls this API with `Authorization: Bearer <id_token>`. You can also verify a login and fetch the profile with:

```bash
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <ID_TOKEN>"
```

## Role permissions (from `app/core/auth.py`)

| Role | fleet | drivers | trips | fuel_expenses | analytics |
|---|---|---|---|---|---|
| fleet_manager | full | full | — | — | full |
| dispatcher | view | — | full | — | — |
| safety_officer | — | full | view | — | — |
| financial_analyst | view | — | — | full | full |

`view` = read-only, `full` = create/edit/delete, `—` = no access (403).

## Endpoint summary

All endpoints are mounted under `/api` and require `Authorization: Bearer <Firebase ID token>` except `POST /api/auth/register` and `GET /api/health`.

- **Auth**: `POST /api/auth/register`, `GET /api/auth/me`
- **Vehicles** (`fleet` module): `GET /api/vehicles` (filters: `type`, `status`, `region`, `dispatchable=true`), `POST /api/vehicles`, `GET /api/vehicles/{id}`, `PATCH /api/vehicles/{id}`, `DELETE /api/vehicles/{id}`, `GET /api/vehicles/{id}/operational-cost`
- **Drivers** (`drivers` module): `GET /api/drivers` (filters: `status`, `dispatchable=true`), `POST /api/drivers`, `GET /api/drivers/{id}`, `PATCH /api/drivers/{id}`, `DELETE /api/drivers/{id}`
- **Trips** (`trips` module): `GET /api/trips` (filter: `status`), `POST /api/trips`, `GET /api/trips/{id}`, `POST /api/trips/{id}/dispatch`, `POST /api/trips/{id}/complete`, `POST /api/trips/{id}/cancel`
- **Maintenance** (`fleet` module): `GET /api/maintenance` (filters: `vehicle_id`, `status`), `POST /api/maintenance`, `POST /api/maintenance/{id}/complete`
- **Fuel logs** (`fuel_expenses` module): `GET /api/fuel-logs`, `POST /api/fuel-logs`
- **Expenses** (`fuel_expenses` module): `GET /api/expenses`, `POST /api/expenses`
- **Dashboard** (`fleet` view): `GET /api/dashboard/kpis` (filters: `type`, `status`, `region`), `GET /api/dashboard/recent-trips`, `GET /api/dashboard/vehicle-status-breakdown`
- **Analytics** (`analytics` module): `GET /api/analytics/summary`, `GET /api/analytics/top-costliest-vehicles`, `GET /api/analytics/export.csv`

## Business rules enforced server-side

1. Vehicle `reg_no` must be unique (checked on create and on `reg_no` update).
2. `Retired` and `In Shop` vehicles are excluded from `dispatchable=true` vehicle queries.
3. Drivers with an expired `license_expiry` or `status=Suspended` are excluded from `dispatchable=true` driver queries, and dispatch is rejected server-side even if a stale/invalid driver ID is passed in.
4. A vehicle or driver already `On Trip` cannot be dispatched again (checked both before and inside the transaction).
5. Cargo weight vs. vehicle `max_load_kg` is validated at trip creation **and** at dispatch, returning a 400 with the exact numbers, e.g. `"Capacity exceeded by 200 kg - dispatch blocked (vehicle capacity: 1000 kg, cargo weight: 1200 kg)"`.
6. Dispatch (`Draft` → `Dispatched`) sets vehicle and driver to `On Trip` atomically in a Firestore transaction.
7. Completion (`Dispatched` → `Completed`) requires `final_odometer_km` and `fuel_consumed_l`, sets vehicle/driver back to `Available`, updates `vehicle.odometer_km`, and writes a `fuel_logs` entry — all in one transaction.
8. Cancelling a `Dispatched` trip restores vehicle/driver to `Available` in a transaction; cancelling a `Draft` trip just flips its status (nothing to restore).
9. Creating an `Active` maintenance log sets `vehicle.status = In Shop` (transactional; refuses to open a maintenance record on a Retired vehicle).
10. Completing a maintenance log restores `vehicle.status = Available` **unless** the vehicle is `Retired` (never overridden).

## Deviations from the spec (and why)

- **Trip numbering (`trip_no`)** uses a `meta/counters` Firestore document bumped inside its own small transaction, rather than counting existing trips (which would race under concurrent dispatch clicks during a demo). This keeps `TR001`, `TR002`, ... strictly increasing.
- **`revenue` on trips**: as instructed, added an optional `revenue` field (default `0`), settable via `POST /api/trips/{id}/complete`, used for the per-vehicle ROI calculation in `/api/analytics/summary`.
- **`fuel_cost` on trip completion**: the spec's rule 7 says completion creates a `fuel_logs` entry from `fuel_consumed_l`, but doesn't specify a cost. Added an optional `fuel_cost` field on the complete request (defaults to `0`) so the generated `fuel_logs` row has a usable `cost` for operational-cost/ROI rollups; the frontend can omit it if unknown.
- **Dashboard/analytics module gating**: the spec didn't say which module governs dashboard/analytics reads. Dashboard KPIs are gated on `fleet` view access (dispatchers, fleet managers, financial analysts can all see it; safety officers cannot, consistent with their driver-only focus in `ROLE_PERMISSIONS`). Analytics endpoints are gated on the `analytics` module as an explicit module already exists for it.
- **Maintenance module**: per the spec's own note ("module `fleet` full since Fleet Manager owns this per the mockup"), maintenance create/complete require `fleet` full access, and maintenance list requires `fleet` view — not a separate `maintenance` module (none exists in `ROLE_PERMISSIONS`).
- **Firestore counter for trip numbers lives under a new top-level `meta` collection** (`meta/counters`) — not in the original collection list, but needed for rule-safe auto-incrementing IDs without extra reads/races.
- **CSV export** streams an in-memory `io.StringIO` buffer via `StreamingResponse`; for hackathon-scale data this avoids extra dependencies (e.g. pandas) while satisfying the "StreamingResponse with text/csv" requirement.
- **`operational-cost` endpoint** sums `fuel_logs.cost` + `maintenance_logs.cost` + `expenses.amount` for a vehicle (all three cost sources, since the spec's parenthetical "(sum(fuel.cost)+sum(expenses where category relates to maintenance or all expenses)+sum(maintenance.cost))" is ambiguous about double-counting maintenance-category expenses vs. the maintenance_logs collection — we treat `expenses` as tolls/misc only and `maintenance_logs` as the source of truth for maintenance cost, avoiding double counting).

## Verification performed

- `pip install -r requirements.txt` succeeded in a clean venv.
- `python -c "from app.main import app"` imported cleanly (using a syntactically valid throwaway RSA service-account JSON so `firebase_admin.initialize_app` didn't fail at import time).
- `app.openapi()` schema generation succeeded, validating all Pydantic models and route signatures (23 paths registered).
- Booted `uvicorn app.main:app` briefly; confirmed `GET /api/health` → `200 {"status":"ok"}` and `GET /api/vehicles` (no auth header) → `403` as expected from `HTTPBearer`/`require_module_access`.
- No live Firestore reads/writes were exercised (would need a real Firebase project + credentials); all Firestore-touching logic was manually reviewed line-by-line for correctness against the Admin SDK / `google-cloud-firestore` API (transaction decorator signatures, query filters, `.stream()`/`.get()` usage).
