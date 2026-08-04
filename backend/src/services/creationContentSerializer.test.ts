import { describe, expect, it } from "vitest";
import { serializeCreationContent } from "./creationContentSerializer";

describe("serializeCreationContent", () => {
  it("projects Data Dash content to its owned fields", () => {
    expect(
      serializeCreationContent("data_dash_challenge", {
        v: 1,
        cardIds: ["bean", "fern", "pine", "moss"],
        sortRule: "waterNeed",
        inferRule: "growthSpeed",
        internalNote: "do not expose",
      }),
    ).toEqual({
      v: 1,
      cardIds: ["bean", "fern", "pine", "moss"],
      sortRule: "waterNeed",
      inferRule: "growthSpeed",
    });
  });

  it("preserves a race track while stripping unknown nested fields", () => {
    expect(
      serializeCreationContent("race_track", {
        v: 1,
        name: "Turbo Loop",
        grid: { w: 6, h: 6, privateGridNote: "hidden" },
        pieces: [
          { x: 1, y: 2, type: "start", rot: 0, privatePieceNote: "hidden" },
          { x: 2, y: 2, type: "finish", rot: 0 },
        ],
        privateRootNote: "hidden",
      }),
    ).toEqual({
      v: 1,
      name: "Turbo Loop",
      grid: { w: 6, h: 6 },
      pieces: [
        { x: 1, y: 2, type: "start", rot: 0 },
        { x: 2, y: 2, type: "finish", rot: 0 },
      ],
    });
  });

  it("preserves a sound duet while stripping unknown nested fields", () => {
    expect(
      serializeCreationContent("sound_duet", {
        v: 1,
        name: "Moon Echo",
        band: "k2",
        pulses: 4,
        layers: {
          lead: [{ t: 0, soundId: "step", privateEventNote: "hidden" }],
          partner: [{ t: 3, soundId: "clap" }],
          privateLayer: [{ secret: true }],
        },
        spots: ["tunnel"],
        coverPose: "highFive",
        privateRootNote: "hidden",
      }),
    ).toEqual({
      v: 1,
      name: "Moon Echo",
      band: "k2",
      pulses: 4,
      layers: {
        lead: [{ t: 0, soundId: "step" }],
        partner: [{ t: 3, soundId: "clap" }],
      },
      spots: ["tunnel"],
      coverPose: "highFive",
    });
  });

  it("fails closed for an unsupported creation type", () => {
    expect(
      serializeCreationContent("unknown_type", { secret: "not exposed" }),
    ).toBeNull();
  });

  it("fails closed for malformed top-level content", () => {
    expect(
      serializeCreationContent("race_track", ["not", "an", "object"]),
    ).toBeNull();
  });
});
