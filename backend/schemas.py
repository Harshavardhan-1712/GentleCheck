from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class RoutineIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    scheduled: str = Field(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("title must not be blank")
        return value


class ConsentIn(BaseModel):
    share_checkins: Optional[bool] = None
    share_routines: Optional[bool] = None
    grace_minutes: Optional[int] = Field(None, ge=1, le=1440)

    @model_validator(mode="after")
    def need_one(self):
        if all(v is None for v in self.model_dump().values()):
            raise ValueError("at least one field is required")
        return self


class SnoozeIn(BaseModel):
    minutes: int = Field(30, ge=5, le=240)


class ShareIn(BaseModel):
    share: bool


class AdvanceIn(BaseModel):
    minutes: Optional[int] = Field(None, ge=1, le=43200)
    to_overdue: bool = False

    @model_validator(mode="after")
    def exactly_one(self):
        if (self.minutes is None) == (not self.to_overdue):
            raise ValueError("provide either minutes or to_overdue=true")
        return self
