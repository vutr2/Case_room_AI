import { expect, test } from "./fixtures";
import { caseIdOf, reseedDemoData, watchForProblems } from "./helpers";

// The workflow changes the agenda and decisions: start from the seeded demo.
test.beforeAll(() => reseedDemoData());

test.describe("tumor board meetings", () => {
  test("a coordinator schedules and prepares a meeting; the board presents, concludes, proposes a decision and prints the minutes", async ({ signIn }) => {
    test.setTimeout(180_000);
    const gonzalez = await caseIdOf("Gonzalez");

    // 1. The care coordinator schedules the meeting and adds a case.
    const coordinator = await signIn("rivera@riverside.demo");
    const problems = watchForProblems(coordinator);
    await coordinator.goto("/meetings");
    await coordinator.getByRole("button", { name: "Schedule meeting" }).click();
    await coordinator.getByLabel("Title").fill("E2E breast tumor board");
    await coordinator.getByLabel("Location").fill("Conference Room 2A");
    await coordinator.getByRole("dialog").getByRole("button", { name: "Schedule" }).click();
    await expect(coordinator).toHaveURL(/\/meetings\/[^/]+$/);
    const meetingUrl = new URL(coordinator.url()).pathname;

    await coordinator.getByRole("button", { name: "Add case" }).click();
    const dialog = coordinator.getByRole("dialog");
    const option = dialog.locator("#agenda-case option", { hasText: "Maria Gonzalez" });
    await dialog.locator("#agenda-case").selectOption((await option.getAttribute("value"))!);
    await dialog.locator("#agenda-presenter").selectOption({ label: "Dr. Minh Nguyen" });
    await dialog.getByLabel("Question for the board").fill("Restaging after cycle 3: continue TCHP or move surgery earlier?");
    await dialog.getByRole("button", { name: "Add to agenda" }).click();
    await expect(coordinator.getByRole("link", { name: "Maria Gonzalez" })).toBeVisible();

    await expect(coordinator.getByText("No brief yet")).toBeVisible();

    // 2. A clinician has AI draft the missing tumor board brief (offline demo engine in tests).
    const oncologist = await signIn("nguyen@riverside.demo");
    await oncologist.goto(meetingUrl);
    await oncologist.getByRole("button", { name: /Prepare with AI \(1 case\)/ }).click();
    await expect(oncologist.getByText(/AI drafted 1 tumor board brief/)).toBeVisible({ timeout: 60_000 });
    await expect(oncologist.getByText("Brief ready")).toBeVisible();

    await coordinator.reload();
    await coordinator.getByRole("button", { name: "Start meeting" }).click();
    await expect(coordinator.getByText("Meeting started. Outcomes can now be recorded.")).toBeVisible();

    // 3. The oncologist presents, records the conclusion and proposes a decision from it.
    await oncologist.goto(`${meetingUrl}/present`);
    await expect(oncologist.getByRole("heading", { name: "Maria Gonzalez", level: 1 })).toBeVisible();
    await expect(oncologist.getByText("Restaging after cycle 3: continue TCHP or move surgery earlier?")).toBeVisible();
    await oncologist.getByLabel("Conclusion").fill("Continue TCHP to 6 cycles, then breast-conserving surgery if the MRI response allows.");
    await oncologist.getByRole("button", { name: "Save as discussed" }).click();
    await expect(oncologist.getByText("Conclusion saved and shared with the care team.")).toBeVisible();

    await oncologist.getByRole("button", { name: "Propose decision" }).click();
    const decisionDialog = oncologist.getByRole("dialog");
    await expect(decisionDialog.locator("#decision-title")).toHaveValue(/Continue TCHP/);
    await decisionDialog.getByRole("button", { name: "Propose decision" }).click();
    await expect(oncologist.getByText("Decision proposed for review")).toBeVisible();
    await expect(oncologist).toHaveURL(/\/present/);
    const decisionLink = oncologist.getByRole("link", { name: /Decision #\d+/ });
    await expect(decisionLink).toBeVisible();

    // The care team sees the outcome in the case discussion, and the new decision under review.
    await oncologist.goto(`/cases/${gonzalez}/discussion`);
    await expect(oncologist.getByText(/Discussed at the tumor board "E2E breast tumor board"/)).toBeVisible();
    await oncologist.goto(`/cases/${gonzalez}/decisions`);
    await expect(oncologist.getByText("Continue TCHP to 6 cycles, then breast-conserving surgery if the MRI response allows.").first()).toBeVisible();

    // 4. The coordinator records attendance, ends the meeting and opens the minutes.
    await coordinator.reload();
    for (const name of ["Dr. Minh Nguyen", "Dr. Emily Smith"]) await coordinator.getByRole("checkbox", { name }).check();
    await coordinator.getByRole("button", { name: "Save attendance (2)" }).click();
    await expect(coordinator.getByText("Attendance saved.")).toBeVisible();
    await coordinator.getByRole("button", { name: "End meeting" }).click();
    await coordinator.getByRole("dialog").getByRole("button", { name: "End meeting" }).click();
    await expect(coordinator.getByText(/Meeting ended/)).toBeVisible();

    await coordinator.getByRole("link", { name: "Minutes" }).click();
    await expect(coordinator.getByRole("heading", { name: "Tumor board minutes" })).toBeVisible();
    const minutes = coordinator.locator("article");
    await expect(minutes).toContainText("Continue TCHP to 6 cycles");
    await expect(minutes).toContainText("Dr. Emily Smith (Surgical Oncology), Dr. Minh Nguyen (Medical Oncology)");
    await expect(minutes).toContainText(/Decision #\d+/);
    expect(problems).toEqual([]);
  });

  test("each person sees only the agenda cases they may open", async ({ signIn }) => {
    const oncologist = await signIn("nguyen@riverside.demo");
    await oncologist.goto("/meetings");
    await oncologist.getByRole("link", { name: /GI & Thoracic Tumor Board/ }).click();
    await expect(oncologist).toHaveURL(/\/meetings\/[^/]+$/);
    await expect(oncologist.getByRole("link", { name: "John Carter", exact: true })).toBeVisible();
    const meetingUrl = new URL(oncologist.url()).pathname;

    // A cardiologist outside these care teams sees the meeting but none of its cases.
    const cardiologist = await signIn("brooks@riverside.demo");
    await cardiologist.goto(meetingUrl);
    await expect(cardiologist.getByRole("heading", { name: "GI & Thoracic Tumor Board" })).toBeVisible();
    await expect(cardiologist.getByText("No cases on the agenda")).toBeVisible();
    await expect(cardiologist.getByText("John Carter")).toHaveCount(0);
  });

  test("the Vietnamese hospital's meetings and minutes are in Vietnamese", async ({ signIn }) => {
    const doctor = await signIn("khoa@benhvien.demo");
    await doctor.goto("/meetings");
    await expect(doctor.getByRole("heading", { name: "Hội chẩn", level: 1 })).toBeVisible();
    await expect(doctor.getByText("Đã lên lịch").first()).toBeVisible();
    await doctor.getByRole("link", { name: /Hội chẩn ung bướu đa chuyên khoa/ }).last().click();
    await doctor.getByRole("link", { name: "Biên bản" }).click();
    await expect(doctor.getByRole("heading", { name: "Biên bản hội chẩn" })).toBeVisible();
    await expect(doctor.locator("article")).toContainText("Osimertinib 80 mg/ngày bước một");
  });
});
