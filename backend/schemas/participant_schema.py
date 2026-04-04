from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional


class ParticipantAdd(BaseModel):
    employee_id: int = Field(..., description="ID сотрудника (участника обучения)")

    model_config = ConfigDict(extra="forbid")


class ParticipantProgressUpdate(BaseModel):
    progress: float = Field(
        ...,
        ge=0,
        le=100,
        description="Процент завершения курса (0–100)"
    )

    model_config = ConfigDict(extra="forbid")


class ParticipantResponse(BaseModel):
    """Схема ответа — для документирования структуры возвращаемых данных"""
    id: str
    group_id: int
    employee_id: int
    progress: float = Field(ge=0, le=100)

    model_config = ConfigDict(extra="forbid")