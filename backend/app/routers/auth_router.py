from fastapi import APIRouter, Depends, HTTPException, status
from firebase_admin import auth as firebase_auth

from app.core.auth import ROLES, CurrentUser, get_current_user
from app.core.firebase import db
from app.models.schemas import MeResponse, RegisterRequest, RegisterResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse)
def register(body: RegisterRequest):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"role must be one of {ROLES}")

    try:
        user_record = firebase_auth.create_user(
            email=body.email,
            password=body.password,
            display_name=body.name,
        )
    except firebase_auth.EmailAlreadyExistsError:
        raise HTTPException(status_code=400, detail=f"A user with email '{body.email}' already exists")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to create auth user: {exc}")

    db.collection("users").document(user_record.uid).set(
        {
            "name": body.name,
            "email": body.email,
            "role": body.role,
        }
    )

    return RegisterResponse(uid=user_record.uid, email=body.email, name=body.name, role=body.role)


@router.get("/me", response_model=MeResponse)
def me(user: CurrentUser = Depends(get_current_user)):
    return MeResponse(uid=user.uid, email=user.email, name=user.name, role=user.role)
