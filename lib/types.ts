/**
 * Emits events: 'block-start', 'block-update', 'block-end', 'end'
 */
export type ChunkerEvent = "block-start" | "block-update" | "block-end" | "end";
export type Listener = ((p: BlockStartPayload) => void) | ((p: BlockUpdatePayload) => void) | ((p: BlockEndPayload) => void) | (() => void);

export interface BlockStartPayload {
  blockId: string;
}
export interface BlockUpdatePayload {
  blockId: string;
  content: string;
}
export interface BlockEndPayload {
  blockId: string;
}
