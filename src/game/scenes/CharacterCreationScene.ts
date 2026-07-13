import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import { createCharacterGameState } from "../data/gameState";
import { getPlayerTextureKey } from "../entities/PlayerEntity";
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
  private appearanceSprite?: Phaser.GameObjects.Sprite;
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
    const { width, height } = this.scale;
    const compact = width < 620;

    this.add.text(width / 2, 48, "Create Character", {
      ...textStyle,
      fontSize: compact ? "26px" : "30px",
    }).setOrigin(0.5);

    const margin = compact ? 20 : 60;
    const contentWidth = compact ? width - margin * 2 : 690;
    const nameWidth = compact ? contentWidth : 310;
    const nameY = compact ? 112 : 116;

    this.add.text(margin, nameY - 24, "Name", smallTextStyle);
    const nameFrame = this.add.rectangle(margin, nameY, nameWidth, 52, panelFill, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, panelStroke)
      .setInteractive({ useHandCursor: true });
    this.nameText = this.add.text(margin + 18, nameY + 16, this.characterName, textStyle);
    nameFrame.on("pointerup", () => {
      this.isNameActive = true;
      nameFrame.setStrokeStyle(2, activeStroke);
      this.game.canvas.dataset.nameInputActive = "true";
    });

    if (compact) {
      const appearanceY = 194;
      const classX = Math.min(width - 198, margin + 190);
      this.drawAppearancePreview(margin, appearanceY, 160, 180, 1.45);
      this.drawClassButtons(classX, appearanceY, Math.max(166, width - classX - margin), 50);
      this.drawStatsPanel(margin, 424, contentWidth);
      this.drawPreviewPanel(margin, 536, contentWidth, Math.max(180, Math.min(236, height - 616)));
      this.drawConfirmButton(margin, Math.min(height - 76, 786), contentWidth);
      return;
    }

    this.drawAppearancePreview(60, 198, 160, 180, 1.55);
    this.drawClassButtons(250, 190, 178, 58);
    this.drawStatsPanel(60, 430, 368);
    this.drawPreviewPanel(470, 116, 280, 360);
    this.drawConfirmButton(520, 520, 220);
  }

  private drawAppearancePreview(x: number, y: number, width = 160, height = 180, spriteScale = 1.55): void {
    this.add.text(x, y - 28, "Appearance", smallTextStyle);
    this.add.rectangle(x, y, width, height, panelFill, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, panelStroke);
    this.add.rectangle(x + width / 2, y + height / 2 + 10, Math.min(92, width - 44), Math.min(116, height - 50), 0x0f172a, 0.55)
      .setStrokeStyle(1, 0x475569);
    this.appearanceSprite = this.add.sprite(x + width / 2, y + height / 2 + 8, getPlayerTextureKey(this.selectedClass?.id ?? "swordsman"))
      .setScale(spriteScale)
      .setDepth(2);
  }

  private drawClassButtons(x: number, y: number, width = 178, spacing = 58): void {
    this.add.text(x, y - 28, "Class", smallTextStyle);

    this.classes.forEach((playerClass, index) => {
      const buttonY = y + index * spacing;
      const frame = this.add.rectangle(x, buttonY, width, 44, panelFill, 1)
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

  private drawStatsPanel(x: number, y: number, width = 368): void {
    this.add.text(x, y - 28, "Starting Stat Preset", smallTextStyle);
    this.add.rectangle(x, y, width, 90, panelFill, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, panelStroke);
    this.statsText = this.add.text(x + 18, y + 16, "", {
      ...smallTextStyle,
      lineSpacing: 8,
    });
  }

  private drawPreviewPanel(x: number, y: number, width = 280, height = 360): void {
    this.add.text(x, y - 24, "Class Preview", smallTextStyle);
    this.add.rectangle(x, y, width, height, panelFill, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, panelStroke);
    this.previewText = this.add.text(x + 18, y + 18, "", {
      ...smallTextStyle,
      fixedWidth: width - 36,
      lineSpacing: 7,
      wordWrap: { width: width - 36 },
    });
  }

  private drawConfirmButton(x: number, y: number, width = 220): void {
    this.confirmFrame = this.add.rectangle(x, y, width, 54, 0x2f5d50, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x86efac)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(x + width / 2, y + 17, "Confirm", {
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
    this.appearanceSprite?.setTexture(getPlayerTextureKey(playerClass.id));
    this.statsText?.setText(statsSummary);
    const compact = this.scale.width < 620;
    this.previewText?.setText(compact
      ? [
        playerClass.name,
        playerClass.roleSummary,
        "",
        `Recommended: ${playerClass.recommendedStats.join(", ")}`,
        `Weapon: ${startingWeapon.name}`,
        `First Skill: ${startingSkill?.name ?? "None"}`,
        `Difficulty: ${playerClass.difficultyRating}`,
        `Specializes: ${playerClass.advancedClassOptions.join(", ")}`,
      ].join("\n")
      : [
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
