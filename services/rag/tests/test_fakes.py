import numpy as np

from .fakes import fake_embed


def test_fake_embed_gives_one_unit_vector_per_text():
    vectors = fake_embed(["HER2 3+", "ER âm tính"])
    assert vectors.shape == (2, 1024)
    assert np.allclose(np.linalg.norm(vectors, axis=1), 1.0)


def test_fake_embed_is_deterministic_and_tells_texts_apart():
    a1, b = fake_embed(["HER2 3+", "ER âm tính"])
    (a2,) = fake_embed(["HER2 3+"])
    assert np.array_equal(a1, a2)
    assert not np.allclose(a1, b)


def test_fake_embed_of_no_text_is_empty():
    assert fake_embed([]).shape == (0, 1024)
