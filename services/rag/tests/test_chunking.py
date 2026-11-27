from itertools import pairwise

import pytest

from app.ingest.chunking import (
    _group,
    _hard_cut,
    _last_space,
    _paragraphs,
    _pieces,
    _trim,
    chunk_by_section,
    chunk_fixed,
    chunk_text,
    find_sections,
    heading_of,
)


def assert_tiles(spans, start, end):
    """So the fulfillment range [start, end], would stick together and there is no spaces"""
    assert spans[0][0] == start
    assert spans[-1][-1] == end
    for (_, e), (s, _) in pairwise(spans):
        assert e == s


TEXT = "CHẨN ĐOÁN: Ung thư vú.\n\nMÔ TẢ:\nVú trái: khối 3,4 cm.\n\nHạch: hai hạch nách.\n\n\nKết thúc."
START = TEXT.index("MÔ TẢ")
END = len(TEXT)


def test_paragraphs_split_at_blank_lines():
    spans = _paragraphs(TEXT, START, END)
    assert [TEXT[s:e].strip() for s, e in spans] == [
        "MÔ TẢ:\nVú trái: khối 3,4 cm.",
        "Hạch: hai hạch nách.",
        "Kết thúc.",
    ]


def test_paragraphs_tile_the_section_with_absolute_positions():
    assert_tiles(_paragraphs(TEXT, START, END), START, END)


def test_a_section_without_blank_lines_is_one_paragraph():
    assert _paragraphs("abc\ndef", 0, 7) == [(0, 7)]


# Test _hard_cut
def test_short_paragraph_is_not_cut():
    text = "Ngắn."
    assert _hard_cut(text, 0, len(text), target=100) == [(0, len(text))]


def test_long_paragraph_is_cut_and_still_tiles():
    text = "Câu một dài. " * 30  # ~390 ký tự
    spans = _hard_cut(text, 0, len(text), target=100)
    assert_tiles(spans, 0, len(text))
    assert all(e - s <= 150 for s, e in spans)  # không mảnh nào > 1.5 × target


def test_cut_never_splits_a_decimal():
    text = "Khối u kích thước 2.5 cm ở vú trái " * 10
    spans = _hard_cut(text, 0, len(text), target=100)
    for s, e in spans:
        assert not text[s:e].endswith("2.")  # không cắt giữa "2.5"


def test_text_without_punctuation_still_terminates():
    text = "x" * 500  # không có ". ", "\n" hay dấu cách
    spans = _hard_cut(text, 0, len(text), target=100)
    assert_tiles(spans, 0, len(text))


REPORT = "CHẨN ĐOÁN: Ung thư vú.\n\nMÔ TẢ:\n" + ("khối u vú trái 3,4 cm. " * 10) + "\n\n" + ("Hạch nách nhóm I. " * 10)


def test_short_section_is_one_piece_marked_as_section_start():
    pieces = _pieces(REPORT, find_sections(REPORT), target=100)
    s, e, is_head = pieces[0]
    assert REPORT[s:e].strip() == "CHẨN ĐOÁN: Ung thư vú."
    assert is_head is True


def test_long_section_is_split_and_only_its_first_piece_is_a_section_start():
    pieces = _pieces(REPORT, find_sections(REPORT), target=100)
    heads = [REPORT[s:e].split("\n")[0] for s, e, h in pieces if h]
    assert heads == ["CHẨN ĐOÁN: Ung thư vú.", "MÔ TẢ:"]  # đúng 2 mục → đúng 2 mảnh đầu mục


def test_pieces_tile_the_whole_text_and_none_is_too_long():
    pieces = _pieces(REPORT, find_sections(REPORT), target=100)
    assert_tiles([(s, e) for s, e, _ in pieces], 0, len(REPORT))
    assert all(e - s <= 150 for s, e, _ in pieces)


