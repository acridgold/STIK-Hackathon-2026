from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    duration: int = Field(..., gt=0)
    price: int = Field(..., gt=0)

    model_config = ConfigDict(extra="forbid")


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = Field(None, gt=0)
    price: Optional[int] = Field(None, gt=0)

    model_config = ConfigDict(extra="forbid")