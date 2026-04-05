from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import date


class SpecificationCreate(BaseModel):
    doc_date: date = Field(..., description="Дата спецификации")
    doc_number: str = Field(..., min_length=1, max_length=100, description="Номер спецификации")
    company_id: int = Field(..., description="ID компании-заказчика")

    model_config = ConfigDict(extra="forbid")


class SpecificationUpdate(BaseModel):
    doc_date: Optional[date] = None
    doc_number: Optional[str] = Field(None, min_length=1, max_length=100)
    company_id: Optional[int] = None

    model_config = ConfigDict(extra="forbid")
