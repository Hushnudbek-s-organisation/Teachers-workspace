"use client";

/** Idempotency kaliti — tarmoq qayta yuborsa natija ikki marta yozilmaydi */
export function newAttemptId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
