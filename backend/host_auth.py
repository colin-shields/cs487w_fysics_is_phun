
import os
import secrets
from typing import Dict, Optional

# Single professor host id
HOST_ID = "default_host"


HOST_CODE = os.getenv("HOST_CODE", "default_code")

_tokens: Dict[str, str] = {}  # token -> host_id


def login_with_code(host_code: str) -> Optional[str]:
    """Return a token if code matches; else None."""
    if host_code != HOST_CODE:
        return None
    token = secrets.token_urlsafe(24)
    _tokens[token] = HOST_ID
    return token


def validate_token(token: str) -> Optional[str]:
    """Return host_id if token is valid; else None."""
    return _tokens.get(token)