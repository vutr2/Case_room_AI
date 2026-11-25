import unicodedata

from app.text import normalize, tokenize


def test_normalize_compose_vietnamese():
    decomposed = unicodedata.normalize("NFD", "ung thư")

    assert normalize(decomposed) == unicodedata.normalize("NFC", "ung thư")
    assert normalize("a\r\nb") == "a\nb"


def test_tokenize_compose():
    assert tokenize("HER2 3+ by IHC.") == ["her2", "3+", "ihc"]
    assert tokenize("EGFR L858R") == ["egfr", "l858r"]
    assert "không" in tokenize("Không di căn hạch")
    assert tokenize("ĐÁI THÁO ĐƯỜNG") == ["đái", "tháo", "đường"]


def test_tokenize_keeps_positive_and_negative_markers():
    # ER+ and ER- must stay different tokens, or BM25 scores them the same.
    assert tokenize("ER+/PR- , HER2 1+") == ["er+", "pr-", "her2", "1+"]
    # A hyphen inside a word is not a negative marker.
    assert tokenize("HER2-positive") == ["her2", "positive"]
