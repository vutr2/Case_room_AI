# Week 1 retrieval results

30 hand-written questions on the synthetic demo cases: 10 exact, 10 paraphrase, 5 crosslingual, 5 negative.
A passage is relevant when it contains one of the question's snippets (after NFC and casefold).
Metrics are averaged over the answerable questions only; each question weighs
4.0 points, so small differences are noise.

## Predictions

Written on 2026-11-29, before the first run.

- Best mode on `exact` questions: hybrid, because it combines BM25's keyword match
  with dense's semantic match.
- Best mode on `crosslingual` questions: dense, because bge-m3 is multilingual, so a
  Vietnamese question can retrieve an English passage with no word in common.

(The reasons were written down just after the first run, but they are the ones the
predictions were made with.)

## Conclusions

Written on 2026-11-29 after the first run. MRR is the metric that tells the modes apart:
hit@5 and recall@10 are at or near 1.00 for every mode but BM25 (see the limits below).

1. **Reranking gives the best ranking, at about 20 times the latency.** `hybrid_rerank`
   has the highest MRR with both chunkings (0.95 section, 1.00 fixed) and puts the
   answer first on every crosslingual question, but its p50 latency is about 450-490 ms
   against about 23 ms for `dense` and `hybrid`.
2. **Dense alone is the best value.** `dense` reaches MRR 0.93 (section) and 0.94
   (fixed) at about 23 ms, and 1.00 on crosslingual questions.
3. **Hybrid with equal weights is worse than dense alone** (0.87 vs 0.93 with section
   chunks). RRF gives BM25 the same vote as dense, so a passage that BM25 ranks low
   pulls the fused ranking down. Example: `hcc-afp-value` is first for dense, seventh for
   BM25, and only third after fusion.
4. **BM25 is the weakest mode** (MRR 0.69 section, 0.76 fixed). On crosslingual
   questions it reaches 0.40-0.47, and it finds nothing at all for
   `sigmoid-largest-liver-lesion` and `lung-vn-vertebral-metastasis`: a Vietnamese
   question shares no word with an English report. It also loses on `exact` questions,
   because these questions describe the answer ("which antiviral drug?") rather than
   contain it ("tenofovir").
5. **Predictions.** Crosslingual: dense, correct (1.00, tied with `hybrid_rerank`).
   Exact: hybrid, wrong; it came third (0.83) after `hybrid_rerank` (0.93) and `dense`
   (0.88). Combining keyword and semantic matching only helps when both sides are
   strong on different questions; here BM25 was not strong on these questions.
6. **Fixed chunks score slightly higher than section chunks** (for example 1.00 vs 0.95
   with reranking). Each answerable question is worth 4 points, so this is about one
   question: not enough to choose a strategy.

**Decision for now:** keep `hybrid_rerank` as the default (best ranking; the latency is
acceptable for a clinician asking about one case). If latency matters more, `dense` is
the fallback; plain `hybrid` with equal weights has no reason to be used.

**Limits of this run.**

- *Ceiling effect.* A case has 4 to 15 chunks, so the top 10 passages are close to the
  whole record. hit@5 and recall@10 cannot separate the good modes; a harder set (more
  documents per case, or a lower limit such as 3) is needed.
- *No threshold for "not enough evidence" yet.* With section chunks the best negative
  question reaches a reranker score of 0.400 while some answerable questions score
  below 0.01; with fixed chunks a negative question reaches 0.871. The two groups
  overlap, and 5 negative questions are too few to set a threshold.
- *Small set.* 25 answerable questions written by one person on synthetic records.

**Next experiments:** hybrid with `weight_bm25 = 0.5`; questions that contain the exact
code (to test BM25 where it should win); more negative questions for the threshold.

## Results by configuration

| Mode | Chunking | hit@5 | recall@10 | MRR | p50 latency (ms) |
|---|---|---|---|---|---|
| bm25 | fixed | 0.88 | 0.88 | 0.76 | 1 |
| dense | fixed | 1.00 | 1.00 | 0.94 | 24 |
| hybrid | fixed | 1.00 | 1.00 | 0.90 | 24 |
| hybrid_rerank | fixed | 1.00 | 1.00 | 1.00 | 445 |
| bm25 | section | 0.84 | 0.92 | 0.69 | 1 |
| dense | section | 1.00 | 1.00 | 0.93 | 23 |
| hybrid | section | 1.00 | 1.00 | 0.87 | 23 |
| hybrid_rerank | section | 1.00 | 1.00 | 0.95 | 488 |

## Results by question type (hit@5 / MRR)