# Test code_group: group the already-cut pieces without splitting or dropping them.
def test_code_group_matches_manual_example():
    pieces = [
        (0, 36, True),
        (36, 84, True),
        (84, 120, False),
        (120, 160, True),
    ]

    groups = _group(pieces, target=150)

    assert groups == [(0, 120), (120, 160)]


def test_code_group_merges_small_section_starts():
    pieces = [(0, 20, True), (20, 40, True), (40, 60, True)]

    assert _group(pieces, target=150) == [(0, 60)]


def test_code_group_starts_new_group_at_section_start_after_target_third():
    pieces = [(0, 60, True), (60, 80, True)]

    assert _group(pieces, target=150) == [(0, 60), (60, 80)]


def test_code_group_keeps_piece_longer_than_target_intact():
    pieces = [(0, 140, True)]

    assert _group(pieces, target=100) == [(0, 140)]


def test_code_group_returns_no_groups_for_empty_input():
    assert _group([], target=150) == []


def test_code_group_groups_tile_the_input_and_keep_the_final_piece():
    pieces = [
        (0, 36, True),
        (36, 84, True),
        (84, 120, False),
        (120, 160, True),
    ]

    groups = _group(pieces, target=150)

    assert_tiles(groups, pieces[0][0], pieces[-1][1])
    assert groups[-1][1] == pieces[-1][1]


# --- _trim ---------------------------------------------------------------


def test_trim_moves_the_end_back_over_trailing_whitespace():
    # (24, 54) is 'MÔ TẢ:\nVú trái: khối 3,4 cm.\n\n' in TEXT: two newlines at the end
    assert TEXT[24:54].endswith("\n\n")
    assert _trim(TEXT, 24, 54) == (24, 52)


def test_trim_moves_the_start_forward_over_leading_whitespace():
    text = "  \n\tHER2 3+"
    assert _trim(text, 0, len(text)) == (4, len(text))


def test_trim_trims_both_ends():
    text = "\n  ER âm tính.  \n"
    s, e = _trim(text, 0, len(text))
    assert text[s:e] == "ER âm tính."


def test_trim_leaves_a_chunk_without_extra_whitespace_unchanged():
    text = "Ki-67 45%."
    assert _trim(text, 0, len(text)) == (0, len(text))


def test_trim_of_an_all_whitespace_chunk_is_empty_and_does_not_crash():
    text = "abc \n\t  \n def"
    s, e = _trim(text, 3, 10)  # only the whitespace between "abc" and "def"
    assert s == e
    assert 3 <= s <= 10  # stays inside the chunk


def test_trim_keeps_whitespace_inside_the_chunk():
    text = "  Vú trái:\nkhối 3,4 cm.  "
    s, e = _trim(text, 0, len(text))
    assert text[s:e] == "Vú trái:\nkhối 3,4 cm."


def test_trim_returns_absolute_positions_in_the_middle_of_the_text():
    # A chunk that starts after position 0: positions must count from the start of TEXT
    start = TEXT.index("Hạch") - 2  # include the two newlines before "Hạch"
    end = TEXT.index("Kết thúc")  # include the three newlines after the sentence
    s, e = _trim(TEXT, start, end)
    assert TEXT[s:e] == "Hạch: hai hạch nách."
    assert s == TEXT.index("Hạch")


def test_trim_result_is_still_verbatim_text():
    s, e = _trim(TEXT, 0, len(TEXT))
    assert TEXT[s:e] == TEXT.strip()


# --- chunk_by_section ----------------------------------------------------

# The English report from contract/examples/ingest-request.json
SAMPLE = (
    "SPECIMEN: Left breast core biopsy.\n\n"
    "DIAGNOSIS: Invasive ductal carcinoma, grade 2.\n\n"
    "BIOMARKERS: ER positive (90%), PR positive (40%), HER2 3+ by IHC. Ki-67 30%."
)

