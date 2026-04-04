from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date


class GroupCreate(BaseModel):
    course_id: str = Field(..., description="ID курса обучения")
    start_date: date = Field(..., description="Дата начала обучения")
    end_date: date = Field(..., description="Дата окончания обучения")
    status: str = Field(
        "planned",
        description="Статус обучения: planned / in_progress / completed / cancelled"
    )
    specification_id: Optional[str] = Field(None, description="ID спецификации")

    model_config = ConfigDict(extra="forbid")


class GroupUpdate(BaseModel):
    course_id: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    specification_id: Optional[str] = None

    model_config = ConfigDict(extra="forbid")


class ParticipantAdd(BaseModel):
    employee_id: str = Field(..., description="ID сотрудника (участника обучения)")

    model_config = ConfigDict(extra="forbid")


class ParticipantProgressUpdate(BaseModel):
    progress: float = Field(..., ge=0, le=100, description="Процент завершения курса (0–100)")

    model_config = ConfigDict(extra="forbid")
