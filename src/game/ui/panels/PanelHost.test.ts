import { describe, expect, it, vi } from "vitest";
import { PanelHost } from "./PanelHost";
import type { PanelContext, PanelId, UIPanel } from "./panelTypes";

class FakeObject {
  type = "Rectangle";
  x: number;
  y: number;
  depth = 130;
  displayWidth: number;
  displayHeight: number;
  displayOriginX = 0;
  displayOriginY = 0;
  input?: object;
  destroyed = false;
  private readonly data = new Map<string, unknown>();
  private readonly listeners = new Map<string, ((...args: unknown[]) => void)[]>();

  constructor(x: number, y: number, width: number, height: number, frame = false) {
    this.x = x; this.y = y; this.displayWidth = width; this.displayHeight = height;
    if (frame) this.data.set("windowFrame", true);
  }

  setInteractive(): this { this.input = {}; return this; }
  setDepth(depth: number): this { this.depth = depth; return this; }
  setData(key: string, value: unknown): this { this.data.set(key, value); return this; }
  getData(key: string): unknown { return this.data.get(key); }
  on(event: string, listener: (...args: unknown[]) => void): this {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]); return this;
  }
  emit(event: string, ...args: unknown[]): void { for (const listener of this.listeners.get(event) ?? []) listener(...args); }
  destroy(): void { this.destroyed = true; }
}

function setup(overrides: Partial<Record<PanelId, Partial<UIPanel>>> = {}) {
  const objects: FakeObject[] = [];
  const datasets = new Map<string, string>();
  let blocked = false;
  const context = {
    objects,
    stateScale: 1,
    scene: { scale: { width: 800, height: 600 }, input: { setDraggable: vi.fn() } },
    clearComparison: vi.fn(),
    clearTooltip: vi.fn(),
    debug: {
      set: (key: string, value: string) => datasets.set(key, value),
      setActivePanel: (id: PanelId | null) => datasets.set("uiPanel", id ?? "closed"),
      setGameplayInputBlocked: (value: boolean) => { blocked = value; },
    },
  } as unknown as PanelContext;
  const makePanel = (id: PanelId): UIPanel => ({
    id,
    ...overrides[id],
    render: () => {
      const frame = new FakeObject(100, 80, 300, 240, true);
      const header = new FakeObject(100, 80, 300, 52);
      objects.push(frame, header);
    },
    destroy: vi.fn(),
  });
  const ids: PanelId[] = ["inventory", "character", "equipment", "skills", "shop"];
  const host = new PanelHost({
    context,
    addBackdrop: () => objects.push(new FakeObject(0, 0, 800, 600)),
  }, new Map(ids.map((id) => [id, makePanel(id)])));
  return { host, objects, datasets, get blocked() { return blocked; } };
}

describe("PanelHost", () => {
  it("keeps singleton ordinary windows open and focuses them independently", () => {
    const fixture = setup();
    fixture.host.open("inventory");
    fixture.host.open("character");
    expect(fixture.host.openPanels).toEqual(["inventory", "character"]);
    expect(fixture.objects).toHaveLength(4);
    expect(fixture.blocked).toBe(false);

    fixture.host.open("inventory");
    expect(fixture.host.openPanels).toEqual(["character", "inventory"]);
    expect(fixture.objects).toHaveLength(4);
  });

  it("closes only the topmost closable window", () => {
    const fixture = setup();
    fixture.host.open("equipment");
    fixture.host.open("skills");
    expect(fixture.host.closeTopmostClosable()).toBe(true);
    expect(fixture.host.openPanels).toEqual(["equipment"]);
  });

  it("adds a blocking backdrop only for modal windows", () => {
    const fixture = setup();
    fixture.host.open("inventory");
    expect(fixture.objects).toHaveLength(2);
    fixture.host.open("shop");
    expect(fixture.objects).toHaveLength(5);
    expect(fixture.blocked).toBe(true);
    fixture.host.close("shop");
    expect(fixture.blocked).toBe(false);
  });

  it("drags, clamps, and remembers a window position during the session", () => {
    const fixture = setup();
    fixture.host.open("inventory");
    const header = fixture.objects[1];
    header.emit("drag", {}, -200, -200);
    header.emit("dragend");
    expect(fixture.objects[0]?.x).toBe(0);
    expect(fixture.objects[0]?.y).toBe(0);
    fixture.host.close("inventory");
    fixture.host.open("inventory");
    expect(fixture.objects[0]?.x).toBe(0);
    expect(fixture.objects[0]?.y).toBe(0);
  });
});
