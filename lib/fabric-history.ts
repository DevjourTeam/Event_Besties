/**
 * Undo/Redo stack for a Fabric.js canvas, per PROMPT.md spec.
 *
 * - Pushes a JSON snapshot on every committed change
 * - Branches: a push after undo discards the redo tail
 * - Caps stack at maxSize (30 by default)
 * - isPaused guards against re-entrancy when loadFromJSON triggers events
 */

import type { fabric } from "fabric";

type Canvas = fabric.Canvas;

export class FabricHistory {
  private stack: string[] = [];
  private pointer = -1;
  private maxSize: number;
  private isPaused = false;
  private canvas: Canvas;

  constructor(canvas: Canvas, maxSize = 30) {
    this.canvas = canvas;
    this.maxSize = maxSize;
  }

  push(): void {
    if (this.isPaused) return;
    // Drop redo tail.
    this.stack = this.stack.slice(0, this.pointer + 1);
    const snapshot = JSON.stringify(this.canvas.toJSON(["_isUserImage"]));
    this.stack.push(snapshot);
    if (this.stack.length > this.maxSize) {
      this.stack.shift();
    } else {
      this.pointer++;
    }
  }

  undo(onDone?: () => void): void {
    if (this.pointer <= 0) return;
    this.pointer--;
    this.replay(onDone);
  }

  redo(onDone?: () => void): void {
    if (this.pointer >= this.stack.length - 1) return;
    this.pointer++;
    this.replay(onDone);
  }

  private replay(onDone?: () => void) {
    const snapshot = this.stack[this.pointer];
    if (!snapshot) return;
    this.isPaused = true;
    this.canvas.loadFromJSON(snapshot, () => {
      this.canvas.renderAll();
      this.isPaused = false;
      onDone?.();
    });
  }

  canUndo(): boolean {
    return this.pointer > 0;
  }

  canRedo(): boolean {
    return this.pointer < this.stack.length - 1;
  }

  reset(): void {
    this.stack = [];
    this.pointer = -1;
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }
}
