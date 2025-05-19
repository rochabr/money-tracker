from pydantic import BaseModel
from typing import Optional

class CreateLinkTokenResponse(BaseModel):
    link_token: str

class TokenExchangeRequest(BaseModel):
    public_token: str
    institution: Optional[str] = None
    institution_id: Optional[str] = None

class TokenExchangeResponse(BaseModel):
    access_token: str
    item_id: str

class AccessTokenRequest(BaseModel):
    access_token: str 