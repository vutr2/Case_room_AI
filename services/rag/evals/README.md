# Evals

Measures retrieval and answer quality against a fixed set of questions, and fails CI when quality drops.

```
evals/
  golden/       the golden set: synthetic questions with the sources that answer them
  ...           metrics, LLM judge and the pytest gate, as you build them
```

Golden set format, one JSON object per line in `golden/*.jsonl` (see `golden/week1.jsonl`):

```json
{"id": "lung-egfr-mutation", "case": "<case title in the app>", "query": "Đột biến EGFR của bệnh nhân là gì?", "relevantSnippets": ["L858R"], "type": "exact"}
```

- `case` is the case title, not its id: ids change every time the demo is reseeded. `evals/run_week1.py` looks the ids up in the app's database.
- A returned passage counts as relevant when its text contains at least one of `relevantSnippets` (compared after Unicode NFC and casefold). Snippets rather than source ids, because ids change on reseed, chunk ids differ between chunking strategies, and a whole document is too coarse when a case has only a few documents.
- `type` is one of `exact`, `paraphrase`, `crosslingual`, `negative`. Negative questions have no answer in the record and an empty `relevantSnippets`.
- Synthetic data only: build the cases from the demo seed (`packages/database/prisma/seed`), never from real patients.
- Retrieval metrics (hit@k, recall@k, MRR) need only `relevantSnippets`. Answer metrics (faithfulness, fact coverage; later handouts) will need expected facts and a judge model.
- Run the week 1 comparison with `uv run python -m evals.run_week1`; it writes `results/week1.md`. The metric functions are tested in `tests/test_metrics.py`.
