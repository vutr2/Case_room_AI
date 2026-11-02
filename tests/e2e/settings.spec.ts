import { expect, test } from "./fixtures";
import { queryOne } from "./helpers";

test("a member edits their profile and sees it across the app", async ({ signIn }) => {
  const patel = await signIn("patel@riverside.demo");
  await patel.goto("/settings");
  await patel.getByLabel("Title").fill("Pathologist (e2e)");
  await patel.getByRole("button", { name: "Save profile" }).click();
  await expect(patel.getByText("Profile saved")).toBeVisible();
  await patel.goto("/dashboard");
  await expect(patel.getByRole("button", { name: /Dr\. Priya Patel Pathologist \(e2e\)/ })).toBeVisible();
});

test("an admin renames the organization and every member sees the new name", async ({ signIn }) => {
  const organization = await queryOne<{ name: string }>(`SELECT name FROM "Organization" WHERE name LIKE 'Riverside%'`);
  const admin = await signIn("admin@riverside.demo");
  // A member of Riverside only (others may have another organization active).
  const brooks = await signIn("brooks@riverside.demo");
  try {
    await admin.goto("/settings");
    await admin.getByLabel("Organization name").fill("Riverside Cancer Center (Demo, renamed)");
    await admin.getByRole("button", { name: "Rename" }).click();
    await expect(admin.getByText("Organization renamed")).toBeVisible();
    await brooks.goto("/dashboard");
    await expect(brooks.getByRole("button", { name: "Switch organization" })).toContainText("Riverside Cancer Center (Demo, renamed)");
    // Members cannot rename it.
    await brooks.goto("/settings");
    await expect(brooks.getByLabel("Organization name")).toHaveCount(0);
  } finally {
    await admin.goto("/settings");
    await admin.getByLabel("Organization name").fill(organization.name);
    await admin.getByRole("button", { name: "Rename" }).click();
    await expect(admin.getByText("Organization renamed")).toBeVisible();
  }
});

test("settings show the active AI provider and what the application actually guarantees", async ({ signIn }) => {
  const page = await signIn("nguyen@riverside.demo");
  await page.goto("/settings");
  await expect(page.getByText("Demo AI (offline)").first()).toBeVisible();
  await expect(page.getByText("Offline, rule-based")).toBeVisible();
  await expect(page.getByText(/answers without a verifiable source are marked low confidence/)).toBeVisible();
  await expect(page.getByText(/This reduces prompt-injection risk; it cannot rule it out/)).toBeVisible();
});

test("an admin sets the organization's language, which members who have not picked their own then see", async ({ signIn }) => {
  const admin = await signIn("admin@riverside.demo");
  const brooks = await signIn("brooks@riverside.demo");
  const language = (page: typeof admin) => page.getByRole("combobox", { name: /^(Language|Ngôn ngữ)$/ });
  try {
    await admin.goto("/settings");
    await language(admin).selectOption("vi");
    await expect(admin.getByText("Organization language changed to Tiếng Việt")).toBeVisible();
    await brooks.goto("/dashboard");
    await expect(brooks.locator("html")).toHaveAttribute("lang", "vi");
    await expect(brooks.locator("aside").getByRole("link", { name: "Ca bệnh" })).toBeVisible();
    // Members see the language but cannot change it.
    await brooks.goto("/settings");
    await expect(brooks.getByText("Tiếng Việt", { exact: true })).toBeVisible();
    await expect(language(brooks)).toHaveCount(0);
    await admin.goto("/settings/audit");
    await expect(admin.getByText(/changed the organization's language to Tiếng Việt|đổi ngôn ngữ của tổ chức thành Tiếng Việt/).first()).toBeVisible();
  } finally {
    await admin.goto("/settings");
    await language(admin).selectOption("en");
    await expect(admin.locator("html")).toHaveAttribute("lang", "en");
  }
});
