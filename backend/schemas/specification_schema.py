from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import date


class SpecificationCreate(BaseModel):
    spec_date: date = Field(..., description="Дата спецификации")
    spec_number: str = Field(..., min_length=1, max_length=100, description="Номер спецификации")
    company_id: str = Field(..., description="ID компании-заказчика")
    group_ids: List[str] = Field(default_factory=list, description="Список ID учебных групп")

    model_config = ConfigDict(extra="forbid")


class SpecificationUpdate(BaseModel):
    spec_date: Optional[date] = None
    spec_number: Optional[str] = Field(None, min_length=1, max_length=100)
    company_id: Optional[str] = None
    group_ids: Optional[List[str]] = None

    model_config = ConfigDict(extra="forbid")
