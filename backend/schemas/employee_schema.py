from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional


class EmployeeCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    company_id: int
    email: Optional[EmailStr] = None  # сделай необязательным

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    company_id: Optional[str] = None
    email: Optional[EmailStr] = None

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
