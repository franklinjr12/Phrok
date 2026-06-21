import Phaser from "phaser";
import { SceneKeys } from "../constants/sceneKeys";
import { RegistryKeys } from "../constants/registryKeys";
import { chooseAdvancedClass, type AdvancedClassDefinition } from "../systems/advancedClasses";
import { eventBus } from "../systems/eventBus";
import type { DataRegistry } from "../data/dataRegistry";
import type { DialogueChoiceDefinition } from "../types/dataDefinitions";
import type { GameState } from "../types/gameState";

export type DialogueSceneData = {
  npcId: string;
  npcName: string;
  dialogueId: string;
  serviceType: string;
  lines: string[];
  choices: DialogueChoiceDefinition[];
  advancedClassOptions?: AdvancedClassDefinition[];
};

export class DialogueScene extends Phaser.Scene {
  private dialogueData?: DialogueSceneData;
  private lineIndex = 0;
  private nameText?: Phaser.GameObjects.Text;
  private bodyText?: Phaser.GameObjects.Text;
  private nextButton?: Phaser.GameObjects.Text;
  private confirmButton?: Phaser.GameObjects.Text;
  private selectedAdvancedClass?: AdvancedClassDefinition;

  constructor() {
    super(SceneKeys.Dialogue);
  }

  init(data: DialogueSceneData): void {
    this.dialogueData = {
      ...data,
      lines: data.lines.length > 0 ? data.lines : ["..."],
    };
    this.lineIndex = 0;
    this.selectedAdvancedClass = undefined;
  }

  create(): void {
    if (!this.dialogueData) {
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const boxHeight = 170;
    const boxY = height - boxHeight - 24;

    this.add.rectangle(width / 2, boxY + boxHeight / 2, Math.min(width - 48, 760), boxHeight, 0x111827, 0.94)
      .setStrokeStyle(2, 0xfacc15, 0.95)
      .setScrollFactor(0)
      .setDepth(200);
    this.nameText = this.add.text(48, boxY + 20, this.dialogueData.npcName, {
      color: "#facc15",
      fontFamily: "Arial, sans-serif",
      fontSize: "18px",
    })
      .setScrollFactor(0)
      .setDepth(201);
    this.bodyText = this.add.text(48, boxY + 52, "", {
      color: "#f8fafc",
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      lineSpacing: 6,
      wordWrap: { width: Math.min(width - 96, 704) },
    })
      .setScrollFactor(0)
      .setDepth(201);

    this.nextButton = this.createButton(width - 150, boxY + boxHeight - 42, "Next", () => this.advance());
    this.createButton(width - 70, boxY + boxHeight - 42, "Close", () => this.close());
    this.createChoices(boxY);
    this.createAdvancedClassConfirmationButton(width, boxY);
    this.syncDataset("open");
    this.renderLine();
    eventBus.emit("dialogueOpened", { dialogueId: this.dialogueData.dialogueId });
  }

  private createChoices(boxY: number): void {
    const choices = this.dialogueData?.choices ?? [];

    choices.forEach((choice, index) => {
      const button = this.add.text(48 + index * 180, boxY + 112, choice.label, {
        backgroundColor: choice.disabled ? "#334155" : "#1d4ed8",
        color: choice.disabled ? "#94a3b8" : "#f8fafc",
        fixedWidth: 164,
        fixedHeight: 28,
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        padding: { x: 8, y: 6 },
      })
        .setScrollFactor(0)
        .setDepth(201);

      if (!choice.disabled) {
        button.setInteractive({ useHandCursor: true });
        button.on(Phaser.Input.Events.POINTER_DOWN, () => this.selectChoice(choice.id));
      }
    });
  }

  private selectChoice(choiceId: string): void {
    this.game.canvas.dataset.lastDialogueChoice = choiceId;

    if (choiceId === "reset-stats") {
      this.game.canvas.dataset.statResetPrompt = "confirm:50";
      eventBus.emit("statResetRequested", { cost: 50 });
      return;
    }

    const advancedClassPrefix = "choose-advanced-class:";

    if (choiceId.startsWith(advancedClassPrefix)) {
      const state = this.registry.get(RegistryKeys.GameState) as GameState | undefined;
      const dataRegistry = this.registry.get(RegistryKeys.DataRegistry) as DataRegistry | undefined;
      const specializationName = choiceId.slice(advancedClassPrefix.length);
      const selectedDefinition = this.dialogueData?.advancedClassOptions
        ?.find((option) => option.name === specializationName);

      if (!state || !dataRegistry) {
        this.game.canvas.dataset.lastAdvancedClassChoice = "failed:missing-state";
        return;
      }

      if (!selectedDefinition) {
        this.game.canvas.dataset.lastAdvancedClassChoice = "failed:invalid-choice";
        return;
      }

      this.selectedAdvancedClass = selectedDefinition;
      this.game.canvas.dataset.advancedClassConfirmation = `pending:${selectedDefinition.id}`;
      this.renderLine();
    }
  }

  private confirmAdvancedClassChoice(): void {
    const state = this.registry.get(RegistryKeys.GameState) as GameState | undefined;
    const dataRegistry = this.registry.get(RegistryKeys.DataRegistry) as DataRegistry | undefined;
    const specializationName = this.selectedAdvancedClass?.name;

    if (!state || !dataRegistry || !specializationName) {
      this.game.canvas.dataset.lastAdvancedClassChoice = "failed:missing-confirmation";
      return;
    }

    const result = chooseAdvancedClass(state, dataRegistry.getClass(state.character.archetype), specializationName);
    this.game.canvas.dataset.lastAdvancedClassChoice = result.success
      ? `success:${result.id}`
      : `failed:${result.reason}`;

    if (result.success) {
      eventBus.emit("advancedClassChosen", { id: result.id, name: result.name });
      this.close();
    }
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    return this.add.text(x, y, label, {
      backgroundColor: "#0f172a",
      color: "#f8fafc",
      fixedWidth: 70,
      fixedHeight: 30,
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      padding: { x: 12, y: 7 },
    })
      .setScrollFactor(0)
      .setDepth(201)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.POINTER_DOWN, onClick);
  }

