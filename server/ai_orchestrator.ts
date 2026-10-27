import { GoogleGenAI } from '@google/genai';
import { decrypt, encrypt } from './crypto.ts';
import { execute, logExecution, query, queryOne } from './db.ts';

export interface AiProviderConfig {
  providerId: 'gemini' | 'openrouter' | 'nvidia' | 'mistral';
  modelName: string;
  priorityOrder: number;
  isEnabled: boolean;
  hasKey: boolean;
  maskedKey?: string;
  failureCount: number;
  lastUsedAt?: string;
}

export interface GenerationResult {
  text: string;
  provider: string;
  model: string;
  failedProviders?: string[];
}

export interface CommentAnalysisResult {
  category: 'question' | 'appreciation' | 'feedback' | 'dm_link_request' | 'collaboration' | 'spam' | 'general';
  sentiment: 'positive' | 'neutral' | 'negative';
  requiresDM: boolean;
  requestedResource?: string;
  suggestedReply: string;
  confidence: number;
}

/**
 * Universal Multi-Provider AI Orchestrator with Intelligent Failover
 */
export class AiOrchestrator {
  /**
   * Initializes default provider configs in database if not present
   */
  static async initProviders(): Promise<void> {
    const defaults: Array<{
      id: 'gemini' | 'openrouter' | 'nvidia' | 'mistral';
      model: string;
      priority: number;
    }> = [
      { id: 'gemini', model: 'gemini-3.8-flash', priority: 1 },
      { id: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free', priority: 2 },
      { id: 'nvidia', model: 'meta/llama-3.3-70b-instruct', priority: 3 },
      { id: 'mistral', model: 'mistral-small-latest', priority: 4 },
    ];

    for (const d of defaults) {
      const exists = await queryOne('SELECT provider_id FROM ai_provider_configs WHERE provider_id = ?', [d.id]);
      if (!exists) {
        await execute(
          `INSERT INTO ai_provider_configs (provider_id, model_name, priority_order, is_enabled, failure_count)
           VALUES (?, ?, ?, 1, 0)`,
          [d.id, d.model, d.priority]
        );
      }
    }
  }

  /**
   * Returns list of configured AI providers and their status
   */
  static async getProviders(): Promise<AiProviderConfig[]> {
    await this.initProviders();
    const rows = await query<any>(
      'SELECT provider_id, model_name, priority_order, is_enabled, failure_count, last_used_at, api_key_encrypted FROM ai_provider_configs ORDER BY priority_order ASC'
    );

    const hasEnvGemini = Boolean(process.env.GEMINI_API_KEY);

    const providerNames: Record<string, string> = {
      gemini: 'Google Gemini',
      openrouter: 'OpenRouter',
      nvidia: 'NVIDIA NIM',
      mistral: 'Mistral AI',
    };

    return rows.map((r) => {
      let hasKey = false;
      let maskedKey: string | undefined = undefined;

      if (r.provider_id === 'gemini') {
        hasKey = hasEnvGemini || Boolean(r.api_key_encrypted);
        if (hasEnvGemini) maskedKey = 'ENV_API_KEY (Active)';
      } else if (r.api_key_encrypted) {
        try {
          const dec = decrypt(r.api_key_encrypted);
          if (dec && dec.length > 6) {
            hasKey = true;
            maskedKey = dec.substring(0, 4) + '...' + dec.substring(dec.length - 4);
          }
        } catch {
          hasKey = false;
        }
      }

      const isFreeTier = r.provider_id === 'gemini' || r.provider_id === 'openrouter' ? 1 : 0;

      return {
        id: r.provider_id,
        provider_id: r.provider_id,
        providerId: r.provider_id,
        provider_name: providerNames[r.provider_id] || r.provider_id,
        modelName: r.model_name,
        model_name: r.model_name,
        priorityOrder: r.priority_order,
        priority_order: r.priority_order,
        isEnabled: Boolean(r.is_enabled),
        is_enabled: r.is_enabled,
        is_free_tier: isFreeTier,
        hasKey,
        maskedKey,
        api_key_masked: maskedKey,
        failureCount: r.failure_count || 0,
        consecutive_failures: r.failure_count || 0,
        lastUsedAt: r.last_used_at,
        last_used_at: r.last_used_at,
      };
    });
  }

  /**
   * Updates an AI provider's API key, model, priority, or enabled status
   */
  static async updateProvider(
    providerId: string,
    updates: {
      apiKey?: string;
      modelName?: string;
      priorityOrder?: number;
      isEnabled?: boolean;
    }
  ): Promise<void> {
    const existing = await queryOne<any>('SELECT * FROM ai_provider_configs WHERE provider_id = ?', [providerId]);
    if (!existing) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const newModel = updates.modelName !== undefined ? updates.modelName : existing.model_name;
    const newPriority = updates.priorityOrder !== undefined ? updates.priorityOrder : existing.priority_order;
    const newEnabled = updates.isEnabled !== undefined ? (updates.isEnabled ? 1 : 0) : existing.is_enabled;
    const newKeyEncrypted = updates.apiKey
      ? encrypt(updates.apiKey.trim())
      : existing.api_key_encrypted;

    await execute(
      `UPDATE ai_provider_configs 
       SET model_name = ?, priority_order = ?, is_enabled = ?, api_key_encrypted = ?, failure_count = 0, updated_at = datetime('now')
       WHERE provider_id = ?`,
      [newModel, newPriority, newEnabled, newKeyEncrypted, providerId]
    );
  }

  /**
   * Retrieves ordered list of viable providers ready to execute
   */
  private static async getOrderedExecutionProviders(): Promise<
    Array<{
      providerId: string;
      modelName: string;
      apiKey: string;
    }>
  > {
    await this.initProviders();
    const rows = await query<any>(
      'SELECT provider_id, model_name, api_key_encrypted, priority_order FROM ai_provider_configs WHERE is_enabled = 1 ORDER BY priority_order ASC'
    );

    const ready: Array<{ providerId: string; modelName: string; apiKey: string }> = [];

    for (const r of rows) {
      let key = '';
      if (r.provider_id === 'gemini') {
        key = process.env.GEMINI_API_KEY || (r.api_key_encrypted ? decrypt(r.api_key_encrypted) : '');
      } else if (r.api_key_encrypted) {
        try {
          key = decrypt(r.api_key_encrypted);
        } catch {
          key = '';
        }
      }

      if (key) {
        ready.push({
          providerId: r.provider_id,
          modelName: r.model_name,
          apiKey: key,
        });
      }
    }

    // Default fallback to Gemini with env key if no rows matched
    if (ready.length === 0 && process.env.GEMINI_API_KEY) {
      ready.push({
        providerId: 'gemini',
        modelName: 'gemini-3.8-flash',
        apiKey: process.env.GEMINI_API_KEY,
      });
    }

    return ready;
  }

  /**
   * Universal text generation with automatic circuit-breaker and failover
   */
  static async generate(
    prompt: string,
    options?: {
      systemInstruction?: string;
      temperature?: number;
      responseFormat?: 'json' | 'text';
    }
  ): Promise<GenerationResult> {
    const providers = await this.getOrderedExecutionProviders();
    if (providers.length === 0) {
      throw new Error(
        'No active AI providers available. Please set GEMINI_API_KEY or configure OpenRouter / NVIDIA in AI Settings.'
      );
    }

    const failedProviders: string[] = [];

    for (const p of providers) {
      try {
        let output = '';

        if (p.providerId === 'gemini') {
          output = await this.callGemini(p.apiKey, p.modelName, prompt, options);
        } else if (p.providerId === 'openrouter') {
          output = await this.callOpenRouter(p.apiKey, p.modelName, prompt, options);
        } else if (p.providerId === 'nvidia') {
          output = await this.callNvidia(p.apiKey, p.modelName, prompt, options);
        } else if (p.providerId === 'mistral') {
          output = await this.callMistral(p.apiKey, p.modelName, prompt, options);
        }

        if (output && output.trim()) {
          // Record successful usage
          await execute(
            `UPDATE ai_provider_configs SET last_used_at = datetime('now'), failure_count = 0 WHERE provider_id = ?`,
            [p.providerId]
          );

          return {
            text: output.trim(),
            provider: p.providerId,
            model: p.modelName,
            failedProviders: failedProviders.length > 0 ? failedProviders : undefined,
          };
        }
      } catch (err: any) {
        console.warn(`[AI Failover] Provider ${p.providerId} (${p.modelName}) failed: ${err.message}`);
        failedProviders.push(`${p.providerId}: ${err.message}`);
        await execute(
          `UPDATE ai_provider_configs SET failure_count = failure_count + 1 WHERE provider_id = ?`,
          [p.providerId]
        );
      }
    }

    throw new Error(`All AI providers failed: ${failedProviders.join('; ')}`);
  }

  /**
   * Gemini SDK caller using @google/genai
   */
  private static async callGemini(
    apiKey: string,
    modelName: string,
    prompt: string,
    options?: { systemInstruction?: string; temperature?: number; responseFormat?: 'json' | 'text' }
  ): Promise<string> {
    const ai = new GoogleGenAI({ apiKey });
    const config: any = {};
    if (options?.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }
    if (options?.temperature !== undefined) {
      config.temperature = options.temperature;
    }
    if (options?.responseFormat === 'json') {
      config.responseMimeType = 'application/json';
    }

    // Always prefer official gemini-3.8-flash
    const targetModel = modelName.includes('gemini') ? modelName : 'gemini-3.8-flash';
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: prompt,
      config,
    });

