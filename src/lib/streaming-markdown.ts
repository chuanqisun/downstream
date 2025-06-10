import { MarkdownStreamChunker } from "./chunker";
import { MarkdownParser } from "./parser";
import { HTMLRenderer } from "./renderer";
import type { BlockEndPayload, BlockStartPayload, BlockUpdatePayload } from "./types";

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

  private onBlockUpdate = async (p: BlockUpdatePayload) => {
    if (this.state !== "processing") return;
    const { html } = await this.parser.parse(p.content);
    this.renderer.updateBlock(p.blockId, html);
    // we don't finalize here; wait for explicit block-end
  };

  private onBlockEnd = async (p: BlockEndPayload) => {
    if (this.state !== "processing") return;
    // For completeness, re‐parse the final content to see if it's now "complete"
    const container = this.renderer["blocks"].get(p.blockId);
    const finalMD = container?.innerText || "";
    const { isComplete } = await this.parser.parse(finalMD);
    this.renderer.finalizeBlock(p.blockId, isComplete);
  };

  private onEnd = () => {
    this.state = "idle";
  };
}
