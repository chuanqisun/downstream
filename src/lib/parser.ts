import { Marked } from "marked";
import markedShiki from "marked-shiki";
import { bundledLanguages, createHighlighter } from "shiki/bundle/web";

/**
 * Wraps marked.parse() and detects unclosed fenced-code blocks.
 */
export class MarkdownParser {
  private marked: Marked | null = null;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    const supportedLanguages = Object.keys(bundledLanguages);

    const highlighter = await createHighlighter({
      langs: supportedLanguages,
      themes: ["dark-plus"],
    });

    this.marked = new Marked().use(
      markedShiki({
        highlight(code, lang, props) {
          const highlightableLanguage = supportedLanguages.includes(lang) ? lang : "text";

          const highlightedHtml = highlighter.codeToHtml(code, {
            lang: highlightableLanguage,
            theme: "dark-plus",
          });

          return highlightedHtml;
        },
      })
    );
  }

  /**
   * Parse markdown → HTML, and detect if there's an odd number
   * of ``` fences (i.e. an unclosed code block).
   */
  async parse(markdown: string): Promise<{ html: string; isComplete: boolean }> {
    await this.initPromise;

    if (!this.marked) {
      throw new Error("Markdown parser not initialized");
    }

    const html = await this.marked.parse(markdown);
    const fences = (markdown.match(/```/g) || []).length;
    const isComplete = fences % 2 === 0;
    return { html, isComplete };
  }
}
