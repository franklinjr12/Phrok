import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import { createCharacterGameState } from "../data/gameState";
import { getPlayerTextureKey } from "../entities/PlayerEntity";
import { writeSaveSlot } from "../systems/autosave";
import type { DataRegistry } from "../data/dataRegistry";
import type { ClassDefinition } from "../types/dataDefinitions";
import type { GameState } from "../types/gameState";
import { enterScene, isSceneTransitioning, transitionToScene } from "./sceneTransition";

const colors = {
  background: 0x071b19,
  backgroundMid: 0x123a32,
  panel: 0x0c211e,
  panelRaised: 0x18332f,
  border: 0x5f765c,
  borderMuted: 0x3e594d,
  gold: 0xd6b45f,
  goldBright: 0xf9e7a8,
  selected: 0x315a4e,
  selectedDeep: 0x28483f,
  disabled: 0x35433d,
  positive: 0x427346,
  negative: 0xa34538,
  preview: 0x0a1716,
} as const;

const titleStyle = {
  color: "#f9f1d0",
  fontFamily: "Georgia, Times New Roman, serif",
  fontStyle: "bold",
  fontSize: "30px",
  shadow: {
    blur: 4,
    color: "#061311",
    fill: true,
    offsetX: 2,
    offsetY: 3,
  },
} satisfies Phaser.Types.GameObjects.Text.TextStyle;

const sectionLabelStyle = {
  color: "#d6b45f",
  fontFamily: "Trebuchet MS, Arial, sans-serif",
  fontStyle: "bold",
  fontSize: "11px",
  letterSpacing: 2,
} satisfies Phaser.Types.GameObjects.Text.TextStyle;

const bodyTextStyle = {
  color: "#f5eacc",
  fontFamily: "Verdana, Arial, sans-serif",
  fontSize: "15px",
} satisfies Phaser.Types.GameObjects.Text.TextStyle;

const smallTextStyle = {
  color: "#b6c7b5",
  fontFamily: "Trebuchet MS, Arial, sans-serif",
  fontSize: "13px",
} satisfies Phaser.Types.GameObjects.Text.TextStyle;

const mutedTextStyle = {
  color: "#819487",
  fontFamily: "Trebuchet MS, Arial, sans-serif",
  fontSize: "11px",
} satisfies Phaser.Types.GameObjects.Text.TextStyle;

interface ClassButton {
  classId: string;
  frame: Phaser.GameObjects.Rectangle;
  accent: Phaser.GameObjects.Rectangle;
  marker: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  meta: Phaser.GameObjects.Text;
}

export class CharacterCreationScene extends Phaser.Scene {
  private dataRegistry?: DataRegistry;
  private classes: ClassDefinition[] = [];
  private selectedClass?: ClassDefinition;
  private classButtons: ClassButton[] = [];
  private characterName = "Adventurer";
  private isNameActive = false;
  private nameFrame?: Phaser.GameObjects.Rectangle;
  private nameText?: Phaser.GameObjects.Text;
  private appearanceSprite?: Phaser.GameObjects.Sprite;
  private statsText?: Phaser.GameObjects.Text;
  private statsHintText?: Phaser.GameObjects.Text;
  private previewText?: Phaser.GameObjects.Text;
  private confirmFrame?: Phaser.GameObjects.Rectangle;
  private confirmLabel?: Phaser.GameObjects.Text;
  private validationText?: Phaser.GameObjects.Text;
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
    this.classButtons = [];
    this.isNameActive = false;
    this.lastNameKey = "";
    this.lastNameKeyAt = 0;

    this.cameras.main.setBackgroundColor("#071b19");
    this.drawLayout();
    this.syncSelection();

