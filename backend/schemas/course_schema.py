from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class CourseCreate(BaseModel):
    course_name: str
    description: Optional[str] = None
    duration_days: int = Field(..., gt=0)
    price_per_person: float = Field(..., gt=0)

    model_config = ConfigDict(extra="forbid")


class CourseUpdate(BaseModel):
    course_name: Optional[str] = None
    description: Optional[str] = None
    duration_days: Optional[int] = Field(None, gt=0)
    price_per_person: Optional[float] = Field(None, gt=0)

    model_config = ConfigDict(extra="forbid")