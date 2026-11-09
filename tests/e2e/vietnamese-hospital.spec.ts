import { expect, test } from "./fixtures";
import { caseIdOf, watchForProblems } from "./helpers";

/**
 * The Vietnamese demo hospital: its clinicians get the interface in Vietnamese
 * without choosing it, patient names are written family name first, and the
 * records, AI drafts and system messages of its cases are in Vietnamese.
 */

test("a clinician of the Vietnamese demo hospital works in Vietnamese", async ({ signIn }) => {
  const thanh = await caseIdOf("Nguyễn");
  const page = await signIn("khoa@benhvien.demo");
  const problems = watchForProblems(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");

  await page.goto("/cases");
  for (const name of ["Nguyễn Văn Thành", "Trần Thị Bích Hạnh", "Đinh Thị Thu Trang"]) {
    await expect(page.getByRole("link", { name: new RegExp(name) }).first(), name).toBeVisible();
  }
  await expect(page.getByText("John Carter")).toHaveCount(0);

  await page.goto(`/cases/${thanh}`);
  await expect(page.getByRole("heading", { name: "Nguyễn Văn Thành", level: 1 })).toBeVisible();
  await expect(page.getByText(/ung thư biểu mô tế bào gan đơn ổ 5,2 cm/).first()).toBeVisible();

  await page.goto(`/cases/${thanh}/discussion`);
  await expect(page.getByText("BS. Trần Minh Khoa đã tạo ca bệnh này.")).toBeVisible();
  await expect(page.getByText(/AFP tăng cao, 856 ng\/mL/).first()).toBeVisible();

  await page.goto(`/cases/${thanh}/timeline`);
  await expect(page.getByText("CT phát hiện khối gan điển hình HCC")).toBeVisible();

  await page.goto(`/cases/${thanh}/tumor-board`);
  await expect(page.getByText(/Với dấu hiệu tăng áp lực tĩnh mạch cửa/).first()).toBeVisible();

  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll).toBeLessThanOrEqual(client + 1);
  expect(problems).toEqual([]);
});

test("the sign-in page offers both demo hospitals, the one in the visitor's language first", async ({ page }) => {
  const teams = page.locator("section[aria-label]");
  await page.goto("/login");
  await expect(teams.first()).toHaveAttribute("aria-label", /^Riverside/);
  await page.getByRole("button", { name: "Tiếng Việt" }).click();
  await expect(teams.first()).toHaveAttribute("aria-label", /Sông Xanh/);
  await expect(teams.first().getByRole("button", { name: /BS\. Trần Minh Khoa/ })).toBeVisible();
});
