export type AIMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; toolCallId?: string; name?: string; toolCalls?: AIToolCall[] };
export type AIToolCall = { id: string; name: string; arguments: unknown };
export type AIResponse = { text: string; toolCalls: AIToolCall[]; inputTokens?: number; outputTokens?: number; model?: string };
export interface AIProvider { readonly name: string; complete(input: { messages: AIMessage[]; tools: unknown[]; model?: string }): Promise<AIResponse>; }
