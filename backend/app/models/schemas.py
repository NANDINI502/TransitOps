from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str


class RegisterResponse(BaseModel):
    uid: str
    email: str
    name: str
    role: str


class MeResponse(BaseModel):
    uid: str
    email: str
    name: str
    role: str


VEHICLE_STATUSES = ["Available", "On Trip", "In Shop", "Retired"]


class VehicleCreate(BaseModel):
    reg_no: str
    name: str
    type: str
    max_load_kg: float = Field(gt=0)
    odometer_km: float = 0
    acquisition_cost: float = 0
    status: str = "Available"
    region: Optional[str] = None

    @field_validator("status")
    @classmethod
    def check_status(cls, v):
        if v not in VEHICLE_STATUSES:
            raise ValueError(f"status must be one of {VEHICLE_STATUSES}")
        return v


class VehicleUpdate(BaseModel):
    reg_no: Optional[str] = None
    name: Optional[str] = None
    type: Optional[str] = None
    max_load_kg: Optional[float] = None
    odometer_km: Optional[float] = None
    acquisition_cost: Optional[float] = None
    status: Optional[str] = None
    region: Optional[str] = None

    @field_validator("status")
    @classmethod
    def check_status(cls, v):
        if v is not None and v not in VEHICLE_STATUSES:
            raise ValueError(f"status must be one of {VEHICLE_STATUSES}")
        return v


class VehicleOut(BaseModel):
    id: str
    reg_no: str
    name: str
    type: str
    max_load_kg: float
    odometer_km: float
    acquisition_cost: float
    status: str
    region: Optional[str] = None
    created_at: Optional[str] = None


DRIVER_STATUSES = ["Available", "On Trip", "Off Duty", "Suspended"]
LICENSE_CATEGORIES = ["LMV", "HMV"]


class DriverCreate(BaseModel):
    name: str
    license_no: str
    license_category: str
    license_expiry: str
    contact: Optional[str] = None
    safety_score: float = Field(default=100, ge=0, le=100)
    status: str = "Available"

    @field_validator("license_category")
    @classmethod
    def check_category(cls, v):
        if v not in LICENSE_CATEGORIES:
            raise ValueError(f"license_category must be one of {LICENSE_CATEGORIES}")
        return v

    @field_validator("status")
    @classmethod
    def check_status(cls, v):
        if v not in DRIVER_STATUSES:
            raise ValueError(f"status must be one of {DRIVER_STATUSES}")
        return v

    @field_validator("license_expiry")
    @classmethod
    def check_expiry_format(cls, v):
        try:
            date.fromisoformat(v)
        except ValueError:
            raise ValueError("license_expiry must be in YYYY-MM-DD format")
        return v


class DriverUpdate(BaseModel):
    name: Optional[str] = None
    license_no: Optional[str] = None
    license_category: Optional[str] = None
    license_expiry: Optional[str] = None
    contact: Optional[str] = None
    safety_score: Optional[float] = Field(default=None, ge=0, le=100)
    status: Optional[str] = None

    @field_validator("license_category")
    @classmethod
    def check_category(cls, v):
        if v is not None and v not in LICENSE_CATEGORIES:
            raise ValueError(f"license_category must be one of {LICENSE_CATEGORIES}")
        return v

    @field_validator("status")
    @classmethod
    def check_status(cls, v):
        if v is not None and v not in DRIVER_STATUSES:
            raise ValueError(f"status must be one of {DRIVER_STATUSES}")
        return v


class DriverOut(BaseModel):
    id: str
    name: str
    license_no: str
    license_category: str
    license_expiry: str
    contact: Optional[str] = None
    safety_score: float
    status: str
    created_at: Optional[str] = None


TRIP_STATUSES = ["Draft", "Dispatched", "Completed", "Cancelled"]


class TripCreate(BaseModel):
    source: str
    destination: str
    vehicle_id: str
    driver_id: str
    cargo_weight_kg: float = Field(ge=0)
    planned_distance_km: float = Field(ge=0)


class TripDispatchRequest(BaseModel):
    pass


class TripCompleteRequest(BaseModel):
    final_odometer_km: float
    fuel_consumed_l: float = Field(ge=0)
    fuel_cost: Optional[float] = None
    revenue: Optional[float] = 0


class TripCancelRequest(BaseModel):
    reason: Optional[str] = None


class TripFlagRequest(BaseModel):
    issue_flagged: bool


class TripOut(BaseModel):
    id: str
    trip_no: str
    source: str
    destination: str
    vehicle_id: str
    driver_id: str
    vehicle_name: Optional[str] = None
    vehicle_reg_no: Optional[str] = None
    driver_name: Optional[str] = None
    cargo_weight_kg: float
    planned_distance_km: float
    status: str
    dispatched_at: Optional[str] = None
    completed_at: Optional[str] = None
    final_odometer_km: Optional[float] = None
    fuel_consumed_l: Optional[float] = None
    revenue: Optional[float] = 0
    issue_flagged: bool = False
    created_at: Optional[str] = None


MAINTENANCE_STATUSES = ["Active", "Completed"]


class MaintenanceCreate(BaseModel):
    vehicle_id: str
    service_type: str
    cost: float = Field(ge=0)
    date: str
    status: str = "Active"

    @field_validator("status")
    @classmethod
    def check_status(cls, v):
        if v not in MAINTENANCE_STATUSES:
            raise ValueError(f"status must be one of {MAINTENANCE_STATUSES}")
        return v


class MaintenanceOut(BaseModel):
    id: str
    vehicle_id: str
    service_type: str
    cost: float
    date: str
    status: str
    created_at: Optional[str] = None


class FuelLogCreate(BaseModel):
    vehicle_id: str
    trip_id: Optional[str] = None
    liters: float = Field(ge=0)
    cost: float = Field(ge=0)
    date: str


class FuelLogOut(BaseModel):
    id: str
    vehicle_id: str
    trip_id: Optional[str] = None
    liters: float
    cost: float
    date: str
    created_at: Optional[str] = None


EXPENSE_CATEGORIES = ["toll", "misc", "other"]


class ExpenseCreate(BaseModel):
    vehicle_id: str
    trip_id: Optional[str] = None
    category: str
    amount: float = Field(ge=0)
    date: str

    @field_validator("category")
    @classmethod
    def check_category(cls, v):
        if v not in EXPENSE_CATEGORIES:
            raise ValueError(f"category must be one of {EXPENSE_CATEGORIES}")
        return v


class ExpenseOut(BaseModel):
    id: str
    vehicle_id: str
    trip_id: Optional[str] = None
    category: str
    amount: float
    date: str
    created_at: Optional[str] = None
