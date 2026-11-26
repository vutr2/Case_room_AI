import re
from dataclasses import dataclass
from typing import Literal

_BLANK_LINES = re.compile(r"\n[ \t]*\n+")


@dataclass(frozen=True)
class Chunk:
    part: int
    parts: int
    start: int
    end: int
    section: str | None
    text: str


def heading_of(line: str) -> str | None:
    if ":" not in line:
        return None
    prefix = line.split(":", 1)[0].strip()
    if 3 <= len(prefix) <= 60 and prefix.isupper():
        return prefix
    return None


def find_sections(text):
    """Step 1: go through each line of the text and add up the len of the text.
    Step 2: For each line which the heading of function return the name,
    then open the new section there
    Step 3: return the set of (start, end, name) together and fulfill the entire docs, get rid of the white spaces."""
    sections, start, name, pos = [], 0, None, 0
    for line in text.splitlines(keepends=True):
        head = heading_of(line)
        if head is not None:
            if pos > start:
                sections.append((start, pos, name))
                start = pos
            name = head
        pos += len(line)
    sections.append((start, len(text), name))
    return [s for s in sections if text[s[0] : s[1]].strip()]


def _paragraphs(text: str, start: int, end: int) -> list[tuple[int, int]]:
    paragraphs = []
    cursor = start

    for match in _BLANK_LINES.finditer(text, start, end):
        paragraphs.append((cursor, match.end()))
        cursor = match.end()

    if cursor < end:
        paragraphs.append((cursor, end))
    return paragraphs


def _find_cut(text: str, s: int, window_end: int) -> int:
    candidates = []
    dot = text.rfind(". ", s, window_end)
    # -1 = cannot find out
    if dot != -1:
        candidates.append(dot + 2)
    newline = text.rfind("\n", s, window_end)
    if newline != -1:
        candidates.append(newline + 1)
    if candidates:
        return max(candidates)  # get the latest cut points

    # after the last space
    space = text.rfind(" ", s, window_end)
    if space != -1:
        return space + 1
    # if there is nothing to cut: then cut at the window_end
    return window_end


def _hard_cut(text: str, start: int, end: int, target: int) -> list[tuple[int, int]]:
    pieces = []
    s = start
    while end - s > 1.5 * target:
        cut = _find_cut(text, s, s + target)

        pieces.append((s, cut))
        s = cut
    pieces.append((s, end))
    return pieces


def _pieces(text: str, sections, target: int) -> list[tuple[int, int, bool]]:
    pieces = []
    for sec_start, sec_end, _name in sections:
        if sec_end - sec_start <= target:
            spans = [(sec_start, sec_end)]
        else:
            spans = []
            for p_start, p_end in _paragraphs(text, sec_start, sec_end):
                if p_end - p_start > 1.5 * target:
                    spans += _hard_cut(text, p_start, p_end, target)
                else:
                    spans.append((p_start, p_end))
        for i, (s, e) in enumerate(spans):
            pieces.append((s, e, i == 0))
    return pieces


def _group(pieces: list[tuple[int, int, bool]], target: int) -> list[tuple[int, int]]:
    curr = None
    chunk = []
    for s, e, is_head in pieces:
        if curr is None:
            curr = [s, e]
            continue
        too_long = e - curr[0] > target
        head_break = is_head and (curr[1] - curr[0]) >= target / 3
        if too_long or head_break:
            chunk.append(tuple(curr))
            curr = [s, e]
        else:
            curr[1] = e
    if curr is not None:
        chunk.append(tuple(curr))
    return chunk


def _trim(text: str, start: int, end: int) -> tuple[int, int]:
    while start < end and text[start].isspace():
        start += 1
    while end > start and text[end - 1].isspace():
        end -= 1
    return (start, end)


def _section_name(sections, position: int) -> str | None:
    for start, end, name in sections:
        if start <= position < end:
            return name
    return None


def chunk_by_section(text: str, target_chars: int = 900) -> list[Chunk]:
    sections = find_sections(text)
    pieces = _pieces(text, sections, target_chars)
    spans = _group(pieces, target_chars)
    # spans = [_trim(text, s, e) for s, e in spans]
    # spans = [(s, e) for s, e in spans if s < e]

    # parts = len(spans)
    # chunks = []
    # for i, (s, e) in enumerate(spans):
    #     chunks.append(
    #         Chunk(
    #             part=i + 1,
    #             parts=parts,
    #             start=s,
    #             end=e,
    #             section=_section_name(sections, s),
    #             text=text[s:e],
    #         )
    #     )
    # return chunks
    return _build_chunks(text, spans, sections)


def _build_chunks(text: str, spans: list[tuple[int, int]], sections=()) -> list[Chunk]:
    spans = [_trim(text, s, e) for s, e in spans]
    spans = [(s, e) for s, e in spans if s < e]

    parts = len(spans)
    chunks = []
    for i, (s, e) in enumerate(spans):
        chunks.append(
            Chunk(
                part=i + 1,
                parts=parts,
                start=s,
                end=e,
                section=_section_name(sections, s),
                text=text[s:e],
            )
        )
    return chunks


def chunk_fixed(text: str, size: int = 800, overlap: int = 150) -> list[Chunk]:
    """Fixed-size chunks with overlap, the baseline for Bài 9 (Handout 1, Bài 2)."""
    spans, start, n = [], 0, len(text)
    while start < n:
        end = min(start + size, n)
        if end < n:
            cut = _last_space(text, start + size // 2, end)
            if cut is not None:
                end = cut
        spans.append((start, end))
        if end == n:
            break
        start = max(end - overlap, start + 1)
        while start < end and not text[start - 1].isspace():
            start += 1
    return _build_chunks(text, spans)


def _last_space(text: str, lo: int, hi: int) -> int | None:
    """Position of the last whitespace character in text[lo:hi], or None if there is none."""
    for i in range(hi - 1, lo - 1, -1):
        if text[i].isspace():
            return i
    return None


def chunk_text(text: str, strategy: Literal["section", "fixed"], target_chars: int = 900) -> list[Chunk]:
    """Call chunk_by_section or chunk_fixed according to strategy (Handout 1, Bài 2).

    target_chars only applies to the section strategy; it stays configurable for the
    chunk-size experiments of Bài 9. The fixed strategy keeps its own defaults.
    """
    if strategy == "section":
        return chunk_by_section(text, target_chars)
    elif strategy == "fixed":
        return chunk_fixed(text)
    else:
        raise ValueError(f"{strategy} strategy is wrong")
