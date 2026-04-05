from pydantic import BaseModel, Field, ConfigDict

class ParticipantAdd(BaseModel):
    employee_id: int = Field(..., gt=0, description="ID сотрудника")

    model_config = ConfigDict(extra="forbid")


class ParticipantProgressUpdate(BaseModel):
    progress: float = Field(..., ge=0, le=100, description="Процент завершения 0–100")

    model_config = ConfigDict(extra="forbid")