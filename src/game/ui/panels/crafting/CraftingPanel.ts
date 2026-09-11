import Phaser from "phaser";
import { getItemRarity } from "../../../systems/equipment";
import { canCraftRecipe, craftRecipe, getRecipeMaterialStatus, getVisibleRecipes } from "../../../systems/crafting";
import type { DataRegistry } from "../../../data/dataRegistry";
import type { ItemDefinition, RecipeDefinition } from "../../../types/dataDefinitions";
import type { GameState } from "../../../types/gameState";
import { uiTheme } from "../../uiTheme";
import type { PanelContext, UIPanel } from "../../panels/panelTypes";
import { addPanelButton as addPanelButtonPrimitive, addPanelRectangle as addPanelRectanglePrimitive, addPanelText as addPanelTextPrimitive } from "../../panels/panelPrimitives";
const { panelDepth, hudDepth, panelFill, panelStroke } = uiTheme;
export class CraftingPanel implements UIPanel {
 readonly id = "crafting" as const;
 constructor(private readonly context: PanelContext) {}
 open(payload?: unknown): void { const values = (payload ?? {}) as Record<string, unknown>; if (typeof values.selectedCraftingIndex === "number") this.selectedCraftingIndex = values.selectedCraftingIndex as number; if (typeof values.activeCraftingNpcId === "string") this.activeCraftingNpcId = values.activeCraftingNpcId as string; }
 render(): void { this.renderCraftingPanel(this.context.state, this.context.data); }
 destroy(): void {}
 
private renderCraftingPanel(state: GameState, dataRegistry: DataRegistry): void {
    const recipes = getVisibleRecipes(state, dataRegistry.getRecipes())
      .sort((left, right) => left.requiredLevel - right.requiredLevel || left.name.localeCompare(right.name));
    const selected = this.clampSelectedCraftingIndex(recipes);
    const selectedRecipe = recipes[selected] ?? null;
    const outputItem = selectedRecipe ? dataRegistry.getItem(selectedRecipe.outputItemId) : null;
    const craftFailure = selectedRecipe ? canCraftRecipe(state, selectedRecipe, this.getCraftingContext(state, dataRegistry)) : null;

    this.addPanelRectangle(64, 54, 672, 500, panelFill, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.92);
    this.addPanelText(92, 78, "Crafting", 23, uiTheme.text.primary);
    this.addPanelText(92, 112, `Gold ${state.inventory.gold}   Known ${recipes.filter((recipe) => this.isCraftingRecipeUnlocked(state, recipe)).length}/${dataRegistry.getRecipes().length}`, 14, uiTheme.text.accent);
    this.addPanelText(92, 146, "Recipes", 14, uiTheme.text.muted);

    recipes.slice(0, 9).forEach((recipe, index) => {
      const rowItem = dataRegistry.getItem(recipe.outputItemId);
      const locked = !this.isCraftingRecipeUnlocked(state, recipe);
      const y = 176 + index * 34;
      const row = this.addPanelRectangle(92, y - 6, 360, 28, index === selected ? uiTheme.colors.selected : uiTheme.colors.inset, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, index === selected ? uiTheme.colors.accent : uiTheme.colors.border, 0.9)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => {
        this.selectedCraftingIndex = index;
        this.context.rerender();
      });
      this.addPanelText(104, y, this.truncateText(locked ? "Locked Recipe" : recipe.name, 26), 13, locked ? uiTheme.text.muted : uiTheme.text.primary);
      this.addPanelText(306, y, `Lv ${recipe.requiredLevel}`, 12, state.playerProfile.level >= recipe.requiredLevel ? uiTheme.text.positive : uiTheme.text.negative);
      this.addPanelText(362, y, rowItem.type, 12, uiTheme.text.secondary);
    });

    this.addPanelRectangle(482, 146, 220, 286, uiTheme.colors.inset, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, uiTheme.colors.border, 0.86);

