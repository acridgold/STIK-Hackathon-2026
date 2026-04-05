from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Optional
from datetime import date

VALID_STATUSES = {"planned", "in_progress", "completed", "cancelled"}

class GroupCreate(BaseModel):
    course_id: int = Field(..., gt=0, description="ID курса обучения")
    start_date: date = Field(..., description="Дата начала обучения")
    end_date: date = Field(..., description="Дата окончания обучения")
    status: str = Field("planned", description="planned / in_progress / completed / cancelled")
    specification_id: Optional[int] = Field(None, gt=0, description="ID спецификации")

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date <= self.start_date:
            raise ValueError("end_date должна быть позже start_date")
        return self

    @model_validator(mode="after")
    def check_status(self):
        if self.status not in VALID_STATUSES:
            raise ValueError(f"status должен быть одним из: {VALID_STATUSES}")
        return self


class GroupUpdate(BaseModel):
    course_id: Optional[int] = Field(None, gt=0)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    specification_id: Optional[int] = Field(None, gt=0)

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def check_status(self):
        if self.status is not None and self.status not in VALID_STATUSES:
            raise ValueError(f"status должен быть одним из: {VALID_STATUSES}")
        return self