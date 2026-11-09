import { day } from "../../helpers";
import { ngay, SYNTHETIC_HEADER_VI, type VietnameseCaseSpec } from "../builder";

/**
 * Stage IV lung adenocarcinoma with an EGFR exon 19 deletion and small
 * asymptomatic brain metastases: first-line osimertinib was approved by every
 * reviewer, and the patient is four weeks into treatment.
 */
export const tranThiBichHanh: VietnameseCaseSpec = {
  patient: { mrn: "SYN-VN-210512", firstName: "Thị Bích Hạnh", lastName: "Trần", age: 62, birthdayMonthsAgo: 8, sex: "FEMALE", primaryDiagnosis: "Ung thư biểu mô tuyến phổi giai đoạn IV, đột biến EGFR exon 19", status: "IN_TREATMENT" },
  room: { title: "Ung thư phổi EGFR exon 19 di căn não: điều trị bước một", specialty: "ONCOLOGY", status: "OPEN", createdBy: "khoa", created: [35, "09:00"] },
  members: [["mai", 35, "09:01"], ["huong", 35, "09:01"], ["bao", 35, "09:02"], ["lan", 35, "09:02"], ["yen", 35, "09:03"]],
  documents: [
    {
      key: "ctnguc", type: "IMAGING_REPORT", title: "CT ngực có tiêm thuốc cản quang", days: 34, time: "10:30", uploadedBy: "mai",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KẾT QUẢ CHỤP CẮT LỚP VI TÍNH
Kỹ thuật: CT ngực có tiêm thuốc cản quang
Ngày chụp: ${ngay(day(34))}
Bệnh nhân: Trần Thị Bích Hạnh | Mã hồ sơ: SYN-VN-210512

LÝ DO CHỤP: Ho khan kéo dài 2 tháng, không hút thuốc lá.

MÔ TẢ:
Thùy trên phổi phải có khối kích thước 3,8 x 3,1 cm, bờ tua gai, ngấm thuốc không đều. Hạch trung thất nhóm 4R kích thước 1,6 cm. Không tràn dịch màng phổi. Phổi trái không thấy nốt bất thường.

KẾT LUẬN:
1. Khối thùy trên phổi phải 3,8 cm, nghĩ nhiều đến ung thư phổi.
2. Hạch trung thất nhóm 4R 1,6 cm.

ĐỀ NGHỊ: Sinh thiết xuyên thành ngực dưới hướng dẫn CT; đánh giá giai đoạn toàn thân.`,
    },
    {
      key: "gpb", type: "PATHOLOGY_REPORT", title: "Giải phẫu bệnh sinh thiết phổi và xét nghiệm sinh học phân tử", days: 28, time: "16:20", uploadedBy: "huong",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KẾT QUẢ GIẢI PHẪU BỆNH
Mã tiêu bản: SYN-GPB-26-1184
Bệnh phẩm: Sinh thiết lõi kim xuyên thành ngực, khối thùy trên phổi phải
Ngày trả kết quả: ${ngay(day(28))}
Bác sĩ đọc: BS. Vũ Thanh Hương

CHẨN ĐOÁN: Ung thư biểu mô tuyến của phổi, cấu trúc nhú và tuyến.

HÓA MÔ MIỄN DỊCH: TTF-1 dương tính, Napsin A dương tính, p40 âm tính.

SINH HỌC PHÂN TỬ:
EGFR (realtime PCR): đột biến mất đoạn exon 19. Không phát hiện đột biến T790M.
ALK (hóa mô miễn dịch, D5F3): âm tính.
ROS1: âm tính.
PD-L1 (22C3): TPS 10%.

NHẬN XÉT: Ung thư biểu mô tuyến phổi có đột biến EGFR nhạy cảm với thuốc ức chế tyrosine kinase.`,
    },
    {
      key: "mri", type: "IMAGING_REPORT", title: "MRI sọ não có tiêm thuốc đối quang từ", days: 25, time: "15:10", uploadedBy: "mai",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KẾT QUẢ CHỤP CỘNG HƯỞNG TỪ
Kỹ thuật: MRI sọ não có tiêm thuốc đối quang từ
Ngày chụp: ${ngay(day(25))}
Bệnh nhân: Trần Thị Bích Hạnh | Mã hồ sơ: SYN-VN-210512

MÔ TẢ:
Thùy trán phải có một tổn thương ngấm thuốc dạng viền kích thước 9 mm, phù nhẹ xung quanh. Bán cầu tiểu não trái có một tổn thương ngấm thuốc 6 mm. Không có hiệu ứng khối, đường giữa không di lệch. Hệ thống não thất không giãn.

KẾT LUẬN: Hai tổn thương di căn não kích thước nhỏ (9 mm và 6 mm), không có hiệu ứng khối.`,
    },
    {
      key: "petct", type: "IMAGING_REPORT", title: "PET/CT toàn thân", days: 24, time: "11:45", uploadedBy: "mai",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KẾT QUẢ PET/CT
Ngày chụp: ${ngay(day(24))}
Bệnh nhân: Trần Thị Bích Hạnh | Mã hồ sơ: SYN-VN-210512

MÔ TẢ:
Khối thùy trên phổi phải tăng chuyển hóa, SUVmax 11,2. Hạch trung thất nhóm 4R tăng chuyển hóa, SUVmax 6,4. Thân đốt sống ngực T8 có tổn thương hủy xương tăng chuyển hóa, SUVmax 5,1. Không thấy tổn thương tăng chuyển hóa ở gan và tuyến thượng thận.

KẾT LUẬN: Khối u phổi phải và hạch trung thất 4R tăng chuyển hóa; di căn xương đốt sống T8. Kết hợp MRI sọ não: giai đoạn IV.`,
    },
    {
      key: "kham", type: "CLINICAL_NOTE", title: "Phiếu khám Nội ung bướu", days: 21, time: "17:00", uploadedBy: "khoa",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KHÁM CHUYÊN KHOA NỘI UNG BƯỚU
Ngày khám: ${ngay(day(21))}
Bác sĩ: BS. Trần Minh Khoa, Nội khoa ung bướu
Bệnh nhân: Trần Thị Bích Hạnh | Mã hồ sơ: SYN-VN-210512

BỆNH SỬ:
Nữ 62 tuổi, không hút thuốc lá, ho khan 2 tháng. Đau lưng nhẹ vùng ngực khoảng 3 tuần, giảm khi dùng paracetamol. Không đau đầu, không yếu liệt, không co giật.

KHÁM: ECOG 1. Thần kinh khu trú âm tính. Ấn đau nhẹ cột sống ngực đoạn giữa.

ĐÁNH GIÁ:
- Ung thư biểu mô tuyến phổi phải, đột biến EGFR exon 19, giai đoạn IV (di căn não và xương).
- Di căn não nhỏ, không triệu chứng.
- Di căn xương đốt sống T8, đau mức độ nhẹ.

KẾ HOẠCH ĐỀ XUẤT:
- Osimertinib 80 mg/ngày, bước một.
- Theo dõi di căn não bằng MRI sau 6-8 tuần; cân nhắc xạ phẫu nếu tổn thương không đáp ứng.
- Acid zoledronic 4 mg mỗi 4 tuần sau khi khám răng miệng.
- Trình hội chẩn đa chuyên khoa trước khi bắt đầu điều trị.`,
    },
    {
      key: "xn", type: "LAB_RESULT", title: "Xét nghiệm và điện tâm đồ trước điều trị", days: 20, time: "10:20", uploadedBy: "lan",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KẾT QUẢ XÉT NGHIỆM
Ngày lấy mẫu: ${ngay(day(20))}
Bệnh nhân: Trần Thị Bích Hạnh | Mã hồ sơ: SYN-VN-210512

Hemoglobin: 124 g/L (120-150)
Bạch cầu: 7,1 G/L (4-10)
Tiểu cầu: 265 G/L (150-400)
Creatinin: 68 µmol/L (44-80)
AST: 24 U/L (< 32)
ALT: 21 U/L (< 33)
Calci toàn phần: 2,41 mmol/L (2,15-2,55)

ĐIỆN TÂM ĐỒ: Nhịp xoang 78 lần/phút, QTc 428 ms.

NHẬN XÉT: Chức năng gan, thận trong giới hạn bình thường. QTc bình thường.`,
    },
    {
      key: "taikham", type: "CLINICAL_NOTE", title: "Tái khám sau 4 tuần osimertinib", days: 2, time: "16:30", uploadedBy: "khoa",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU TÁI KHÁM NỘI UNG BƯỚU
Ngày khám: ${ngay(day(2))}
Bác sĩ: BS. Trần Minh Khoa, Nội khoa ung bướu
Bệnh nhân: Trần Thị Bích Hạnh | Mã hồ sơ: SYN-VN-210512

DIỄN TIẾN: Đã dùng osimertinib 80 mg/ngày được 4 tuần. Ho giảm rõ. Đau lưng giảm, không cần thuốc giảm đau thường xuyên. Không đau đầu.

TÁC DỤNG PHỤ: Ban dạng trứng cá độ 1 ở mặt và ngực. Tiêu chảy độ 1, 2-3 lần/ngày. Không khó thở.

KẾ HOẠCH:
- Tiếp tục osimertinib 80 mg/ngày.
- Kem dưỡng ẩm, chống nắng; loperamid khi cần.
- Điện tâm đồ kiểm tra QTc.
- MRI sọ não và CT ngực đánh giá đáp ứng sau 8 tuần điều trị.`,
    },
  ],
  timeline: [
    { doc: "ctnguc", type: "IMAGING", title: "CT ngực phát hiện khối phổi phải", description: "Khối thùy trên phổi phải 3,8 cm, bờ tua gai; hạch trung thất 4R 1,6 cm." },
    { doc: "gpb", type: "PATHOLOGY", title: "Ung thư biểu mô tuyến, EGFR exon 19", description: "TTF-1 dương tính; đột biến mất đoạn EGFR exon 19, không có T790M; ALK, ROS1 âm tính; PD-L1 TPS 10%." },
    { doc: "mri", type: "IMAGING", title: "MRI: hai di căn não nhỏ", description: "Tổn thương thùy trán phải 9 mm và tiểu não trái 6 mm, không hiệu ứng khối." },
    { doc: "petct", type: "IMAGING", title: "PET/CT: di căn xương T8", description: "Khối phổi SUVmax 11,2; hạch 4R SUVmax 6,4; tổn thương hủy xương T8. Giai đoạn IV." },
    { doc: "kham", type: "CONSULTATION", title: "Khám Nội ung bướu", description: "ECOG 1; đề xuất osimertinib bước một, theo dõi di căn não bằng MRI, acid zoledronic." },
    { doc: "xn", type: "LAB", title: "Xét nghiệm trước điều trị bình thường", description: "Công thức máu, chức năng gan thận bình thường; QTc 428 ms." },
    { doc: "taikham", type: "TREATMENT", title: "Tái khám sau 4 tuần osimertinib", description: "Ho và đau lưng giảm; ban dạng trứng cá độ 1, tiêu chảy độ 1. Tiếp tục điều trị." },
  ],
  discussion: [
    { author: "khoa", at: [34, "11:00"], content: "Ca mới: nữ 62 tuổi không hút thuốc, khối thùy trên phổi phải 3,8 cm. @BsHuong em sẽ gửi mẫu sinh thiết, nhờ chị làm EGFR, ALK, ROS1 và PD-L1.", mentions: ["huong"] },
    { author: "huong", at: [28, "16:30"], content: "Đã có kết quả: ung thư biểu mô tuyến, EGFR mất đoạn exon 19, không có T790M. ALK và ROS1 âm tính, PD-L1 TPS 10%." },
    { author: "mai", at: [24, "12:10"], content: "MRI có 2 ổ di căn não nhỏ, PET/CT thêm tổn thương xương T8. Giai đoạn IV." },
    {
      author: "bao", at: [23, "08:40"], askAI: "tóm tắt các tổn thương di căn và kích thước",
      answer: "Hồ sơ ghi nhận:\n- Não: hai tổn thương di căn, thùy trán phải 9 mm và tiểu não trái 6 mm, không có hiệu ứng khối [1].\n- Xương: tổn thương hủy xương thân đốt sống ngực T8 tăng chuyển hóa, SUVmax 5,1 [2].\n- Không thấy tổn thương tăng chuyển hóa ở gan và tuyến thượng thận [2].",
      sources: [
        ["mri", "Hai tổn thương di căn não kích thước nhỏ (9 mm và 6 mm), không có hiệu ứng khối."],
        ["petct", "Không thấy tổn thương tăng chuyển hóa ở gan và tuyến thượng thận."],
      ],
      confidence: "high",
      limitations: "Tóm tắt từ phiếu MRI sọ não và PET/CT; không đánh giá chỉ định xạ trị.",
    },
    { author: "bao", at: [22, "09:15"], content: "Với 2 ổ nhỏ không triệu chứng và osimertinib có tác dụng tốt trên hệ thần kinh trung ương, tôi đồng ý chưa xạ phẫu ngay. Cần MRI lại sau 6-8 tuần." },
    { author: "yen", at: [19, "15:00"], content: "Hồ sơ bảo hiểm cho osimertinib đã được duyệt. Bệnh nhân có thể nhận thuốc từ tuần này." },
    { author: "lan", at: [2, "17:00"], content: "Tái khám tuần 4: ban da độ 1 và tiêu chảy độ 1, đã hướng dẫn chăm sóc da và dùng loperamid khi cần. Em đã đặt lịch điện tâm đồ." },
  ],
  decision: {
    title: "Osimertinib 80 mg/ngày bước một, theo dõi di căn não bằng MRI",
    description:
      "Bắt đầu osimertinib 80 mg/ngày. Chưa xạ phẫu di căn não do tổn thương nhỏ, không triệu chứng; chụp MRI sọ não sau 6-8 tuần và xạ phẫu nếu tổn thương không đáp ứng. Acid zoledronic 4 mg mỗi 4 tuần sau khi khám răng miệng.",
    rationale:
      "Ung thư biểu mô tuyến phổi có đột biến mất đoạn EGFR exon 19, giai đoạn IV (di căn não và xương). Di căn não nhỏ (9 mm và 6 mm), không triệu chứng, không hiệu ứng khối. ECOG 1, chức năng gan thận và QTc bình thường.",
    status: "APPROVED",
    createdBy: "khoa",
    created: [21, "17:20"],
    sources: ["gpb", "mri", "petct", "kham"],
    approvals: [
      { reviewer: "huong", status: "APPROVED", comment: "Kết quả EGFR đủ tin cậy cho chỉ định điều trị đích.", responded: [21, "19:00"] },
      { reviewer: "mai", status: "APPROVED", responded: [20, "08:30"] },
      { reviewer: "bao", status: "APPROVED", comment: "Đồng ý trì hoãn xạ phẫu; MRI sau 6-8 tuần.", responded: [20, "11:15"] },
    ],
    finalized: [20, "11:15"],
  },
  tasks: [
    { title: "Hoàn thiện hồ sơ bảo hiểm cho osimertinib", assignee: "yen", creator: "khoa", status: "DONE", priority: "HIGH", due: 18, created: [20, "11:30"], completed: [19, "15:00"], fromDecision: true },
    { title: "Hướng dẫn chăm sóc da và xử trí tiêu chảy", assignee: "lan", creator: "khoa", status: "DONE", priority: "MEDIUM", due: 18, created: [20, "11:32"], completed: [19, "16:20"], fromDecision: true },
    { title: "Khám răng miệng trước khi dùng acid zoledronic", assignee: "lan", creator: "khoa", status: "IN_PROGRESS", priority: "MEDIUM", due: 1, created: [20, "11:35"], fromDecision: true },
    { title: "Điện tâm đồ kiểm tra QTc", assignee: "lan", creator: "khoa", status: "TODO", priority: "MEDIUM", due: 0, created: [2, "16:40"] },
    { title: "MRI sọ não và CT ngực đánh giá đáp ứng sau 8 tuần", assignee: "yen", creator: "khoa", status: "TODO", priority: "HIGH", due: -28, created: [20, "11:40"], fromDecision: true },
  ],
  summary: {
    status: "APPROVED",
    requestedBy: "khoa",
    at: [2, "17:10"],
    approvedBy: "khoa",
    approvedAt: [2, "17:25"],
    content: (s) => ({
      headline: "Nữ 62 tuổi, ung thư biểu mô tuyến phổi giai đoạn IV, đột biến EGFR exon 19, đang dùng osimertinib bước một.",
      currentStatus: "Sau 4 tuần osimertinib: ho và đau lưng giảm; tác dụng phụ độ 1 (ban dạng trứng cá, tiêu chảy). Chờ MRI sọ não và CT ngực đánh giá đáp ứng.",
      currentDiagnosis: "Ung thư biểu mô tuyến thùy trên phổi phải, EGFR mất đoạn exon 19, không T790M; di căn não (9 mm, 6 mm) và xương đốt sống T8.",
      currentTreatment: "Osimertinib 80 mg/ngày (Quyết định #1, đã được phê duyệt). Acid zoledronic sẽ bắt đầu sau khám răng miệng.",
      keyFindings: [
        { text: "Đột biến mất đoạn EGFR exon 19, không có T790M; ALK và ROS1 âm tính.", sources: [s.ref("gpb", "EGFR (realtime PCR): đột biến mất đoạn exon 19.")] },
        { text: "Hai di căn não nhỏ, không có hiệu ứng khối.", sources: [s.ref("mri", "Hai tổn thương di căn não kích thước nhỏ (9 mm và 6 mm), không có hiệu ứng khối.")] },
        { text: "Di căn xương đốt sống T8 trên PET/CT.", sources: [s.ref("petct", "di căn xương đốt sống T8")] },
        { text: "Dung nạp tốt osimertinib sau 4 tuần, tác dụng phụ độ 1.", sources: [s.ref("taikham", "Ban dạng trứng cá độ 1 ở mặt và ngực. Tiêu chảy độ 1, 2-3 lần/ngày.")] },
      ],
      latestResults: [
        { label: "QTc", value: "428 ms", date: s.date("xn"), flag: "normal", sources: [s.ref("xn", "ĐIỆN TÂM ĐỒ: Nhịp xoang 78 lần/phút, QTc 428 ms.")] },
        { label: "ALT", value: "21 U/L", date: s.date("xn"), flag: "normal", sources: [s.ref("xn")] },
        { label: "Creatinin", value: "68 µmol/L", date: s.date("xn"), flag: "normal", sources: [s.ref("xn")] },
        { label: "PD-L1 (22C3)", value: "TPS 10%", date: s.date("gpb"), flag: "unknown", sources: [s.ref("gpb", "PD-L1 (22C3): TPS 10%.")] },
      ],
      outstandingQuestions: ["Đáp ứng của di căn não trên MRI sau 8 tuần: có cần xạ phẫu không?"],
      missingInformation: [
        { item: "Điện tâm đồ kiểm tra QTc khi đang dùng osimertinib", reason: "Đã chỉ định ở lần tái khám tuần 4.", priority: "medium" },
        { item: "Kết quả khám răng miệng", reason: "Cần trước khi bắt đầu acid zoledronic.", priority: "medium" },
      ],
      limitations: "Tạo từ 7 tài liệu; chưa có hình ảnh đánh giá đáp ứng.",
    }),
  },
  memory: (s) => ({
    patientSummary: "Nữ 62 tuổi, không hút thuốc, ung thư biểu mô tuyến phổi giai đoạn IV với đột biến EGFR exon 19, di căn não và xương; đang dùng osimertinib bước một, dung nạp tốt.",
    activeProblems: ["Ung thư biểu mô tuyến phổi giai đoạn IV, EGFR exon 19", "Di căn não không triệu chứng", "Di căn xương đốt sống T8"],
    diagnoses: [
      { name: "Ung thư biểu mô tuyến phổi", detail: "Thùy trên phổi phải, EGFR mất đoạn exon 19, giai đoạn IV", date: s.date("gpb"), sourceDocumentId: s.id("gpb") },
      { name: "Di căn não", detail: "Thùy trán phải 9 mm, tiểu não trái 6 mm", date: s.date("mri"), sourceDocumentId: s.id("mri") },
      { name: "Di căn xương", detail: "Thân đốt sống ngực T8", date: s.date("petct"), sourceDocumentId: s.id("petct") },
    ],
    medications: [
      { name: "Osimertinib", detail: "80 mg/ngày", date: s.date("taikham"), sourceDocumentId: s.id("taikham") },
      { name: "Loperamid", detail: "Khi cần, cho tiêu chảy", date: s.date("taikham"), sourceDocumentId: s.id("taikham") },
    ],
    importantLabs: [
      { name: "QTc", value: "428 ms", flag: "normal", date: s.date("xn"), sourceDocumentId: s.id("xn") },
      { name: "Creatinin", value: "68 µmol/L", flag: "normal", date: s.date("xn"), sourceDocumentId: s.id("xn") },
    ],
    importantImaging: [
      { study: "CT ngực", finding: "Khối thùy trên phổi phải 3,8 cm; hạch 4R 1,6 cm", date: s.date("ctnguc"), sourceDocumentId: s.id("ctnguc") },
      { study: "MRI sọ não", finding: "Hai di căn não 9 mm và 6 mm, không hiệu ứng khối", date: s.date("mri"), sourceDocumentId: s.id("mri") },
      { study: "PET/CT", finding: "Di căn xương T8; không tổn thương gan, thượng thận", date: s.date("petct"), sourceDocumentId: s.id("petct") },
    ],
    pathology: [
      { finding: "Ung thư biểu mô tuyến; EGFR mất đoạn exon 19, không T790M; ALK, ROS1 âm tính; PD-L1 TPS 10%", date: s.date("gpb"), sourceDocumentId: s.id("gpb") },
    ],
    treatments: [
      { name: "Osimertinib", status: "active", detail: "80 mg/ngày, bước một", date: s.date("taikham"), sourceDocumentId: s.id("taikham") },
      { name: "Acid zoledronic", status: "planned", detail: "4 mg mỗi 4 tuần, sau khám răng miệng", date: s.date("kham"), sourceDocumentId: s.id("kham") },
    ],
    openQuestions: ["Có cần xạ phẫu di căn não sau MRI đánh giá đáp ứng?"],
  }),
};