# The Vietnamese pathology report of the demo breast case (seed/vietnam/cases/breast-her2.ts)
REPORT_VI = (
    "PHIẾU KẾT QUẢ GIẢI PHẪU BỆNH\n"
    "Mã tiêu bản: SYN-GPB-26-1302\n"
    "Bệnh phẩm: A. Sinh thiết lõi kim khối vú trái vị trí 2 giờ. B. Chọc hút tế bào hạch nách trái.\n"
    "Bác sĩ đọc: BS. Vũ Thanh Hương\n\n"
    "CHẨN ĐOÁN:\n"
    "A. Ung thư biểu mô thể ống xâm nhập, độ mô học 3 (Nottingham).\n"
    "B. Có tế bào ung thư biểu mô di căn, phù hợp nguồn gốc từ vú.\n\n"
    "HÓA MÔ MIỄN DỊCH:\n"
    "ER: âm tính (0%). PR: âm tính (0%). HER2: dương tính (3+). Ki-67: 45%.\n\n"
    "NHẬN XÉT: Ung thư vú thể HER2 dương tính, thụ thể nội tiết âm tính."
)


def test_chunk_text_is_verbatim():
    for text, target in [(SAMPLE, 1000), (SAMPLE, 60), (REPORT_VI, 150)]:
        for c in chunk_by_section(text, target):
            assert c.text == text[c.start : c.end]


def test_parts_count_from_one_and_all_share_the_total():
    chunks = chunk_by_section(REPORT_VI, 150)
    assert [c.part for c in chunks] == list(range(1, len(chunks) + 1))
    assert all(c.parts == len(chunks) for c in chunks)


def test_no_text_is_lost():
    for text, target in [(SAMPLE, 60), (REPORT_VI, 150), (REPORT_VI, 1000)]:
        chunks = chunk_by_section(text, target)
        covered = set()
        for c in chunks:
            covered.update(range(c.start, c.end))
        lost = [i for i, ch in enumerate(text) if not ch.isspace() and i not in covered]
        assert lost == []


def test_chunks_are_in_order_and_do_not_overlap():
    chunks = chunk_by_section(REPORT_VI, 150)
    for a, b in pairwise(chunks):
        assert a.end <= b.start


def test_no_chunk_is_longer_than_one_and_a_half_targets():
    long_text = "MÔ TẢ:\n" + ("Khối u vú trái kích thước 3,4 cm, bờ không đều. " * 60)
    for c in chunk_by_section(long_text, 200):
        assert len(c.text) <= 300


def test_chunks_carry_no_whitespace_at_either_end():
    for c in chunk_by_section(REPORT_VI, 150):
        assert c.text == c.text.strip()


def test_small_sections_merge_and_a_new_section_starts_a_chunk():
    # target 150: SPECIMEN (36) + DIAGNOSIS (48) merge; BIOMARKERS would overflow, so it starts a new chunk
    chunks = chunk_by_section(SAMPLE, 150)
    assert [c.section for c in chunks] == ["SPECIMEN", "BIOMARKERS"]
    assert chunks[1].text.startswith("BIOMARKERS:")


def test_a_short_document_is_one_chunk():
    chunks = chunk_by_section(SAMPLE, 1000)
    assert len(chunks) == 1
    assert (chunks[0].part, chunks[0].parts) == (1, 1)
    assert chunks[0].text == SAMPLE


def test_section_is_the_heading_where_the_chunk_starts():
    chunks = chunk_by_section(REPORT_VI, 150)
    by_section = {c.section: c for c in chunks}
    assert by_section["CHẨN ĐOÁN"].text.startswith("CHẨN ĐOÁN:")
    assert by_section["HÓA MÔ MIỄN DỊCH"].text.startswith("HÓA MÔ MIỄN DỊCH:")


def test_text_before_the_first_heading_has_no_section():
    chunks = chunk_by_section(REPORT_VI, 150)
    assert chunks[0].text.startswith("PHIẾU KẾT QUẢ GIẢI PHẪU BỆNH")
    assert chunks[0].section is None


def test_a_document_without_headings_has_no_section():
    chunks = chunk_by_section("Bệnh nhân ổn định, tiếp tục theo dõi.", 1000)
    assert [c.section for c in chunks] == [None]