  private advance(): void {
    if (!this.dialogueData) {
      return;
    }

    if (this.lineIndex >= this.dialogueData.lines.length - 1) {
      this.close();
      return;
    }

    this.lineIndex += 1;
    this.renderLine();
  }

  private renderLine(): void {
    if (!this.dialogueData) {
      return;
    }

    const line = this.selectedAdvancedClass
      ? this.getAdvancedClassPreviewText(this.selectedAdvancedClass)
      : this.dialogueData.lines[this.lineIndex] ?? "";

    this.nameText?.setText(this.dialogueData.npcName);
    this.bodyText?.setText(line);
    this.nextButton?.setText(this.lineIndex >= this.dialogueData.lines.length - 1 ? "Close" : "Next");
    this.confirmButton?.setVisible(Boolean(this.selectedAdvancedClass));
    this.syncDataset("open");
  }

  private close(): void {
    const dialogueId = this.dialogueData?.dialogueId ?? "";

    this.selectedAdvancedClass = undefined;
    this.syncDataset("closed");
    eventBus.emit("dialogueClosed", { dialogueId });
    this.scene.stop();
  }

  private createAdvancedClassConfirmationButton(width: number, boxY: number): void {
    if (this.dialogueData?.serviceType !== "advanced-class") {
      return;
    }

    this.confirmButton = this.add.text(width - 252, boxY + 112, "Confirm", {
      backgroundColor: "#047857",
      color: "#f8fafc",
      fixedWidth: 92,
      fixedHeight: 28,
      fontFamily: "Arial, sans-serif",
      fontSize: "13px",
      padding: { x: 10, y: 6 },
    })
      .setScrollFactor(0)
      .setDepth(201)
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.POINTER_DOWN, () => this.confirmAdvancedClassChoice());
  }

  private getAdvancedClassPreviewText(definition: AdvancedClassDefinition): string {
    return [
      `${definition.name}: ${definition.description}`,
      `Playstyle: ${definition.playstyle}`,
      `Advanced skills: ${definition.previewSkillNames.join(", ")}`,
      "Confirm to make this permanent.",
    ].join("\n");
  }

  private syncDataset(state: "open" | "closed"): void {
    const data = this.dialogueData;
    const selected = state === "open" ? this.selectedAdvancedClass : undefined;

    this.game.canvas.dataset.dialogueState = state;
    this.game.canvas.dataset.dialogueNpcId = state === "open" ? data?.npcId ?? "" : "";
    this.game.canvas.dataset.dialogueNpcName = state === "open" ? data?.npcName ?? "" : "";
    this.game.canvas.dataset.dialogueId = state === "open" ? data?.dialogueId ?? "" : "";
    this.game.canvas.dataset.dialogueServiceType = state === "open" ? data?.serviceType ?? "" : "";
    this.game.canvas.dataset.dialogueText = state === "open"
      ? selected ? this.getAdvancedClassPreviewText(selected) : data?.lines[this.lineIndex] ?? ""
      : "";
    this.game.canvas.dataset.dialogueLineIndex = state === "open" ? String(this.lineIndex) : "";
    this.game.canvas.dataset.dialogueChoiceLabels = state === "open"
      ? data?.choices.map((choice) => choice.label).join("|") ?? ""
      : "";
    this.game.canvas.dataset.dialogueChoiceDisabled = state === "open"
      ? data?.choices.map((choice) => String(choice.disabled)).join("|") ?? ""
      : "";
    this.game.canvas.dataset.advancedClassDetailNames = state === "open"
      ? data?.advancedClassOptions?.map((option) => option.name).join("|") ?? ""
      : "";
    this.game.canvas.dataset.advancedClassDetailDescriptions = state === "open"
      ? data?.advancedClassOptions?.map((option) => option.description).join("|") ?? ""
      : "";
    this.game.canvas.dataset.advancedClassDetailPlaystyles = state === "open"
      ? data?.advancedClassOptions?.map((option) => option.playstyle).join("|") ?? ""
      : "";
    this.game.canvas.dataset.advancedClassDetailPreviewSkills = state === "open"
      ? data?.advancedClassOptions?.map((option) => option.previewSkillNames.join(", ")).join("|") ?? ""
      : "";
    this.game.canvas.dataset.selectedAdvancedClass = selected?.id ?? "";
    this.game.canvas.dataset.selectedAdvancedClassPreviewSkills = selected?.previewSkillNames.join("|") ?? "";
    this.game.canvas.dataset.advancedClassConfirmation = selected ? `pending:${selected.id}` : "";
  }
}
