import re
from dataclasses import dataclass
from typing import Literal

_BLANK_LINES = re.compile(r"\n[ \t]*\n+")


@dataclass(frozen=True)
class Chunk:
    """One piece of a document, ready to be embedded and stored.

    part/parts: 1-based position and total number of chunks of the document.
    start/end: half-open character offsets [start, end) in the normalized text,
    so text == full_text[start:end] always holds.
    section: the heading the chunk starts under (e.g. "DIAGNOSIS"), or None.
    """

    part: int
    parts: int
    start: int
    end: int
    section: str | None
    text: str


def heading_of(line: str) -> str | None:
    """Return the heading name if `line` starts like a section heading, else None.

    A heading is the text before the first ":" when it is 3-60 characters long and
    all upper case, e.g. "KẾT LUẬN: ..." -> "KẾT LUẬN". "Bệnh nhân: ..." is not one.
    """
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
    """Split text[start:end] into paragraphs at blank lines; return their (start, end) spans.

    Each blank-line run stays attached to the paragraph before it, so the spans
    cover text[start:end] with no gap and no overlap.
    """
    paragraphs = []
    cursor = start

    for match in _BLANK_LINES.finditer(text, start, end):
        paragraphs.append((cursor, match.end()))
        cursor = match.end()

    if cursor < end:
        paragraphs.append((cursor, end))
    return paragraphs


def _find_cut(text: str, s: int, window_end: int) -> int:
    """Choose where to cut a too-long paragraph, at or before window_end.

    Preference: the latest sentence end (". ") or line break inside [s, window_end);
    else just after the last space; else window_end itself (one long unbroken token).
    Returns the position where the next piece starts.
    """
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
    """Cut one paragraph longer than 1.5 * target into pieces of about `target` characters.

    Uses _find_cut so pieces end at sentences or words when possible. The last piece
    takes the rest, so it can be up to 1.5 * target long. Spans touch: no gap, no overlap.
    """
    pieces = []
    s = start
    while end - s > 1.5 * target:
        cut = _find_cut(text, s, s + target)

        pieces.append((s, cut))
        s = cut
    pieces.append((s, end))
    return pieces


def _pieces(text: str, sections, target: int) -> list[tuple[int, int, bool]]:
    """Turn sections into small pieces that _group can glue back together.

    A section that fits in `target` stays whole; a longer one is split into paragraphs,
    and any paragraph still longer than 1.5 * target is hard-cut.
    Each piece is (start, end, is_head): is_head is True for the first piece of a section,
    so _group knows where a new section begins.
    """
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
    """Glue consecutive pieces into chunk spans of at most about `target` characters.

    Start a new chunk when adding the piece would go over `target`, or when a new
    section begins and the current chunk already has at least target / 3 characters
    (so a section heading starts its own chunk unless the chunk so far is tiny).
    """
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
    """Move start forward and end backward past whitespace; return the tightened (start, end)."""
    while start < end and text[start].isspace():
        start += 1
    while end > start and text[end - 1].isspace():
        end -= 1
    return (start, end)


def _section_name(sections, position: int) -> str | None:
    """Name of the section that contains `position`, or None if it is in no named section."""
    for start, end, name in sections:
        if start <= position < end:
            return name
    return None


def chunk_by_section(text: str, target_chars: int = 900) -> list[Chunk]:
    """Split a document into chunks that follow its sections (Handout 1, Bài 2).

    find_sections -> _pieces (split long sections) -> _group (merge small pieces up to
    target_chars) -> _build_chunks (trim, drop empty spans, number the chunks).
    """
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
    """Turn (start, end) spans into numbered Chunk objects; shared by both strategies.

    Trims whitespace at both ends of each span, drops spans that become empty, then
    numbers the rest 1..parts. `sections` gives each chunk its section name; chunk_fixed
    passes none, so its chunks have section=None.
    """
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
