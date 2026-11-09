import { day } from "../../helpers";
import { ngay, SYNTHETIC_HEADER_VI, type VietnameseCaseSpec } from "../builder";

/**
 * HER2-positive, hormone receptor-negative breast cancer (cT2N1M0): neoadjuvant
 * TCHP is proposed and the breast surgeon has asked for a change (clip the
 * tumor and the node before chemotherapy). No tumor board brief yet, so the
 * demo can generate one in Vietnamese.
 */
export const dinhThiThuTrang: VietnameseCaseSpec = {
  patient: { mrn: "SYN-VN-210688", firstName: "Thị Thu Trang", lastName: "Đinh", age: 45, birthdayMonthsAgo: 2, sex: "FEMALE", primaryDiagnosis: "Ung thư vú trái thể ống xâm nhập, HER2 dương tính (cT2N1M0)", status: "ACTIVE" },
  room: { title: "Ung thư vú trái HER2 dương tính: điều trị tân bổ trợ", specialty: "ONCOLOGY", status: "DECISION_PENDING", createdBy: "khoa", created: [23, "08:15"] },
  members: [["mai", 23, "08:16"], ["huong", 23, "08:16"], ["van", 23, "08:17"], ["bao", 23, "08:17"], ["lan", 23, "08:18"], ["yen", 23, "08:18"]],
  documents: [
    {
      key: "sieuam", type: "IMAGING_REPORT", title: "Nhũ ảnh và siêu âm tuyến vú", days: 22, time: "09:40", uploadedBy: "mai",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KẾT QUẢ CHẨN ĐOÁN HÌNH ẢNH TUYẾN VÚ
Kỹ thuật: Chụp nhũ ảnh hai bên và siêu âm tuyến vú, hạch nách
Ngày thực hiện: ${ngay(day(22))}
Bệnh nhân: Đinh Thị Thu Trang | Mã hồ sơ: SYN-VN-210688

LÝ DO: Tự sờ thấy khối vú trái khoảng 1 tháng.

MÔ TẢ:
Nhũ ảnh: khối đậm độ cao, bờ tua gai ở 1/4 trên ngoài vú trái, kèm vi vôi hóa đa hình. Vú phải không thấy bất thường.
Siêu âm: khối giảm âm bờ không đều ở vị trí 2 giờ vú trái, kích thước 3,2 x 2,6 cm, cách núm vú 5 cm. Hạch nách trái 1,8 cm, vỏ dày 4 mm, mất rốn hạch.

KẾT LUẬN:
1. Khối vú trái 3,2 cm, BI-RADS 5.
2. Hạch nách trái nghi di căn.
3. Vú phải BI-RADS 1.

ĐỀ NGHỊ: Sinh thiết lõi kim khối vú và chọc hút tế bào hạch nách dưới hướng dẫn siêu âm.`,
    },
    {
      key: "gpb", type: "PATHOLOGY_REPORT", title: "Giải phẫu bệnh sinh thiết lõi kim và hóa mô miễn dịch", days: 18, time: "15:30", uploadedBy: "huong",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KẾT QUẢ GIẢI PHẪU BỆNH
Mã tiêu bản: SYN-GPB-26-1302
Bệnh phẩm: A. Sinh thiết lõi kim khối vú trái vị trí 2 giờ. B. Chọc hút tế bào hạch nách trái.
Ngày trả kết quả: ${ngay(day(18))}
Bác sĩ đọc: BS. Vũ Thanh Hương

CHẨN ĐOÁN:
A. Ung thư biểu mô thể ống xâm nhập, độ mô học 3 (Nottingham).
B. Có tế bào ung thư biểu mô di căn, phù hợp nguồn gốc từ vú.

HÓA MÔ MIỄN DỊCH:
ER: âm tính (0%). PR: âm tính (0%). HER2: dương tính (3+). Ki-67: 45%.

NHẬN XÉT: Ung thư vú thể HER2 dương tính, thụ thể nội tiết âm tính.`,
    },
    {
      key: "mri", type: "IMAGING_REPORT", title: "MRI tuyến vú có tiêm thuốc đối quang từ", days: 15, time: "14:20", uploadedBy: "mai",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KẾT QUẢ CHỤP CỘNG HƯỞNG TỪ TUYẾN VÚ
Ngày chụp: ${ngay(day(15))}
Bệnh nhân: Đinh Thị Thu Trang | Mã hồ sơ: SYN-VN-210688

MÔ TẢ:
Vú trái: khối ngấm thuốc bờ không đều ở 1/4 trên ngoài, kích thước 3,4 x 2,8 x 2,9 cm, có ảnh giả kẹp sau sinh thiết. Không thấy tổn thương nghi ngờ khác ở hai vú. Không xâm lấn da và thành ngực.
Hạch: hai hạch nách trái nhóm I, lớn nhất 1,9 cm.

KẾT LUẬN: Khối u vú trái 3,4 cm đã được chẩn đoán, không có tổn thương khác ở hai vú; hai hạch nách trái nhóm I.`,
    },
    {
      key: "giaidoan", type: "IMAGING_REPORT", title: "CT ngực bụng và xạ hình xương", days: 14, time: "16:00", uploadedBy: "mai",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KẾT QUẢ ĐÁNH GIÁ GIAI ĐOẠN
Kỹ thuật: CT ngực - bụng có tiêm thuốc cản quang; xạ hình xương toàn thân
Ngày thực hiện: ${ngay(day(14))}
Bệnh nhân: Đinh Thị Thu Trang | Mã hồ sơ: SYN-VN-210688

KẾT LUẬN: Không thấy di căn phổi, gan. Xạ hình xương không thấy tổn thương nghi di căn.`,
    },
    {
      key: "tim", type: "IMAGING_REPORT", title: "Siêu âm tim", days: 12, time: "10:10", uploadedBy: "lan",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KẾT QUẢ SIÊU ÂM TIM
Ngày thực hiện: ${ngay(day(12))}
Bệnh nhân: Đinh Thị Thu Trang | Mã hồ sơ: SYN-VN-210688
Chỉ định: Đánh giá chức năng tim trước điều trị kháng HER2.

KẾT LUẬN: Phân suất tống máu thất trái (LVEF) 64%. Không rối loạn vận động vùng. Các van tim bình thường.`,
    },
    {
      key: "kham", type: "CLINICAL_NOTE", title: "Phiếu khám Nội ung bướu", days: 10, time: "17:10", uploadedBy: "khoa",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KHÁM CHUYÊN KHOA NỘI UNG BƯỚU
Ngày khám: ${ngay(day(10))}
Bác sĩ: BS. Trần Minh Khoa, Nội khoa ung bướu
Bệnh nhân: Đinh Thị Thu Trang | Mã hồ sơ: SYN-VN-210688

BỆNH SỬ: Nữ 45 tuổi, chưa mãn kinh, tự phát hiện khối vú trái 1 tháng. Không có tiền sử gia đình ung thư vú hay buồng trứng.

KHÁM: ECOG 0. Khối vú trái 1/4 trên ngoài khoảng 3 cm, di động. Hạch nách trái 2 cm, di động.

ĐÁNH GIÁ:
- Ung thư vú trái thể ống xâm nhập, độ 3, ER âm tính, PR âm tính, HER2 dương tính (3+), Ki-67 45%.
- Giai đoạn cT2N1M0 (giai đoạn IIB).
- LVEF 64%.

KẾ HOẠCH ĐỀ XUẤT:
- Hóa trị tân bổ trợ phác đồ TCHP (docetaxel, carboplatin, trastuzumab, pertuzumab) mỗi 3 tuần x 6 chu kỳ.
- Phẫu thuật sau hóa trị; bệnh nhân mong muốn bảo tồn vú nếu có thể.
- Siêu âm tim mỗi 3 tháng khi dùng thuốc kháng HER2.`,
    },
  ],
  timeline: [
    { doc: "sieuam", type: "IMAGING", title: "Khối vú trái BI-RADS 5", description: "Khối 3,2 cm vị trí 2 giờ vú trái; hạch nách trái 1,8 cm nghi di căn." },
    { doc: "gpb", type: "PATHOLOGY", title: "Ung thư thể ống xâm nhập, HER2 dương tính", description: "Độ 3; ER 0%, PR 0%, HER2 3+, Ki-67 45%; hạch nách có tế bào ung thư di căn." },
    { doc: "mri", type: "IMAGING", title: "MRI vú: khối 3,4 cm, không tổn thương khác", description: "Hai hạch nách trái nhóm I, lớn nhất 1,9 cm; không xâm lấn da, thành ngực." },
    { doc: "giaidoan", type: "IMAGING", title: "Không di căn xa", description: "CT ngực bụng và xạ hình xương không thấy di căn." },
    { doc: "tim", type: "IMAGING", title: "Siêu âm tim: LVEF 64%", description: "Chức năng tâm thu thất trái bình thường trước điều trị kháng HER2." },
    { doc: "kham", type: "CONSULTATION", title: "Khám Nội ung bướu", description: "cT2N1M0 (IIB). Đề xuất hóa trị tân bổ trợ TCHP 6 chu kỳ, sau đó phẫu thuật." },
  ],
  discussion: [
    { author: "khoa", at: [22, "11:00"], content: "Ca mới: nữ 45 tuổi, khối vú trái 3,2 cm BI-RADS 5 kèm hạch nách. @BsHuong nhờ chị ưu tiên đọc sinh thiết và hóa mô miễn dịch.", mentions: ["huong"] },
    { author: "huong", at: [18, "15:45"], content: "Kết quả: thể ống xâm nhập độ 3, ER và PR âm tính, HER2 3+, Ki-67 45%. Hạch nách dương tính." },
    {
      author: "van", at: [15, "15:00"], askAI: "so sánh kích thước khối u trên siêu âm và MRI",
      answer: "Siêu âm đo khối vú trái 3,2 x 2,6 cm ở vị trí 2 giờ [1]. MRI đo khối 3,4 x 2,8 x 2,9 cm, không có tổn thương nghi ngờ khác ở hai vú [2]. Hạch nách trái: siêu âm thấy một hạch 1,8 cm [1]; MRI thấy hai hạch nhóm I, lớn nhất 1,9 cm [2].",
      sources: [
        ["sieuam", "khối giảm âm bờ không đều ở vị trí 2 giờ vú trái, kích thước 3,2 x 2,6 cm"],
        ["mri", "Không thấy tổn thương nghi ngờ khác ở hai vú."],
      ],
      confidence: "high",
      limitations: "So sánh số đo được ghi trong hai phiếu kết quả; chênh lệch nhỏ có thể do khác kỹ thuật.",
    },
    { author: "lan", at: [12, "10:30"], content: "Siêu âm tim LVEF 64%, đã tải kết quả lên." },
    { author: "khoa", at: [9, "16:10"], content: "Em đã đề xuất Quyết định #1 (TCHP 6 chu kỳ). @BsVan @BsBao nhờ anh chị duyệt.", mentions: ["van", "bao"] },
    { author: "van", at: [7, "10:40"], content: "Bệnh nhân muốn bảo tồn vú. Cần kẹp clip đánh dấu khối u và hạch nách trước hóa trị, nếu không sau khi u đáp ứng sẽ khó xác định vị trí để mổ." },
    { author: "yen", at: [6, "09:20"], content: "Em đã đặt lịch kẹp clip dưới siêu âm và lịch đặt buồng tiêm truyền." },
  ],
  decision: {
    title: "Hóa trị tân bổ trợ TCHP 6 chu kỳ, sau đó phẫu thuật",
    description:
      "Docetaxel, carboplatin, trastuzumab, pertuzumab mỗi 3 tuần x 6 chu kỳ. Đánh giá đáp ứng bằng siêu âm sau chu kỳ 3 và MRI sau chu kỳ 6, sau đó phẫu thuật (bảo tồn vú nếu được). Siêu âm tim mỗi 3 tháng.",
    rationale:
      "Ung thư vú thể ống xâm nhập độ 3, ER và PR âm tính, HER2 3+, Ki-67 45%; cT2N1M0, không di căn xa. LVEF 64%. Bệnh nhân mong muốn bảo tồn vú.",
    status: "UNDER_REVIEW",
    createdBy: "khoa",
    created: [9, "16:00"],
    sources: ["gpb", "mri", "giaidoan", "tim", "kham"],
    approvals: [
      { reviewer: "huong", status: "APPROVED", responded: [8, "09:30"] },
      { reviewer: "van", status: "NEEDS_CHANGES", comment: "Bổ sung kẹp clip đánh dấu khối u và hạch nách trước chu kỳ 1.", responded: [7, "10:30"] },
      { reviewer: "bao", status: "PENDING" },
    ],
  },
  tasks: [
    { title: "Kẹp clip đánh dấu khối u và hạch nách dưới siêu âm", description: "Theo yêu cầu của Ngoại vú, trước chu kỳ 1.", assignee: "mai", creator: "van", status: "TODO", priority: "HIGH", due: -2, created: [7, "10:45"] },
    { title: "Đặt buồng tiêm truyền dưới da", assignee: "yen", creator: "khoa", status: "IN_PROGRESS", priority: "MEDIUM", due: -3, created: [9, "16:20"] },
    { title: "Tư vấn bệnh nhân về hóa trị và chăm sóc khi rụng tóc", assignee: "lan", creator: "khoa", status: "DONE", priority: "MEDIUM", due: 5, created: [9, "16:25"], completed: [6, "14:00"] },
    { title: "Siêu âm tim theo dõi sau 3 tháng điều trị kháng HER2", assignee: "lan", creator: "khoa", status: "TODO", priority: "LOW", due: -85, created: [9, "16:30"] },
  ],
  summary: {
    status: "DRAFT",
    requestedBy: "khoa",
    at: [6, "18:00"],
    content: (s) => ({
      headline: "Nữ 45 tuổi, ung thư vú trái thể ống xâm nhập HER2 dương tính, thụ thể nội tiết âm tính, cT2N1M0.",
      currentStatus: "Chưa điều trị. Đề xuất hóa trị tân bổ trợ TCHP đang chờ duyệt; Ngoại vú yêu cầu kẹp clip đánh dấu trước chu kỳ 1.",
      currentDiagnosis: "Ung thư biểu mô thể ống xâm nhập độ 3, ER 0%, PR 0%, HER2 3+, Ki-67 45%; khối 3,4 cm trên MRI, hạch nách trái di căn; không di căn xa.",
      currentTreatment: "Chưa bắt đầu. Quyết định #1 (TCHP 6 chu kỳ rồi phẫu thuật) đang được xem xét.",
      keyFindings: [
        { text: "HER2 dương tính (3+), ER và PR âm tính, Ki-67 45%.", sources: [s.ref("gpb", "ER: âm tính (0%). PR: âm tính (0%). HER2: dương tính (3+). Ki-67: 45%.")] },
        { text: "Hạch nách trái có tế bào ung thư di căn.", sources: [s.ref("gpb", "Có tế bào ung thư biểu mô di căn, phù hợp nguồn gốc từ vú.")] },
        { text: "MRI: khối 3,4 cm, không tổn thương khác ở hai vú.", sources: [s.ref("mri", "Khối u vú trái 3,4 cm đã được chẩn đoán, không có tổn thương khác ở hai vú; hai hạch nách trái nhóm I.")] },
        { text: "Không di căn xa trên CT ngực bụng và xạ hình xương.", sources: [s.ref("giaidoan", "Không thấy di căn phổi, gan.")] },
      ],
      latestResults: [
        { label: "LVEF", value: "64%", date: s.date("tim"), flag: "normal", sources: [s.ref("tim", "Phân suất tống máu thất trái (LVEF) 64%.")] },
        { label: "Ki-67", value: "45%", date: s.date("gpb"), flag: "abnormal", sources: [s.ref("gpb")] },
      ],
      outstandingQuestions: ["Phẫu thuật bảo tồn vú sau hóa trị tân bổ trợ có khả thi không?", "Xạ trị sau mổ: chỉ định theo đáp ứng hạch nách?"],
      missingInformation: [
        { item: "Kẹp clip đánh dấu khối u và hạch nách", reason: "Ngoại vú yêu cầu trước chu kỳ 1.", priority: "high" },
        { item: "Ý kiến Xạ trị về Quyết định #1", reason: "Người duyệt chưa phản hồi.", priority: "medium" },
      ],
      limitations: "Tạo từ 6 tài liệu. Chưa có kết quả xét nghiệm máu trước hóa trị trong hồ sơ.",
    }),
  },
  memory: (s) => ({
    patientSummary: "Nữ 45 tuổi, chưa mãn kinh, ung thư vú trái HER2 dương tính, thụ thể nội tiết âm tính, cT2N1M0; dự kiến hóa trị tân bổ trợ TCHP rồi phẫu thuật, mong muốn bảo tồn vú.",
    activeProblems: ["Ung thư vú trái HER2 dương tính, cT2N1M0", "Di căn hạch nách trái"],
    diagnoses: [
      { name: "Ung thư biểu mô thể ống xâm nhập vú trái", detail: "Độ 3; ER 0%, PR 0%, HER2 3+, Ki-67 45%", date: s.date("gpb"), sourceDocumentId: s.id("gpb") },
      { name: "Di căn hạch nách trái", detail: "Chọc hút tế bào dương tính", date: s.date("gpb"), sourceDocumentId: s.id("gpb") },
    ],
    medications: [],
    importantLabs: [{ name: "LVEF", value: "64%", flag: "normal", date: s.date("tim"), sourceDocumentId: s.id("tim") }],
    importantImaging: [
      { study: "Nhũ ảnh và siêu âm", finding: "Khối 3,2 cm BI-RADS 5; hạch nách trái 1,8 cm", date: s.date("sieuam"), sourceDocumentId: s.id("sieuam") },
      { study: "MRI tuyến vú", finding: "Khối 3,4 cm; hai hạch nách nhóm I, lớn nhất 1,9 cm", date: s.date("mri"), sourceDocumentId: s.id("mri") },
      { study: "CT ngực bụng, xạ hình xương", finding: "Không di căn xa", date: s.date("giaidoan"), sourceDocumentId: s.id("giaidoan") },
    ],
    pathology: [{ finding: "Thể ống xâm nhập độ 3, HER2 3+, thụ thể nội tiết âm tính; hạch nách di căn", date: s.date("gpb"), sourceDocumentId: s.id("gpb") }],
    treatments: [{ name: "Hóa trị tân bổ trợ TCHP", status: "planned", detail: "6 chu kỳ mỗi 3 tuần, sau đó phẫu thuật", date: s.date("kham"), sourceDocumentId: s.id("kham") }],
    openQuestions: ["Khả năng bảo tồn vú sau hóa trị tân bổ trợ"],
  }),
};
