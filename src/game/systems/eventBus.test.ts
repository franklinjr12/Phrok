import { describe, expect, it } from "vitest";
import { eventBus } from "./eventBus";

describe("eventBus", () => {
  it("emits typed game events to subscribers", () => {
    const healthEvents: string[] = [];
    const unsubscribe = eventBus.on("playerHealthChanged", ({ hp, maxHp }) => {
      healthEvents.push(`${hp}/${maxHp}`);
    });

    eventBus.emit("playerHealthChanged", { hp: 12, maxHp: 24 });
    unsubscribe();
    eventBus.emit("playerHealthChanged", { hp: 8, maxHp: 24 });

    expect(healthEvents).toEqual(["12/24"]);
  });
});
