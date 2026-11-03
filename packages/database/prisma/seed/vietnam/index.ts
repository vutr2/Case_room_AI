import type { PrismaClient } from "../../../src/generated/prisma/client";
import { at, audit, type SeedContext } from "../helpers";
import type { DemoUser } from "../users";
import { seedVietnameseCase } from "./builder";
import { dinhThiThuTrang } from "./cases/breast-her2";
import { nguyenVanThanh } from "./cases/liver-hbv";
import { tranThiBichHanh } from "./cases/lung-egfr";

/**
 * A fictional Vietnamese hospital whose language is Vietnamese: the interface,
 * the case records and the AI drafts are in Vietnamese. Staff sign in with
 * @benhvien.demo addresses (password demo1234). All patients are synthetic.
 */
export const VIETNAMESE_HOSPITAL = "Bệnh viện Đa khoa Sông Xanh (Demo)";

export const VIETNAMESE_DEMO_USERS: DemoUser[] = [
  { key: "admin", name: "Phạm Thu Hà", email: "admin@benhvien.demo", handle: "PhamThuHa", role: "ORG_ADMIN", specialty: null, title: "Trưởng phòng Kế hoạch tổng hợp" },
  { key: "khoa", name: "BS. Trần Minh Khoa", email: "khoa@benhvien.demo", handle: "BsKhoa", role: "DOCTOR", specialty: "Nội khoa ung bướu", title: "Bác sĩ Nội ung bướu" },
  { key: "mai", name: "BS. Lê Thị Mai", email: "mai@benhvien.demo", handle: "BsMai", role: "SPECIALIST", specialty: "Chẩn đoán hình ảnh", title: "Bác sĩ Chẩn đoán hình ảnh" },
  { key: "long", name: "BS. Hoàng Đức Long", email: "long@benhvien.demo", handle: "BsLong", role: "SPECIALIST", specialty: "Ngoại gan mật", title: "Bác sĩ Ngoại gan mật" },
  { key: "van", name: "BS. Nguyễn Thanh Vân", email: "van@benhvien.demo", handle: "BsVan", role: "SPECIALIST", specialty: "Ngoại vú", title: "Bác sĩ Phẫu thuật tuyến vú" },
  { key: "huong", name: "BS. Vũ Thanh Hương", email: "huong@benhvien.demo", handle: "BsHuong", role: "SPECIALIST", specialty: "Giải phẫu bệnh", title: "Bác sĩ Giải phẫu bệnh" },
  { key: "bao", name: "BS. Đặng Quốc Bảo", email: "bao@benhvien.demo", handle: "BsBao", role: "SPECIALIST", specialty: "Xạ trị", title: "Bác sĩ Xạ trị" },
  { key: "tam", name: "BS. Đỗ Văn Tâm", email: "tam@benhvien.demo", handle: "BsTam", role: "DOCTOR", specialty: "Tiêu hóa - Gan mật", title: "Bác sĩ Tiêu hóa" },
  { key: "lan", name: "ĐD. Ngô Thị Lan", email: "lan@benhvien.demo", handle: "DdLan", role: "NURSE", specialty: "Điều dưỡng ung bướu", title: "Điều dưỡng" },
  { key: "yen", name: "Bùi Hải Yến", email: "yen@benhvien.demo", handle: "BuiHaiYen", role: "CARE_COORDINATOR", specialty: "Điều phối hội chẩn", title: "Điều phối viên" },
];

export async function seedVietnameseHospital(prisma: PrismaClient, passwordHash: string) {
  console.log(`› Seeding organization: ${VIETNAMESE_HOSPITAL} (Vietnamese)`);
  const org = await prisma.organization.create({ data: { name: VIETNAMESE_HOSPITAL, locale: "vi", createdAt: at(90, "08:00") } });
  const users: SeedContext["users"] = {};
  for (const demo of VIETNAMESE_DEMO_USERS) {
    const identity = await prisma.identity.create({
      data: { email: demo.email, name: demo.name, passwordHash, createdAt: at(90, "08:05") },
    });
    users[demo.key] = await prisma.user.create({
      data: {
        identityId: identity.id,
        name: demo.name,
        email: demo.email,
        handle: demo.handle,
        role: demo.role,
        specialty: demo.specialty,
        title: demo.title,
        organizationId: org.id,
        createdAt: at(90, "08:05"),
        lastLoginAt: at(1, "07:45"),
      },
    });
  }
  const ctx: SeedContext = { prisma, org, users };
  await audit(ctx, { userId: users.admin!.id, action: "org.created", resourceType: "Organization", resourceId: org.id, metadata: { name: org.name }, createdAt: at(90, "08:00") });
  for (const demo of VIETNAMESE_DEMO_USERS.filter((d) => d.key !== "admin")) {
    await audit(ctx, { userId: users.admin!.id, action: "org.member_added", resourceType: "User", resourceId: users[demo.key]!.id, metadata: { memberName: demo.name, role: demo.role }, createdAt: at(89, "09:00") });
  }

  console.log("› Seeding case: Trần Thị Bích Hạnh (lung, EGFR, decision approved)");
  await seedVietnameseCase(ctx, tranThiBichHanh);
  console.log("› Seeding case: Đinh Thị Thu Trang (breast, HER2, changes requested)");
  await seedVietnameseCase(ctx, dinhThiThuTrang);
  console.log("› Seeding case: Nguyễn Văn Thành (liver, HBV, tumor board pending)");
  await seedVietnameseCase(ctx, nguyenVanThanh);
}
