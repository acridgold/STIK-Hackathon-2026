from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class CompanyCreate(BaseModel):
    company_code: str = Field(..., min_length=2,
                      max_length=4,
                      pattern=r"^[A-Za-z0-9]+$",
                      description="Код компании (2–4 символа, только буквы и цифры)")
    company_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Полное наименование компании"
    )

    model_config = ConfigDict(
        extra="forbid",  # запрещаем лишние поля
        str_strip_whitespace=True
    )


class CompanyUpdate(BaseModel):
    company_code: Optional[str] = Field(
        None,
        min_length=2,
        max_length=4,
        pattern=r"^[A-Za-z0-9]+$"
    )
    company_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255
    )

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True
    )