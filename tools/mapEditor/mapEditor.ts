import type { MapDefinition, MonsterDefinition, NpcDefinition, RegionDefinition } from "../../src/game/types/dataDefinitions";
import "./styles.css";

type TiledPropertyType = "string" | "int" | "float" | "bool";
type TiledPropertyValue = string | number | boolean;

interface TiledProperty {
  name: string;
  type: TiledPropertyType;
  value: TiledPropertyValue;
}

interface TiledObject {
  height: number;
  id: number;
  name: string;
  point?: boolean;
  properties: TiledProperty[];
  rotation: number;
  type: string;
  visible: boolean;
  width: number;
  x: number;
  y: number;
}

interface TiledTileLayer {
  data: number[];
  height: number;
  id: number;
  name: string;
  opacity: number;
  type: "tilelayer";
  visible: boolean;
  width: number;
  x: number;
  y: number;
}

interface TiledObjectLayer {
  draworder: string;
  id: number;
  name: string;
  objects: TiledObject[];
  opacity: number;
  type: "objectgroup";
  visible: boolean;
  x: number;
  y: number;
}

type TiledLayer = TiledTileLayer | TiledObjectLayer;

interface TiledMap {
  compressionlevel: number;
  height: number;
  infinite: boolean;
  layers: TiledLayer[];
  nextlayerid: number;
  nextobjectid: number;
  orientation: string;
  renderorder: string;
  tiledversion: string;
  tileheight: number;
  tilesets: unknown[];
  tilewidth: number;
  type: "map";
  version: string;
  width: number;
}

type EditorTool = "select" | "paint" | "object";
type TileLayerName = "Ground" | "Decoration" | "Collision";
type InspectorTab = "map" | "object" | "export";

const objectTypes = ["spawn", "portal", "monsterSpawn", "npc", "safeZone", "gathering", "treasure"] as const;
type ObjectType = typeof objectTypes[number];

interface EditorState {
  maps: MapDefinition[];
  regions: RegionDefinition[];
  monsters: MonsterDefinition[];
  npcs: NpcDefinition[];
  assets: Map<string, TiledMap>;
  currentMapId: string;
  currentTilemapKey: string;
  selectedObjectId: number | null;
  tool: EditorTool;
  activeLayer: TileLayerName;
  selectedTile: number;
  selectedObjectType: ObjectType;
  inspectorTab: InspectorTab;
  zoom: number;
  showGrid: boolean;
  showCollision: boolean;
  showObjects: boolean;
  mapFilter: string;
  exportText: string;
  status: string;
  dirty: boolean;
}

const rootElement = document.querySelector<HTMLElement>("#map-editor");

if (!rootElement) {
  throw new Error("Map editor root was not found.");
}

const root: HTMLElement = rootElement;

const canvas = document.createElement("canvas");
canvas.id = "map-canvas";
canvas.setAttribute("data-testid", "map-canvas");
const canvasContext = canvas.getContext("2d");

if (!canvasContext) {
  throw new Error("2D canvas context was not available.");
}

const context: CanvasRenderingContext2D = canvasContext;

let state: EditorState;
let isPointerDown = false;
let draggedObjectId: number | null = null;
let dragOffset = { x: 0, y: 0 };

init().catch((error: unknown) => {
  root.innerHTML = `<div class="panel-section">Map editor failed to load: ${escapeHtml(String(error))}</div>`;
});