def test_empty_or_blank_text_gives_no_chunks():
    assert chunk_by_section("", 1000) == []
    assert chunk_by_section("  \n\n\t ", 1000) == []


# --- _last_space -------------------------------------------------------------

#            0123456789012345678
LAST_SPACE = "HER2 dương tính 3+"  # spaces at 4 and 10


def test_last_space_returns_the_last_space_in_the_range():
    assert _last_space(LAST_SPACE, 0, len(LAST_SPACE)) == 15


def test_last_space_returns_the_position_of_the_space_itself_not_after_it():
    assert LAST_SPACE[_last_space(LAST_SPACE, 0, 8)] == " "
    assert _last_space(LAST_SPACE, 0, 8) == 4


def test_last_space_finds_a_newline_too():
    text = "CHẨN ĐOÁN:\nUng"
    assert _last_space(text, 0, len(text)) == text.index("\n")


def test_last_space_is_none_when_the_range_has_no_whitespace():
    assert _last_space(LAST_SPACE, 5, 10) is None  # "dương"
    assert _last_space("x" * 50, 0, 50) is None


def test_last_space_does_not_look_at_position_hi():
    # The space at 4 is the end of the range [0, 4): it is outside.
    assert _last_space(LAST_SPACE, 0, 4) is None


def test_last_space_counts_position_lo():
    assert _last_space(LAST_SPACE, 4, 8) == 4


def test_last_space_does_not_look_before_lo():
    assert _last_space(LAST_SPACE, 5, 9) is None


def test_last_space_of_an_empty_range_is_none():
    assert _last_space(LAST_SPACE, 7, 7) is None


def test_last_space_returns_an_absolute_position():
    # Searching from the middle still counts from the start of the text, not from lo.
    assert _last_space(LAST_SPACE, 6, 18) == 15


# --- chunk_fixed -------------------------------------------------------------

LONG_VI = (
    "Bệnh nhân nữ 52 tuổi, phát hiện khối u vú trái kích thước 3,4 cm qua siêu âm. "
    "Sinh thiết lõi kim cho kết quả ung thư biểu mô thể ống xâm nhập, độ mô học 3. "
    "Hóa mô miễn dịch: ER âm tính, PR âm tính, HER2 dương tính 3+, Ki-67 45%.\n"
    "CT ngực bụng chưa ghi nhận di căn xa. Hội chẩn đề nghị hóa trị tân bổ trợ. "
) * 8


def splits_a_word(text: str, position: int) -> bool:
    """True if position falls between two letters or digits of the same word."""
    return 0 < position < len(text) and text[position - 1].isalnum() and text[position].isalnum()


def test_fixed_chunk_text_is_verbatim():
    for c in chunk_fixed(LONG_VI, size=200, overlap=50):
        assert c.text == LONG_VI[c.start : c.end]


def test_fixed_chunks_are_never_longer_than_size():
    assert all(len(c.text) <= 200 for c in chunk_fixed(LONG_VI, size=200, overlap=50))


def test_consecutive_fixed_chunks_overlap():
    chunks = chunk_fixed(LONG_VI, size=200, overlap=50)
    assert len(chunks) > 2
    for a, b in pairwise(chunks):
        assert b.start < a.end  # the next chunk starts inside the previous one
        assert b.start > a.start  # but always moves forward


def test_the_overlap_is_at_most_overlap_characters():
    for a, b in pairwise(chunk_fixed(LONG_VI, size=200, overlap=50)):
        assert a.end - b.start <= 50


def test_fixed_chunk_boundaries_never_split_a_word():
    for c in chunk_fixed(LONG_VI, size=200, overlap=50):
        assert not splits_a_word(LONG_VI, c.start), LONG_VI[c.start - 5 : c.start + 5]
        assert not splits_a_word(LONG_VI, c.end), LONG_VI[c.end - 5 : c.end + 5]


