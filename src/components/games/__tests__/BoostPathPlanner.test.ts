import { describe, it, expect } from "vitest";
import { runBoostProgram } from "../BoostPathPlannerGame";

const LEVEL_1 = {
  title: "Test level",
  size: 4,
  start: { x: 0, y: 3 },
  goal: { x: 3, y: 0 },
  dir: "E" as const,
  walls: [
    { x: 1, y: 3 },
    { x: 1, y: 2 },
  ],
  maxSteps: 6,
};

describe("runBoostProgram", () => {
  it("returns success when program reaches the goal", () => {
    // Move forward, turn left, forward x3, turn right, forward x2
    // Going around the walls: E→F, N→L,F,F,F, E→R,F,F,F
    // Actually let's find a valid path:
    // Start at (0,3) facing E
    // F → (1,3) blocked! So we need to turn first.
    // L → facing N, F → (0,2), F → (0,1), F → (0,0)
    // R → facing E, F → (1,0), F → (2,0), F → (3,0) = goal!
    const result = runBoostProgram(LEVEL_1, ["L", "F", "F", "F", "R", "F", "F", "F"]);
    // This exceeds maxSteps but runBoostProgram doesn't enforce maxSteps, the UI does
    expect(result.success).toBe(true);
    expect(result.crashed).toBe(false);
  });

  it("reports crash when hitting a wall", () => {
    // Start at (0,3) facing E, move forward into wall at (1,3)
    const result = runBoostProgram(LEVEL_1, ["F"]);
    expect(result.success).toBe(false);
    expect(result.crashed).toBe(true);
  });

  it("reports failure without crash when goal not reached", () => {
    // Turn left (face N), move forward to (0,2)
    const result = runBoostProgram(LEVEL_1, ["L", "F"]);
    expect(result.success).toBe(false);
    expect(result.crashed).toBe(false);
    expect(result.pos).toEqual({ x: 0, y: 2 });
  });

  it("handles empty program", () => {
    const result = runBoostProgram(LEVEL_1, []);
    expect(result.success).toBe(false);
    expect(result.crashed).toBe(false);
    expect(result.pos).toEqual(LEVEL_1.start);
  });

  it("handles turns correctly", () => {
    const result = runBoostProgram(LEVEL_1, ["L"]);
    expect(result.dir).toBe("N");

    const result2 = runBoostProgram(LEVEL_1, ["R"]);
    expect(result2.dir).toBe("S");

    const result3 = runBoostProgram(LEVEL_1, ["L", "L"]);
    expect(result3.dir).toBe("W");
  });

  it("crashes on out of bounds", () => {
    // Start at (0,3) facing E, turn right (face S), go forward = (0,4) out of bounds
    const result = runBoostProgram(LEVEL_1, ["R", "F"]);
    expect(result.crashed).toBe(true);
  });
});