async function init(): Promise<void> {
  const [maps, regions, monsters, npcs] = await Promise.all([
    fetchJson<MapDefinition[]>("/assets/data/maps.json"),
    fetchJson<RegionDefinition[]>("/assets/data/regions.json"),
    fetchJson<MonsterDefinition[]>("/assets/data/monsters.json"),
    fetchJson<NpcDefinition[]>("/assets/data/npcs.json"),
  ]);
  const firstMap = maps[0];

  if (!firstMap) {
    throw new Error("No map definitions were found.");
  }

  state = {
    maps: clone(maps),
    regions,
    monsters,
    npcs,
    assets: new Map(),
    currentMapId: firstMap.id,
    currentTilemapKey: firstMap.tilemapKey,
    selectedObjectId: null,
    tool: "select",
    activeLayer: "Ground",
    selectedTile: 1,
    selectedObjectType: "spawn",
    inspectorTab: "map",
    zoom: 1,
    showGrid: true,
    showCollision: true,
    showObjects: true,
    mapFilter: "",
    exportText: "",
    status: "Loaded",
    dirty: false,
  };

  await ensureCurrentAsset();
  renderShell();
  bindCanvasEvents();
  renderAll();
  root.dataset.editorReady = "true";
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}`);
  }

  return await response.json() as T;
}

async function ensureCurrentAsset(): Promise<void> {
  if (state.assets.has(state.currentTilemapKey)) {
    return;
  }

  const path = tilemapPathFromKey(state.currentTilemapKey);

  try {
    state.assets.set(state.currentTilemapKey, await fetchJson<TiledMap>(path));
  } catch {
    state.assets.set(state.currentTilemapKey, createBlankMap());
    state.status = `Created blank asset for ${state.currentTilemapKey}`;
  }
}

function tilemapPathFromKey(tilemapKey: string): string {
  return `/assets/maps/${tilemapKey.replace(/^map-/, "")}.json`;
}

function renderShell(): void {
  root.innerHTML = `
    <main class="editor-shell">
      <aside class="left-panel">
        <section class="panel-section">
          <h1 class="panel-title">Maps</h1>
          <input class="map-search" data-action="map-filter" placeholder="Filter maps" />
          <div class="map-list" data-region="map-list"></div>
        </section>
        <section class="panel-section">
          <h2 class="panel-title">Layer</h2>
          <div class="segmented" data-region="layer-buttons"></div>
        </section>
        <section class="panel-section">
          <h2 class="panel-title">Tiles</h2>
          <div class="tile-palette" data-region="tile-palette"></div>
        </section>
        <section class="panel-section">
          <h2 class="panel-title">Objects</h2>
          <div class="object-palette" data-region="object-palette"></div>
        </section>
        <section class="panel-section">
          <h2 class="panel-title">Object List</h2>
          <div class="object-list" data-region="object-list"></div>
        </section>
      </aside>
      <section class="toolbar">
        <header class="top-bar">
          <div class="top-title" data-region="top-title"></div>
          <div class="tool-cluster" data-region="tool-buttons"></div>
          <div class="tool-cluster">
            <button data-action="toggle-grid" title="Grid" aria-pressed="true">Grid</button>
            <button data-action="toggle-collision" title="Collision" aria-pressed="true">Collision</button>
            <button data-action="toggle-objects" title="Objects" aria-pressed="true">Objects</button>
            <input data-action="zoom" type="range" min="0.75" max="2" step="0.25" value="1" title="Zoom" />
          </div>
        </header>
        <div class="canvas-wrap">
          <div class="canvas-stage" data-region="canvas-stage"></div>
        </div>
      </section>
      <aside class="right-panel">
        <div class="inspector-tabs" data-region="inspector-tabs"></div>
        <div class="inspector-body" data-region="inspector"></div>
      </aside>
    </main>
  `;

  root.querySelector<HTMLElement>("[data-region='canvas-stage']")?.append(canvas);
  bindShellEvents();
}

function bindShellEvents(): void {
  root.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>("[data-action]") : null;

    if (!target) {
      return;
    }

    const action = target.dataset.action;
    if (action === "select-map") {
      void selectMap(target.dataset.mapId ?? "");
    } else if (action === "set-tool") {
      state.tool = target.dataset.tool as EditorTool;
      renderAll();
    } else if (action === "set-layer") {
      state.activeLayer = target.dataset.layer as TileLayerName;
      state.tool = "paint";
      renderAll();
    } else if (action === "set-tile") {
      state.selectedTile = Number(target.dataset.tile ?? "0");
      state.tool = "paint";
      renderAll();
    } else if (action === "set-object-type") {
      state.selectedObjectType = target.dataset.objectType as ObjectType;
      state.tool = "object";
      renderAll();
    } else if (action === "select-object") {
      state.selectedObjectId = Number(target.dataset.objectId);
      state.inspectorTab = "object";
      state.tool = "select";
      renderAll();
    } else if (action === "set-tab") {
      state.inspectorTab = target.dataset.tab as InspectorTab;
      renderAll();
    } else if (action === "toggle-grid") {
      state.showGrid = !state.showGrid;
      renderAll();
    } else if (action === "toggle-collision") {
      state.showCollision = !state.showCollision;
      renderAll();
    } else if (action === "toggle-objects") {
      state.showObjects = !state.showObjects;
      renderAll();
    } else if (action === "delete-object") {
      deleteSelectedObject();
    } else if (action === "duplicate-object") {
      duplicateSelectedObject();
    } else if (action === "add-property") {
      addPropertyToSelectedObject();
    } else if (action === "remove-property") {
      removePropertyFromSelectedObject(Number(target.dataset.propertyIndex));
    } else if (action === "sync-metadata") {
      syncMetadataFromObjects();
    } else if (action === "add-portal-row") {
      addPortalRow();
    } else if (action === "remove-portal-row") {
      removePortalRow(Number(target.dataset.rowIndex));
    } else if (action === "add-spawn-row") {
      addSpawnGroupRow();
    } else if (action === "remove-spawn-row") {
      removeSpawnGroupRow(Number(target.dataset.rowIndex));
    } else if (action === "export-map") {
      exportCurrentMap();
    } else if (action === "export-maps") {
      exportMapsData();
    } else if (action === "copy-export") {
      void copyExportText();
    } else if (action === "download-export") {
      downloadCurrentExport();
    } else if (action === "import-map") {
      root.querySelector<HTMLInputElement>("[data-action='import-map-file']")?.click();
    } else if (action === "import-maps") {
      root.querySelector<HTMLInputElement>("[data-action='import-maps-file']")?.click();
    }
  });

  root.addEventListener("input", (event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    const action = target.dataset.action;

    if (action === "map-filter") {
      state.mapFilter = target.value;
      renderMapList();
    } else if (action === "zoom") {
      state.zoom = Number(target.value);
      renderCanvas();
    } else if (action === "map-field") {
      updateMapField(target.name, target.value);
    } else if (action === "portal-field") {
      updatePortalField(Number(target.dataset.rowIndex), target.name, target.value);
    } else if (action === "spawn-field") {
      updateSpawnGroupField(Number(target.dataset.rowIndex), target.name, target.value);
    } else if (action === "object-field") {
      updateObjectField(target.name, target.value, target.type === "checkbox" ? (target as HTMLInputElement).checked : undefined);
    } else if (action === "property-field") {
      updateObjectProperty(Number(target.dataset.propertyIndex), target.name, target.value);
    } else if (action === "import-map-file") {
      void importMapFile(target as HTMLInputElement);
    } else if (action === "import-maps-file") {
      void importMapsFile(target as HTMLInputElement);
    }
  });
}

function bindCanvasEvents(): void {
  canvas.addEventListener("pointerdown", (event) => {
    isPointerDown = true;
    canvas.setPointerCapture(event.pointerId);
    handleCanvasPointer(event, true);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (isPointerDown) {
      handleCanvasPointer(event, false);
    }
  });
  canvas.addEventListener("pointerup", (event) => {
    isPointerDown = false;
    draggedObjectId = null;
    canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointerleave", () => {
    isPointerDown = false;
    draggedObjectId = null;
  });
}

async function selectMap(mapId: string): Promise<void> {
  const map = state.maps.find((entry) => entry.id === mapId);

  if (!map) {
    return;
  }

  state.currentMapId = map.id;
  state.currentTilemapKey = map.tilemapKey;
  state.selectedObjectId = null;
  await ensureCurrentAsset();
  state.status = `Selected ${map.name}`;
  renderAll();
}

function renderAll(): void {
  root.dataset.currentMapId = state.currentMapId;
  root.dataset.selectedObjectId = state.selectedObjectId === null ? "" : String(state.selectedObjectId);
  root.dataset.validationIssues = String(validateCurrent().length);
  renderMapList();
  renderToolButtons();
  renderLayerButtons();
  renderTilePalette();
  renderObjectPalette();
  renderObjectList();
  renderTopTitle();
  renderInspectorTabs();
  renderInspector();
  renderCanvas();
}

function renderMapList(): void {
  const list = root.querySelector<HTMLElement>("[data-region='map-list']");
  const search = root.querySelector<HTMLInputElement>("[data-action='map-filter']");

  if (!list) {
    return;
  }

  if (search && search.value !== state.mapFilter) {
    search.value = state.mapFilter;
  }

  const filter = state.mapFilter.trim().toLowerCase();
  const maps = state.maps.filter((map) => (
    map.name.toLowerCase().includes(filter) || map.id.toLowerCase().includes(filter)
  ));

  list.innerHTML = maps.map((map) => `
    <button data-action="select-map" data-map-id="${escapeAttr(map.id)}" aria-pressed="${map.id === state.currentMapId}">
      <span>${escapeHtml(map.name)}</span>
      <small>${escapeHtml(map.type)} ${map.levelRange.min}-${map.levelRange.max}</small>
    </button>
  `).join("");
}

function renderToolButtons(): void {
  const region = root.querySelector<HTMLElement>("[data-region='tool-buttons']");

  if (!region) {
    return;
  }

  region.innerHTML = [
    toolButton("select", "Select"),
    toolButton("paint", "Paint"),
    toolButton("object", "Place"),
  ].join("");
}

function toolButton(tool: EditorTool, label: string): string {
  return `<button data-action="set-tool" data-tool="${tool}" aria-pressed="${state.tool === tool}">${label}</button>`;
}

function renderLayerButtons(): void {
  const region = root.querySelector<HTMLElement>("[data-region='layer-buttons']");
  const layers: TileLayerName[] = ["Ground", "Decoration", "Collision"];

  if (!region) {
    return;
  }

  region.innerHTML = layers.map((layer) => (
    `<button class="chip" data-action="set-layer" data-layer="${layer}" aria-pressed="${state.activeLayer === layer}">${layer}</button>`
  )).join("");
}

function renderTilePalette(): void {
  const region = root.querySelector<HTMLElement>("[data-region='tile-palette']");

  if (!region) {
    return;
  }

  region.innerHTML = [
    tileButton(0, "Empty", "empty"),
    tileButton(1, "Grass", "grass"),
    tileButton(2, "Stone", "stone"),
  ].join("");
}

function tileButton(tile: number, label: string, swatch: string): string {
  return `
    <button class="chip" data-action="set-tile" data-tile="${tile}" aria-pressed="${state.selectedTile === tile}">
      <span class="swatch ${swatch}"></span>${label}
    </button>
  `;
}

function renderObjectPalette(): void {
  const region = root.querySelector<HTMLElement>("[data-region='object-palette']");

  if (!region) {
    return;
  }

  region.innerHTML = objectTypes.map((type) => (
    `<button class="chip" data-action="set-object-type" data-object-type="${type}" aria-pressed="${state.selectedObjectType === type}">${objectLabel(type)}</button>`
  )).join("");
}

function renderObjectList(): void {
  const region = root.querySelector<HTMLElement>("[data-region='object-list']");

  if (!region) {
    return;
  }

  region.innerHTML = getObjectLayer().objects.map((object) => `
    <button data-action="select-object" data-object-id="${object.id}" aria-pressed="${object.id === state.selectedObjectId}">
      <span class="pill ${escapeAttr(object.type)}">${escapeHtml(objectLabel(object.type))}</span>
      <span>${escapeHtml(object.name)}</span>
    </button>
  `).join("");
}

function renderTopTitle(): void {
  const region = root.querySelector<HTMLElement>("[data-region='top-title']");
  const map = getCurrentMap();
  const asset = getCurrentAsset();

  if (!region) {
    return;
  }

  region.innerHTML = `
    <strong>${escapeHtml(map.name)}</strong>
    <span>${escapeHtml(map.id)} / ${escapeHtml(state.currentTilemapKey)} / ${asset.width}x${asset.height}</span>
  `;

  for (const action of ["toggle-grid", "toggle-collision", "toggle-objects"] as const) {
    const button = root.querySelector<HTMLButtonElement>(`[data-action='${action}']`);

    if (!button) {
      continue;
    }

    const pressed = action === "toggle-grid"
      ? state.showGrid
      : action === "toggle-collision"
        ? state.showCollision
        : state.showObjects;
    button.setAttribute("aria-pressed", String(pressed));
  }
}

function renderInspectorTabs(): void {
  const region = root.querySelector<HTMLElement>("[data-region='inspector-tabs']");

  if (!region) {
    return;
  }

  region.innerHTML = [
    tabButton("map", "Map"),
    tabButton("object", "Object"),
    tabButton("export", "Export"),
  ].join("");
}

function tabButton(tab: InspectorTab, label: string): string {
  return `<button data-action="set-tab" data-tab="${tab}" aria-pressed="${state.inspectorTab === tab}">${label}</button>`;
}

function renderInspector(): void {
  if (state.inspectorTab === "map") {
    renderMapInspector();
  } else if (state.inspectorTab === "object") {
    renderObjectInspector();
  } else {
    renderExportInspector();
  }
}

function renderMapInspector(): void {
  const region = root.querySelector<HTMLElement>("[data-region='inspector']");
  const map = getCurrentMap();
  const regionOptions = state.regions.map((entry) => option(entry.id, `${entry.name} (${entry.id})`, entry.id === map.regionId)).join("");
  const mapTypeOptions = ["town", "field", "dungeon", "tower", "coast", "highlands", "marsh"]
    .map((entry) => option(entry, entry, entry === map.type)).join("");

  if (!region) {
    return;
  }

  region.innerHTML = `
    <section class="panel-section">
      <h2 class="panel-title">Map Data <button data-action="sync-metadata">Sync</button></h2>
      <div class="field-grid">
        ${inputField("Name", "name", map.name)}
        <div class="field"><label>Type</label><select data-action="map-field" name="type">${mapTypeOptions}</select></div>
        <div class="field"><label>Region</label><select data-action="map-field" name="regionId">${regionOptions}</select></div>
        ${inputField("Tilemap Key", "tilemapKey", map.tilemapKey)}
        ${inputField("Music", "musicKey", map.musicKey)}
        ${numberField("Min", "levelRange.min", map.levelRange.min)}
        ${numberField("Max", "levelRange.max", map.levelRange.max)}
      </div>
      <div class="field-grid single">
        ${textareaField("Description", "description", map.description)}
        ${inputField("Elements", "recommendedElements", map.recommendedElements.join(", "))}
        ${inputField("Drops", "dropHighlights", map.dropHighlights.join(", "))}
        ${inputField("Monsters", "monsterIds", map.monsterIds.join(", "))}
        ${inputField("NPCs", "npcIds", map.npcIds.join(", "))}
      </div>
    </section>
    <section class="panel-section">
      <h2 class="panel-title">Portals <button data-action="add-portal-row">Add</button></h2>
      <div class="array-list">
        ${map.portals.map((portal, index) => portalRow(portal, index)).join("")}
      </div>
    </section>
    <section class="panel-section">
      <h2 class="panel-title">Spawn Groups <button data-action="add-spawn-row">Add</button></h2>
      <div class="array-list">
        ${map.spawnGroups.map((group, index) => spawnGroupRow(group, index)).join("")}
      </div>
    </section>
    <section class="panel-section">
      <h2 class="panel-title">Validation</h2>
      <div class="issue-list">${validationMarkup()}</div>
    </section>
  `;
}

function renderObjectInspector(): void {
  const region = root.querySelector<HTMLElement>("[data-region='inspector']");
  const object = getSelectedObject();

  if (!region) {
    return;
  }

  if (!object) {
    region.innerHTML = `
      <section class="panel-section">
        <h2 class="panel-title">Object</h2>
        <div class="status-line">No object selected.</div>
      </section>
    `;
    return;
  }

  const typeOptions = objectTypes.map((type) => option(type, objectLabel(type), type === object.type)).join("");

  region.innerHTML = `
    <section class="panel-section">
      <h2 class="panel-title">
        Object
        <span class="tool-cluster">
          <button data-action="duplicate-object">Copy</button>
          <button data-action="delete-object">Delete</button>
        </span>
      </h2>
      <div class="field-grid">
        ${inputField("Name", "name", object.name, "object-field")}
        <div class="field"><label>Type</label><select data-action="object-field" name="type">${typeOptions}</select></div>
        ${numberField("X", "x", object.x, "object-field")}
        ${numberField("Y", "y", object.y, "object-field")}
        ${numberField("Width", "width", object.width, "object-field")}
        ${numberField("Height", "height", object.height, "object-field")}
      </div>
      <div class="field">
        <label>Point</label>
        <input data-action="object-field" name="point" type="checkbox" ${object.point ? "checked" : ""} />
      </div>
    </section>
    <section class="panel-section">
      <h2 class="panel-title">Properties <button data-action="add-property">Add</button></h2>
      <div class="property-list">
        ${object.properties.map((property, index) => propertyRow(property, index)).join("")}
      </div>
    </section>
    <section class="panel-section">
      <h2 class="panel-title">Validation</h2>
      <div class="issue-list">${validationMarkup()}</div>
    </section>
  `;
}

function renderExportInspector(): void {
  const region = root.querySelector<HTMLElement>("[data-region='inspector']");

  if (!region) {
    return;
  }

  region.innerHTML = `
    <section class="panel-section">
      <h2 class="panel-title">Import</h2>
      <div class="field-grid">
        <button data-action="import-map">Map JSON</button>
        <button data-action="import-maps">maps.json</button>
      </div>
      <input data-action="import-map-file" type="file" accept="application/json,.json" hidden />
      <input data-action="import-maps-file" type="file" accept="application/json,.json" hidden />
    </section>
    <section class="panel-section">
      <h2 class="panel-title">Export</h2>
      <div class="field-grid">
        <button data-action="export-map" data-testid="export-map">Map JSON</button>
        <button data-action="export-maps">maps.json</button>
        <button data-action="copy-export">Copy</button>
        <button data-action="download-export">Download</button>
      </div>
    </section>
    <section class="panel-section">
      <h2 class="panel-title">Output</h2>
      <textarea class="export-output" data-testid="export-output" readonly>${escapeHtml(state.exportText)}</textarea>
      <div class="status-line">${escapeHtml(state.status)}</div>
    </section>
    <section class="panel-section">
      <h2 class="panel-title">Validation</h2>
      <div class="issue-list">${validationMarkup()}</div>
    </section>
  `;
}

function inputField(label: string, name: string, value: string, action = "map-field"): string {
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <input data-action="${action}" name="${escapeAttr(name)}" value="${escapeAttr(value)}" />
    </div>
  `;
}

