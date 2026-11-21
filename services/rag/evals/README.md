# Evals

Measures retrieval and answer quality against a fixed set of questions, and fails CI when quality drops.

```
evals/
  golden/       the golden set: synthetic questions with the sources that answer them
  ...           metrics, LLM judge and the pytest gate, as you build them
```

Suggested golden set format, one JSON object per line in `golden/*.jsonl`:

```json
{"id": "her2-status", "caseRoomId": "case_synthetic_001", "query": "What is the HER2 status?", "relevantSourceIds": ["doc_synthetic_pathology"], "expectedFacts": ["HER2 3+ by IHC"]}
```

- Synthetic data only: build the cases from the demo seed (`packages/database/prisma/seed`), never from real patients.
- Retrieval metrics (recall@k, MRR, nDCG) need only `relevantSourceIds`. Answer metrics (faithfulness, fact coverage) use `expectedFacts` and a judge model.
- Run with `uv run pytest evals` (kept out of the default `uv run pytest`, which runs `tests/` only).