    return response.text || '';
  }

  /**
   * OpenRouter API caller (OpenAI-compatible)
   */
  private static async callOpenRouter(
    apiKey: string,
    modelName: string,
    prompt: string,
    options?: { systemInstruction?: string; temperature?: number; responseFormat?: 'json' | 'text' }
  ): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [];
    if (options?.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://aistudio.google.com',
        'X-Title': 'YouTube AI Studio Pro',
      },
      body: JSON.stringify({
        model: modelName || 'meta-llama/llama-3.3-70b-instruct:free',
        messages,
        temperature: options?.temperature ?? 0.7,
        response_format: options?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter HTTP ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * NVIDIA NIM caller
   */
  private static async callNvidia(
    apiKey: string,
    modelName: string,
    prompt: string,
    options?: { systemInstruction?: string; temperature?: number; responseFormat?: 'json' | 'text' }
  ): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [];
    if (options?.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName || 'meta/llama-3.3-70b-instruct',
        messages,
        temperature: options?.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`NVIDIA NIM HTTP ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Mistral AI caller
   */
  private static async callMistral(
    apiKey: string,
    modelName: string,
    prompt: string,
    options?: { systemInstruction?: string; temperature?: number }
  ): Promise<string> {
    const messages: Array<{ role: string; content: string }> = [];
    if (options?.systemInstruction) {
      messages.push({ role: 'system', content: options.systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName || 'mistral-small-latest',
        messages,
        temperature: options?.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Mistral HTTP ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Analyzes comment intent, sentiment, and detects whether viewer is requesting a DM or link
   */
  static async analyzeComment(
    commentText: string,
    videoContext: { title: string; description: string; customLinks?: string }
  ): Promise<CommentAnalysisResult> {
    const prompt = `Analyze this YouTube viewer's comment on the following video:

Video Title: "${videoContext.title}"
Video Context/Links: "${videoContext.customLinks || videoContext.description.substring(0, 300)}"
Viewer Comment: "${commentText}"

Task:
1. Classify intent into one of: 'question', 'appreciation', 'feedback', 'dm_link_request', 'collaboration', 'spam', 'general'.
   - Use 'dm_link_request' if the viewer is asking for a link, PDF, notes, Telegram, download, or requested a private DM/message.
2. Determine sentiment: 'positive', 'neutral', or 'negative'.
3. If intent is 'dm_link_request', extract the specific requested item into 'requestedResource' (e.g. "Urdu PDF notes", "course link", "telegram group").
4. Formulate a polite, unique, highly context-aware reply in the same language as the comment (e.g., Urdu or English). Never output a repetitive or robotic reply. If they asked for a link, acknowledge their request warmly.

Return ONLY a valid JSON object matching this schema:
{
  "category": "question" | "appreciation" | "feedback" | "dm_link_request" | "collaboration" | "spam" | "general",
  "sentiment": "positive" | "neutral" | "negative",
  "requiresDM": boolean,
  "requestedResource": string or null,
  "suggestedReply": "unique context-rich reply text",
  "confidence": number between 0 and 1
}`;

    const res = await this.generate(prompt, {
      systemInstruction:
        'You are an expert YouTube Audience Engagement & Intent Analysis Agent. Analyze comments with deep human understanding. Output valid JSON only.',
      responseFormat: 'json',
      temperature: 0.3,
    });

    try {
      const parsed = JSON.parse(res.text.replace(/```json/g, '').replace(/```/g, '').trim());
      return {
        category: parsed.category || 'general',
        sentiment: parsed.sentiment || 'neutral',
        requiresDM: Boolean(parsed.requiresDM || parsed.category === 'dm_link_request'),
        requestedResource: parsed.requestedResource || undefined,
        suggestedReply: parsed.suggestedReply || 'Thank you for watching and commenting!',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
      };
    } catch {
      return {
        category: commentText.toLowerCase().includes('link') || commentText.toLowerCase().includes('dm') ? 'dm_link_request' : 'general',
        sentiment: 'positive',
        requiresDM: commentText.toLowerCase().includes('link') || commentText.toLowerCase().includes('dm'),
        suggestedReply: 'Thank you for sharing your thoughts with us!',
        confidence: 0.7,
      };
    }
  }

  /**
   * Generates a context-rich personalized reply
   */
  static async generateContextualReply(
    commentText: string,
    authorName: string,
    videoContext: { title: string; description: string },
    learnedLink?: string
  ): Promise<string> {
    const prompt = `Video Title: "${videoContext.title}"
Viewer Name: "${authorName}"
Viewer Comment: "${commentText}"
${learnedLink ? `Verified Resource/Link to provide: "${learnedLink}"` : ''}

Generate a genuine, human, conversational reply from the channel creator.
Rules:
1. Address their specific point or question directly.
2. If a resource/link is provided above, politely share it and invite them to check it out.
3. Match the language and tone of the viewer (Urdu if they wrote in Urdu/Roman Urdu, English if English).
4. Do NOT use generic robotic phrases like "Thank you for commenting!". Speak like a real creator.
5. Keep it concise (1 to 3 natural sentences).`;

    const res = await this.generate(prompt, {
      systemInstruction:
        'You are the channel creator IslamNoorae responding warmly to your community. Speak naturally, respectfully, and authentically.',
      temperature: 0.7,
    });

    return res.text;
  }

  /**
   * Interactive Studio Agent Chat (like ChatGPT / Gemini)
   */
  static async chatWithStudioAgent(
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
    channelContext: any
  ): Promise<GenerationResult> {
    const systemInstruction = `You are the YouTube AI Studio Chief Orchestrator & Executive Agent for channel "${channelContext?.title || 'IslamNoorae'}".
You have full access to:
- Channel metrics (${channelContext?.subscriberCount || 0} subscribers, ${channelContext?.videoCount || 0} videos)
- Comment Intent & DM Detection Engine
- Self-Learning Link Memory Repository
- Multi-Provider AI Failover System (Gemini, OpenRouter, NVIDIA, Mistral)

Your role:
1. Help the creator manage comments, teach you new links to auto-reply to viewers, analyze audience retention, and optimize video metadata.
2. If the user tells you: "Whenever someone asks for X, reply with link Y", confirm that you will remember this link trigger for the channel.
3. Respond in the user's preferred language (Urdu or English) warmly, intelligently, and concisely.
4. If asked to draft replies, check comments, or provide strategy, deliver actionable, production-ready copy.`;

    const formattedHistory = history
      .slice(-10)
      .map((m) => `${m.role === 'user' ? 'Creator' : 'Agent'}: ${m.content}`)
      .join('\n\n');

    const prompt = `${formattedHistory}\n\nAgent:`;

    return await this.generate(prompt, {
      systemInstruction,
      temperature: 0.7,
    });
  }
}
