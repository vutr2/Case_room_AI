"""Lexical search with BM25, written by hand (Handout 1, Bài 6).

BM25 ranks documents by the words they share with the question. Three ideas:
- a rare word counts more than a common one (IDF);
- repeating a word helps less and less (saturation, controlled by k1);
- the same count means more in a short document than in a long one (length
  normalization, controlled by b).

A case has only a few dozen chunks, so the index is rebuilt in memory for
every question instead of being stored.
"""

import heapq  # nlargest: the top k without sorting the whole list
import math
from collections import Counter
from collections.abc import Sequence

from ..store.chunks import StoredChunk
from ..text import tokenize


class BM25:
    """A BM25 index over a small corpus of tokenized documents.

    Documents are identified by their position in the corpus (0, 1, 2, ...).

        score(q, d) = Σ  IDF(t) · f(t,d)·(k1+1) / (f(t,d) + k1·(1 − b + b·|d|/avgdl))
                     t ∈ q
        IDF(t)      = ln(1 + (N − n(t) + 0.5) / (n(t) + 0.5))
    """

    def __init__(self, corpus: Sequence[Sequence[str]], k1: float = 1.5, b: float = 0.75) -> None:
        """Count, once, everything the formula needs.

        corpus: one list of tokens per document, already tokenized.
        k1: how fast repeated words saturate. 0 ignores how often a word appears.
        b: how much document length matters, from 0 (not at all) to 1 (fully).

        Stores:
        - n: the number of documents (N);
        - lengths: the number of tokens of each document (|d|);
        - tf: one Counter per document, how many times each word appears in it (f(t,d));
        - df: for each word, how many documents contain it (n(t)). set(doc) counts
          a document once even when it repeats the word;
        - avgdl: the average document length, 0 for an empty corpus (no division by 0).
        """
        self.n = len(corpus)
        self.k1 = k1
        self.b = b
        self.lengths = [len(doc) for doc in corpus]
        self.tf = [Counter(doc) for doc in corpus]
        self.df = Counter()
        for doc in corpus:
            self.df.update(set(doc))
        self.avgdl = (sum(self.lengths) / self.n) if self.n > 0 else 0.0

    def idf(self, term: str) -> float:
        """How much a word weighs: high for a rare word, low for a common one.

        The "1 +" inside the log keeps it positive. Robertson's original formula
        gives a negative IDF to a word found in more than half of the documents,
        which would lower the score of documents that contain it.
        """
        n_t = self.df.get(term, 0)
        frac = (self.n - n_t + 0.5) / (n_t + 0.5)
        idf = math.log(1 + frac)
        return idf

    def score(self, query: Sequence[str], index: int) -> float:
        """BM25 score of document `index` for the query tokens; 0.0 if it shares no word.

        Each distinct query word is counted once: "HER2 HER2 HER2" scores like "HER2".
        A word the document lacks adds nothing and is skipped, which also means the
        division by avgdl never runs when avgdl is 0.
        """
        tf = self.tf[index]
        dl = self.lengths[index]
        total = 0.0

        for t in set(query):
            f = tf[t]
            if f == 0:
                continue
            nominator = f * (self.k1 + 1)
            denominator = f + self.k1 * (1 - self.b + self.b * dl / self.avgdl)
            total += self.idf(t) * (nominator / denominator)
        return total

    def top_k(self, query: Sequence[str], k: int) -> list[tuple[int, float]]:
        """The k best documents as (index, score), highest score first.

        Documents scoring 0 (no query word) are left out, so the result can be
        shorter than k, or empty. Equal scores keep the smaller index first, so the
        order is the same on every run: the key (score, -index) makes nlargest
        prefer the higher score, then the smaller index.
        """
        score_all = [(i, self.score(query, i)) for i in range(self.n)]
        pairs = [s for s in score_all if s[1] > 0]

        return heapq.nlargest(k, pairs, key=lambda pair: (pair[1], -pair[0]))


def lexical_ranking(chunks: Sequence[StoredChunk], query: str, k: int) -> list[tuple[StoredChunk, float]]:
    """The k chunks that best match the question's words, with their BM25 scores.

    Each chunk is indexed as its title plus its text, so a word found only in the
    title (e.g. "imaging" in "Imaging report") still matches. The question goes
    through the same tokenize() as the chunks, so case, punctuation, stopwords and
    Vietnamese Unicode forms do not matter.

    BM25 returns positions in the list; chunks[i] turns each one back into its chunk.
    """
    corpus = [tokenize(f"{chunk.title}\n{chunk.text}") for chunk in chunks]
    query_tokens = tokenize(query)
    bm25 = BM25(corpus)
    hits = bm25.top_k(query_tokens, k)
    return [(chunks[i], score) for (i, score) in hits]
