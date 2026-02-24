import os
from typing import Optional

# Single shared host code stored in environment variable
HOST_CODE = os.getenv("HOST_CODE", "default_code")

def validate_host_code(host_code: Optional[str]) -> bool:
    """Return True if host_code matches the configured HOST_CODE."""

    if not host_code:
        return False
    return str(host_code) == str(HOST_CODE)
