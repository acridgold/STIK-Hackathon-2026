from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional


class ParticipantAdd(BaseModel):
    employee_id: str = Field(..., description="ID сотрудника (участника обучения)")

    model_config = ConfigDict(extra="forbid")

    @field_validator("employee_id")
    @classmethod
    def employee_id_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("employee_id не может быть пустым")
        return v


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
    group_id: str
    employee_id: str
    progress: float = Field(ge=0, le=100)

    model_config = ConfigDict(extra="forbid")