def test_fixed_chunks_cover_the_whole_text():
    chunks = chunk_fixed(LONG_VI, size=200, overlap=50)
    assert chunks[0].start == 0
    assert chunks[-1].end == len(LONG_VI.rstrip())
    covered = set()
    for c in chunks:
        covered.update(range(c.start, c.end))
    assert [i for i, ch in enumerate(LONG_VI) if not ch.isspace() and i not in covered] == []


def test_fixed_chunks_carry_no_whitespace_at_either_end():
    for c in chunk_fixed(LONG_VI, size=200, overlap=50):
        assert c.text == c.text.strip()


def test_fixed_chunks_have_no_section_and_are_numbered_from_one():
    chunks = chunk_fixed(LONG_VI, size=200, overlap=50)
    assert {c.section for c in chunks} == {None}
    assert [c.part for c in chunks] == list(range(1, len(chunks) + 1))
    assert all(c.parts == len(chunks) for c in chunks)


def test_a_text_shorter_than_size_is_one_fixed_chunk():
    chunks = chunk_fixed("HER2 dương tính (3+).", size=800, overlap=150)
    assert [(c.start, c.end, c.part, c.parts) for c in chunks] == [(0, 21, 1, 1)]


def test_a_word_longer_than_size_is_cut_hard_and_still_terminates():
    # No whitespace at all: _last_space finds nothing, so the chunk is cut at size.
    text = "x" * 500
    chunks = chunk_fixed(text, size=100, overlap=20)
    assert all(len(c.text) <= 100 for c in chunks)
    assert chunks[-1].end == 500
    # No gap between chunks: an off-by-one in the "move to the next word" loop drops one character per cut.
    covered = {i for c in chunks for i in range(c.start, c.end)}
    assert covered == set(range(500))


def test_a_long_unbroken_token_in_normal_text_loses_nothing():
    # A URL or gene sequence longer than the overlap must not swallow the text after it.
    text = "Xem kết quả tại " + "B" * 300 + " cuối báo cáo."
    chunks = chunk_fixed(text, size=100, overlap=20)
    covered = {i for c in chunks for i in range(c.start, c.end)}
    assert [i for i, ch in enumerate(text) if not ch.isspace() and i not in covered] == []


def test_an_overlap_as_large_as_size_still_terminates():
    chunks = chunk_fixed("một hai ba bốn năm sáu bảy tám chín mười", size=10, overlap=10)
    assert chunks[-1].end == len("một hai ba bốn năm sáu bảy tám chín mười")


def test_empty_or_blank_text_gives_no_fixed_chunks():
    assert chunk_fixed("") == []
    assert chunk_fixed("   \n\n  ") == []


# --- chunk_text --------------------------------------------------------------


def test_chunk_text_dispatches_on_the_strategy():
    assert chunk_text(LONG_VI, "section") == chunk_by_section(LONG_VI)
    assert chunk_text(LONG_VI, "fixed") == chunk_fixed(LONG_VI)


def test_chunk_text_passes_target_chars_to_the_section_strategy():
    assert chunk_text(LONG_VI, "section", 300) == chunk_by_section(LONG_VI, 300)


def test_chunk_text_of_empty_text_is_empty():
    assert chunk_text("", "section") == []
    assert chunk_text("", "fixed") == []


def test_chunk_text_rejects_an_unknown_strategy():
    with pytest.raises(ValueError):
        chunk_text(LONG_VI, "Section")  # type: ignore[arg-type]


# --- heading_of (from the handout's list) ----------------------------------------


def test_an_uppercase_label_before_a_colon_is_a_heading():
    assert heading_of("CHẨN ĐOÁN: Ung thư biểu mô tuyến") == "CHẨN ĐOÁN"
    assert heading_of("DIAGNOSIS: Invasive ductal carcinoma") == "DIAGNOSIS"


def test_a_line_with_lowercase_before_the_colon_is_not_a_heading():
    assert heading_of("ER positive (90%): yes") is None
