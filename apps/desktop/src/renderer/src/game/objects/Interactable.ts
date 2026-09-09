import * as Phaser from 'phaser';
import { CustomText } from './CustomText';
import { DEPTH } from '../constants';

export interface InteractableConfig {
  /** Distance (px) the player must be within to trigger this interactable */
  radius?: number;
  /** Radius (px) of the marker circle */
  markerRadius?: number;
  /** Color of the marker circle */
  color?: number;
  /** Text shown below the marker when the player is within range */
  promptText?: string;
}

const DEFAULT_RADIUS = 90;
const DEFAULT_MARKER_RADIUS = 36;
const DEFAULT_COLOR = 0x00ffff;
const DEFAULT_PROMPT_TEXT = 'Press <SPACE>';

// anchor percentages get scaled against this size so interactables don't spread too far apart on larger screens
const MAX_LAYOUT_WIDTH = 1920;
const MAX_LAYOUT_HEIGHT = 1080;

/**
 * Something the player can walk up to and trigger (eg: opening inventory, upgrading a ship).
 * Renders as a glowing marker circle, positioned at a relative anchor so it stays put (proportionally) across resizes.
 */
export class Interactable {
  public readonly name: string;
  public x = 0;
  public y = 0;
  public readonly radius: number;

  private xFrac: number;
  private yFrac: number;
  private marker: Phaser.GameObjects.Arc;
  private label: CustomText;
  private prompt: CustomText;
  private onInteract: () => void;

  constructor(
    scene: Phaser.Scene,
    name: string,
    xFrac: number,
    yFrac: number,
    onInteract: () => void,
    {
      radius = DEFAULT_RADIUS,
      markerRadius = DEFAULT_MARKER_RADIUS,
      color = DEFAULT_COLOR,
      promptText = DEFAULT_PROMPT_TEXT,
    }: InteractableConfig = {}
  ) {
    this.name = name;
    this.xFrac = xFrac;
    this.yFrac = yFrac;
    this.radius = radius;
    this.onInteract = onInteract;

    this.marker = scene.add
      .circle(0, 0, markerRadius, color, 0.15)
      .setStrokeStyle(2, color)
      .setDepth(DEPTH.INTERACTABLE);

    this.label = new CustomText(scene, 0, 0, name, {
      fontFamily: 'Tiny5',
      fontSize: 20,
      strokeThickness: 6,
    })
      .setOrigin(0.5)
      .setDepth(DEPTH.INTERACTABLE);

    this.prompt = new CustomText(scene, 0, 0, promptText, {
      fontFamily: 'Tiny5',
      fontSize: 18,
      strokeThickness: 6,
    })
      .setOrigin(0.5)
      .setDepth(DEPTH.INTERACTABLE)
      .setVisible(false);
  }

  public destroy() {
    this.marker.destroy();
    this.label.destroy();
    this.prompt.destroy();
  }

  /** Repositions the marker to fit the given dimensions */
  public resize(width: number, height: number) {
    // center the capped layout area within the actual screen so things don't spread out on large screens
    const layoutWidth = Math.min(width, MAX_LAYOUT_WIDTH);
    const layoutHeight = Math.min(height, MAX_LAYOUT_HEIGHT);
    const offsetX = (width - layoutWidth) / 2;
    const offsetY = (height - layoutHeight) / 2;

    this.x = offsetX + layoutWidth * this.xFrac;
    this.y = offsetY + layoutHeight * this.yFrac;
    this.marker.setPosition(this.x, this.y);
    this.label.setPosition(this.x, this.y - 60);
    this.prompt.setPosition(this.x, this.y + 60);
  }

  /** Shows or hides the prompt below this interactable */
  public setPromptVisible(visible: boolean) {
    this.prompt.setVisible(visible);
  }

  /** Distance (px) from the given point to this interactable */
  public distanceTo(x: number, y: number): number {
    return Phaser.Math.Distance.Between(x, y, this.x, this.y);
  }

  /** Whether the given point is within interact range */
  public isWithinRange(x: number, y: number): boolean {
    return this.distanceTo(x, y) <= this.radius;
  }

  /** Triggers this interactable's callback */
  public interact() {
    this.onInteract();
  }
}
