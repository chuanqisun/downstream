import { StreamingMarkdownParser } from "./lib/streaming-down";
import "./style.css";

class StreamingDemo {
  private parser: StreamingMarkdownParser | null = null;
  private streamingInterval: number | null = null;
  private currentText = "";
  private currentIndex = 0;
  private streamSpeed = 50; // ms between chunks

  private markdownInput: HTMLTextAreaElement;
  private outputContainer: HTMLElement;
  private startBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private resumeBtn: HTMLButtonElement;
  private stopBtn: HTMLButtonElement;
  private statusEl: HTMLElement;

  constructor() {
    this.markdownInput = document.getElementById("markdown-input") as HTMLTextAreaElement;
    this.outputContainer = document.getElementById("output-container") as HTMLElement;
    this.startBtn = document.getElementById("start-btn") as HTMLButtonElement;
    this.pauseBtn = document.getElementById("pause-btn") as HTMLButtonElement;
    this.resumeBtn = document.getElementById("resume-btn") as HTMLButtonElement;
    this.stopBtn = document.getElementById("stop-btn") as HTMLButtonElement;
    this.statusEl = document.getElementById("status") as HTMLElement;

    this.setupEventListeners();
    this.loadSampleMarkdown();
  }

  private setupEventListeners(): void {
    this.startBtn.addEventListener("click", () => this.start());
    this.pauseBtn.addEventListener("click", () => this.pause());
    this.resumeBtn.addEventListener("click", () => this.resume());
    this.stopBtn.addEventListener("click", () => this.stop());
  }

  private loadSampleMarkdown(): void {
    const sampleMarkdown = `# Streaming Markdown Demo

This is a **demonstration** of the streaming markdown parser.

## Features

- Real-time markdown parsing
- Block-by-block rendering
- Pause and resume functionality

### Code Example

\`\`\`javascript
function hello() {
  console.log("Hello, world!");
}
\`\`\`

## Lists

1. First item
2. Second item
3. Third item

- Bullet point one
- Bullet point two
- Bullet point three

### Quote

> This is a blockquote
> with multiple lines
> showing how the parser handles streaming content.

## Tables

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| More     | Content  | Here     |

---

**The End**

This demonstrates how the streaming parser handles various markdown elements as they arrive in chunks.`;

    this.markdownInput.value = sampleMarkdown;
  }

  private start(): void {
    if (this.parser) {
      this.parser.destroy();
    }

    this.currentText = this.markdownInput.value;
    this.currentIndex = 0;

    if (!this.currentText.trim()) {
      alert("Please enter some markdown text first!");
      return;
    }

    this.parser = new StreamingMarkdownParser(this.outputContainer);
    this.updateStatus("Streaming...");
    this.updateButtons("streaming");

    this.startStreaming();
  }

  private pause(): void {
    if (this.parser) {
      this.parser.pause();
      this.pauseStreaming();
      this.updateStatus("Paused");
      this.updateButtons("paused");
    }
  }

  private resume(): void {
    if (this.parser) {
      this.parser.resume();
      this.startStreaming();
      this.updateStatus("Streaming...");
      this.updateButtons("streaming");
    }
  }

  private stop(): void {
    if (this.parser) {
      this.parser.destroy();
      this.parser = null;
    }
    this.pauseStreaming();
    this.currentIndex = 0;
    this.outputContainer.innerHTML = "";
    this.updateStatus("Ready");
    this.updateButtons("ready");
  }

  private startStreaming(): void {
    this.streamingInterval = window.setInterval(() => {
      if (this.currentIndex >= this.currentText.length) {
        // Finished streaming
        if (this.parser) {
          this.parser.end();
        }
        this.pauseStreaming();
        this.updateStatus("Complete");
        this.updateButtons("complete");
        return;
      }

      // Send a small chunk of text
      const chunkSize = Math.random() * 10 + 1; // 1-10 characters
      const chunk = this.currentText.slice(this.currentIndex, this.currentIndex + chunkSize);

      if (this.parser) {
        this.parser.write(chunk);
      }

      this.currentIndex += chunk.length;
    }, this.streamSpeed);
  }

  private pauseStreaming(): void {
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = null;
    }
  }

  private updateStatus(status: string): void {
    this.statusEl.textContent = status;
  }

  private updateButtons(state: "ready" | "streaming" | "paused" | "complete"): void {
    switch (state) {
      case "ready":
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.resumeBtn.disabled = true;
        this.stopBtn.disabled = true;
        break;
      case "streaming":
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.resumeBtn.disabled = true;
        this.stopBtn.disabled = false;
        break;
      case "paused":
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = true;
        this.resumeBtn.disabled = false;
        this.stopBtn.disabled = false;
        break;
      case "complete":
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        this.resumeBtn.disabled = true;
        this.stopBtn.disabled = false;
        break;
    }
  }
}

// Initialize the demo when the page loads
new StreamingDemo();
