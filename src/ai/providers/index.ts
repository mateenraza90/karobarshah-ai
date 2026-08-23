import { serverEnv } from "@/lib/env.server";
import type { AIProvider } from "@/ai/types";
import { MockAIProvider } from "./mock";
import { OpenAICompatibleProvider } from "./openai";
import { AnthropicCompatibleProvider } from "./anthropic";
export function getAIProvider(): AIProvider { if(serverEnv.AI_PROVIDER==="openai" && serverEnv.OPENAI_API_KEY)return new OpenAICompatibleProvider(serverEnv.OPENAI_API_KEY,serverEnv.OPENAI_BASE_URL); if(serverEnv.AI_PROVIDER==="anthropic" && serverEnv.ANTHROPIC_API_KEY)return new AnthropicCompatibleProvider(serverEnv.ANTHROPIC_API_KEY,serverEnv.ANTHROPIC_BASE_URL); return new MockAIProvider(); }
