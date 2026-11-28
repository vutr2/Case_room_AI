"""Compare the four retrieval modes on the hand-written golden set (Handout 1, Bài 9).

Run from services/rag:

    uv run python -m evals.run_week1

It needs RAG_DATABASE_URL and APP_DATABASE_URL (services/rag/.env), the demo documents
indexed by `python -m scripts.ingest_seed`, and the real models (bge-m3, bge-reranker).

Write your predictions under "## Predictions" in evals/results/week1.md BEFORE the
first run. The script keeps that section and a "## Conclusions" section, which you
write after reading the results, and regenerates the tables.
"""

import dataclasses
import json
import statistics
import time
from dataclasses import dataclass
from pathlib import Path

import psycopg

from app.config import Settings
from app.resources import Resources
from app.retrieval.service import retrieve
from app.schemas import RetrieveRequest
from app.store.chunks import list_case_chunks
from evals.metrics import hit_at_k, is_relevant, recall_at_k, reciprocal_rank

EVALS = Path(__file__).resolve().parent
GOLDEN = EVALS / "golden" / "week1.jsonl"
RESULTS = EVALS / "results" / "week1.md"

MODES = ("bm25", "dense", "hybrid", "hybrid_rerank")
ANSWERABLE_TYPES = ("exact", "paraphrase", "crosslingual")
LIMIT = 10  # passages asked from retrieve: enough for recall@10

PREDICTIONS_HEADER = "## Predictions"
CONCLUSIONS_HEADER = "## Conclusions"
PREDICTIONS_TEMPLATE = f"""{PREDICTIONS_HEADER}

Written before the first run.

- Best mode on `exact` questions: TODO, because TODO
- Best mode on `crosslingual` questions: TODO, because TODO
"""


@dataclass(frozen=True)
class GoldenItem:
    """One question of the golden set; organization_id/case_room_id are filled by resolve_cases."""

    id: str
    case: str
    query: str
    relevant_snippets: tuple[str, ...]
    type: str
    organization_id: str = ""
    case_room_id: str = ""


@dataclass(frozen=True)
class ItemResult:
    """How one configuration did on one question."""

    id: str
    type: str
    hit_at_5: float
    recall_at_10: float
    reciprocal_rank: float
    latency_ms: float
    top_score: float  # score of the first passage; meaningful as a probability only with the reranker


@dataclass(frozen=True)
class ConfigResult:
    """Every question's result for one (mode, chunking strategy) configuration."""

    mode: str
    strategy: str
    items: list[ItemResult]

    def answerable(self, types: tuple[str, ...] = ANSWERABLE_TYPES) -> list[ItemResult]:
        return [r for r in self.items if r.type in types]

    def mean(self, metric: str, types: tuple[str, ...] = ANSWERABLE_TYPES) -> float:
        rows = self.answerable(types)
        return sum(getattr(r, metric) for r in rows) / len(rows) if rows else 0.0

    def p50_latency_ms(self) -> float:
        return statistics.median(r.latency_ms for r in self.items) if self.items else 0.0


def load_golden(path: Path) -> list[GoldenItem]:
    """Read the golden set: one JSON object per line, blank lines ignored."""
    items = []
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            raw = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"{path.name} line {number}: {error}") from error
        items.append(
            GoldenItem(
                id=raw["id"],
                case=raw["case"],
                query=raw["query"],
                relevant_snippets=tuple(raw["relevantSnippets"]),
                type=raw["type"],
            )
        )
    return items


def resolve_cases(app_database_url: str, titles: set[str]) -> dict[str, tuple[str, str]]:
    """Case title -> (organization id, case room id), read from the app's database.

    The golden set names cases by title because ids change every time the demo is
    reseeded. A title that is not found is an error, not a silently skipped question.
    """
    with psycopg.connect(app_database_url) as conn:
        conn.read_only = True
        rows = conn.execute('SELECT title, "organizationId", id FROM "CaseRoom"').fetchall()
    found = {title: (organization_id, case_room_id) for title, organization_id, case_room_id in rows}
    missing = sorted(titles - set(found))
    if missing:
        raise ValueError(f"Cases not found in the app database: {missing}")
    return {title: found[title] for title in titles}


