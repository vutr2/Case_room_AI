import json
from pathlib import Path

TOKEN = "test-token-0123456789abcdef0123456789abcdef"
EXAMPLES = Path(__file__).resolve().parent.parent / "contract" / "examples"


def example(name: str) -> dict:
    return json.loads((EXAMPLES / f"{name}.json").read_text(encoding="utf-8"))
