import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth

from app.core.firebase import db

security = HTTPBearer()

_USER_CACHE: dict[str, tuple[float, "CurrentUser"]] = {}
_USER_CACHE_TTL_SECONDS = 60

ROLES = ["admin", "fleet_manager", "dispatcher", "safety_officer", "financial_analyst"]

ROLE_PERMISSIONS = {
    "admin": {"fleet": "full", "drivers": "full", "trips": "full", "fuel_expenses": "full", "analytics": "full"},
    "fleet_manager": {"fleet": "full", "drivers": "full", "trips": "view", "fuel_expenses": "view", "analytics": "view"},
    "dispatcher": {"fleet": "view", "drivers": "view", "trips": "full", "fuel_expenses": None, "analytics": None},
    "safety_officer": {"fleet": "view", "drivers": "full", "trips": "view", "fuel_expenses": None, "analytics": "view"},
    "financial_analyst": {"fleet": "view", "drivers": None, "trips": "view", "fuel_expenses": "full", "analytics": "full"},
}


class CurrentUser:
    def __init__(self, uid: str, email: str, role: str, name: str):
        self.uid = uid
        self.email = email
        self.role = role
        self.name = name


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> CurrentUser:
    token = credentials.credentials

    cached = _USER_CACHE.get(token)
    if cached and cached[0] > time.monotonic():
        return cached[1]

    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    uid = decoded["uid"]
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User profile not found")

    data = user_doc.to_dict()
    user = CurrentUser(uid=uid, email=decoded.get("email", ""), role=data.get("role"), name=data.get("name", ""))
    _USER_CACHE[token] = (time.monotonic() + _USER_CACHE_TTL_SECONDS, user)
    return user


def require_module_access(module: str, min_level: str = "view"):
    def checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        level = ROLE_PERMISSIONS.get(user.role, {}).get(module)
        if level is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Role '{user.role}' has no access to {module}")
        if min_level == "full" and level != "full":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Role '{user.role}' has read-only access to {module}")
        return user

    return checker
