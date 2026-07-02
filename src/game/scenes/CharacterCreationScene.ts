import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import { createCharacterGameState } from "../data/gameState";
import { writeSaveSlot } from "../systems/autosave";
import type { DataRegistry } from "../data/dataRegistry";
import type { ClassDefinition } from "../types/dataDefinitions";
import type { GameState } from "../types/gameState";

const panelFill = 0x17202a;
const panelStroke = 0x334155;
const activeStroke = 0xfacc15;
const textStyle = {
  color: "#f4f7fb",
  fontFamily: "Arial, sans-serif",
  fontSize: "18px",
} satisfies Phaser.Types.GameObjects.Text.TextStyle;
const smallTextStyle = {
  color: "#cbd5e1",
  fontFamily: "Arial, sans-serif",
  fontSize: "14px",
} satisfies Phaser.Types.GameObjects.Text.TextStyle;

interface ClassButton {
  classId: string;
  frame: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class CharacterCreationScene extends Phaser.Scene {
  private dataRegistry?: DataRegistry;
  private classes: ClassDefinition[] = [];
  private selectedClass?: ClassDefinition;
  private classButtons: ClassButton[] = [];
  private characterName = "Adventurer";
  private isNameActive = false;
  private nameText?: Phaser.GameObjects.Text;
  private statsText?: Phaser.GameObjects.Text;
  private previewText?: Phaser.GameObjects.Text;
  private confirmFrame?: Phaser.GameObjects.Rectangle;
  private lastNameKey = "";
  private lastNameKeyAt = 0;

  constructor() {
    super(SceneKeys.CharacterCreation);
  }

  create(): void {
    const state = this.registry.get(RegistryKeys.GameState) as GameState | undefined;
    this.dataRegistry = this.registry.get(RegistryKeys.DataRegistry) as DataRegistry;
    this.classes = this.dataRegistry.getClasses();
    this.selectedClass = this.classes.find((entry) => entry.id === state?.character.archetype) ?? this.classes[0];
    this.characterName = state?.playerProfile.name ?? "Adventurer";

    this.cameras.main.setBackgroundColor("#111827");
    this.drawLayout();
    this.syncSelection();

    this.game.canvas.dataset.scene = "character-creation";
    this.input.keyboard?.on("keydown", this.handleKeyDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.handleKeyDown, this);
    });
  }

  private drawLayout(): void {
    const { width } = this.scale;

    this.add.text(width / 2, 48, "Create Character", {
      ...textStyle,
      fontSize: "30px",
    }).setOrigin(0.5);

    this.add.text(60, 92, "Name", smallTextStyle);
    const nameFrame = this.add.rectangle(60, 116, 310, 52, panelFill, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, panelStroke)
      .setInteractive({ useHandCursor: true });
    this.nameText = this.add.text(78, 132, this.characterName, textStyle);
    nameFrame.on("pointerup", () => {
      this.isNameActive = true;
      nameFrame.setStrokeStyle(2, activeStroke);
      this.game.canvas.dataset.nameInputActive = "true";
    });

    this.drawAppearancePlaceholder(60, 190);
    this.drawClassButtons(250, 190);
    this.drawStatsPanel(60, 410);
    this.drawPreviewPanel(470, 116);
    this.drawConfirmButton(520, 520);
  }

  private drawAppearancePlaceholder(x: number, y: number): void {
    this.add.text(x, y - 28, "Appearance", smallTextStyle);
    this.add.rectangle(x, y, 160, 180, panelFill, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, panelStroke);
    this.add.circle(x + 80, y + 54, 28, 0xf8fafc, 1)
      .setStrokeStyle(2, 0x0f172a);
    this.add.rectangle(x + 80, y + 124, 72, 82, 0x4fd1c5, 1)
      .setStrokeStyle(2, 0x0f172a);
    this.add.text(x + 80, y + 162, "Preview", {
      ...smallTextStyle,
      color: "#0f172a",
    }).setOrigin(0.5);
  }

  private drawClassButtons(x: number, y: number): void {
    this.add.text(x, y - 28, "Class", smallTextStyle);

    this.classes.forEach((playerClass, index) => {
      const buttonY = y + index * 58;
      const frame = this.add.rectangle(x, buttonY, 178, 44, panelFill, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(2, panelStroke)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x + 18, buttonY + 12, playerClass.name, textStyle);

      frame.on("pointerup", () => this.selectClass(playerClass.id));
      label.setInteractive({ useHandCursor: true });
      label.on("pointerup", () => this.selectClass(playerClass.id));
      this.classButtons.push({ classId: playerClass.id, frame, label });
    });
  }

  private drawStatsPanel(x: number, y: number): void {
    this.add.text(x, y - 28, "Starting Stat Preset", smallTextStyle);
    this.add.rectangle(x, y, 368, 90, panelFill, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, panelStroke);
    this.statsText = this.add.text(x + 18, y + 16, "", {
      ...smallTextStyle,
      lineSpacing: 8,
    });
  }

  private drawPreviewPanel(x: number, y: number): void {
    this.add.text(x, y - 24, "Class Preview", smallTextStyle);
    this.add.rectangle(x, y, 280, 360, panelFill, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, panelStroke);
    this.previewText = this.add.text(x + 18, y + 18, "", {
      ...smallTextStyle,
      fixedWidth: 244,
      lineSpacing: 7,
      wordWrap: { width: 244 },
    });
  }

  private drawConfirmButton(x: number, y: number): void {
    this.confirmFrame = this.add.rectangle(x, y, 220, 54, 0x2f5d50, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x86efac)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(x + 110, y + 17, "Confirm", {
      ...textStyle,
      fontSize: "20px",
    }).setOrigin(0.5, 0);

    this.confirmFrame.on("pointerup", () => this.confirmCharacter());
    label.setInteractive({ useHandCursor: true });
    label.on("pointerup", () => this.confirmCharacter());
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isNameActive) {
      return;
    }

    event.preventDefault();

    if (event.repeat) {
      return;
    }

    if (event.key === "Enter") {
      this.confirmCharacter();
      return;
    }

    if (event.key === "Backspace") {
      this.characterName = this.characterName.slice(0, -1);
      this.syncSelection();
      return;
    }

    if (event.ctrlKey && event.key.toLowerCase() === "a") {
      this.characterName = "";
      this.syncSelection();
      return;
    }

    if (/^[a-zA-Z0-9 -]$/.test(event.key) && this.characterName.length < 16) {
      if (event.key === this.lastNameKey && event.timeStamp - this.lastNameKeyAt < 40) {
        return;
      }

      this.lastNameKey = event.key;
      this.lastNameKeyAt = event.timeStamp;
      this.characterName += event.key;
      this.syncSelection();
    }
  }

  private selectClass(classId: string): void {
    this.selectedClass = this.classes.find((entry) => entry.id === classId) ?? this.selectedClass;
    this.syncSelection();
  }

  private syncSelection(): void {
    if (!this.selectedClass || !this.dataRegistry) {
      return;
    }

    const playerClass = this.selectedClass;
    const startingWeapon = this.dataRegistry.getItem(playerClass.startingWeaponId);
    const startingSkill = playerClass.startingSkillIds[0]
      ? this.dataRegistry.getSkill(playerClass.startingSkillIds[0])
      : null;
    const stats = playerClass.baseStats;
    const statsSummary = `HP ${stats.hp}  SP ${stats.sp}\nATK ${stats.attack}  DEF ${stats.defense}`;

    this.nameText?.setText(this.characterName || "Adventurer");
    this.statsText?.setText(statsSummary);
    this.previewText?.setText([
      playerClass.name,
      playerClass.roleSummary,
      "",
      `Recommended: ${playerClass.recommendedStats.join(", ")}`,
      `Weapon: ${startingWeapon.name}`,
      `First Skill: ${startingSkill?.name ?? "None"}`,
      `Difficulty: ${playerClass.difficultyRating}`,
      `Specializes Into: ${playerClass.advancedClassOptions.join(", ")}`,
      "",
      playerClass.description,
    ].join("\n"));

    for (const button of this.classButtons) {
      const isSelected = button.classId === playerClass.id;
      button.frame.setFillStyle(isSelected ? 0x284052 : panelFill, 1);
      button.frame.setStrokeStyle(2, isSelected ? activeStroke : panelStroke);
      button.label.setColor(isSelected ? "#fef08a" : "#f4f7fb");
    }

    this.confirmFrame?.setFillStyle(this.getTrimmedName().length > 0 ? 0x2f5d50 : 0x475569, 1);
    this.syncDataset(playerClass, startingWeapon.name, startingSkill?.name ?? "");
  }

  private syncDataset(playerClass: ClassDefinition, weaponName: string, skillName: string): void {
    const stats = playerClass.baseStats;

    this.game.canvas.dataset.characterName = this.getTrimmedName() || "Adventurer";
    this.game.canvas.dataset.classOptions = this.classes.map((entry) => entry.id).join("|");
    this.game.canvas.dataset.selectedClass = playerClass.id;
    this.game.canvas.dataset.selectedClassName = playerClass.name;
    this.game.canvas.dataset.statPreset = `hp:${stats.hp}|sp:${stats.sp}|attack:${stats.attack}|defense:${stats.defense}`;
    this.game.canvas.dataset.classRole = playerClass.roleSummary;
    this.game.canvas.dataset.recommendedStats = playerClass.recommendedStats.join("|");
    this.game.canvas.dataset.startingWeapon = playerClass.startingWeaponId;
    this.game.canvas.dataset.startingWeaponName = weaponName;
    this.game.canvas.dataset.startingSkill = playerClass.startingSkillIds[0] ?? "";
    this.game.canvas.dataset.startingSkillName = skillName;
    this.game.canvas.dataset.difficultyRating = playerClass.difficultyRating;
    this.game.canvas.dataset.advancedClassOptions = playerClass.advancedClassOptions.join("|");
    this.game.canvas.dataset.confirmEnabled = String(this.getTrimmedName().length > 0);
  }

  private confirmCharacter(): void {
    if (!this.selectedClass || this.getTrimmedName().length === 0) {
      return;
    }

    const previousState = this.registry.get(RegistryKeys.GameState) as ReturnType<typeof createCharacterGameState> | undefined;
    const state = createCharacterGameState(this.characterName, this.selectedClass);
    const pendingSaveSlot = this.registry.get(RegistryKeys.PendingSaveSlot) as number | undefined;

    if (previousState?.settings) {
      state.settings = { ...previousState.settings };
    }

    if (pendingSaveSlot) {
      state.currentSaveSlot = pendingSaveSlot;
      writeSaveSlot(pendingSaveSlot, state);
      this.registry.remove(RegistryKeys.PendingSaveSlot);
    }

    this.registry.set(RegistryKeys.GameState, state);
    this.scene.start(SceneKeys.World);
  }

  private getTrimmedName(): string {
    return this.characterName.trim();
  }
}
