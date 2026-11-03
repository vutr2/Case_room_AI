import { describe, expect, it } from "vitest";
import { initials, patientName } from "./format";

describe("names", () => {
  it("abbreviates a name without its professional title", () => {
    expect(initials("Dr. Elena Park")).toBe("EP");
    expect(initials("BS. Nguyễn Văn An")).toBe("NA");
    expect(initials("ĐD. Ngô Thị Lan")).toBe("NL");
    expect(initials("Bùi Hải Yến")).toBe("BY");
  });

  it("writes a patient's name given name first, or family name first", () => {
    expect(patientName({ firstName: "Maria", lastName: "Gonzalez" })).toBe("Maria Gonzalez");
    expect(patientName({ firstName: "Văn Thành", lastName: "Nguyễn" }, true)).toBe("Nguyễn Văn Thành");
  });
});