    this.game.canvas.dataset.scene = "character-creation";
    this.game.canvas.dataset.characterCreationLayout = "draft-onboarding";
    this.game.canvas.dataset.characterCreationOptions = "name|class|preview|stats|loadout|difficulty|advanced-class|confirm";
    this.input.keyboard?.on("keydown", this.handleKeyDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.handleKeyDown, this);
    });
    enterScene(this, "character-creation");
  }

  private drawLayout(): void {
    const { width, height } = this.scale;
    const compact = width < 620;

    this.drawBackdrop(width, height, compact);

    this.add.text(width / 2, compact ? 30 : 34, "CREATE YOUR ADVENTURER", {
      ...titleStyle,
      fontSize: compact ? "23px" : titleStyle.fontSize,
    }).setOrigin(0.5);
    this.add.rectangle(width / 2, compact ? 63 : 69, compact ? 138 : 190, 1, colors.gold, 0.78);
    this.add.text(width / 2, compact ? 75 : 82, "Choose a path. Shape a legend.", {
      ...smallTextStyle,
      color: "#e8dcae",
      fontSize: compact ? "11px" : "12px",
    }).setOrigin(0.5);

    const margin = compact ? 16 : 60;
    const contentWidth = compact ? width - margin * 2 : 690;
    const nameWidth = compact ? contentWidth : 310;
    const nameY = compact ? 96 : 112;

    this.add.text(margin, nameY - 22, "IDENTITY", sectionLabelStyle);
    this.add.text(margin + nameWidth, nameY - 21, "1–16 characters", {
      ...mutedTextStyle,
      align: "right",
      fixedWidth: 124,
    }).setOrigin(1, 0);
    this.nameFrame = this.add.rectangle(margin, nameY, nameWidth, 52, colors.panelRaised, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(1, colors.border, 0.95)
      .setInteractive({ useHandCursor: true });
    this.add.rectangle(margin + 12, nameY + 11, 3, 30, colors.gold, 0.85);
    this.nameText = this.add.text(margin + 28, nameY + 16, this.characterName, bodyTextStyle);
    this.add.text(margin + nameWidth - 14, nameY + 18, "✎", {
      ...smallTextStyle,
      color: "#d6b45f",
      fontSize: "16px",
    }).setOrigin(1, 0);
    this.nameFrame.on("pointerup", () => {
      this.isNameActive = true;
      this.nameFrame?.setStrokeStyle(2, colors.goldBright, 1);
      this.game.canvas.dataset.nameInputActive = "true";
    });

    if (compact) {
      this.drawAppearancePreview(margin, 166, 132, 138, 1.72);
      this.drawClassButtons(164, 160, Math.max(150, width - 180), 34, 32);
      this.drawStatsPanel(margin, 326, contentWidth);
      this.drawPreviewPanel(margin, 418, contentWidth, 112);
      this.drawConfirmButton(margin, Math.min(height - 64, 536), contentWidth);
      return;
    }

    this.drawAppearancePreview(60, 198, 160, 180, 1.55);
    this.drawClassButtons(250, 190, 178, 58, 50);
    this.drawStatsPanel(60, 430, 368);
    this.drawPreviewPanel(470, 116, 280, 360);
    this.drawConfirmButton(520, 520, 220);
  }

  private drawBackdrop(width: number, height: number, compact: boolean): void {
    this.add.rectangle(width / 2, height / 2, width, height, colors.background, 1).setDepth(-20);
    this.add.rectangle(width / 2, height * 0.42, width, height * 0.72, colors.backgroundMid, 0.34).setDepth(-19);
    this.add.rectangle(width / 2, height * 0.86, width, height * 0.28, 0x061311, 0.72).setDepth(-18);

    const glow = this.add.circle(width * 0.82, compact ? 120 : 138, compact ? 74 : 118, colors.gold, 0.1).setDepth(-17);
    this.add.circle(width * 0.82, compact ? 120 : 138, compact ? 50 : 80, colors.selected, 0.16).setDepth(-16);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.06, to: 0.14 },
      duration: 2600,
      ease: "Sine.inOut",
      repeat: -1,
      yoyo: true,
    });

    const stars = [
      [0.08, 0.2, 2], [0.19, 0.1, 1], [0.39, 0.17, 1], [0.63, 0.11, 2],
      [0.94, 0.24, 1], [0.72, 0.3, 1], [0.49, 0.08, 1],
    ] as const;
    for (const [x, y, radius] of stars) {
      this.add.circle(width * x, height * y, radius, colors.goldBright, 0.56).setDepth(-13);
    }
  }

  private drawAppearancePreview(x: number, y: number, width = 160, height = 180, spriteScale = 1.55): void {
    this.add.text(x, y - 28, "YOUR HERO", sectionLabelStyle);
    this.add.rectangle(x, y, width, height, colors.panel, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(1, colors.border, 0.95);
    this.add.rectangle(x + 12, y + 12, width - 24, 2, colors.gold, 0.66);
    this.add.ellipse(x + width / 2, y + height - 28, Math.min(88, width - 32), 18, 0x000000, 0.42);
    this.add.rectangle(x + width / 2, y + height / 2 + 10, Math.min(92, width - 44), Math.min(116, height - 50), colors.preview, 0.72)
      .setStrokeStyle(1, 0x47675a, 0.86);
    this.add.circle(x + width / 2, y + height / 2 - 16, Math.min(46, width * 0.3), colors.selected, 0.2);
    this.appearanceSprite = this.add.sprite(
      x + width / 2,
      y + height / 2 + 8,
      getPlayerTextureKey(this.selectedClass?.id ?? "swordsman"),
    ).setScale(spriteScale).setDepth(2);
    this.tweens.add({
      targets: this.appearanceSprite,
      y: y + height / 2 + 5,
      duration: 1900,
      ease: "Sine.inOut",
      repeat: -1,
      yoyo: true,
    });
    this.add.text(x + width / 2, y + height - 19, "READY FOR ADVENTURE", {
      ...mutedTextStyle,
      color: "#9bb4a2",
      fontSize: width < 150 ? "8px" : "9px",
    }).setOrigin(0.5);
  }

  private drawClassButtons(x: number, y: number, width = 178, spacing = 58, height = 50): void {
    this.add.text(x, y - 28, "CHOOSE YOUR PATH", sectionLabelStyle);

    this.classes.forEach((playerClass, index) => {
      const buttonY = y + index * spacing;
      const frame = this.add.rectangle(x, buttonY, width, height, colors.panelRaised, 0.98)
        .setOrigin(0, 0)
        .setStrokeStyle(1, colors.borderMuted, 0.95)
        .setInteractive({ useHandCursor: true });
      const accent = this.add.rectangle(x + 6, buttonY + 8, 3, Math.max(16, height - 16), colors.border, 0.86);
      const marker = this.add.circle(x + width - 16, buttonY + height / 2 - (height > 40 ? 6 : 0), 4, colors.border, 0.9);
      const label = this.add.text(x + 20, buttonY + (height > 40 ? 8 : 7), playerClass.name, {
        ...bodyTextStyle,
        fontSize: height > 40 ? "15px" : "12px",
      });
      const meta = this.add.text(x + 20, buttonY + (height > 40 ? 29 : 19), `${playerClass.difficultyRating.toUpperCase()}  •  ${playerClass.recommendedStats[0] ?? "BALANCED"} FOCUS`, {
        ...mutedTextStyle,
        fontSize: height > 40 ? "9px" : "8px",
      });

      frame.on("pointerover", () => {
        this.game.canvas.dataset.activeClass = playerClass.id;
        this.setClassButtonHover(playerClass.id, true);
      });
      frame.on("pointerout", () => {
        delete this.game.canvas.dataset.activeClass;
        this.setClassButtonHover(playerClass.id, false);
      });
      frame.on("pointerup", () => this.selectClass(playerClass.id));
      label.setInteractive({ useHandCursor: true });
      label.on("pointerup", () => this.selectClass(playerClass.id));

      this.classButtons.push({ classId: playerClass.id, frame, accent, marker, label, meta });
    });
  }

  private setClassButtonHover(classId: string, hovered: boolean): void {
    const button = this.classButtons.find((entry) => entry.classId === classId);
    if (!button || button.classId === this.selectedClass?.id) {
      return;
    }

    button.frame.setFillStyle(hovered ? colors.selectedDeep : colors.panelRaised, 0.98);
    button.frame.setStrokeStyle(1, hovered ? colors.gold : colors.borderMuted, 0.95);
    button.accent.setFillStyle(hovered ? colors.gold : colors.border, hovered ? 1 : 0.86);
  }

  private drawStatsPanel(x: number, y: number, width = 368): void {
    this.add.text(x, y - 28, "STARTING PROFILE", sectionLabelStyle);
    this.add.rectangle(x, y, width, 90, colors.panel, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(1, colors.border, 0.95);
    this.add.rectangle(x + 12, y + 12, width - 24, 1, colors.borderMuted, 0.8);
    this.statsText = this.add.text(x + 18, y + 20, "", {
      ...bodyTextStyle,
      fontSize: "15px",
      lineSpacing: 7,
    });
    this.statsHintText = this.add.text(x + 18, y + 67, "", {
      ...mutedTextStyle,
      color: "#d6b45f",
      fontSize: "10px",
    });
  }

  private drawPreviewPanel(x: number, y: number, width = 280, height = 360): void {
    this.add.text(x, y - 28, "CLASS DOSSIER", sectionLabelStyle);
    this.add.rectangle(x, y, width, height, colors.panel, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(1, colors.border, 0.95);
    this.add.rectangle(x + 12, y + 12, width - 24, 2, colors.gold, 0.66);
    this.previewText = this.add.text(x + 18, y + 22, "", {
      ...smallTextStyle,
      fontSize: this.scale.width < 620 ? "11px" : smallTextStyle.fontSize,
      fixedWidth: width - 36,
      lineSpacing: this.scale.width < 620 ? 2 : 6,
      wordWrap: { width: width - 36 },
    });
  }

  private drawConfirmButton(x: number, y: number, width = 220): void {
    this.validationText = this.add.text(x + width / 2, y - 18, "", {
      ...mutedTextStyle,
      align: "center",
      fixedWidth: width,
    }).setOrigin(0.5, 1);
    this.confirmFrame = this.add.rectangle(x, y, width, 54, colors.positive, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0xa8d5a9, 0.95)
      .setInteractive({ useHandCursor: true });
    this.confirmLabel = this.add.text(x + width / 2, y + 10, "BEGIN ADVENTURE", {
      ...bodyTextStyle,
      color: "#f9f1d0",
      fontFamily: "Trebuchet MS, Arial, sans-serif",
      fontStyle: "bold",
      fontSize: width < 240 ? "15px" : "17px",
    }).setOrigin(0.5, 0);
    this.add.text(x + width / 2, y + 34, "Enter to begin", {
      ...mutedTextStyle,
      color: "#d8ead0",
      fontSize: "9px",
    }).setOrigin(0.5, 0);

    this.confirmFrame.on("pointerover", () => {
      if (this.getTrimmedName().length > 0) {
        this.confirmFrame?.setFillStyle(0x5c995f, 1);
        this.confirmFrame?.setStrokeStyle(2, colors.goldBright, 1);
      }
    });
    this.confirmFrame.on("pointerout", () => this.syncSelection());
    this.confirmFrame.on("pointerup", () => this.confirmCharacter());
    this.confirmLabel.setInteractive({ useHandCursor: true });
    this.confirmLabel.on("pointerup", () => this.confirmCharacter());
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isNameActive || isSceneTransitioning(this)) {
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
    const statsSummary = `HP ${stats.hp}        SP ${stats.sp}\nATK ${stats.attack}        DEF ${stats.defense}`;

    this.nameText?.setText(this.characterName || "Adventurer");
    this.appearanceSprite?.setTexture(getPlayerTextureKey(playerClass.id));
    const compact = this.scale.width < 620;
    this.previewText?.setText((compact
      ? [
        playerClass.name.toUpperCase(),
        playerClass.roleSummary,
        `Weapon: ${startingWeapon.name}  •  Skill: ${startingSkill?.name ?? "None"}`,
        `Recommended: ${playerClass.recommendedStats.join(" • ")}`,
        `Difficulty: ${playerClass.difficultyRating}`,
        `Advanced paths: ${playerClass.advancedClassOptions.join(" • ")}`,
      ]
      : [
        playerClass.name.toUpperCase(),
        playerClass.roleSummary,
        "",
        "STARTING LOADOUT",
        `Weapon   ${startingWeapon.name}`,
        `Skill    ${startingSkill?.name ?? "None"}`,
        "",
        `DIFFICULTY   ${playerClass.difficultyRating}`,
        `GROWTH FOCUS ${playerClass.recommendedStats.join(" • ")}`,
        `ADVANCED PATHS  ${playerClass.advancedClassOptions.join(" • ")}`,
        "",
        playerClass.description,
      ]).join("\n"));
    this.statsText?.setText(statsSummary);
    this.statsHintText?.setText(`Recommended: ${playerClass.recommendedStats.join("  •  ")}`);

    for (const button of this.classButtons) {
      const isSelected = button.classId === playerClass.id;
      button.frame.setFillStyle(isSelected ? colors.selected : colors.panelRaised, 0.98);
      button.frame.setStrokeStyle(isSelected ? 2 : 1, isSelected ? colors.goldBright : colors.borderMuted, 0.95);
      button.accent.setFillStyle(isSelected ? colors.goldBright : colors.border, isSelected ? 1 : 0.86);
      button.marker.setFillStyle(isSelected ? colors.goldBright : colors.border, 1);
      button.label.setColor(isSelected ? "#f9e7a8" : "#f5eacc");
      button.meta.setColor(isSelected ? "#c5d9bf" : "#819487");
    }

    const hasName = this.getTrimmedName().length > 0;
    this.nameFrame?.setStrokeStyle(hasName ? (this.isNameActive ? 2 : 1) : 2, hasName
      ? (this.isNameActive ? colors.goldBright : colors.border)
      : colors.negative, 0.95);
    this.confirmFrame?.setFillStyle(hasName ? colors.positive : colors.disabled, 0.98);
    this.confirmFrame?.setStrokeStyle(1, hasName ? 0xa8d5a9 : colors.borderMuted, 0.95);
    this.confirmLabel?.setColor(hasName ? "#f9f1d0" : "#9aa99d");
    this.validationText?.setText(hasName ? "" : "A name is required to begin.");
    this.validationText?.setColor(hasName ? "#819487" : "#eeaaa1");
    this.syncDataset(playerClass, startingWeapon.name, startingSkill?.name ?? "", hasName);
  }

  private syncDataset(playerClass: ClassDefinition, weaponName: string, skillName: string, hasName: boolean): void {
    const stats = playerClass.baseStats;
    const canvas = this.game.canvas;

    canvas.dataset.characterName = this.getTrimmedName() || "Adventurer";
    canvas.dataset.classOptions = this.classes.map((entry) => entry.id).join("|");
    canvas.dataset.selectedClass = playerClass.id;
    canvas.dataset.selectedClassName = playerClass.name;
    canvas.dataset.selectedClassPreviewTexture = getPlayerTextureKey(playerClass.id);
    canvas.dataset.statPreset = `hp:${stats.hp}|sp:${stats.sp}|attack:${stats.attack}|defense:${stats.defense}`;
    canvas.dataset.classRole = playerClass.roleSummary;
    canvas.dataset.recommendedStats = playerClass.recommendedStats.join("|");
    canvas.dataset.startingWeapon = playerClass.startingWeaponId;
    canvas.dataset.startingWeaponName = weaponName;
    canvas.dataset.startingSkill = playerClass.startingSkillIds[0] ?? "";
    canvas.dataset.startingSkillName = skillName;
    canvas.dataset.difficultyRating = playerClass.difficultyRating;
    canvas.dataset.advancedClassOptions = playerClass.advancedClassOptions.join("|");
    canvas.dataset.confirmEnabled = String(hasName);
    canvas.dataset.formStatus = hasName ? "ready" : "invalid";
    canvas.dataset.validationMessage = hasName ? "" : "A name is required to begin.";
  }

  private confirmCharacter(): void {
    if (isSceneTransitioning(this)) {
      return;
    }

    if (!this.selectedClass || this.getTrimmedName().length === 0) {
      this.isNameActive = true;
      this.nameFrame?.setStrokeStyle(2, colors.negative, 1);
      this.game.canvas.dataset.nameInputActive = "true";
      this.syncSelection();
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
    transitionToScene(this, SceneKeys.World);
  }

  private getTrimmedName(): string {
    return this.characterName.trim();
  }
}
