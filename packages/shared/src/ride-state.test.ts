import { describe, expect, it } from "vitest";
import { canTransition, isActiveRide, isTerminalState } from "./ride-state";
import type { RideActor, RideStatus } from "./types";

describe("ride state machine", () => {
  it("walks the happy path with the permitted actor at each step", () => {
    const path: Array<{ from: RideStatus; to: RideStatus; actor: RideActor }> = [
      { from: "requested", to: "searching", actor: "passenger" },
      { from: "searching", to: "accepted", actor: "driver" },
      { from: "accepted", to: "driver_arriving", actor: "driver" },
      { from: "driver_arriving", to: "driver_arrived", actor: "driver" },
      { from: "driver_arrived", to: "in_progress", actor: "driver" },
      { from: "in_progress", to: "completed", actor: "driver" },
    ];

    for (const step of path) {
      expect(canTransition(step.from, step.to, step.actor).allowed).toBe(true);
    }
  });

  it("keeps dispatch and lifecycle steps with the right actor", () => {
    expect(canTransition("requested", "searching", "driver").allowed).toBe(false);
    expect(canTransition("searching", "accepted", "passenger").allowed).toBe(false);
    expect(canTransition("searching", "accepted", "driver").allowed).toBe(true);
  });

  it("prevents a passenger from starting or completing a trip", () => {
    expect(canTransition("driver_arrived", "in_progress", "passenger")).toEqual({
      allowed: false,
      reason: "actor_not_permitted",
    });
    expect(canTransition("in_progress", "completed", "passenger")).toEqual({
      allowed: false,
      reason: "actor_not_permitted",
    });
  });

  it("prevents resurrection of terminal states", () => {
    expect(canTransition("completed", "in_progress", "platform_owner").allowed).toBe(false);
    expect(canTransition("cancelled", "accepted", "driver").allowed).toBe(false);
    expect(canTransition("no_driver_found", "searching", "system").allowed).toBe(false);
  });

  it("allows the platform owner to resolve disputes", () => {
    expect(canTransition("disputed", "completed", "platform_owner").allowed).toBe(true);
    expect(canTransition("disputed", "completed", "driver").allowed).toBe(false);
  });

  it("classifies ride states", () => {
    expect(isTerminalState("completed")).toBe(true);
    expect(isTerminalState("disputed")).toBe(false);
    expect(isActiveRide("accepted")).toBe(true);
    expect(isActiveRide("cancelled")).toBe(false);
  });
});
