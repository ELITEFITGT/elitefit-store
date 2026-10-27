/**
 * Límite de uso básico en memoria, por IP: N solicitudes por minuto y por día.
 * En plataformas serverless cada instancia tiene su propia memoria, así que este límite
 * es orientativo; para producción con tráfico real conviene sumar el límite de la plataforma
 * (p. ej. Vercel Firewall) o un almacén compartido.
 */
export function createRateLimiter(limits: { perMinute: number; perDay: number }, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  const DAY = 24 * 60 * 60 * 1000;

  return function check(key: string): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((ts) => t - ts < DAY);
    const lastMinute = recent.filter((ts) => t - ts < 60_000);

    if (lastMinute.length >= limits.perMinute) {
      hits.set(key, recent);
      return { allowed: false, retryAfterSeconds: Math.ceil((60_000 - (t - lastMinute[0])) / 1000) };
    }
    if (recent.length >= limits.perDay) {
      hits.set(key, recent);
      return { allowed: false, retryAfterSeconds: Math.ceil((DAY - (t - recent[0])) / 1000) };
    }
    recent.push(t);
    hits.set(key, recent);

    // Limpieza ocasional para que el mapa no crezca sin límite.
    if (hits.size > 5000) {
      for (const [k, list] of hits) if (!list.some((ts) => t - ts < DAY)) hits.delete(k);
    }
    return { allowed: true };
  };
}
