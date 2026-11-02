import { expect, test } from "./fixtures";
import { caseIdOf, DEMO_PASSWORD, watchForProblems } from "./helpers";

/**
 * The interface in Vietnamese: the language picked on the sign-in page stays
 * after signing in, every page renders in it without errors and still fits a
 * laptop screen (Vietnamese labels are longer), and English comes back from
 * the user menu.
 */

const CASE_TABS = ["", "/timeline", "/discussion", "/documents", "/decisions", "/tasks", "/tumor-board", "/handoff", "/audit"];

test("the interface works in Vietnamese", async ({ browser }) => {
  const carter = await caseIdOf("Carter");
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const problems = watchForProblems(page);

  await page.goto("/login");
  await page.getByRole("button", { name: "Tiếng Việt" }).click();
  await expect(page.getByRole("heading", { name: "Đăng nhập vào các ca bệnh của bạn" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");

  await page.getByLabel("Email").fill("nguyen@riverside.demo");
  await page.getByLabel("Mật khẩu").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  const sidebar = page.locator("aside");
  for (const path of ["/dashboard", "/cases", "/cases/new", "/tasks", "/team", "/settings", ...CASE_TABS.map((tab) => `/cases/${carter}${tab}`)]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 }).first(), path).toBeVisible();
    await expect(page.locator("html"), path).toHaveAttribute("lang", "vi");
    await expect(sidebar.getByRole("link", { name: "Ca bệnh" }), path).toBeVisible();
    const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(scroll, `${path} is wider than the screen`).toBeLessThanOrEqual(client + 1);
  }

  // Case pages: tabs and AI panels in Vietnamese.
  await page.goto(`/cases/${carter}`);
  for (const tab of ["Tổng quan", "Dòng thời gian", "Thảo luận", "Tài liệu", "Quyết định", "Công việc", "Hội chẩn", "Bàn giao", "Nhật ký"]) {
    await expect(page.getByRole("link", { name: new RegExp(`^${tab}`) }).first(), tab).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Tóm tắt ca bệnh" })).toBeVisible();
  await page.goto(`/cases/${carter}/tumor-board`);
  await expect(page.getByRole("heading", { name: "Bản tóm tắt hội chẩn" }).first()).toBeVisible();

  // Back to English from the user menu.
  await sidebar.getByRole("button", { name: /Nguyen/ }).click();
  await page.getByRole("menuitem", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(sidebar.getByRole("link", { name: "Cases" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tumor board brief" }).first()).toBeVisible();

  expect(problems).toEqual([]);
  await context.close();
});
