// streamingMarkdownParser.ts
import { marked } from "marked";

/**
 * Emits events: 'block-start', 'block-update', 'block-end', 'end'
 */
type ChunkerEvent = "block-start" | "block-update" | "block-end" | "end";

interface BlockStartPayload {
  blockId: string;
}
interface BlockUpdatePayload {
  blockId: string;
  content: string;
}
interface BlockEndPayload {
  blockId: string;
}

type Listener = ((p: BlockStartPayload) => void) | ((p: BlockUpdatePayload) => void) | ((p: BlockEndPayload) => void) | (() => void);

/**
 * 1) Splits a stream of markdown text into block sub‑streams,
 *    emitting start/update/end events per block, based on blank lines.
 */
class MarkdownStreamChunker {
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

/**
 * 2) Wraps marked.parse() and detects unclosed fenced-code blocks.
 */
class MarkdownParser {
  /**
   * Parse markdown → HTML, and detect if there's an odd number
   * of ``` fences (i.e. an unclosed code block).
   */
  parse(markdown: string): { html: string; isComplete: boolean } {
    const html = marked.parse(markdown) as string;
    const fences = (markdown.match(/```/g) || []).length;
    const isComplete = fences % 2 === 0;
    return { html, isComplete };
  }
}

/**
 * 3) Renders each block into its own <div data-block-id="..."> under root.
 */
class HTMLRenderer {
  private root: HTMLElement;
  private blocks = new Map<string, HTMLElement>();

  constructor(root: HTMLElement) {
    this.root = root;
    this.root.innerHTML = "";
  }

  createBlock(blockId: string): void {
    const div = document.createElement("div");
    div.dataset.blockId = blockId;
    this.root.appendChild(div);
    this.blocks.set(blockId, div);
  }

  updateBlock(blockId: string, html: string): void {
    const el = this.blocks.get(blockId);
    if (el) {
      el.innerHTML = html;
    }
  }

  finalizeBlock(blockId: string, isComplete: boolean): void {
    const el = this.blocks.get(blockId);
    if (el && isComplete) {
      el.classList.add("md-block-complete");
    }
  }

  clear(): void {
    this.root.innerHTML = "";
    this.blocks.clear();
  }
}

/**
 * 4) Orchestrator: wires chunker → parser → renderer.
 *    Supports write(), end(), pause/resume, destroy().
 */
export class StreamingMarkdownParser {
  private chunker = new MarkdownStreamChunker();
  private parser = new MarkdownParser();
  private renderer: HTMLRenderer;
  private state: "idle" | "processing" | "paused" | "destroyed" = "idle";

  constructor(targetElement: HTMLElement) {
    this.renderer = new HTMLRenderer(targetElement);
    this.hookup();
  }

  /** Feed more markdown text into the pipeline */
  write(chunk: string): void {
    if (this.state === "processing") {
      this.chunker.write(chunk);
    }
  }

  /** Signal no more data is coming */
  end(): void {
    if (this.state === "processing") {
      this.chunker.end();
    }
  }

  pause(): void {
    if (this.state === "processing") {
      this.state = "paused";
    }
  }

  resume(): void {
    if (this.state === "paused") {
      this.state = "processing";
    }
  }

  destroy(): void {
    this.state = "destroyed";
    this.renderer.clear();
    // tear down chunker listeners
    this.chunker.off("block-start", this.onBlockStart);
    this.chunker.off("block-update", this.onBlockUpdate);
    this.chunker.off("block-end", this.onBlockEnd);
    this.chunker.off("end", this.onEnd);
  }

  getState(): "idle" | "processing" | "paused" | "destroyed" {
    return this.state;
  }

  /** Wire chunker → parser → renderer */
  private hookup(): void {
    this.state = "processing";
    this.chunker.on("block-start", this.onBlockStart);
    this.chunker.on("block-update", this.onBlockUpdate);
    this.chunker.on("block-end", this.onBlockEnd);
    this.chunker.on("end", this.onEnd);
  }

  private onBlockStart = (p: BlockStartPayload) => {
    if (this.state !== "processing") return;
    this.renderer.createBlock(p.blockId);
  };

  private onBlockUpdate = (p: BlockUpdatePayload) => {
    if (this.state !== "processing") return;
    const { html, isComplete } = this.parser.parse(p.content);
    this.renderer.updateBlock(p.blockId, html);
    // we don’t finalize here; wait for explicit block-end
  };

  private onBlockEnd = (p: BlockEndPayload) => {
    if (this.state !== "processing") return;
    // For completeness, re‐parse the final content to see if it's now “complete”
    const container = this.renderer["blocks"].get(p.blockId);
    const finalMD = container?.innerText || "";
    const { isComplete } = this.parser.parse(finalMD);
    this.renderer.finalizeBlock(p.blockId, isComplete);
  };

  private onEnd = () => {
    this.state = "idle";
  };
}