| Mode | Chunking | exact (n=10) | paraphrase (n=10) | crosslingual (n=5) |
|---|---|---|---|---|
| bm25 | fixed | 1.00 / 0.90 | 0.90 / 0.76 | 0.60 / 0.47 |
| dense | fixed | 1.00 / 0.90 | 1.00 / 0.95 | 1.00 / 1.00 |
| hybrid | fixed | 1.00 / 0.95 | 1.00 / 0.85 | 1.00 / 0.90 |
| hybrid_rerank | fixed | 1.00 / 1.00 | 1.00 / 1.00 | 1.00 / 1.00 |
| bm25 | section | 0.90 / 0.81 | 0.90 / 0.72 | 0.60 / 0.40 |
| dense | section | 1.00 / 0.88 | 1.00 / 0.95 | 1.00 / 1.00 |
| hybrid | section | 1.00 / 0.83 | 1.00 / 0.88 | 1.00 / 0.90 |
| hybrid_rerank | section | 1.00 / 0.93 | 1.00 / 0.93 | 1.00 / 1.00 |

## Top reranker score: answerable vs. negative questions

| Chunking | Questions | n | lowest top score | median | highest |
|---|---|---|---|---|---|
| fixed | answerable | 25 | 0.002 | 0.822 | 0.996 |
| fixed | negative | 5 | 0.137 | 0.263 | 0.871 |
| section | answerable | 25 | 0.004 | 0.751 | 0.998 |
| section | negative | 5 | 0.026 | 0.299 | 0.400 |

## Reciprocal rank per question

| Question | Type | bm25/fixed | dense/fixed | hybrid/fixed | hybrid_rerank/fixed | bm25/section | dense/section | hybrid/section | hybrid_rerank/section |
|---|---|---|---|---|---|---|---|---|---|
| lung-vn-egfr-mutation | exact | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| lung-rul-pathology-accession | exact | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| breast-vn-ki67 | exact | 1.00 | 1.00 | 1.00 | 1.00 | 0.50 | 1.00 | 1.00 | 1.00 |
| hcc-hbv-antiviral | exact | 0.50 | 0.50 | 0.50 | 1.00 | 0.50 | 0.50 | 0.50 | 0.33 |
| pancreas-cholangitis-antibiotic | exact | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| sigmoid-kras-variant | exact | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| adhf-medication-hold | exact | 1.00 | 0.50 | 1.00 | 1.00 | 1.00 | 0.25 | 0.50 | 1.00 |
| breast-idc-home-medication | exact | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| hcc-afp-value | exact | 0.50 | 1.00 | 1.00 | 1.00 | 0.14 | 1.00 | 0.33 | 1.00 |
| pancreas-protein-loss | exact | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| lung-rul-airflow-gas-transfer | paraphrase | 1.00 | 1.00 | 1.00 | 1.00 | 0.20 | 1.00 | 0.33 | 0.33 |
| adhf-fluid-balance | paraphrase | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| hcc-varix-grade | paraphrase | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| sigmoid-reassessment-timing | paraphrase | 0.00 | 1.00 | 0.50 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| breast-idc-family-history | paraphrase | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 0.50 | 1.00 | 1.00 |
| pancreas-ercp-hemostasis | paraphrase | 1.00 | 1.00 | 1.00 | 1.00 | 0.50 | 1.00 | 0.50 | 1.00 |
| breast-vn-surgery-preference | paraphrase | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| lung-vn-skin-change | paraphrase | 0.25 | 0.50 | 0.50 | 1.00 | 0.14 | 1.00 | 1.00 | 1.00 |
| adhf-right-heart-pressure | paraphrase | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| breast-idc-node-origin | paraphrase | 0.33 | 1.00 | 0.50 | 1.00 | 0.33 | 1.00 | 1.00 | 1.00 |
| lung-rul-primary-pet-uptake | crosslingual | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| sigmoid-largest-liver-lesion | crosslingual | 0.00 | 1.00 | 1.00 | 1.00 | 0.00 | 1.00 | 1.00 | 1.00 |
| breast-vn-baseline-lvef | crosslingual | 0.33 | 1.00 | 0.50 | 1.00 | 0.50 | 1.00 | 0.50 | 1.00 |
| lung-vn-vertebral-metastasis | crosslingual | 0.00 | 1.00 | 1.00 | 1.00 | 0.00 | 1.00 | 1.00 | 1.00 |
| breast-idc-largest-axillary-node | crosslingual | 1.00 | 1.00 | 1.00 | 1.00 | 0.50 | 1.00 | 1.00 | 1.00 |