def count_relevant_chunks(res: Resources, item: GoldenItem) -> int:
    """How many of the case's chunks contain a snippet: the denominator of recall."""
    with res.pool().connection() as conn:
        chunks = list_case_chunks(conn, item.organization_id, item.case_room_id, res.settings.chunk_strategy)
    return sum(is_relevant(chunk.text, item.relevant_snippets) for chunk in chunks)


def evaluate(items: list[GoldenItem], res: Resources) -> ConfigResult:
    """Ask every question with res.settings and score the passages that come back."""
    results = []
    for item in items:
        request = RetrieveRequest(
            organization_id=item.organization_id,
            case_room_id=item.case_room_id,
            query=item.query,
            limit=LIMIT,
        )
        started = time.perf_counter()
        response = retrieve(request, res)
        latency_ms = (time.perf_counter() - started) * 1000

        relevance = [is_relevant(p.text, item.relevant_snippets) for p in response.passages]
        results.append(
            ItemResult(
                id=item.id,
                type=item.type,
                hit_at_5=hit_at_k(relevance, 5),
                recall_at_10=recall_at_k(relevance, count_relevant_chunks(res, item), 10),
                reciprocal_rank=reciprocal_rank(relevance),
                latency_ms=latency_ms,
                top_score=response.passages[0].score if response.passages else 0.0,
            )
        )
    return ConfigResult(mode=res.settings.retrieval_mode, strategy=res.settings.chunk_strategy, items=results)


def indexed_strategies(res: Resources) -> list[str]:
    """The chunking strategies present in the index ('section', and 'fixed' if it was ingested)."""
    with res.pool().connection() as conn:
        rows = conn.execute("SELECT DISTINCT strategy FROM chunks WHERE kind = 'document' ORDER BY 1").fetchall()
    return [strategy for (strategy,) in rows]


# --- Report ------------------------------------------------------------------------------


def summary_table(results: list[ConfigResult]) -> str:
    lines = [
        "| Mode | Chunking | hit@5 | recall@10 | MRR | p50 latency (ms) |",
        "|---|---|---|---|---|---|",
    ]
    for r in results:
        lines.append(
            f"| {r.mode} | {r.strategy} | {r.mean('hit_at_5'):.2f} | {r.mean('recall_at_10'):.2f}"
            f" | {r.mean('reciprocal_rank'):.2f} | {r.p50_latency_ms():.0f} |"
        )
    return "\n".join(lines)


def by_type_table(results: list[ConfigResult]) -> str:
    header = " | ".join(f"{t} (n={len(results[0].answerable((t,)))})" for t in ANSWERABLE_TYPES)
    lines = [
        f"| Mode | Chunking | {header} |",
        "|---|---|" + "---|" * len(ANSWERABLE_TYPES),
    ]
    for r in results:
        cells = " | ".join(
            f"{r.mean('hit_at_5', (t,)):.2f} / {r.mean('reciprocal_rank', (t,)):.2f}" for t in ANSWERABLE_TYPES
        )
        lines.append(f"| {r.mode} | {r.strategy} | {cells} |")
    return "\n".join(lines)


def negative_table(results: list[ConfigResult]) -> str:
    """Top reranker score on questions with and without an answer, to set a threshold later."""
    lines = [
        "| Chunking | Questions | n | lowest top score | median | highest |",
        "|---|---|---|---|---|---|",
    ]
    for r in results:
        if r.mode != "hybrid_rerank":
            continue
        for label, types in (("answerable", ANSWERABLE_TYPES), ("negative", ("negative",))):
            scores = [x.top_score for x in r.answerable(types)]
            if scores:
                lines.append(
                    f"| {r.strategy} | {label} | {len(scores)} | {min(scores):.3f}"
                    f" | {statistics.median(scores):.3f} | {max(scores):.3f} |"
                )
    return "\n".join(lines)


