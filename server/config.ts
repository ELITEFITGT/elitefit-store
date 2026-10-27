/**
 * CONFIGURACIÓN DEL ASISTENTE (solo servidor)
 * Se lee de variables de entorno. Ninguna de estas variables usa el prefijo VITE_,
 * así que Vite nunca las incluye en el código que se envía al navegador.
 */
const int = (value: string | undefined, fallback: number) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
type Effort = (typeof EFFORTS)[number];

export function getServerConfig(env: NodeJS.ProcessEnv = process.env) {
  const effort = (EFFORTS as readonly string[]).includes(env.AI_EFFORT ?? '') ? (env.AI_EFFORT as Effort) : 'low';
  return {
    provider: 'anthropic' as const,
    providerLabel: 'Anthropic (Claude)',
    apiKey: env.ANTHROPIC_API_KEY?.trim() || '',
    model: env.AI_MODEL?.trim() || 'claude-opus-5-5',
    effort,
    maxOutputTokens: int(env.AI_MAX_OUTPUT_TOKENS, 4096),
    /** Reintento automático en otro modelo si el principal declina por políticas de seguridad. */
    serverFallbacks: (env.AI_FALLBACKS ?? 'default') !== 'off',
    timeoutMs: int(env.AI_TIMEOUT_MS, 45_000),
    limits: {
      maxBodyBytes: int(env.CHAT_MAX_BODY_BYTES, 300_000),
      maxMessages: int(env.CHAT_MAX_MESSAGES, 90),
      maxUserChars: int(env.CHAT_MAX_USER_CHARS, 1000),
      maxToolResultChars: int(env.CHAT_MAX_TOOL_RESULT_CHARS, 20_000),
      maxToolRoundsPerTurn: int(env.CHAT_MAX_TOOL_ROUNDS, 8),
      maxToolCallsPerRound: 10,
    },
    rateLimit: {
      perMinute: int(env.CHAT_RATE_LIMIT_PER_MINUTE, 15),
      perDay: int(env.CHAT_RATE_LIMIT_PER_DAY, 300),
    },
    /** Orígenes permitidos separados por coma. Vacío = solo el mismo dominio que sirve la API. */
    allowedOrigins: (env.CHAT_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  };
}

export type ServerConfig = ReturnType<typeof getServerConfig>;
