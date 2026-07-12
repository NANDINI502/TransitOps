# TransitOps — Smart Transport Operations Platform

Hackathon project: an end-to-end transport operations platform covering vehicle registry, driver management, trip dispatch, maintenance, fuel & expense tracking, and analytics — with role-based access control (Fleet Manager, Dispatcher, Safety Officer, Financial Analyst).

## Stack
- **Backend**: FastAPI (Python) + Firebase (Firestore + Auth)
- **Frontend**: React + Vite

## Structure
- `backend/` — FastAPI REST API. See `backend/README.md` for setup.
- `frontend/` — React SPA. See `frontend/README.md` for setup.

## Quick start
1. Create a Firebase project (Firestore + Email/Password Auth enabled).
2. Follow `backend/README.md` to configure the service account and run the API.
3. Follow `frontend/README.md` to configure the web app and run the UI.
