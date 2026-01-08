from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: int
    email: str
    nome_completo: Optional[str] = Field(None, validation_alias="full_name")
    cargo: str = Field(..., validation_alias="role")
    is_active: bool
    created_at: datetime

# Mock SQLAlchemy-like object
class MockUser:
    def __init__(self):
        self.id = 1
        self.email = "test@test.com"
        self.full_name = "Test User"
        self.role = "admin"
        self.is_active = True
        self.created_at = datetime.now()

user_obj = MockUser()
user_model = UserResponse.model_validate(user_obj)

print("--- Pydantic v2 Test ---")
print(f"Model: {user_model}")
print(f"JSON: {user_model.model_dump_json()}")
print("------------------------")