    if (selectedRecipe && outputItem) {
      const locked = !this.isCraftingRecipeUnlocked(state, selectedRecipe);
      const materialText = getRecipeMaterialStatus(state.inventory, selectedRecipe)
        .map((material) => {
          const item = dataRegistry.getItem(material.itemId);
          return `${item.name} ${material.owned}/${material.required}`;
        })
        .join("; ");
      const statusText = craftFailure
        ? `Blocked: ${craftFailure.reason}`
        : "Ready";

      this.addPanelText(502, 168, this.truncateText(locked ? "Locked Recipe" : selectedRecipe.name, 22), 16, uiTheme.text.primary);
      this.addPanelText(502, 198, `${outputItem.name} x${selectedRecipe.outputQuantity}`, 13, this.getRarityColor(outputItem));
      this.addPanelText(502, 224, `Gold ${selectedRecipe.requiredGold}   Region ${selectedRecipe.requiredRegionId ?? "Any"}`, 12, uiTheme.text.accent);
      this.addPanelText(502, 250, this.wrapText(materialText || "No materials", 25), 12, craftFailure?.reason === "missing-materials" ? uiTheme.text.negative : uiTheme.text.secondary);
      this.addPanelText(502, 342, this.wrapText(statusText, 24), 13, craftFailure ? uiTheme.text.negative : uiTheme.text.positive);
      this.addPanelText(502, 372, this.wrapText(this.getRecipeUnlockText(selectedRecipe), 24), 12, locked ? uiTheme.text.muted : uiTheme.text.positive);
    } else {
      this.addPanelText(502, 184, "No recipe selected", 15, uiTheme.text.muted);
    }

    this.addPanelButton(482, 450, 92, 34, "Craft", () => this.craftSelectedRecipe());
    this.addPanelButton(606, 502, 92, 28, "Close", () => this.context.closePanel());
    this.syncCraftingDataset(state, dataRegistry, recipes, selectedRecipe, outputItem, craftFailure);
  }

private clampSelectedCraftingIndex(recipes: RecipeDefinition[]): number {
    if (recipes.length === 0) {
      this.selectedCraftingIndex = 0;
      return 0;
    }

    this.selectedCraftingIndex = Phaser.Math.Clamp(this.selectedCraftingIndex, 0, recipes.length - 1);
    return this.selectedCraftingIndex;
  }

private selectedCraftingIndex = 0;

private getCraftingContext(state: GameState, dataRegistry: DataRegistry): { regionId?: string; npcId?: string } {
    return {
      regionId: dataRegistry.getMap(state.currentMapId).regionId,
      npcId: this.activeCraftingNpcId || undefined,
    };
  }

private activeCraftingNpcId = "";

private addPanelRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha: number,
  ): Phaser.GameObjects.Rectangle {
    return addPanelRectanglePrimitive(this.context, x, y, width, height, color, alpha);
  }

private addPanelText(x: number, y: number, text: string, fontSize: number, color: string, wrapWidth?: number): Phaser.GameObjects.Text {
    return addPanelTextPrimitive(this.context, x, y, text, fontSize, color, wrapWidth);
  }

private isCraftingRecipeUnlocked(state: GameState, recipe: RecipeDefinition): boolean {
    return recipe.unlockCondition.type === "default" || state.crafting.unlockedRecipeIds.includes(recipe.id);
  }

private truncateText(text: string, maxLength: number): string {
    return text.length <= maxLength ? text : `${text.slice(0, Math.max(0, maxLength - 1))}.`;
  }

private getRarityColor(item: ItemDefinition): string {
    const rarity = getItemRarity(item);

    const colors = {
      Common: uiTheme.text.secondary,
      Uncommon: uiTheme.text.positive,
      Rare: uiTheme.text.info,
      Epic: "#c4b5fd",
      Legendary: uiTheme.text.accent,
      Mythic: "#f9a8d4",
    };

    return colors[rarity];
  }

private wrapText(text: string, lineLength: number): string {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;

      if (next.length > lineLength) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }

    if (line) {
      lines.push(line);
    }

    return lines.join("\n");
  }

