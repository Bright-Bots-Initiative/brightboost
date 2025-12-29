import { describe, it, expect, vi } from "vitest";
import { preventHpp } from "./security";
import { Request, Response, NextFunction } from "express";

describe("preventHpp middleware", () => {
  it("should keep single values as is", () => {
    const req = { query: { id: "123", name: "test" } } as unknown as Request;
    const next = vi.fn();

    preventHpp(req, {} as Response, next);

    expect(req.query).toEqual({ id: "123", name: "test" });
    expect(next).toHaveBeenCalled();
  });

  it("should flatten array values to the last element", () => {
    const req = {
      query: {
        id: ["1", "2", "3"], // HPP attack: ?id=1&id=2&id=3
        sort: "asc",
      },
    } as unknown as Request;
    const next = vi.fn();

    preventHpp(req, {} as Response, next);

    expect(req.query).toEqual({ id: "3", sort: "asc" });
    expect(next).toHaveBeenCalled();
  });

  it("should handle mixed single and array values", () => {
    const req = {
      query: {
        user: "alice",
        role: ["guest", "admin"], // HPP attack
      },
    } as unknown as Request;
    const next = vi.fn();

    preventHpp(req, {} as Response, next);

    expect(req.query).toEqual({ user: "alice", role: "admin" });
    expect(next).toHaveBeenCalled();
  });

  it("should handle empty query", () => {
    const req = { query: {} } as unknown as Request;
    const next = vi.fn();

    preventHpp(req, {} as Response, next);

    expect(req.query).toEqual({});
    expect(next).toHaveBeenCalled();
  });
});
