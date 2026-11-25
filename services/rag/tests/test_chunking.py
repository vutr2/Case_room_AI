from itertools import pairwise

from app.ingest.chunking import _group, _hard_cut, _paragraphs, _pieces, _trim, chunk_by_section, find_sections


def assert_tiles(spans, start, end):
    """So the fulfillment range [start, end], would stick together and there is no spaces"""
    assert spans[0][0] == start
    assert spans[-1][-1] == end
    for (_, e), (s, _) in zip(spans, spans[1:]):
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
