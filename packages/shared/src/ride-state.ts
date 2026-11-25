import type { RideActor, RideStatus } from "./types";

type TransitionTable = Record<RideStatus, readonly RideStatus[]>;

/**
 * Mirrors the database state machine in `20261125120300_ride_engine.sql`.
 * This copy supports optimistic UI and tests; the database remains canonical.
 */
export const RIDE_TRANSITIONS: TransitionTable = {
  requested: ["searching", "cancelled", "no_driver_found"],
  searching: ["accepted", "cancelled", "no_driver_found"],
  accepted: ["driver_arriving", "cancelled", "disputed"],
  driver_arriving: ["driver_arrived", "cancelled", "disputed"],
  driver_arrived: ["in_progress", "cancelled", "disputed"],
  in_progress: ["completed", "disputed"],
  completed: ["disputed"],
  cancelled: ["disputed"],
  no_driver_found: [],
  disputed: ["completed", "cancelled"],
};

export interface TransitionCheck {
  allowed: boolean;
  reason?: "unknown_state" | "illegal_transition" | "actor_not_permitted";
}

const DRIVER_CANCEL_STATES: readonly RideStatus[] = [
  "accepted",
  "driver_arriving",
  "driver_arrived",
];

const PASSENGER_CANCEL_STATES: readonly RideStatus[] = [
  "requested",
  "searching",
  "accepted",
  "driver_arriving",
  "driver_arrived",
];

/**
 * Actor permission mirrors the trigger body. The transition table above is
 * checked first, so a permitted actor can still never resurrect a ride or skip
 * a lifecycle step.
 */
function actorMayTransition(from: RideStatus, to: RideStatus, actor: RideActor): boolean {
  if (actor === "platform_owner" || actor === "system") return true;

  if (actor === "passenger") {
    return (
      (PASSENGER_CANCEL_STATES.includes(from) && (to === "cancelled" || to === "no_driver_found")) ||
      (from === "requested" && to === "searching") ||
      ((from === "completed" || from === "cancelled") && to === "disputed")
    );
  }

  return (
    to === "accepted" ||
    to === "driver_arriving" ||
    to === "driver_arrived" ||
    to === "in_progress" ||
    to === "completed" ||
    (to === "cancelled" && DRIVER_CANCEL_STATES.includes(from))
  );
}

export function canTransition(
  from: RideStatus,
  to: RideStatus,
  actor: RideActor,
): TransitionCheck {
  const targets = RIDE_TRANSITIONS[from];
  if (!targets) return { allowed: false, reason: "unknown_state" };
  if (!targets.includes(to)) {
    return { allowed: false, reason: "illegal_transition" };
  }
  if (!actorMayTransition(from, to, actor)) {
    return { allowed: false, reason: "actor_not_permitted" };
  }
  return { allowed: true };
}

export function isTerminalState(status: RideStatus): boolean {
  return status === "completed" || status === "cancelled" || status === "no_driver_found";
}

export function isActiveRide(status: RideStatus): boolean {
  return !isTerminalState(status) && status !== "disputed";
}