function numberField(label: string, name: string, value: number, action = "map-field"): string {
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <input data-action="${action}" name="${escapeAttr(name)}" type="number" value="${Number(value)}" />
    </div>
  `;
}

function textareaField(label: string, name: string, value: string): string {
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <textarea data-action="map-field" name="${escapeAttr(name)}">${escapeHtml(value)}</textarea>
    </div>
  `;
}

function portalRow(portal: MapDefinition["portals"][number], index: number): string {
  return `
    <div class="row-editor">
      <input data-action="portal-field" data-row-index="${index}" name="id" value="${escapeAttr(portal.id)}" />
      <input data-action="portal-field" data-row-index="${index}" name="name" value="${escapeAttr(portal.name)}" />
      <button data-action="remove-portal-row" data-row-index="${index}">X</button>
      <input data-action="portal-field" data-row-index="${index}" name="targetMapId" value="${escapeAttr(portal.targetMapId)}" />
      <input data-action="portal-field" data-row-index="${index}" name="targetSpawnName" value="${escapeAttr(portal.targetSpawnName)}" />
    </div>
  `;
}

function spawnGroupRow(group: MapDefinition["spawnGroups"][number], index: number): string {
  return `
    <div class="row-editor">
      <input data-action="spawn-field" data-row-index="${index}" name="id" value="${escapeAttr(group.id)}" />
      <input data-action="spawn-field" data-row-index="${index}" name="monsterIds" value="${escapeAttr(group.monsterIds.join(", "))}" />
      <button data-action="remove-spawn-row" data-row-index="${index}">X</button>
      <input data-action="spawn-field" data-row-index="${index}" name="maxCount" type="number" value="${group.maxCount}" />
    </div>
  `;
}

