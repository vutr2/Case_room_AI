import { day } from "../../helpers";
import { ngay, SYNTHETIC_HEADER_VI, type VietnameseCaseSpec } from "../builder";

/**
 * Flagship Vietnamese case: hepatocellular carcinoma on chronic hepatitis B,
 * BCLC A, with signs of portal hypertension. The tumor board must choose
 * between resection and locoregional treatment; a reviewer has not answered yet
 * and the tumor board brief is a draft waiting for a physician.
 */
export const nguyenVanThanh: VietnameseCaseSpec = {
  patient: { mrn: "SYN-VN-210345", firstName: "Văn Thành", lastName: "Nguyễn", age: 58, birthdayMonthsAgo: 5, sex: "MALE", primaryDiagnosis: "Ung thư biểu mô tế bào gan trên nền viêm gan B mạn", status: "ACTIVE" },
  room: { title: "HCC hạ phân thùy VIII trên nền viêm gan B: hội chẩn điều trị", specialty: "ONCOLOGY", status: "REVIEWING", createdBy: "khoa", created: [16, "08:30"] },
  members: [["tam", 16, "08:31"], ["mai", 16, "08:31"], ["long", 16, "08:32"], ["huong", 16, "08:32"], ["bao", 16, "08:32"], ["lan", 16, "08:33"], ["yen", 16, "08:33"]],
  documents: [
    {
      key: "ct", type: "IMAGING_REPORT", title: "CT bụng có tiêm thuốc cản quang 3 thì", days: 15, time: "10:40", uploadedBy: "mai",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KẾT QUẢ CHỤP CẮT LỚP VI TÍNH
Kỹ thuật: CT bụng có tiêm thuốc cản quang, 3 thì (động mạch, tĩnh mạch cửa, muộn)
Ngày chụp: ${ngay(day(15))}
Bệnh nhân: Nguyễn Văn Thành | Mã hồ sơ: SYN-VN-210345

LÝ DO CHỤP: Siêu âm tầm soát phát hiện khối gan phải trên bệnh nhân viêm gan B mạn.

MÔ TẢ:
Gan: bờ đều, nhu mô thô nhẹ. Hạ phân thùy VIII có một khối kích thước 5,2 x 4,6 cm, ngấm thuốc mạnh thì động mạch và thải thuốc thì tĩnh mạch cửa, có vỏ bao giả. Khối cách tĩnh mạch gan phải khoảng 1 cm. Không thấy tổn thương khu trú khác.
Mạch máu: tĩnh mạch cửa và các nhánh thông, không có huyết khối. Các tĩnh mạch gan thông.
Lách kích thước 11 cm. Không có dịch ổ bụng. Không thấy hạch ổ bụng.

KẾT LUẬN:
1. Khối hạ phân thùy VIII kích thước 5,2 cm, đặc điểm điển hình ung thư biểu mô tế bào gan (LI-RADS 5).
2. Không có huyết khối tĩnh mạch cửa, không thấy di căn ngoài gan trên CT bụng.
3. Gan thô nhẹ, lách không to.

ĐỀ NGHỊ: Đối chiếu AFP; CT ngực để hoàn thiện đánh giá giai đoạn.`,
    },
    {
      key: "xn", type: "LAB_RESULT", title: "Xét nghiệm máu: chức năng gan, AFP, virus viêm gan B", days: 14, time: "15:20", uploadedBy: "lan",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KẾT QUẢ XÉT NGHIỆM
Ngày lấy mẫu: ${ngay(day(14))}
Bệnh nhân: Nguyễn Văn Thành | Mã hồ sơ: SYN-VN-210345

HUYẾT HỌC
Hemoglobin: 138 g/L (130-170)
Bạch cầu: 6,2 G/L (4-10)
Tiểu cầu: 128 G/L (150-400) - THẤP

ĐÔNG MÁU
INR: 1,1 (0,8-1,2)

SINH HÓA
Albumin: 37 g/L (35-52)
Bilirubin toàn phần: 15 µmol/L (< 21)
AST: 58 U/L (< 40) - CAO
ALT: 62 U/L (< 41) - CAO
Creatinin: 82 µmol/L (62-106)

DẤU ẤN UNG THƯ
AFP: 856 ng/mL (< 7) - CAO

VIRUS VIÊM GAN
HBsAg: dương tính
HBeAg: âm tính
HBV DNA: 2,3 x 10^4 IU/mL
Anti-HCV: âm tính

NHẬN XÉT: AFP tăng cao. Tiểu cầu giảm nhẹ. Chức năng gan còn bù (Child-Pugh A5).`,
    },
    {
      key: "noisoi", type: "CLINICAL_NOTE", title: "Nội soi thực quản - dạ dày - tá tràng", days: 12, time: "10:15", uploadedBy: "tam",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KẾT QUẢ NỘI SOI THỰC QUẢN - DẠ DÀY - TÁ TRÀNG
Ngày thực hiện: ${ngay(day(12))}
Bác sĩ thực hiện: BS. Đỗ Văn Tâm, Tiêu hóa - Gan mật
Bệnh nhân: Nguyễn Văn Thành | Mã hồ sơ: SYN-VN-210345

CHỈ ĐỊNH: Đánh giá tăng áp lực tĩnh mạch cửa trước điều trị khối u gan.

MÔ TẢ:
Thực quản: giãn tĩnh mạch thực quản độ I ở 1/3 dưới, không có dấu son đỏ.
Dạ dày: viêm sung huyết nhẹ vùng hang vị, không thấy giãn tĩnh mạch phình vị.
Tá tràng: bình thường.

KẾT LUẬN: Giãn tĩnh mạch thực quản độ I, không có dấu hiệu nguy cơ chảy máu cao.`,
    },
    {
      key: "kham", type: "CLINICAL_NOTE", title: "Phiếu khám Nội ung bướu", days: 10, time: "16:40", uploadedBy: "khoa",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KHÁM CHUYÊN KHOA NỘI UNG BƯỚU
Ngày khám: ${ngay(day(10))}
Bác sĩ: BS. Trần Minh Khoa, Nội khoa ung bướu
Bệnh nhân: Nguyễn Văn Thành | Mã hồ sơ: SYN-VN-210345

BỆNH SỬ:
Nam 58 tuổi, viêm gan B mạn phát hiện 12 năm, điều trị không liên tục, đã ngưng thuốc kháng virus khoảng 2 năm nay. Siêu âm tầm soát định kỳ phát hiện khối gan phải. Không đau bụng, không sụt cân, không vàng da.

TIỀN SỬ:
Tăng huyết áp, đang dùng amlodipin 5 mg/ngày. Uống rượu khoảng 2 đơn vị/ngày, đã ngừng 1 năm. Không hút thuốc lá.

KHÁM:
Tỉnh, tiếp xúc tốt, ECOG 0. Không vàng da, không phù. Bụng mềm, gan lách không sờ thấy, không có dịch ổ bụng.

ĐÁNH GIÁ:
- Ung thư biểu mô tế bào gan hạ phân thùy VIII, đơn ổ 5,2 cm, chẩn đoán theo tiêu chuẩn hình ảnh (LI-RADS 5) kết hợp AFP 856 ng/mL.
- Xơ gan còn bù, Child-Pugh A5. Giãn tĩnh mạch thực quản độ I, tiểu cầu 128 G/L.
- Giai đoạn BCLC A.
- Viêm gan B mạn, HBV DNA 2,3 x 10^4 IU/mL, hiện chưa điều trị kháng virus.

KẾ HOẠCH:
- Bắt đầu tenofovir alafenamide 25 mg/ngày.
- CT ngực để hoàn thiện đánh giá giai đoạn.
- Đo ICG-R15 và CT đo thể tích gan nếu cân nhắc phẫu thuật.
- Trình hội chẩn đa chuyên khoa: cắt gan hay điều trị tại chỗ (TACE, đốt sóng cao tần).`,
    },
    {
      key: "ctnguc", type: "IMAGING_REPORT", title: "CT ngực có tiêm thuốc cản quang", days: 6, time: "14:05", uploadedBy: "mai",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KẾT QUẢ CHỤP CẮT LỚP VI TÍNH
Kỹ thuật: CT ngực có tiêm thuốc cản quang
Ngày chụp: ${ngay(day(6))}
Bệnh nhân: Nguyễn Văn Thành | Mã hồ sơ: SYN-VN-210345

MÔ TẢ:
Nhu mô hai phổi không thấy nốt hay khối bất thường. Không tràn dịch màng phổi. Không thấy hạch trung thất hay hạch rốn phổi to. Không thấy tổn thương xương trong trường chụp.

KẾT LUẬN: Không thấy nốt di căn phổi. Không thấy hạch trung thất.`,
    },
    {
      key: "ngoai", type: "CLINICAL_NOTE", title: "Phiếu khám Ngoại gan mật", days: 4, time: "16:00", uploadedBy: "long",
      text: `${SYNTHETIC_HEADER_VI}

PHIẾU KHÁM CHUYÊN KHOA NGOẠI GAN MẬT
Ngày khám: ${ngay(day(4))}
Bác sĩ: BS. Hoàng Đức Long, Ngoại gan mật
Bệnh nhân: Nguyễn Văn Thành | Mã hồ sơ: SYN-VN-210345

NHẬN ĐỊNH:
Khối đơn ổ hạ phân thùy VIII, kích thước 5,2 cm, cách tĩnh mạch gan phải khoảng 1 cm. Chức năng gan Child-Pugh A5, nhưng có dấu hiệu tăng áp lực tĩnh mạch cửa (giãn tĩnh mạch thực quản độ I, tiểu cầu 128 G/L).

ĐỀ XUẤT:
Có thể cắt hạ phân thùy VIII nếu ICG-R15 dưới 10% và thể tích gan còn lại từ 40% trở lên. Cần thống nhất với chuyên khoa Tiêu hóa về mức độ tăng áp lực tĩnh mạch cửa trước khi xếp lịch mổ.`,
    },
  ],
  timeline: [
    { doc: "ct", type: "IMAGING", title: "CT phát hiện khối gan điển hình HCC", description: "Khối hạ phân thùy VIII 5,2 cm, ngấm thuốc thì động mạch và thải thuốc thì tĩnh mạch cửa (LI-RADS 5); không huyết khối tĩnh mạch cửa." },
    { doc: "xn", type: "LAB", title: "AFP tăng cao, HBV DNA dương tính", description: "AFP 856 ng/mL; HBsAg dương tính, HBV DNA 2,3 x 10^4 IU/mL; tiểu cầu 128 G/L; Child-Pugh A5." },
    { doc: "noisoi", type: "PROCEDURE", title: "Nội soi: giãn tĩnh mạch thực quản độ I", description: "Không có dấu son đỏ, không giãn tĩnh mạch phình vị." },
    { doc: "kham", type: "CONSULTATION", title: "Khám Nội ung bướu", description: "ECOG 0, BCLC A. Bắt đầu tenofovir alafenamide; đề nghị hội chẩn đa chuyên khoa." },
    { doc: "ctnguc", type: "IMAGING", title: "CT ngực không thấy di căn", description: "Không có nốt di căn phổi, không có hạch trung thất." },
    { doc: "ngoai", type: "CONSULTATION", title: "Khám Ngoại gan mật", description: "Có thể cắt hạ phân thùy VIII nếu ICG-R15 dưới 10% và thể tích gan còn lại từ 40% trở lên." },
  ],
  discussion: [
    { author: "khoa", at: [15, "11:05"], content: "Chào cả nhóm. Ca mới: nam 58 tuổi, viêm gan B mạn, khối gan phải 5,2 cm trên CT. @BsMai nhờ chị xem lại CT giúp em, nhất là tĩnh mạch cửa.", mentions: ["mai"] },
    { author: "mai", at: [15, "14:30"], content: "Đã xem. Khối điển hình HCC, LI-RADS 5. Tĩnh mạch cửa thông, không huyết khối. Khối cách tĩnh mạch gan phải khoảng 1 cm." },
    {
      author: "khoa", at: [14, "16:00"], askAI: "tóm tắt kết quả xét nghiệm và chức năng gan",
      answer: "AFP tăng cao, 856 ng/mL [1]. HBsAg dương tính, HBV DNA 2,3 x 10^4 IU/mL [1]. Chức năng gan còn bù: albumin 37 g/L, bilirubin toàn phần 15 µmol/L, INR 1,1; phiếu xét nghiệm ghi nhận Child-Pugh A5 [1]. Tiểu cầu giảm nhẹ, 128 G/L [1].",
      sources: [["xn", "Chức năng gan còn bù (Child-Pugh A5)."]],
      confidence: "high",
      limitations: "Chỉ tóm tắt phiếu xét nghiệm ngày lấy mẫu gần nhất; chưa có kết quả HBV DNA sau điều trị kháng virus.",
    },
    { author: "tam", at: [12, "11:00"], content: "Nội soi: giãn tĩnh mạch thực quản độ I, không có dấu son đỏ, chưa cần thắt. Tôi lo bệnh nhân có tăng áp lực tĩnh mạch cửa có ý nghĩa lâm sàng, cần tính đến khi chọn phẫu thuật." },
    { author: "khoa", at: [10, "17:00"], content: "Đã bắt đầu tenofovir alafenamide 25 mg. @BsLong anh xem giúp khả năng cắt gan.", mentions: ["long"] },
    { author: "long", at: [4, "16:20"], content: "Đã khám. Về kỹ thuật cắt được hạ phân thùy VIII, nhưng cần ICG-R15 và CT đo thể tích gan trước. Phiếu khám đã tải lên." },
    {
      author: "yen", at: [3, "08:15"], askAI: "trước buổi hội chẩn còn thiếu thông tin gì?",
      answer: "Theo hồ sơ hiện có, còn thiếu:\n- Kết quả ICG-R15 và CT đo thể tích gan còn lại: bác sĩ Ngoại gan mật cần trước khi quyết định cắt gan [1].\n- Đánh giá thống nhất về tăng áp lực tĩnh mạch cửa: nội soi ghi nhận giãn tĩnh mạch thực quản độ I [2], tiểu cầu 128 G/L [3].\n- HBV DNA sau khi bắt đầu tenofovir alafenamide: chưa có trong hồ sơ [4].",
      sources: [
        ["ngoai", "Có thể cắt hạ phân thùy VIII nếu ICG-R15 dưới 10% và thể tích gan còn lại từ 40% trở lên."],
        ["noisoi", "Giãn tĩnh mạch thực quản độ I, không có dấu hiệu nguy cơ chảy máu cao."],
        ["xn", "Tiểu cầu: 128 G/L (150-400) - THẤP"],
        ["kham", "Bắt đầu tenofovir alafenamide 25 mg/ngày."],
      ],
      confidence: "moderate",
      limitations: "Liệt kê thông tin còn thiếu theo hồ sơ hiện có; không phải đánh giá lâm sàng.",
    },
    { author: "yen", at: [3, "09:00"], content: `Đã xếp lịch hội chẩn ngày ${ngay(day(-2))} lúc 13:30. Em cũng đã đặt lịch đo ICG-R15.` },
    { author: "khoa", at: [1, "10:00"], content: "@BsTam anh duyệt giúp Quyết định #1 trước buổi hội chẩn nhé, nhất là phần tăng áp lực tĩnh mạch cửa.", mentions: ["tam"] },
  ],
  decision: {
    title: "Cắt gan hạ phân thùy VIII nếu đạt tiêu chuẩn chức năng gan",
    description:
      "Phẫu thuật cắt hạ phân thùy VIII với điều kiện ICG-R15 dưới 10% và thể tích gan còn lại từ 40% trở lên. Nếu không đạt, chuyển sang điều trị tại chỗ (TACE, có thể phối hợp đốt sóng cao tần) theo hội chẩn. Tiếp tục tenofovir alafenamide trong mọi phương án.",
    rationale:
      "HCC đơn ổ 5,2 cm (LI-RADS 5), BCLC A, Child-Pugh A5, ECOG 0; không huyết khối tĩnh mạch cửa, không di căn trên CT bụng và ngực. Ngoại gan mật đánh giá cắt được về kỹ thuật. Có dấu hiệu tăng áp lực tĩnh mạch cửa (giãn tĩnh mạch thực quản độ I, tiểu cầu 128 G/L) nên cần đánh giá dự trữ chức năng gan trước mổ.",
    status: "UNDER_REVIEW",
    createdBy: "khoa",
    created: [3, "17:30"],
    sources: ["ct", "xn", "kham", "ngoai"],
    approvals: [
      { reviewer: "mai", status: "APPROVED", comment: "Đồng ý. Đề nghị CT đo thể tích gan cùng lần chụp kiểm tra.", responded: [2, "09:10"] },
      { reviewer: "long", status: "APPROVED", comment: "Đồng ý về nguyên tắc, với điều kiện ICG-R15 và thể tích gan còn lại đạt.", responded: [2, "15:00"] },
      { reviewer: "tam", status: "PENDING" },
    ],
  },
  tasks: [
    { title: "Xếp lịch hội chẩn đa chuyên khoa", assignee: "yen", creator: "khoa", status: "DONE", priority: "MEDIUM", due: 3, created: [10, "17:05"], completed: [3, "09:00"] },
    { title: "Tư vấn bệnh nhân tuân thủ thuốc kháng virus", description: "Bệnh nhân từng tự ngưng thuốc 2 năm. Giải thích nguy cơ bùng phát viêm gan khi ngưng thuốc.", assignee: "lan", creator: "khoa", status: "DONE", priority: "MEDIUM", due: 8, created: [10, "17:12"], completed: [9, "10:30"] },
    { title: "Đo độ thanh thải ICG (ICG-R15)", description: "Ngoại gan mật cần trước khi quyết định cắt gan.", assignee: "yen", creator: "long", status: "IN_PROGRESS", priority: "HIGH", due: -1, created: [4, "16:30"] },
    { title: "CT đo thể tích gan còn lại", assignee: "mai", creator: "khoa", status: "TODO", priority: "HIGH", due: -2, created: [3, "17:40"], fromDecision: true },
    { title: "Chuẩn bị trình bày ca tại hội chẩn", description: "Hình ảnh, xét nghiệm, chức năng gan và các câu hỏi cho hội đồng.", assignee: "khoa", creator: "yen", status: "TODO", priority: "HIGH", due: -2, created: [3, "09:05"] },
    { title: "Kiểm tra HBV DNA và chức năng gan sau 4 tuần tenofovir", assignee: "tam", creator: "khoa", status: "TODO", priority: "MEDIUM", due: -18, created: [10, "17:10"] },
  ],
  summary: {
    status: "DRAFT",
    requestedBy: "khoa",
    at: [1, "07:30"],
    content: (s) => ({
      headline: "Nam 58 tuổi, ung thư biểu mô tế bào gan đơn ổ 5,2 cm trên nền viêm gan B mạn, xơ gan còn bù.",
      currentStatus: "BCLC A, Child-Pugh A5, ECOG 0. Chưa điều trị khối u; đang chờ ICG-R15 và CT đo thể tích gan để chọn giữa cắt gan và điều trị tại chỗ.",
      currentDiagnosis: "HCC hạ phân thùy VIII 5,2 cm (LI-RADS 5), AFP 856 ng/mL; không huyết khối tĩnh mạch cửa, không di căn trên CT bụng và CT ngực.",
      currentTreatment: "Tenofovir alafenamide 25 mg/ngày. Đề xuất cắt hạ phân thùy VIII nếu đạt tiêu chuẩn chức năng gan (Quyết định #1, đang chờ duyệt).",
      keyFindings: [
        { text: "CT: khối hạ phân thùy VIII 5,2 cm, điển hình HCC (LI-RADS 5), không huyết khối tĩnh mạch cửa.", sources: [s.ref("ct", "Khối hạ phân thùy VIII kích thước 5,2 cm, đặc điểm điển hình ung thư biểu mô tế bào gan (LI-RADS 5).")] },
        { text: "AFP 856 ng/mL; HBsAg dương tính, HBV DNA 2,3 x 10^4 IU/mL.", sources: [s.ref("xn", "AFP: 856 ng/mL (< 7) - CAO")] },
        { text: "Dấu hiệu tăng áp lực tĩnh mạch cửa: giãn tĩnh mạch thực quản độ I, tiểu cầu 128 G/L.", sources: [s.ref("noisoi", "Giãn tĩnh mạch thực quản độ I, không có dấu hiệu nguy cơ chảy máu cao."), s.ref("xn", "Tiểu cầu: 128 G/L (150-400) - THẤP")] },
        { text: "CT ngực không thấy di căn.", sources: [s.ref("ctnguc", "Không thấy nốt di căn phổi.")] },
        { text: "Ngoại gan mật: cắt được nếu ICG-R15 dưới 10% và thể tích gan còn lại từ 40% trở lên.", sources: [s.ref("ngoai", "Có thể cắt hạ phân thùy VIII nếu ICG-R15 dưới 10% và thể tích gan còn lại từ 40% trở lên.")] },
      ],
      latestResults: [
        { label: "AFP", value: "856 ng/mL", date: s.date("xn"), flag: "abnormal", sources: [s.ref("xn")] },
        { label: "HBV DNA", value: "2,3 x 10^4 IU/mL", date: s.date("xn"), flag: "abnormal", sources: [s.ref("xn")] },
        { label: "Tiểu cầu", value: "128 G/L", date: s.date("xn"), flag: "abnormal", sources: [s.ref("xn")] },
        { label: "Albumin", value: "37 g/L", date: s.date("xn"), flag: "normal", sources: [s.ref("xn")] },
        { label: "INR", value: "1,1", date: s.date("xn"), flag: "normal", sources: [s.ref("xn")] },
      ],
      outstandingQuestions: [
        "Cắt gan hay điều trị tại chỗ khi có dấu hiệu tăng áp lực tĩnh mạch cửa?",
        "Nếu không cắt gan: TACE đơn thuần hay TACE phối hợp đốt sóng cao tần?",
      ],
      missingInformation: [
        { item: "ICG-R15", reason: "Ngoại gan mật cần trước khi quyết định cắt gan.", priority: "high" },
        { item: "CT đo thể tích gan còn lại", reason: "Điều kiện của phương án phẫu thuật.", priority: "high" },
        { item: "HBV DNA sau điều trị kháng virus", reason: "Mới bắt đầu tenofovir alafenamide; chưa có kết quả kiểm tra.", priority: "medium" },
      ],
      limitations: "Tạo từ 6 tài liệu. Chưa có kết quả ICG-R15 và CT đo thể tích gan.",
    }),
  },
  tumorBoard: {
    requestedBy: "khoa",
    at: [1, "07:45"],
    content: (s) => ({
      sections: [
        { key: "caseSummary", title: "Tóm tắt ca bệnh", body: "Nam 58 tuổi, viêm gan B mạn, phát hiện HCC đơn ổ 5,2 cm hạ phân thùy VIII qua tầm soát. Child-Pugh A5, ECOG 0, BCLC A. [1]", sources: [s.ref("kham", "Giai đoạn BCLC A.")] },
        { key: "diagnosis", title: "Chẩn đoán", body: "Ung thư biểu mô tế bào gan, chẩn đoán theo tiêu chuẩn hình ảnh (LI-RADS 5) kết hợp AFP 856 ng/mL. [1][2]", sources: [s.ref("ct", "Khối hạ phân thùy VIII kích thước 5,2 cm, đặc điểm điển hình ung thư biểu mô tế bào gan (LI-RADS 5)."), s.ref("xn", "AFP: 856 ng/mL (< 7) - CAO")] },
        { key: "patientHistory", title: "Tiền sử", body: "- Viêm gan B mạn 12 năm, tự ngưng thuốc kháng virus 2 năm [1]\n- Tăng huyết áp, dùng amlodipin\n- Uống rượu khoảng 2 đơn vị/ngày, đã ngừng 1 năm", sources: [s.ref("kham", "đã ngưng thuốc kháng virus khoảng 2 năm nay")] },
        { key: "imaging", title: "Chẩn đoán hình ảnh", body: "- CT bụng: khối 5,2 x 4,6 cm hạ phân thùy VIII, cách tĩnh mạch gan phải khoảng 1 cm; tĩnh mạch cửa thông [1]\n- CT ngực: không di căn phổi, không hạch trung thất [2]", sources: [s.ref("ct", "Không có huyết khối tĩnh mạch cửa, không thấy di căn ngoài gan trên CT bụng."), s.ref("ctnguc", "Không thấy nốt di căn phổi. Không thấy hạch trung thất.")] },
        { key: "pathology", title: "Giải phẫu bệnh", body: "Chưa sinh thiết. Chẩn đoán dựa trên hình ảnh điển hình và AFP tăng, theo tiêu chuẩn không xâm lấn.", sources: [] },
        { key: "labs", title: "Xét nghiệm", body: "- AFP 856 ng/mL [1]\n- HBV DNA 2,3 x 10^4 IU/mL, HBeAg âm tính [1]\n- Tiểu cầu 128 G/L; albumin 37 g/L; bilirubin toàn phần 15 µmol/L; INR 1,1 [1]", sources: [s.ref("xn", "Chức năng gan còn bù (Child-Pugh A5).")] },
        { key: "previousTreatment", title: "Điều trị trước đây", body: "Thuốc kháng virus viêm gan B không liên tục, ngưng 2 năm. Chưa điều trị khối u. [1]", sources: [s.ref("kham", "điều trị không liên tục")] },
        { key: "currentTreatment", title: "Điều trị hiện tại", body: "Tenofovir alafenamide 25 mg/ngày; amlodipin 5 mg/ngày. [1]", sources: [s.ref("kham", "Bắt đầu tenofovir alafenamide 25 mg/ngày.")] },
        { key: "missingInformation", title: "Thông tin còn thiếu", body: "- ICG-R15\n- CT đo thể tích gan còn lại\n- HBV DNA sau điều trị kháng virus", sources: [] },
        { key: "openQuestions", title: "Vấn đề còn mở", body: "- Mức độ tăng áp lực tĩnh mạch cửa: giãn tĩnh mạch thực quản độ I, tiểu cầu 128 G/L [1]\n- Có cần điều trị dự phòng giãn tĩnh mạch thực quản không", sources: [s.ref("noisoi", "Giãn tĩnh mạch thực quản độ I, không có dấu hiệu nguy cơ chảy máu cao.")] },
        { key: "decisionsRequired", title: "Quyết định cần đưa ra", body: "Quyết định #1 (đang chờ duyệt): cắt hạ phân thùy VIII nếu ICG-R15 dưới 10% và thể tích gan còn lại từ 40% trở lên; nếu không đạt, điều trị tại chỗ. [1]", sources: [s.ref("ngoai", "Có thể cắt hạ phân thùy VIII nếu ICG-R15 dưới 10% và thể tích gan còn lại từ 40% trở lên.")] },
        { key: "questionsForTumorBoard", title: "Câu hỏi cho hội đồng", body: "1. Với dấu hiệu tăng áp lực tĩnh mạch cửa, cắt gan có còn là lựa chọn ưu tiên?\n2. Nếu không cắt gan: TACE đơn thuần hay TACE phối hợp đốt sóng cao tần?\n3. Lịch theo dõi AFP và hình ảnh sau điều trị.", sources: [] },
      ],
      limitations: "Bản nháp do AI tạo từ 6 tài liệu của ca bệnh; chưa có ICG-R15 và CT đo thể tích gan. Cần bác sĩ xem lại trước khi trình hội chẩn.",
    }),
  },
  memory: (s) => ({
    patientSummary: "Nam 58 tuổi, HCC đơn ổ 5,2 cm hạ phân thùy VIII trên nền viêm gan B mạn, Child-Pugh A5, BCLC A; đang chờ đánh giá chức năng gan trước khi chọn cắt gan hay điều trị tại chỗ.",
    activeProblems: ["Ung thư biểu mô tế bào gan hạ phân thùy VIII", "Viêm gan B mạn, HBV DNA dương tính", "Dấu hiệu tăng áp lực tĩnh mạch cửa", "Tăng huyết áp"],
    diagnoses: [
      { name: "Ung thư biểu mô tế bào gan", detail: "Hạ phân thùy VIII, 5,2 cm, LI-RADS 5, BCLC A", date: s.date("ct"), sourceDocumentId: s.id("ct") },
      { name: "Viêm gan B mạn", detail: "HBsAg dương tính, HBeAg âm tính, HBV DNA 2,3 x 10^4 IU/mL", date: s.date("xn"), sourceDocumentId: s.id("xn") },
      { name: "Giãn tĩnh mạch thực quản độ I", detail: "Không có dấu son đỏ", date: s.date("noisoi"), sourceDocumentId: s.id("noisoi") },
    ],
    medications: [
      { name: "Tenofovir alafenamide", detail: "25 mg/ngày, bắt đầu tại lần khám Nội ung bướu", date: s.date("kham"), sourceDocumentId: s.id("kham") },
      { name: "Amlodipin", detail: "5 mg/ngày", date: s.date("kham"), sourceDocumentId: s.id("kham") },
    ],
    importantLabs: [
      { name: "AFP", value: "856 ng/mL", flag: "high", date: s.date("xn"), sourceDocumentId: s.id("xn") },
      { name: "HBV DNA", value: "2,3 x 10^4 IU/mL", flag: "abnormal", date: s.date("xn"), sourceDocumentId: s.id("xn") },
      { name: "Tiểu cầu", value: "128 G/L", flag: "low", date: s.date("xn"), sourceDocumentId: s.id("xn") },
      { name: "Albumin", value: "37 g/L", flag: "normal", date: s.date("xn"), sourceDocumentId: s.id("xn") },
    ],
    importantImaging: [
      { study: "CT bụng 3 thì", finding: "Khối hạ phân thùy VIII 5,2 cm, LI-RADS 5; tĩnh mạch cửa thông", date: s.date("ct"), sourceDocumentId: s.id("ct") },
      { study: "CT ngực", finding: "Không di căn phổi, không hạch trung thất", date: s.date("ctnguc"), sourceDocumentId: s.id("ctnguc") },
    ],
    pathology: [],
    treatments: [
      { name: "Thuốc kháng virus viêm gan B", status: "active", detail: "Tenofovir alafenamide từ lần khám Nội ung bướu", date: s.date("kham"), sourceDocumentId: s.id("kham") },
      { name: "Cắt hạ phân thùy VIII", status: "planned", detail: "Nếu ICG-R15 dưới 10% và thể tích gan còn lại từ 40% trở lên", date: s.date("ngoai"), sourceDocumentId: s.id("ngoai") },
    ],
    openQuestions: ["Cắt gan hay điều trị tại chỗ khi có tăng áp lực tĩnh mạch cửa?", "Kết quả ICG-R15 và thể tích gan còn lại"],
  }),
};
