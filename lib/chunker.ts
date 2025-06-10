import type { ChunkerEvent, Listener } from "./types";

/**
 * Splits a stream of markdown text into block sub‑streams,
 * emitting start/update/end events per block, based on blank lines.
 */
export class MarkdownStreamChunker {
  private buffer = "";
  private nextBlockId = 1;
  private currentBlockId: string | null = null;
  private listeners: Record<ChunkerEvent, Listener[]> = {
    "block-start": [],
    "block-update": [],
    "block-end": [],
    end: [],
  };

  /**
   * Write a chunk of markdown text into the chunker.
   */
  write(chunk: string): void {
    let data = this.buffer + chunk;
    this.buffer = "";

    // 1) While there's a blank-line boundary, cut out a full block
    while (true) {
      const idx = data.indexOf("\n\n");
      if (idx === -1) break;

      const part = data.slice(0, idx);
      data = data.slice(idx + 2);

      this.emitUpdate(part);
      this.emitEnd();
    }

    // 2) Whatever remains is the current block's ongoing content
    if (data.length > 0) {
      this.buffer = data;
      this.emitUpdate(data);
    }
  }

  /**
   * Signal end of the overall stream.
   * Flush any remaining block.
   */
  end(): void {
    if (this.buffer.length > 0) {
      this.emitUpdate(this.buffer);
      this.buffer = "";
      this.emitEnd();
    }
    this.emit("end");
  }

  on(event: ChunkerEvent, fn: Listener): void {
    this.listeners[event].push(fn);
  }

  off(event: ChunkerEvent, fn: Listener): void {
    this.listeners[event] = this.listeners[event].filter((l) => l !== fn);
  }

  private emit(event: ChunkerEvent, payload?: any): void {
    for (const fn of this.listeners[event]) {
      // @ts-ignore
      fn(payload);
    }
  }

  private emitStart(): void {
    if (!this.currentBlockId) {
      this.currentBlockId = `block-${this.nextBlockId++}`;
      this.emit("block-start", { blockId: this.currentBlockId });
    }
  }

  private emitUpdate(content: string): void {
    this.emitStart();
    this.emit("block-update", { blockId: this.currentBlockId!, content });
  }

  private emitEnd(): void {
    if (!this.currentBlockId) return;
    this.emit("block-end", { blockId: this.currentBlockId });
    this.currentBlockId = null;
  }
}
