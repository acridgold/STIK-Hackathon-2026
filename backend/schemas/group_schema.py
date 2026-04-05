from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date


class GroupCreate(BaseModel):
    course_id: int = Field(..., description="ID курса обучения")
    start_date: date = Field(..., description="Дата начала обучения")
    end_date: date = Field(..., description="Дата окончания обучения")
    status: str = Field(
        "planned",
        description="Статус обучения: planned / in_progress / completed / cancelled"
    )
    specification_id: Optional[int] = Field(None, description="ID спецификации")

    model_config = ConfigDict(extra="forbid")


class GroupUpdate(BaseModel):
    course_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    specification_id: Optional[int] = None

    model_config = ConfigDict(extra="forbid")
