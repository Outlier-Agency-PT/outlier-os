"use client";

import { useRef, useCallback } from "react";

/**
 * Debounced autosave. Returns a `trigger` function — chama-a sempre que
 * o valor muda. A acção real só dispara após `delayMs` ms de silêncio.
 *
 * Uso:
 *   const save = useAutosave((text) => saveAction(id, text), 1000);
 *   <textarea onChange={(e) => { setValue(e.target.value); save(e.target.value); }} />
 */
export function useAutosave<T>(
  fn: (value: T) => Promise<void>,
  delayMs = 1000,
): (value: T) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback(
    (value: T) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        fnRef.current(value);
      }, delayMs);
    },
    [delayMs],
  );
}

/**
 * Versão com chave — útil quando há múltiplos itens independentes na
 * mesma lista (ex: notas por desafio, campos por linha de tabela).
 * Cada chave tem o seu próprio timer.
 *
 * Uso:
 *   const save = useAutosaveKeyed((key, text) => saveAction(key, text), 1000);
 *   items.map(item => <textarea onChange={(e) => save(item.id, e.target.value)} />)
 */
export function useAutosaveKeyed<K extends string, T>(
  fn: (key: K, value: T) => Promise<void>,
  delayMs = 1000,
): (key: K, value: T) => void {
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback(
    (key: K, value: T) => {
      if (timersRef.current[key]) clearTimeout(timersRef.current[key]);
      timersRef.current[key] = setTimeout(() => {
        fnRef.current(key, value);
      }, delayMs);
    },
    [delayMs],
  );
}
