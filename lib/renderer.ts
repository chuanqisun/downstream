/**
 * Renders each block into its own <div data-block-id="..."> under root.
 */
export class HTMLRenderer {
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