def per_question_table(results: list[ConfigResult]) -> str:
    """Reciprocal rank of every answerable question in every configuration: where each mode fails."""
    columns = [f"{r.mode}/{r.strategy}" for r in results]
    lines = [f"| Question | Type | {' | '.join(columns)} |", "|---|---|" + "---|" * len(columns)]
    for index, item in enumerate(results[0].items):
        if item.type == "negative":
            continue
        cells = " | ".join(f"{r.items[index].reciprocal_rank:.2f}" for r in results)
        lines.append(f"| {item.id} | {item.type} | {cells} |")
    return "\n".join(lines)


def kept_section(path: Path, header: str) -> str | None:
    """A hand-written section ('## Predictions', '## Conclusions') of an earlier results file.

    The section runs from its header to the next '## ' header. Kept across runs so that
    regenerating the tables never erases what was written by hand.
    """
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8")
    start = text.find(header)
    if start == -1:
        return None
    end = text.find("\n## ", start + len(header))
    return text[start : end if end != -1 else len(text)].rstrip() + "\n"


def write_report(
    path: Path, items: list[GoldenItem], results: list[ConfigResult], predictions: str, conclusions: str | None = None
) -> str:
    counts = {t: sum(i.type == t for i in items) for t in (*ANSWERABLE_TYPES, "negative")}
    report = f"""# Week 1 retrieval results

{len(items)} hand-written questions on the synthetic demo cases: {", ".join(f"{n} {t}" for t, n in counts.items())}.
A passage is relevant when it contains one of the question's snippets (after NFC and casefold).
Metrics are averaged over the answerable questions only; each question weighs
{100 / max(1, len(items) - counts["negative"]):.1f} points, so small differences are noise.

{predictions}
{conclusions + chr(10) if conclusions else ""}## Results by configuration

{summary_table(results)}

## Results by question type (hit@5 / MRR)

{by_type_table(results)}

## Top reranker score: answerable vs. negative questions

{negative_table(results)}

## Reciprocal rank per question

{per_question_table(results)}
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(report, encoding="utf-8")
    return report


def main() -> None:
    settings = Settings()
    if settings.app_database_url is None:
        raise RuntimeError("Missing APP_DATABASE_URL in services/rag/.env (copy DATABASE_URL from the repo's .env)")

    predictions = kept_section(RESULTS, PREDICTIONS_HEADER)
    conclusions = kept_section(RESULTS, CONCLUSIONS_HEADER)
    if predictions is None or "TODO" in predictions:
        RESULTS.parent.mkdir(parents=True, exist_ok=True)
        if predictions is None:
            RESULTS.write_text(f"# Week 1 retrieval results\n\n{PREDICTIONS_TEMPLATE}", encoding="utf-8")
        raise SystemExit(f"Write your predictions in {RESULTS.relative_to(EVALS.parent)} first (replace every TODO).")

    items = load_golden(GOLDEN)
    cases = resolve_cases(settings.app_database_url.get_secret_value(), {i.case for i in items})
    items = [dataclasses.replace(i, organization_id=cases[i.case][0], case_room_id=cases[i.case][1]) for i in items]

    base = Resources(settings)
    try:
        # Load everything once; every configuration below shares it.
        base.pool()
        base.embedder()
        base.reranker()

        results = []
        for strategy in indexed_strategies(base):
            for mode in MODES:
                config = settings.model_copy(update={"retrieval_mode": mode, "chunk_strategy": strategy})
                res = base.with_settings(config)
                evaluate(items[:1], res)  # warm-up: the first call pays one-off costs (MPS kernels)
                result = evaluate(items, res)
                results.append(result)
                print(
                    f"{mode:14s} {strategy:8s} hit@5={result.mean('hit_at_5'):.2f}"
                    f" recall@10={result.mean('recall_at_10'):.2f} MRR={result.mean('reciprocal_rank'):.2f}"
                    f" p50={result.p50_latency_ms():.0f} ms"
                )
    finally:
        base.close()

    write_report(RESULTS, items, results, predictions, conclusions)
    print(f"Wrote {RESULTS.relative_to(EVALS.parent)}")


if __name__ == "__main__":
    main()
