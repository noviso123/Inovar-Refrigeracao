from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class UserResponse(BaseModel):
    id: int
    email: str
    nome_completo: Optional[str] = Field(None, alias="full_name")
    cargo: str = Field(..., alias="role")
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

# Mock data
data = {
    "id": 1,
    "email": "test@test.com",
    "full_name": "Test User",
    "role": "admin",
    "is_active": True,
    "created_at": datetime.now()
}

user = UserResponse(**data)
print("--- SERIALIZATION TEST ---")
print(f"Object: {user}")
print(f"Dict: {user.dict()}")
print(f"JSON: {user.json()}")
print("--------------------------")