function propertyRow(property: TiledProperty, index: number): string {
  const typeOptions = ["string", "int", "float", "bool"].map((type) => option(type, type, type === property.type)).join("");

  return `
    <div class="property-row">
      <input data-action="property-field" data-property-index="${index}" name="name" value="${escapeAttr(property.name)}" />
      <select data-action="property-field" data-property-index="${index}" name="type">${typeOptions}</select>
      <input data-action="property-field" data-property-index="${index}" name="value" value="${escapeAttr(String(property.value))}" />
      <button data-action="remove-property" data-property-index="${index}">X</button>
    </div>
  `;
}

function option(value: string, label: string, selected: boolean): string {
  return `<option value="${escapeAttr(value)}" ${selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function renderCanvas(): void {
  const asset = getCurrentAsset();
  const cssWidth = Math.max(1, asset.width * asset.tilewidth * state.zoom);
  const cssHeight = Math.max(1, asset.height * asset.tileheight * state.zoom);
  const dpr = window.devicePixelRatio || 1;

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  canvas.width = Math.ceil(cssWidth * dpr);
  canvas.height = Math.ceil(cssHeight * dpr);
  context.setTransform(dpr * state.zoom, 0, 0, dpr * state.zoom, 0, 0);
  context.clearRect(0, 0, asset.width * asset.tilewidth, asset.height * asset.tileheight);

  drawTileLayer("Ground", false);
  drawTileLayer("Decoration", true);

  if (state.showCollision) {
    drawCollisionLayer();
  }

  if (state.showGrid) {
    drawGrid();
  }

  if (state.showObjects) {
    drawObjects();
  }
}

function drawTileLayer(layerName: TileLayerName, transparentZero: boolean): void {
  const asset = getCurrentAsset();
  const layer = getTileLayer(layerName);

  for (let y = 0; y < layer.height; y += 1) {
    for (let x = 0; x < layer.width; x += 1) {
      const value = layer.data[y * layer.width + x] ?? 0;

      if (transparentZero && value === 0) {
        continue;
      }

      context.fillStyle = tileColor(value, layerName);
      context.fillRect(x * asset.tilewidth, y * asset.tileheight, asset.tilewidth, asset.tileheight);

      if (value === 2 && layerName !== "Ground") {
        context.strokeStyle = "rgba(230, 238, 238, 0.22)";
        context.lineWidth = 2;
        context.strokeRect(x * asset.tilewidth + 4, y * asset.tileheight + 4, asset.tilewidth - 8, asset.tileheight - 8);
      }
    }
  }
}

function drawCollisionLayer(): void {
  const asset = getCurrentAsset();
  const layer = getTileLayer("Collision");

  for (let y = 0; y < layer.height; y += 1) {
    for (let x = 0; x < layer.width; x += 1) {
      const value = layer.data[y * layer.width + x] ?? 0;

      if (value <= 0) {
        continue;
      }

      context.fillStyle = "rgba(217, 80, 72, 0.34)";
      context.fillRect(x * asset.tilewidth, y * asset.tileheight, asset.tilewidth, asset.tileheight);
      context.strokeStyle = "rgba(255, 225, 206, 0.72)";
      context.lineWidth = 2;
      context.strokeRect(x * asset.tilewidth + 1, y * asset.tileheight + 1, asset.tilewidth - 2, asset.tileheight - 2);
    }
  }
}

function drawGrid(): void {
  const asset = getCurrentAsset();

  context.strokeStyle = "rgba(236, 244, 235, 0.16)";
  context.lineWidth = 1;

  for (let x = 0; x <= asset.width; x += 1) {
    const px = x * asset.tilewidth + 0.5;
    context.beginPath();
    context.moveTo(px, 0);
    context.lineTo(px, asset.height * asset.tileheight);
    context.stroke();
  }

  for (let y = 0; y <= asset.height; y += 1) {
    const py = y * asset.tileheight + 0.5;
    context.beginPath();
    context.moveTo(0, py);
    context.lineTo(asset.width * asset.tilewidth, py);
    context.stroke();
  }
}

function drawObjects(): void {
  const selected = state.selectedObjectId;

  for (const object of getObjectLayer().objects) {
    const style = objectStyle(object.type);
    const isPoint = Boolean(object.point);
    const x = object.x;
    const y = object.y;
    const width = isPoint ? 28 : object.width;
    const height = isPoint ? 28 : object.height;
    const left = isPoint ? x - width / 2 : x;
    const top = isPoint ? y - height / 2 : y;

    context.fillStyle = style.fill;
    context.strokeStyle = object.id === selected ? "#f8fafc" : style.stroke;
    context.lineWidth = object.id === selected ? 3 : 2;
    context.fillRect(left, top, width, height);
    context.strokeRect(left, top, width, height);
    context.fillStyle = "#f8fafc";
    context.font = "12px Arial";
    context.textBaseline = "bottom";
    context.fillText(objectLabel(object.type), left + 3, top - 3);
  }
}

function handleCanvasPointer(event: PointerEvent, initial: boolean): void {
  const point = canvasPoint(event);

  if (state.tool === "paint") {
    paintTile(point.x, point.y);
  } else if (state.tool === "object") {
    if (initial) {
      createObjectAt(point.x, point.y);
    }
  } else if (initial) {
    const object = findObjectAt(point.x, point.y);
    state.selectedObjectId = object?.id ?? null;
    state.inspectorTab = object ? "object" : state.inspectorTab;
    draggedObjectId = object?.id ?? null;
    dragOffset = object ? { x: point.x - object.x, y: point.y - object.y } : { x: 0, y: 0 };
    renderAll();
  } else if (draggedObjectId !== null) {
    const object = getObjectLayer().objects.find((entry) => entry.id === draggedObjectId);

    if (object) {
      object.x = snap(point.x - dragOffset.x);
      object.y = snap(point.y - dragOffset.y);
      markDirty("Moved object");
      renderAll();
    }
  }
}

function canvasPoint(event: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left) / state.zoom,
    y: (event.clientY - rect.top) / state.zoom,
  };
}

function paintTile(worldX: number, worldY: number): void {
  const asset = getCurrentAsset();
  const tileX = Math.floor(worldX / asset.tilewidth);
  const tileY = Math.floor(worldY / asset.tileheight);

  if (tileX < 0 || tileY < 0 || tileX >= asset.width || tileY >= asset.height) {
    return;
  }

  const layer = getTileLayer(state.activeLayer);
  const index = tileY * layer.width + tileX;
  const value = state.activeLayer === "Collision" && state.selectedTile > 0 ? 2 : state.selectedTile;

  if (layer.data[index] === value) {
    return;
  }

  layer.data[index] = value;
  markDirty("Painted tile");
  renderCanvas();
}

function createObjectAt(worldX: number, worldY: number): void {
  const layer = getObjectLayer();
  const type = state.selectedObjectType;
  const id = getCurrentAsset().nextobjectid;
  const point = type === "spawn" || type === "npc" || type === "gathering" || type === "treasure";
  const object: TiledObject = {
    height: point ? 32 : type === "safeZone" ? 96 : 64,
    id,
    name: defaultObjectName(type, id),
    point: point || undefined,
    properties: defaultProperties(type),
    rotation: 0,
    type,
    visible: true,
    width: point ? 32 : type === "monsterSpawn" ? 128 : 64,
    x: snap(worldX),
    y: snap(worldY),
  };

  layer.objects.push(object);
  getCurrentAsset().nextobjectid = id + 1;
  state.selectedObjectId = object.id;
  state.inspectorTab = "object";
  markDirty("Created object");
  renderAll();
}

function findObjectAt(worldX: number, worldY: number): TiledObject | undefined {
  const objects = [...getObjectLayer().objects].reverse();

  return objects.find((object) => {
    const isPoint = Boolean(object.point);
    const width = isPoint ? 32 : object.width;
    const height = isPoint ? 32 : object.height;
    const left = isPoint ? object.x - width / 2 : object.x;
    const top = isPoint ? object.y - height / 2 : object.y;

    return worldX >= left && worldX <= left + width && worldY >= top && worldY <= top + height;
  });
}

function updateMapField(name: string, value: string): void {
  const map = getCurrentMap();

  if (name === "levelRange.min" || name === "levelRange.max") {
    map.levelRange[name.endsWith("min") ? "min" : "max"] = Number(value);
  } else if (name === "recommendedElements" || name === "dropHighlights" || name === "monsterIds" || name === "npcIds") {
    map[name] = splitList(value);
  } else if (name === "tilemapKey") {
    map.tilemapKey = value;
    state.currentTilemapKey = value;
    void ensureCurrentAsset().then(renderAll);
  } else if (name in map) {
    (map as unknown as Record<string, string>)[name] = value;
  }

  markDirty("Updated map data");
  renderTopTitle();
  renderCanvas();
}

function updatePortalField(index: number, name: string, value: string): void {
  const portal = getCurrentMap().portals[index];

  if (!portal) {
    return;
  }

  (portal as unknown as Record<string, string>)[name] = value;
  markDirty("Updated portal");
  renderAll();
}

function updateSpawnGroupField(index: number, name: string, value: string): void {
  const group = getCurrentMap().spawnGroups[index];

  if (!group) {
    return;
  }

  if (name === "monsterIds") {
    group.monsterIds = splitList(value);
  } else if (name === "maxCount") {
    group.maxCount = Math.max(1, Number(value));
  } else {
    group.id = value;
  }

  markDirty("Updated spawn group");
  renderAll();
}

function updateObjectField(name: string, value: string, checked?: boolean): void {
  const object = getSelectedObject();

  if (!object) {
    return;
  }

  if (name === "point") {
    object.point = checked || undefined;
  } else if (name === "x" || name === "y" || name === "width" || name === "height") {
    object[name] = Number(value);
  } else if (name === "type") {
    object.type = value;
    object.properties = mergeDefaultProperties(value, object.properties);
  } else if (name === "name") {
    object.name = value;
  }

  markDirty("Updated object");
  renderAll();
}

function updateObjectProperty(index: number, name: string, value: string): void {
  const object = getSelectedObject();
  const property = object?.properties[index];

  if (!object || !property) {
    return;
  }

  if (name === "name") {
    property.name = value;
  } else if (name === "type") {
    property.type = value as TiledPropertyType;
    property.value = parsePropertyValue(String(property.value), property.type);
  } else {
    property.value = parsePropertyValue(value, property.type);
  }

  markDirty("Updated property");
  renderAll();
}

function addPropertyToSelectedObject(): void {
  const object = getSelectedObject();

  if (!object) {
    return;
  }

  object.properties.push({ name: "property", type: "string", value: "" });
  markDirty("Added property");
  renderAll();
}

function removePropertyFromSelectedObject(index: number): void {
  const object = getSelectedObject();

  if (!object) {
    return;
  }

  object.properties.splice(index, 1);
  markDirty("Removed property");
  renderAll();
}

function deleteSelectedObject(): void {
  const layer = getObjectLayer();

  if (state.selectedObjectId === null) {
    return;
  }

  layer.objects = layer.objects.filter((object) => object.id !== state.selectedObjectId);
  state.selectedObjectId = null;
  markDirty("Deleted object");
  renderAll();
}

function duplicateSelectedObject(): void {
  const object = getSelectedObject();

  if (!object) {
    return;
  }

  const id = getCurrentAsset().nextobjectid;
  const copy = clone(object);
  copy.id = id;
  copy.name = `${object.name} Copy`;
  copy.x += 32;
  copy.y += 32;
  getObjectLayer().objects.push(copy);
  getCurrentAsset().nextobjectid = id + 1;
  state.selectedObjectId = id;
  markDirty("Duplicated object");
  renderAll();
}

function syncMetadataFromObjects(): void {
  const map = getCurrentMap();
  const objects = getObjectLayer().objects;
  const portalObjects = objects.filter((object) => object.type === "portal");
  const monsterSpawnObjects = objects.filter((object) => object.type === "monsterSpawn");

  map.portals = portalObjects.map((object) => ({
    id: kebab(object.name),
    name: object.name,
    targetMapId: getPropertyString(object, "targetMapId"),
    targetSpawnName: getPropertyString(object, "targetSpawnName", "PlayerSpawn"),
  })).filter((portal) => portal.targetMapId.length > 0);
  map.npcIds = unique(objects
    .filter((object) => object.type === "npc")
    .map((object) => getPropertyString(object, "npcId"))
    .filter(Boolean));
  map.monsterIds = unique(monsterSpawnObjects
    .map((object) => getPropertyString(object, "monsterId"))
    .filter(Boolean));
  map.spawnGroups = monsterSpawnObjects.map((object) => ({
    id: kebab(object.name),
    monsterIds: [getPropertyString(object, "monsterId")].filter(Boolean),
    maxCount: Math.max(1, Number(getPropertyValue(object, "maxCount") ?? 1)),
  })).filter((group) => group.monsterIds.length > 0);

  markDirty("Synced metadata");
  renderAll();
}

function addPortalRow(): void {
  getCurrentMap().portals.push({
    id: "new-portal",
    name: "New Portal",
    targetMapId: state.maps[0]?.id ?? "",
    targetSpawnName: "PlayerSpawn",
  });
  markDirty("Added portal row");
  renderAll();
}

function removePortalRow(index: number): void {
  getCurrentMap().portals.splice(index, 1);
  markDirty("Removed portal row");
  renderAll();
}

function addSpawnGroupRow(): void {
  getCurrentMap().spawnGroups.push({
    id: "new-spawn-group",
    monsterIds: [state.monsters[0]?.id ?? ""].filter(Boolean),
    maxCount: 1,
  });
  markDirty("Added spawn group row");
  renderAll();
}

function removeSpawnGroupRow(index: number): void {
  getCurrentMap().spawnGroups.splice(index, 1);
  markDirty("Removed spawn group row");
  renderAll();
}

function exportCurrentMap(): void {
  state.exportText = JSON.stringify(getCurrentAsset(), null, 2);
  state.status = `${state.currentTilemapKey}.json ready`;
  state.inspectorTab = "export";
  renderAll();
}

function exportMapsData(): void {
  state.exportText = JSON.stringify(state.maps, null, 2);
  state.status = "maps.json ready";
  state.inspectorTab = "export";
  renderAll();
}

async function copyExportText(): Promise<void> {
  if (state.exportText.length === 0) {
    exportCurrentMap();
  }

  await navigator.clipboard.writeText(state.exportText);
  state.status = "Copied";
  renderAll();
}

function downloadCurrentExport(): void {
  if (state.exportText.length === 0) {
    exportCurrentMap();
  }

  const fileName = state.exportText.trim().startsWith("[")
    ? "maps.json"
    : `${state.currentTilemapKey.replace(/^map-/, "")}.json`;
  const blob = new Blob([state.exportText], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function importMapFile(input: HTMLInputElement): Promise<void> {
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  const imported = JSON.parse(await file.text()) as TiledMap;
  normalizeImportedMap(imported);
  state.assets.set(state.currentTilemapKey, imported);
  state.status = `Imported ${file.name}`;
  markDirty("Imported map JSON");
  input.value = "";
  renderAll();
}

async function importMapsFile(input: HTMLInputElement): Promise<void> {
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  state.maps = JSON.parse(await file.text()) as MapDefinition[];
  state.currentMapId = state.maps[0]?.id ?? state.currentMapId;
  state.currentTilemapKey = getCurrentMap().tilemapKey;
  state.status = `Imported ${file.name}`;
  markDirty("Imported maps.json");
  input.value = "";
  await ensureCurrentAsset();
  renderAll();
}

function validateCurrent(): string[] {
  const map = getCurrentMap();
  const asset = getCurrentAsset();
  const issues: string[] = [];
  const objectLayer = getObjectLayer();
  const mapIds = new Set(state.maps.map((entry) => entry.id));
  const monsterIds = new Set(state.monsters.map((entry) => entry.id));
  const npcIds = new Set(state.npcs.map((entry) => entry.id));
  const objectSpawnNames = new Set(objectLayer.objects.filter((object) => object.type === "spawn").map((object) => object.name));

  for (const layerName of ["Ground", "Decoration", "Collision", "Objects"]) {
    if (!asset.layers.some((layer) => layer.name === layerName)) {
      issues.push(`Missing ${layerName} layer.`);
    }
  }

  for (const portal of map.portals) {
    if (!mapIds.has(portal.targetMapId)) {
      issues.push(`Portal ${portal.id} targets missing map ${portal.targetMapId}.`);
    }
  }

  for (const object of objectLayer.objects) {
    if (object.type === "portal") {
      const targetMapId = getPropertyString(object, "targetMapId");
      const targetSpawnName = getPropertyString(object, "targetSpawnName");

      if (!mapIds.has(targetMapId)) {
        issues.push(`Object ${object.name} targets missing map ${targetMapId}.`);
      }

      if (targetSpawnName.length === 0) {
        issues.push(`Object ${object.name} has no target spawn.`);
      }
    }

    if (object.type === "monsterSpawn" && !monsterIds.has(getPropertyString(object, "monsterId"))) {
      issues.push(`Object ${object.name} has an unknown monster.`);
    }

    if (object.type === "npc" && !npcIds.has(getPropertyString(object, "npcId"))) {
      issues.push(`Object ${object.name} has an unknown NPC.`);
    }
  }

  for (const portal of map.portals) {
    if (portal.targetMapId === map.id && !objectSpawnNames.has(portal.targetSpawnName)) {
      issues.push(`Portal ${portal.id} targets a spawn not present in this asset.`);
    }
  }

  return issues;
}

function validationMarkup(): string {
  const issues = validateCurrent();

  if (issues.length === 0) {
    return "<div>No issues.</div>";
  }

  return issues.map((issue) => `<div>${escapeHtml(issue)}</div>`).join("");
}

function getCurrentMap(): MapDefinition {
  const map = state.maps.find((entry) => entry.id === state.currentMapId);

  if (!map) {
    throw new Error(`Missing current map ${state.currentMapId}`);
  }

  return map;
}

function getCurrentAsset(): TiledMap {
  const asset = state.assets.get(state.currentTilemapKey);

  if (!asset) {
    throw new Error(`Missing current tilemap asset ${state.currentTilemapKey}`);
  }

  return asset;
}

function getTileLayer(name: TileLayerName): TiledTileLayer {
  const layer = getCurrentAsset().layers.find((entry): entry is TiledTileLayer => entry.type === "tilelayer" && entry.name === name);

  if (!layer) {
    throw new Error(`Missing tile layer ${name}`);
  }

  return layer;
}

function getObjectLayer(): TiledObjectLayer {
  const layer = getCurrentAsset().layers.find((entry): entry is TiledObjectLayer => entry.type === "objectgroup" && entry.name === "Objects");

  if (!layer) {
    throw new Error("Missing Objects layer");
  }

  return layer;
}

function getSelectedObject(): TiledObject | undefined {
  return state.selectedObjectId === null
    ? undefined
    : getObjectLayer().objects.find((object) => object.id === state.selectedObjectId);
}

function markDirty(status: string): void {
  state.dirty = true;
  state.status = status;
}

function createBlankMap(): TiledMap {
  const width = 25;
  const height = 19;
  const total = width * height;

  return {
    compressionlevel: -1,
    height,
    infinite: false,
    layers: [
      tileLayer(1, "Ground", width, height, Array(total).fill(1) as number[]),
      tileLayer(2, "Decoration", width, height, Array(total).fill(0) as number[]),
      tileLayer(3, "Collision", width, height, Array(total).fill(0) as number[]),
      {
        draworder: "topdown",
        id: 4,
        name: "Objects",
        objects: [],
        opacity: 1,
        type: "objectgroup",
        visible: true,
        x: 0,
        y: 0,
      },
    ],
    nextlayerid: 5,
    nextobjectid: 1,
    orientation: "orthogonal",
    renderorder: "right-down",
    tiledversion: "1.11.2",
    tileheight: 32,
    tilesets: [{
      columns: 2,
      firstgid: 1,
      image: "../tiles/prototype-tiles.png",
      imageheight: 32,
      imagewidth: 64,
      margin: 0,
      name: "prototype-tiles",
      spacing: 0,
      tilecount: 2,
      tileheight: 32,
      tilewidth: 32,
    }],
    tilewidth: 32,
    type: "map",
    version: "1.10",
    width,
  };
}

function tileLayer(id: number, name: TileLayerName, width: number, height: number, data: number[]): TiledTileLayer {
  return {
    data,
    height,
    id,
    name,
    opacity: name === "Collision" ? 0.42 : 1,
    type: "tilelayer",
    visible: true,
    width,
    x: 0,
    y: 0,
  };
}

function normalizeImportedMap(map: TiledMap): void {
  const fallback = createBlankMap();

  for (const layer of fallback.layers) {
    if (!map.layers.some((entry) => entry.name === layer.name)) {
      map.layers.push(layer);
    }
  }

  map.nextobjectid = Math.max(
    map.nextobjectid || 1,
    ...map.layers
      .filter((layer): layer is TiledObjectLayer => layer.type === "objectgroup")
      .flatMap((layer) => layer.objects.map((object) => object.id + 1)),
  );
}

function defaultProperties(type: string): TiledProperty[] {
  if (type === "portal") {
    return [
      { name: "targetMapId", type: "string", value: state.maps[0]?.id ?? "" },
      { name: "targetSpawnName", type: "string", value: "PlayerSpawn" },
    ];
  }

  if (type === "monsterSpawn") {
    return [
      { name: "monsterId", type: "string", value: state.monsters[0]?.id ?? "" },
      { name: "maxCount", type: "int", value: 1 },
      { name: "respawnMs", type: "int", value: 15000 },
    ];
  }

  if (type === "npc") {
    return [{ name: "npcId", type: "string", value: state.npcs[0]?.id ?? "" }];
  }

  return [];
}

function mergeDefaultProperties(type: string, properties: TiledProperty[]): TiledProperty[] {
  const existing = new Set(properties.map((property) => property.name));
  const missing = defaultProperties(type).filter((property) => !existing.has(property.name));

  return [...properties, ...missing];
}

function defaultObjectName(type: string, id: number): string {
  return `${objectLabel(type).replace(/\s+/g, "")}${id}`;
}

function objectLabel(type: string): string {
  const labels: Record<string, string> = {
    spawn: "Spawn",
    portal: "Portal",
    monsterSpawn: "Monster",
    npc: "NPC",
    safeZone: "Safe Zone",
    gathering: "Gather",
    treasure: "Treasure",
  };

  return labels[type] ?? type;
}

function objectStyle(type: string): { fill: string; stroke: string } {
  const styles: Record<string, { fill: string; stroke: string }> = {
    spawn: { fill: "rgba(201, 232, 121, 0.45)", stroke: "#d8f38d" },
    portal: { fill: "rgba(86, 184, 230, 0.36)", stroke: "#a9ddf5" },
    monsterSpawn: { fill: "rgba(233, 102, 72, 0.34)", stroke: "#f2a084" },
    npc: { fill: "rgba(207, 143, 229, 0.42)", stroke: "#ecc0fb" },
    safeZone: { fill: "rgba(113, 202, 166, 0.28)", stroke: "#a7ecd0" },
    gathering: { fill: "rgba(104, 190, 98, 0.46)", stroke: "#a8eda3" },
    treasure: { fill: "rgba(225, 187, 72, 0.48)", stroke: "#f7dc84" },
  };

  return styles[type] ?? { fill: "rgba(255,255,255,0.28)", stroke: "#ffffff" };
}

function tileColor(value: number, layerName: TileLayerName): string {
  if (value === 0) {
    return layerName === "Ground" ? "#17211b" : "rgba(0,0,0,0)";
  }

  if (value === 2) {
    return layerName === "Ground" ? "#55605f" : "#56616c";
  }

  return "#35643e";
}

function getPropertyString(object: TiledObject, name: string, fallback = ""): string {
  const value = getPropertyValue(object, name);

  return typeof value === "string" ? value : fallback;
}

function getPropertyValue(object: TiledObject, name: string): TiledPropertyValue | undefined {
  return object.properties.find((property) => property.name === name)?.value;
}

function parsePropertyValue(value: string, type: TiledPropertyType): TiledPropertyValue {
  if (type === "bool") {
    return value === "true" || value === "1";
  }

  if (type === "int") {
    return Number.parseInt(value, 10) || 0;
  }

  if (type === "float") {
    return Number.parseFloat(value) || 0;
  }

  return value;
}

function splitList(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function snap(value: number): number {
  return Math.round(value / 16) * 16;
}

function kebab(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "entry";
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
