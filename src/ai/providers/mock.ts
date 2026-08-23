import type { AIProvider, AIResponse } from "@/ai/types";
export class MockAIProvider implements AIProvider { readonly name = "mock"; async complete(): Promise<AIResponse> { return { text: "I can help with your clinic's business information, services and appointments.", toolCalls: [], model: "mock" }; } }