private getRecipeUnlockText(recipe: RecipeDefinition): string {
    const condition = recipe.unlockCondition;

    if (condition.type === "default") {
      return "Known by default";
    }

    if (condition.type === "npc") {
      return `Unlocked by ${condition.npcId}`;
    }

    if (condition.type === "bossDrop") {
      return `Boss drop ${condition.bossId}`;
    }

    if (condition.type === "quest") {
      return `Quest ${condition.questId}`;
    }

    if (condition.type === "huntingBoard") {
      return `Board ${condition.boardId}`;
    }

    if (condition.type === "exploration") {
      return `Explore ${condition.regionId}`;
    }

    return `Bestiary ${condition.enemyId} x${condition.defeatCount}`;
  }

private addPanelButton(x: number, y: number, width: number, height: number, label: string, callback: () => void): void {
    addPanelButtonPrimitive(this.context, x, y, width, height, label, callback);
  }

private craftSelectedRecipe(): void {
    if (!this.context.state || !this.context.data) {
      return;
    }

    const recipes = getVisibleRecipes(this.context.state, this.context.data.getRecipes())
      .sort((left, right) => left.requiredLevel - right.requiredLevel || left.name.localeCompare(right.name));
    const recipe = recipes[this.clampSelectedCraftingIndex(recipes)];

    if (!recipe) {
      this.context.debug?.set("lastCraftingAction", "craft-failed:no-recipe");
      return;
    }

    const result = craftRecipe(
      this.context.state,
      recipe,
      (id) => this.context.data!.getItem(id),
      this.getCraftingContext(this.context.state, this.context.data),
    );

    this.context.debug?.set("lastCraftingAction", result.success
? `craft:${result.recipeId}:${result.itemId}:${result.quantity}:${result.gold}`
: `craft-failed:${result.reason}:${result.recipeId}`);
    this.context.rerender();
  }

private syncCraftingDataset(
    state: GameState,
    dataRegistry: DataRegistry,
    recipes: RecipeDefinition[],
    selectedRecipe: RecipeDefinition | null,
    outputItem: ItemDefinition | null,
    craftFailure: ReturnType<typeof canCraftRecipe>,
  ): void {
    this.context.debug?.set("shopPanel", "hidden");
    this.context.debug?.set("appraiserPanel", "hidden");
    this.context.debug?.set("storagePanel", "hidden");
    this.context.debug?.set("craftingPanel", "visible");
    this.context.debug?.set("activeCraftingNpc", this.activeCraftingNpcId);
    this.context.debug?.set("craftingRecipeCount", String(recipes.length));
    this.context.debug?.set("visibleRecipes", recipes.map((recipe) => recipe.id).join("|"));
    this.context.debug?.set("lockedRecipes", recipes
.filter((recipe) => !this.isCraftingRecipeUnlocked(state, recipe))
.map((recipe) => recipe.id)
.join("|"));
    this.context.debug?.set("unlockedRecipes", state.crafting.unlockedRecipeIds.join("|"));
    this.context.debug?.set("recipeUnlockNotifications", state.crafting.unlockNotifications.join("|"));
    this.context.debug?.set("selectedRecipe", selectedRecipe?.id ?? "");
    this.context.debug?.set("selectedRecipeName", selectedRecipe?.name ?? "");
    this.context.debug?.set("selectedRecipeOutput", outputItem?.id ?? "");
    this.context.debug?.set("selectedRecipeOutputName", outputItem?.name ?? "");
    this.context.debug?.set("selectedRecipeCanCraft", String(Boolean(selectedRecipe && !craftFailure)));
    this.context.debug?.set("selectedRecipeBlockReason", craftFailure?.reason ?? "");
    this.context.debug?.set("selectedRecipeMissingMaterials", selectedRecipe
? getRecipeMaterialStatus(state.inventory, selectedRecipe)
.filter((material) => material.missing > 0)
.map((material) => `${material.itemId}:${material.missing}`)
.join("|")
: "");
    this.context.debug?.set("craftingButtons", "Craft|Close");
    this.context.debug?.set("inventoryGold", String(state.inventory.gold));
    this.context.debug?.set("playerGold", String(state.inventory.gold));
  }
}
