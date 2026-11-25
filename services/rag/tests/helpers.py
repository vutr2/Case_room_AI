import json
from pathlib import Path

import psycopg

TOKEN = "test-token-0123456789abcdef0123456789abcdef"
EXAMPLES = Path(__file__).resolve().parent.parent / "contract" / "examples"


def example(name: str) -> dict:
    return json.loads((EXAMPLES / f"{name}.json").read_text(encoding="utf-8"))


def connect_to(db_url: str, schema: str) -> psycopg.Connection:
    """A connection whose unqualified table names resolve in `schema`."""
    return psycopg.connect(db_url, options=f"-c search_path={schema},public")
