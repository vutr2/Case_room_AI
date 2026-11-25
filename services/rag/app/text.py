import re
import unicodedata

STOPWORDS: frozenset[str] = frozenset(
    {
        # tiếng Anh
        "a",
        "an",
        "the",
        "of",
        "in",
        "on",
        "at",
        "to",
        "for",
        "from",
        "by",
        "with",
        "and",
        "or",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "this",
        "that",
        "these",
        "those",
        "it",
        "its",
        "as",
        "what",
        "which",
        "how",
        "does",
        "do",
        # tiếng Việt (âm tiết)
        "và",
        "của",
        "là",
        "có",
        "được",
        "cho",
        "các",
        "những",
        "một",
        "với",
        "trong",
        "này",
        "đó",
        "thì",
        "mà",
        "ở",
        "về",
        "đã",
        "đang",
        "sẽ",
        "gì",
        "nào",
    }
)

_WORD = re.compile(r"\w+(?:[+\-\u2212](?!\w))?")


def normalize(text: str) -> str:
    """Passage to store: NFC, Go to next line using \n, Don't change any different content"""
    text = unicodedata.normalize("NFC", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return text


def tokenize(text: str) -> list[str]:
    """Token to compare matching: normalize, casefold, get rid of stopword"""

    tokens = _WORD.findall(normalize(text).casefold())

    return [t for t in tokens if t not in STOPWORDS]
