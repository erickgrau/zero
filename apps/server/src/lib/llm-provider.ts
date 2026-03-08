/**
 * LLM Provider Abstraction Layer
 *
 * Central registry for all LLM providers. Instead of hardcoding `openai('gpt-4o')` everywhere,
 * all AI calls should use `getModel()` or `getMiniModel()` from this module.
 *
 * Supports: OpenAI, Anthropic (Claude), Google (Gemini), Groq, and local OpenAI-compatible
 * endpoints (Ollama, vLLM, text-generation-inference).
 */

import { createOpenAI, openai } from '@ai-sdk/openai';
import { createAnthropic, anthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI, google } from '@ai-sdk/google';
import { createGroq, groq } from '@ai-sdk/groq';
import { env } from '../env';
import { createDb } from '../db';
import { credentials } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { decryptText } from './encryption';

export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'groq' | 'local';

const DEFAULT_MODELS: Record<LLMProvider, string> = {
    openai: 'gpt-4o',
    anthropic: 'claude-3-7-sonnet-20250219',
    google: 'gemini-2.0-flash',
    groq: 'llama-3.3-70b-versatile',
    local: 'llama3.1:8b',
};

const DEFAULT_MINI_MODELS: Record<LLMProvider, string> = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-haiku-20241022',
    google: 'gemini-2.0-flash-lite',
    groq: 'llama-3.1-8b-instant',
    local: 'llama3.1:8b',
};

export function getActiveProvider(): LLMProvider {
    const provider = (env as any).LLM_PROVIDER as string | undefined;
    if (provider && isValidProvider(provider)) {
        return provider as LLMProvider;
    }
    if ((env as any).USE_OPENAI === 'true') {
        return 'openai';
    }
    return 'openai';
}

function isValidProvider(provider: string): provider is LLMProvider {
    return ['openai', 'anthropic', 'google', 'groq', 'local'].includes(provider);
}

function getLocalProvider(customBaseUrl?: string) {
    const baseURL = customBaseUrl || (env as any).LOCAL_LLM_URL || 'http://localhost:11434/v1';
    const apiKey = (env as any).LOCAL_LLM_API_KEY || 'ollama';
    return createOpenAI({
        baseURL,
        apiKey,
    });
}

function getProviderEnvKey(provider: LLMProvider): string {
    switch (provider) {
        case 'openai': return 'OPENAI_API_KEY';
        case 'anthropic': return 'ANTHROPIC_API_KEY';
        case 'google': return 'GOOGLE_GENERATIVE_AI_API_KEY';
        case 'groq': return 'GROQ_API_KEY';
        case 'local': return 'LOCAL_LLM_URL';
    }
}

async function getUserCredential(userId: string, provider: LLMProvider): Promise<string | null> {
    try {
        const { db } = createDb((env as any).DATABASE_URL);
        const keyName = getProviderEnvKey(provider);

        const cred = await db.query.credentials.findFirst({
            where: and(eq(credentials.userId, userId), eq(credentials.name, keyName)),
        });

        if (cred) {
            return await decryptText(cred.value);
        }
    } catch (e) {
        console.error('Failed to fetch user credential for provider', provider, e);
    }
    return null;
}

export type GetModelOptions = {
    userId?: string;
    providerOverride?: LLMProvider;
    modelOverride?: string;
};

export async function getModel(options?: GetModelOptions) {
    const provider = options?.providerOverride || getActiveProvider();
    const modelName = options?.modelOverride || getModelName(provider);

    let customKey: string | null = null;
    if (options?.userId) {
        customKey = await getUserCredential(options.userId, provider);
    }

    switch (provider) {
        case 'openai':
            return customKey ? createOpenAI({ apiKey: customKey })(modelName) : openai(modelName);
        case 'anthropic':
            return customKey ? createAnthropic({ apiKey: customKey })(modelName) : anthropic(modelName);
        case 'google':
            return customKey ? createGoogleGenerativeAI({ apiKey: customKey })(modelName) : google(modelName);
        case 'groq':
            return customKey ? createGroq({ apiKey: customKey })(modelName) : groq(modelName);
        case 'local':
            // For local, customKey stores the actual URL if they configured it
            return getLocalProvider(customKey || undefined)(modelName);
        default:
            return customKey ? createOpenAI({ apiKey: customKey })(modelName) : openai(modelName);
    }
}

export async function getMiniModel(options?: GetModelOptions) {
    const provider = options?.providerOverride || getActiveProvider();
    const modelName = options?.modelOverride || getMiniModelName(provider);

    let customKey: string | null = null;
    if (options?.userId) {
        customKey = await getUserCredential(options.userId, provider);
    }

    switch (provider) {
        case 'openai':
            return customKey ? createOpenAI({ apiKey: customKey })(modelName) : openai(modelName);
        case 'anthropic':
            return customKey ? createAnthropic({ apiKey: customKey })(modelName) : anthropic(modelName);
        case 'google':
            return customKey ? createGoogleGenerativeAI({ apiKey: customKey })(modelName) : google(modelName);
        case 'groq':
            return customKey ? createGroq({ apiKey: customKey })(modelName) : groq(modelName);
        case 'local':
            return getLocalProvider(customKey || undefined)(modelName);
        default:
            return customKey ? createOpenAI({ apiKey: customKey })(modelName) : openai(modelName);
    }
}

function getModelName(provider: LLMProvider): string {
    switch (provider) {
        case 'openai': return (env as any).OPENAI_MODEL || DEFAULT_MODELS.openai;
        case 'anthropic': return (env as any).ANTHROPIC_MODEL || DEFAULT_MODELS.anthropic;
        case 'google': return (env as any).GOOGLE_MODEL || DEFAULT_MODELS.google;
        case 'groq': return (env as any).GROQ_MODEL || DEFAULT_MODELS.groq;
        case 'local': return (env as any).LOCAL_LLM_MODEL || DEFAULT_MODELS.local;
        default: return DEFAULT_MODELS.openai;
    }
}

function getMiniModelName(provider: LLMProvider): string {
    switch (provider) {
        case 'openai': return (env as any).OPENAI_MINI_MODEL || DEFAULT_MINI_MODELS.openai;
        case 'anthropic': return (env as any).ANTHROPIC_MINI_MODEL || DEFAULT_MINI_MODELS.anthropic;
        case 'google': return (env as any).GOOGLE_MINI_MODEL || DEFAULT_MINI_MODELS.google;
        case 'groq': return (env as any).GROQ_MINI_MODEL || DEFAULT_MINI_MODELS.groq;
        case 'local': return (env as any).LOCAL_LLM_MODEL || DEFAULT_MINI_MODELS.local;
        default: return DEFAULT_MINI_MODELS.openai;
    }
}

export function getAvailableProviders(): { id: LLMProvider; name: string; available: boolean }[] {
    return [
        { id: 'openai', name: 'OpenAI', available: !!(env as any).OPENAI_API_KEY },
        { id: 'anthropic', name: 'Anthropic (Claude)', available: !!(env as any).ANTHROPIC_API_KEY },
        { id: 'google', name: 'Google (Gemini)', available: !!(env as any).GOOGLE_GENERATIVE_AI_API_KEY },
        { id: 'groq', name: 'Groq', available: !!(env as any).GROQ_API_KEY },
        { id: 'local', name: 'Local LLM (Ollama/vLLM)', available: !!(env as any).LOCAL_LLM_URL },
    ];
}
