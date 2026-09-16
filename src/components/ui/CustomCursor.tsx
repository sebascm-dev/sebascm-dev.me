'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

/** Estado visual del cursor */
export type CursorState = 'hidden' | 'default' | 'interactive' | 'text';

/** Elementos pulsables: el círculo crece sobre ellos */
const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'summary',
  'label',
  'select',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  '[data-repo-hit]',
  '[data-cursor="pointer"]',
].join(', ');

/** Campos donde se escribe: ahí vuelve el cursor de texto nativo */
const TEXT_SELECTOR = [
  'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"])',
  'textarea',
  '[contenteditable="true"]',
].join(', ');

/** Solo con ratón o trackpad: en pantallas táctiles no hay cursor que sustituir */
const FINE_POINTER_QUERY = '(pointer: fine) and (hover: hover)';

/** Clase en <html> que oculta el cursor nativo (ver globals.css) */
const ACTIVE_CLASS = 'custom-cursor';

/** Tamaño (px) y aspecto del círculo en cada estado */
const APPEARANCE: Record<Exclude<CursorState, 'hidden' | 'text'>, { size: number; fill: string; border: string; glow: string }> = {
  default: { size: 12, fill: 'rgba(34, 211, 238, 0)', border: 'rgba(34, 211, 238, 0.7)', glow: '0 0 0 rgba(34, 211, 238, 0)' },
  interactive: { size: 40, fill: 'rgba(34, 211, 238, 0.15)', border: 'rgba(103, 232, 249, 1)', glow: '0 0 18px rgba(34, 211, 238, 0.45)' },
};

/** Muelle del seguimiento: rápido pero sin tirones */
const FOLLOW_SPRING = { stiffness: 900, damping: 50, mass: 0.35 };

/** Qué aspecto debe tener el cursor sobre `target` */
export function cursorStateFor(target: Element | null): CursorState {
  if (!target) return 'default';
  if (target.closest(TEXT_SELECTOR)) return 'text';
  const interactive = target.closest(INTERACTIVE_SELECTOR);
  if (!interactive) return 'default';
  // Un botón deshabilitado no se puede pulsar
  return interactive.matches(':disabled') ? 'default' : 'interactive';
}

function subscribeToPointer(onChange: () => void) {
  const query = window.matchMedia(FINE_POINTER_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const hasFinePointer = () => window.matchMedia(FINE_POINTER_QUERY).matches;

/** El destino de un evento puede ser el propio document, que no es un elemento */
const elementOf = (target: EventTarget | null) => (target instanceof Element ? target : null);

/**
 * Cursor circular propio: sigue al ratón y crece sobre lo que se puede pulsar.
 * No se activa en pantallas táctiles y respeta la preferencia de movimiento reducido.
 */
export default function CustomCursor() {
  // En el servidor no hay ratón: se activa al hidratar
  const enabled = useSyncExternalStore(subscribeToPointer, hasFinePointer, () => false);
  const reducedMotion = useReducedMotion();
  const [state, setState] = useState<CursorState>('hidden');
  const [pressed, setPressed] = useState(false);

  // La posición va por motion values: moverse no vuelve a renderizar React
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, FOLLOW_SPRING);
  const springY = useSpring(y, FOLLOW_SPRING);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add(ACTIVE_CLASS);

    const onMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      // El primer movimiento lo hace visible; después manda el elemento bajo el cursor
      setState((current) => (current === 'hidden' ? cursorStateFor(elementOf(event.target)) : current));
    };
    const onOver = (event: PointerEvent) => setState(cursorStateFor(elementOf(event.target)));
    const onLeave = () => setState('hidden');
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerover', onOver);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointerup', onUp);
    root.addEventListener('pointerleave', onLeave);
    return () => {
      root.classList.remove(ACTIVE_CLASS);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointerleave', onLeave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  const visible = state === 'default' || state === 'interactive';
  const look = APPEARANCE[state === 'interactive' ? 'interactive' : 'default'];
  const size = look.size * (pressed ? 0.8 : 1);

  return (
    <motion.div
      data-testid="custom-cursor"
      data-state={state}
      data-pressed={pressed}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-full border"
      // Con movimiento reducido el círculo va pegado al ratón, sin muelle
      style={{ x: reducedMotion ? x : springX, y: reducedMotion ? y : springY, translateX: '-50%', translateY: '-50%' }}
      initial={false}
      animate={{
        width: size,
        height: size,
        opacity: visible ? 1 : 0,
        backgroundColor: look.fill,
        borderColor: look.border,
        boxShadow: look.glow,
      }}
      transition={{ duration: reducedMotion ? 0 : 0.18, ease: 'easeOut' }}
    />
  );
}
