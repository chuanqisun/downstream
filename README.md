# Semidown

A semi-incremental streaming markdown parser and renderer for the web, designed for handling LLM streaming out.

[Try the live demo!](https://chuanqisun.github.io/semidown/)

## Install

```bash
npm install semidown
```

## Usage

Below is a simplified usage example. See `src/main.ts` for a full-featured demo with UI controls.

```typescript
import { Semidown } from "semidown";

const outputContainer = document.getElementById("output");
const parser = new Semidown(outputContainer);

// Simulate streaming input
const markdown = "# Hello\nThis is a **streaming** demo.";
let idx = 0;
const interval = setInterval(() => {
  if (idx < markdown.length) {
    parser.write(markdown[idx++]);
  } else {
    parser.end();
    clearInterval(interval);
  }
}, 50);
```

## Key Features

- **Semi-incremental Parsing:**
  - **Block-level incremental:** As new markdown text arrives (e.g., from a stream), the parser incrementally processes and renders new blocks (paragraphs, lists, code blocks, tables, etc.) without reprocessing the entire document.
  - **Inline-level re-rendering:** Within a block, inline elements (bold, italics, links, code spans, etc.) are re-rendered as the block's content grows. This design ensures robust and correct inline rendering, even as partial input arrives.
- **Streaming Support:** Feed markdown text in arbitrary chunks (e.g., as it arrives from a network or user input) and see the output update in real time.
- **Pause, Resume, and Fast-forward:** Control the streaming process for demos, testing, or user interaction.
- **Performance & Robustness:** The semi-incremental approach balances efficient updates with correct rendering, avoiding flicker or broken formatting as content streams in.

## How It Works

- The parser maintains state as new markdown text is written.
- When a complete block is detected, it is parsed and rendered immediately.
- If a block is incomplete (e.g., a code block or list is still being typed), it is held and re-parsed as more text arrives.
- Inline elements within a block are always re-parsed on each update to ensure correctness.

## Sample App

The included demo (`src/main.ts`) provides a UI to:

- Start, pause, resume, and stop streaming markdown input
- See real-time updates as markdown is parsed and rendered
- Experiment with different markdown features (lists, code, tables, etc.)

## Design Rationale

- **Why semi-incremental?**
  - Full incremental parsing at the inline level is complex and error-prone, especially with partial tokens and nested formatting.
  - By incrementally parsing at the block level and re-rendering inlines, the library achieves a robust balance: fast updates for new blocks, and correct inline formatting as content grows.

## License

MIT
