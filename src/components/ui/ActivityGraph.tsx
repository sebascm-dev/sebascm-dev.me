'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceDot
} from 'recharts';
import { IconBrandGithub, IconLock, IconSparkles } from '@tabler/icons-react';
import { repoActivity, scaleActivity, yDomainMax, type HeroPoint, type ScaledHeroPoint } from '@/lib/github/hero';

/** Max repos listed in the tooltip before collapsing the rest */
const TOOLTIP_REPO_LIMIT = 4;

/** Hueco (px) entre la fila de botones del hero y el techo del gráfico */
const CHART_GAP_BELOW_ACTIONS = 32;
/** Selector de la fila de botones del hero, que marca el techo del gráfico */
const HERO_ACTIONS_SELECTOR = '[data-hero-actions]';

/**
 * Techo del gráfico (px desde arriba del hero): siempre un poco por debajo de los botones.
 * En pantallas bajas la curva simplemente queda más pequeña. null si no se puede medir
 * (se usa el valor por defecto).
 */
export function chartTopFor(actionsBottom: number | null, containerHeight: number): number | null {
  if (actionsBottom == null || containerHeight <= 0) return null;
  return actionsBottom + CHART_GAP_BELOW_ACTIONS;
}

/** Ancho del tooltip (w-72) y hueco entre el cursor y el tooltip, en px */
const TOOLTIP_WIDTH = 288;
const TOOLTIP_GAP = 16;

interface Point2D {
  x: number;
  y: number;
}

/**
 * Posición del tooltip: justo a la izquierda del cursor y con su centro vertical a la altura
 * del ratón (el propio tooltip se desplaza -50 % en vertical). Si no cabe, pasa a la derecha.
 */
export function tooltipPosition(cursor: Point2D, containerWidth: number): Point2D {
  const left = cursor.x - TOOLTIP_GAP - TOOLTIP_WIDTH;
  const x = left < 0 ? cursor.x + TOOLTIP_GAP : left;
  return { x: Math.min(x, Math.max(0, containerWidth - TOOLTIP_WIDTH)), y: cursor.y };
}

/** Repos destacados al pasar el ratón por el punto donde se crearon */
export interface RepoHover {
  repos: string[];
  /** Día del punto (creación de los repos) */
  createdOn: string;
}

/** Lo que muestra el tooltip mientras hay repos destacados */
export interface RepoFocus {
  repos: { name: string; isPrivate?: boolean }[];
  createdOn: string;
  /** Commits de esos repos en el último año */
  total: number;
  /** Días con al menos un commit en esos repos */
  activeDays: number;
  /** Commits por semana del año, para las barritas */
  weekly: number[];
}

/** Clases del fundido de las capas del gráfico (curva normal, resaltado y sus puntos) */
const LAYER_FADE = 'transition-opacity duration-200 ease-out';

/** Distancia base (px) entre el punto y su etiqueta; los días alternos suben un escalón más */
const LABEL_OFFSET = 18;
const LABEL_STAGGER = 16;
const LABEL_LINE_HEIGHT = 12;

/** Props que Recharts pasa a un dot/shape custom */
interface CustomShapeProps {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: ScaledHeroPoint;
}

interface RepoMarkerProps extends CustomShapeProps {
  /** Se llama con los repos del punto al entrar el cursor y con null al salir */
  onHover?: (hover: RepoHover | null) => void;
}

/** Props que Recharts pasa a un tooltip custom, más los datos que necesita la ficha */
interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: ScaledHeroPoint }[];
  /** Serie completa, para dibujar los 30 días que acaban en el punto */
  series?: ScaledHeroPoint[];
  /** Si hay un repo destacado, el tooltip muestra su ficha en lugar del día */
  focus?: RepoFocus | null;
}

const dayFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const yearFormatter = new Intl.DateTimeFormat('es-ES', { year: 'numeric', timeZone: 'UTC' });
const weekdayFormatter = new Intl.DateTimeFormat('es-ES', { weekday: 'short', timeZone: 'UTC' });
const averageFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

/** Las fechas son días de calendario: se leen a mediodía UTC para que ninguna zona horaria las mueva */
const toDate = (day: string) => new Date(`${day}T12:00:00Z`);

/** "10 feb 2026" */
function formatDay(day: string): string {
  return `${dayFormatter.format(toDate(day))} ${yearFormatter.format(toDate(day))}`;
}

/** "lun 16 feb 2026" */
function formatWeekday(day: string): string {
  return `${weekdayFormatter.format(toDate(day)).replace('.', '')} ${formatDay(day)}`;
}

/**
 * Punto brillante con el nombre de cada repo, en el día exacto en que se creó (público o privado).
 * Las etiquetas van siempre debajo del punto, dentro del área rellena: el texto del hero
 * queda por encima de la curva y así nunca se pisan. Los días alternos se escalonan.
 */
export const RepoMarker = ({ cx, cy, index = 0, payload, onHover }: RepoMarkerProps) => {
  if (cx == null || cy == null || !payload?.newRepos.length) return null;

  const names = payload.newRepos;
  // Línea base del primer nombre; los siguientes se apilan hacia abajo
  const labelTop = cy + LABEL_OFFSET + (index % 2) * LABEL_STAGGER + 8;

  return (
    <g>
      {/* Guía y nombres de los repos, apilados hacia abajo; en pantallas estrechas se pisarían */}
      <g className="repo-labels hidden sm:block">
        <line x1={cx} y1={cy + 6} x2={cx} y2={labelTop - 10} stroke="#22d3ee" strokeWidth={1} strokeOpacity={0.3} />
        {names.map((name, i) => (
          <text
            key={name}
            x={cx}
            y={labelTop + i * LABEL_LINE_HEIGHT}
            textAnchor="middle"
            fontSize="10"
            fontFamily="monospace"
            fill="#67e8f9"
            // Contorno del color del fondo para que el nombre se lea sobre la curva
            stroke="#0a0a0a"
            strokeWidth={3}
            paintOrder="stroke"
            opacity="0.9"
          >
            {name}
          </text>
        ))}
      </g>
      {/* Halo exterior */}
      <circle cx={cx} cy={cy} r="10" fill="#22d3ee" opacity="0.08" />
      {/* Halo medio */}
      <circle cx={cx} cy={cy} r="6" fill="#22d3ee" opacity="0.15" />
      {/* Punto principal */}
      <circle cx={cx} cy={cy} r="3.5" fill="#67e8f9" />
      {/* Brillo central */}
      <circle cx={cx} cy={cy} r="1.5" fill="white" opacity="0.8" />
      {/* Zona de hover, más grande que el punto para que sea fácil de atrapar */}
      <circle
        data-repo-hit
        cx={cx}
        cy={cy}
        r="12"
        fill="transparent"
        pointerEvents="all"
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => onHover?.({ repos: names, createdOn: payload.end })}
        onMouseLeave={() => onHover?.(null)}
      />
    </g>
  );
};

/**
 * Punto pequeño en cada día con commits del repo destacado. Recharts pinta los puntos en una
 * capa aparte de la curva, así que el fundido se aplica aquí también.
 */
export const CommitDayDot = ({ cx, cy, payload, repos, active }: CustomShapeProps & { repos: string[]; active: boolean }) => {
  if (cx == null || cy == null || !payload) return null;
  if (!repos.some((repo) => (payload.dayCommits[repo] ?? 0) > 0)) return null;
  return <circle cx={cx} cy={cy} r="2.5" fill="#67e8f9" className={`${LAYER_FADE} ${active ? 'opacity-100' : 'opacity-0'}`} />;
};

/** Cifra destacada: el valor manda y la etiqueta lo acompaña en tono apagado */
const Stat = ({ testId, value, label }: { testId: string; value: string | number; label: string }) => (
  <div data-testid={testId} className="min-w-0">
    <div className="text-[22px] leading-none font-semibold text-white tabular-nums tracking-tight">{value}</div>
    <div className="mt-1 text-[10px] leading-tight text-white/40">{label}</div>
  </div>
);

/** Minigráfico de barras: altura relativa al máximo, las vacías quedan como una rayita */
const MiniBars = ({ testId, values, current }: { testId: string; values: number[]; current?: number }) => {
  const max = Math.max(1, ...values);
  return (
    <div data-testid={testId} className="flex h-7 items-end gap-[2px]" aria-hidden="true">
      {values.map((value, i) => (
        <span
          key={i}
          data-bar
          data-value={value}
          data-current={i === current ? '' : undefined}
          className={`flex-1 rounded-[1px] ${
            i === current ? 'bg-cyan-300 shadow-[0_0_6px_#22d3ee]' : value > 0 ? 'bg-cyan-400/45' : 'bg-white/10'
          }`}
          style={{ height: value > 0 ? `${Math.max(12, (value / max) * 100)}%` : '2px' }}
        />
      ))}
    </div>
  );
};

/** Fila de repo: rayita de color como clave, nombre, marcas y su cifra a la derecha */
const RepoRow = ({ name, commits, isPrivate, isNew }: { name: string; commits: number; isPrivate: boolean; isNew: boolean }) => (
  <li className="flex items-center gap-2 min-w-0">
    <span className="h-[2px] w-2.5 flex-shrink-0 rounded-full bg-cyan-400" />
    <span className="truncate text-[12px] font-medium text-white/80">{name}</span>
    {isPrivate && <IconLock size={11} className="flex-shrink-0 text-white/30" aria-label="Repositorio privado" />}
    {isNew && <IconSparkles size={11} className="flex-shrink-0 text-cyan-300" aria-label="Repositorio nuevo" />}
    <span className="ml-auto pl-2 font-mono text-[12px] font-semibold text-white tabular-nums">{commits}</span>
  </li>
);

/** Rótulo de sección en mono, como el resto de detalles técnicos del hero */
const SectionLabel = ({ children }: { children: string }) => (
  <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">{children}</p>
);

/** Ficha del repo destacado: identidad, fechas, cifras del año y su actividad por semanas */
const RepoFocusCard = ({ focus }: { focus: RepoFocus }) => {
  const isPrivate = focus.repos.some((repo) => repo.isPrivate);
  const average = focus.activeDays > 0 ? focus.total / focus.activeDays : 0;

  return (
    <>
      {/* Identidad: nombre del repo y visibilidad */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          {focus.repos.map((repo) => (
            <div key={repo.name} className="flex items-center gap-1.5 min-w-0">
              {repo.isPrivate ? (
                <IconLock size={13} className="flex-shrink-0 text-white/40" aria-label="Repositorio privado" />
              ) : (
                <IconBrandGithub size={13} className="flex-shrink-0 text-white/40" />
              )}
              <span className="truncate text-[14px] font-semibold tracking-tight text-white">{repo.name}</span>
            </div>
          ))}
        </div>
        <span
          className={`flex-shrink-0 rounded-full border px-2 py-[1px] font-mono text-[9px] uppercase tracking-[0.15em] ${
            isPrivate ? 'border-white/15 text-white/50' : 'border-cyan-400/30 text-cyan-300/80'
          }`}
        >
          {isPrivate ? 'Privado' : 'Público'}
        </span>
      </div>
      <div className="mt-1.5 space-y-0.5 font-mono text-[10px] text-white/40">
        <p>Creado el {formatDay(focus.createdOn)}</p>
        {focus.total === 0 && <p>Sin commits en el último año</p>}
      </div>

      {/* Cifras del año */}
      <div className="mt-3 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-3">
        <Stat testId="focus-total" value={focus.total} label={focus.total === 1 ? 'commit' : 'commits'} />
        <Stat testId="focus-days" value={focus.activeDays} label={focus.activeDays === 1 ? 'día activo' : 'días activos'} />
        <Stat testId="focus-average" value={averageFormatter.format(average)} label="por día activo" />
      </div>

      {/* Actividad del repo semana a semana */}
      <div className="mt-3">
        <SectionLabel>Último año, por semanas</SectionLabel>
        <MiniBars testId="focus-bars" values={focus.weekly} />
      </div>
    </>
  );
};

/** Punto discreto bajo el cursor; el detalle lo da el tooltip */
const CustomActiveDot = ({ cx, cy }: CustomShapeProps) => {
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r="3" fill="#67e8f9" opacity="0.5" />;
};

/** Días que se dibujan en el minigráfico del tooltip */
const DAY_BARS = 30;

/** Contenido del día bajo el cursor: sus cifras, los 30 días que lo rodean y los repos */
const DayCard = ({ point, series }: { point: ScaledHeroPoint; series?: ScaledHeroPoint[] }) => {
  const privacy = new Map(point.repos.map((repo) => [repo.name, repo.isPrivate]));
  const dayRepos = Object.entries(point.dayCommits)
    .map(([name, commits]) => ({ name, commits, isPrivate: privacy.get(name) ?? false }))
    .sort((a, b) => b.commits - a.commits || a.name.localeCompare(b.name));
  const dayTotal = dayRepos.reduce((sum, repo) => sum + repo.commits, 0);

  // Sin commits ese día, la lista explica la altura de la curva con los repos de los últimos 30 días
  const listedRepos = dayRepos.length > 0 ? dayRepos : point.repos;
  const visibleRepos = listedRepos.slice(0, TOOLTIP_REPO_LIMIT);
  const hiddenRepos = listedRepos.length - visibleRepos.length;

  // Commits diarios de los 30 días que acaban en el punto
  const index = series?.findIndex((other) => other.end === point.end) ?? -1;
  const bars =
    index >= 0
      ? series!
          .slice(Math.max(0, index - DAY_BARS + 1), index + 1)
          .map((other) => Object.values(other.dayCommits).reduce((sum, commits) => sum + commits, 0))
      : [];

  return (
    <>
      {/* Día exacto del punto */}
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">{formatWeekday(point.end)}</p>

      {/* Cifras: el día y su contexto de 30 días */}
      <div className="mt-2.5 grid grid-cols-2 gap-3">
        <Stat testId="day-total" value={dayTotal} label={dayTotal === 1 ? 'commit este día' : 'commits este día'} />
        <Stat testId="range-total" value={point.commits} label="en los últimos 30 días" />
      </div>

      {bars.length > 0 && (
        <div className="mt-3">
          <MiniBars testId="day-bars" values={bars} current={bars.length - 1} />
        </div>
      )}

      {/* Repos del día, o de los últimos 30 días si ese día no hubo commits */}
      {visibleRepos.length > 0 && (
        <div className="mt-3 border-t border-white/[0.06] pt-2.5" data-testid="repo-list">
          <SectionLabel>{dayRepos.length > 0 ? 'Este día' : 'Últimos 30 días'}</SectionLabel>
          <ul className="space-y-1">
            {visibleRepos.map((repo) => (
              <RepoRow
                key={repo.name}
                name={repo.name}
                commits={repo.commits}
                isPrivate={repo.isPrivate}
                isNew={point.newRepos.includes(repo.name)}
              />
            ))}
          </ul>
          {hiddenRepos > 0 && <p className="mt-1 text-[10px] text-white/30">+{hiddenRepos} repos más</p>}
        </div>
      )}
    </>
  );
};

/**
 * Conserva el último valor no nulo: cuando `value` pasa a null, `value` sigue siendo el anterior
 * y `active` pasa a false, para poder desvanecerlo en vez de quitarlo de golpe.
 */
export function useLingeringValue<T>(value: T | null): { value: T | null; active: boolean } {
  const [last, setLast] = useState<T | null>(value);
  if (value !== null && value !== last) setLast(value);
  return { value: value ?? last, active: value !== null };
}

/** Duración (s) del fundido de entrada y salida del tooltip */
const TOOLTIP_FADE_S = 0.18;

/** Exportado solo para los tests del tooltip */
export const CustomTooltip = ({ active, payload, series, focus }: CustomTooltipProps) => {
  const point = payload?.[0]?.payload;
  // Sin foco, el tooltip solo aparece donde la curva tiene altura
  const visible = Boolean(active && point && (focus || point.commits > 0));

  // Se guarda lo último que se mostró para poder desvanecerlo en vez de quitarlo de golpe
  const [shown, setShown] = useState<{ point: ScaledHeroPoint; focus?: RepoFocus | null } | null>(null);
  if (visible && point && (shown?.point !== point || shown?.focus !== focus)) {
    setShown({ point, focus });
  }

  const content = visible && point ? { point, focus } : shown;
  if (!content) return null;

  // translateY(-50%): el centro vertical del tooltip queda a la altura del cursor
  return (
    <div
      data-testid="tooltip-card"
      data-state={visible ? 'visible' : 'hidden'}
      className="pointer-events-none select-none"
      style={{ filter: 'drop-shadow(0 0 16px rgba(34,211,238,0.12))', position: 'relative', zIndex: 50, transform: 'translateY(-50%)' }}
    >
      {/* Fundido: entra desde 0 al montarse y sube 4px hasta su sitio; al irse se desvanece */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 4 }}
        transition={{ duration: TOOLTIP_FADE_S, ease: 'easeOut' }}
      >
        <div className="relative bg-[#0d0f10]/95 backdrop-blur-2xl border border-cyan-400/30 rounded-xl overflow-hidden w-72" style={{ boxShadow: '0 0 12px rgba(34,211,238,0.06), inset 0 1px 0 rgba(255,255,255,0.04)' }}>

          {/* Barra superior de acento */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

          {/* Glow interno sutil */}
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />

          <div className="px-4 pt-3 pb-4 relative">
            {content.focus ? <RepoFocusCard focus={content.focus} /> : <DayCard point={content.point} series={series} />}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function ActivityGraph() {
  const [data, setData] = useState<ScaledHeroPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartTop, setChartTop] = useState<number | null>(null);
  const [hover, setHover] = useState<RepoHover | null>(null);
  const [cursor, setCursor] = useState<(Point2D & { width: number }) | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Capa del tooltip, fuera del z-0 del gráfico para que el fundido del hero no lo apague
  const [tooltipLayer, setTooltipLayer] = useState<HTMLDivElement | null>(null);
  const hasData = data.length > 0;

  // Datos del repo destacado: tramos a encender y ficha del tooltip.
  // chartData siempre lleva la clave `highlight` (null sin foco) para no cambiar la estructura del gráfico
  const chartData = useMemo(() => data.map((point) => ({ ...point, highlight: null as number | null })), [data]);
  // El repo destacado se conserva al quitar el ratón para que el resaltado se desvanezca
  const lingering = useLingeringValue(hover);
  const focusActive = lingering.active;
  const focusView = useMemo(() => {
    const shown = lingering.value;
    if (!shown) return null;
    const activity = repoActivity(data, shown.repos);
    const privacy = new Map(data.flatMap((point) => point.repos.map((repo) => [repo.name, repo.isPrivate] as const)));
    const focus: RepoFocus = {
      repos: shown.repos.map((name) => ({ name, isPrivate: privacy.get(name) })),
      createdOn: shown.createdOn,
      total: activity.total,
      activeDays: activity.activeDays,
      weekly: activity.weekly,
    };
    const chartData = data.map((point) => ({
      ...point,
      highlight: activity.highlighted.has(point.end) ? point.level : null,
    }));
    return { focus, chartData };
  }, [data, lingering.value]);

  // Evita renders en bucle: solo cambia el estado si cambian los repos destacados
  const handleHover = (next: RepoHover | null) =>
    setHover((current) =>
      current?.createdOn === next?.createdOn && current?.repos.join() === next?.repos.join() ? current : next
    );

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    setCursor({ x: event.clientX - box.left, y: event.clientY - box.top, width: box.width });
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/github/activity');
        if (!response.ok) throw new Error(`Activity API responded ${response.status}`);
        const json: { points?: HeroPoint[] } = await response.json();
        setData(scaleActivity(json.points ?? []));
      } catch (error) {
        console.error('Error loading activity graph:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Coloca el techo del gráfico justo debajo de los botones y lo recalcula al redimensionar
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!hasData || !wrapper) return;

    const measure = () => {
      const actions = wrapper.parentElement?.querySelector(HERO_ACTIONS_SELECTOR);
      const box = wrapper.getBoundingClientRect();
      const actionsBottom = actions ? actions.getBoundingClientRect().bottom - box.top : null;
      setChartTop(chartTopFor(actionsBottom, box.height));
    };

    measure();
    // El texto del hero entra con una animación que lo desplaza unos px: se vuelve a medir al acabar
    const timer = setTimeout(measure, 1000);
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [hasData]);

  if (loading || data.length === 0) return null;

  const tooltipAt = cursor ? tooltipPosition(cursor, cursor.width) : null;

  // Techo fijo con un pequeño margen: el pico se queda justo bajo el borde superior del gráfico
  const yMax = yDomainMax(data.map((point) => point.level));
  const last = data[data.length - 1];

  return (
    <>
    <motion.div
      ref={wrapperRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: 'easeIn' }}
    >
      {/* El chart empieza bajo los botones del hero, así el pico nunca invade el texto */}
      <div
        className="absolute left-0 right-0 bottom-[5%] pointer-events-auto"
        style={{ top: chartTop ?? '10%', overflow: 'visible' }}
        onMouseMove={handleMouseMove}
        // El cursor se conserva al salir: el tooltip se desvanece en su última posición
        onMouseLeave={() => setHover(null)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={focusView?.chartData ?? chartData} margin={{ top: 20, right: 0, left: 0, bottom: 30 }} accessibilityLayer={false}>
            <defs>
              <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.12} />
                <stop offset="60%" stopColor="#22d3ee" stopOpacity={0.06} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              {/* Relleno apagado para el resto de la curva mientras hay un repo destacado */}
              <linearGradient id="colorMuted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#71717a" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#71717a" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis hide />
            <YAxis hide domain={[0, yMax]} />

            <Tooltip
              content={<CustomTooltip series={data} focus={focusActive ? focusView?.focus : null} />}
              cursor={false}
              // En modo portal Recharts no coloca el tooltip: se posiciona aquí con las coordenadas del cursor
              portal={tooltipLayer}
              wrapperStyle={{
                zIndex: 200,
                position: 'absolute',
                // Recharts lo oculta de golpe; la visibilidad la controla el fundido del propio tooltip
                visibility: 'visible',
                ...(tooltipAt ? { left: tooltipAt.x, top: tooltipAt.y } : {}),
              }}
            />

            <ReferenceDot
              x={data.length - 1}
              y={last.level}
              r={0}
              shape={(props: CustomShapeProps) => {
                const { cx, cy } = props;
                if (cx == null || cy == null) return <g />; // Recharts espera un elemento SVG
                return (
                  <g>
                    {/* Label NOW — a la izquierda arriba del punto */}
                    <text
                      x={cx - 4}
                      y={cy - 18}
                      textAnchor="end"
                      fontSize="8"
                      fontFamily="monospace"
                      fontWeight="bold"
                      fill="#22d3ee"
                      letterSpacing="0.2em"
                    >
                      NOW
                    </text>
                    {/* Línea diagonal desde el label al punto */}
                    <line x1={cx + 2} y1={cy - 14} x2={cx - 1} y2={cy - 1} stroke="#22d3ee" strokeWidth={1} strokeOpacity={0.5} />
                    {/* Punta de flecha */}
                    <polygon
                      points={`${cx - 1},${cy - 1} ${cx + 2},${cy - 6} ${cx + 5},${cy - 4}`}
                      fill="#22d3ee"
                      opacity={0.5}
                    />
                  </g>
                );
              }}
            />

            {/* Curva apagada (gris), siempre debajo: queda a la vista cuando se destaca un repo */}
            <Area
              type="monotoneX"
              dataKey="level"
              baseValue={0}
              stroke="#52525b"
              strokeWidth={1.2}
              strokeOpacity={0.7}
              fillOpacity={1}
              fill="url(#colorMuted)"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />

            {/* Curva normal en cian. monotoneX: suave y sin pasarse de los datos (sin valles bajo cero).
                Se desvanece mientras hay un repo destacado */}
            <Area
              type="monotoneX"
              dataKey="level"
              baseValue={0}
              stroke="#22d3ee"
              strokeWidth={1.2}
              strokeOpacity={0.7}
              fillOpacity={1}
              fill="url(#colorActivity)"
              className={`${LAYER_FADE} ${focusActive ? 'opacity-0' : 'opacity-100'}`}
              dot={false}
              activeDot={focusActive ? false : <CustomActiveDot />}
              isAnimationActive={false}
            />

            {/* Tramos encendidos: los días con commits del repo destacado (y sus vecinos).
                Siempre montado (vacío sin foco): añadir la capa al vuelo rehace los puntos de
                repos y el navegador lo interpreta como que el cursor ha salido */}
            <Area
              type="monotoneX"
              dataKey="highlight"
              baseValue={0}
              connectNulls={false}
              stroke="#22d3ee"
              strokeWidth={1.8}
              fillOpacity={1}
              fill="url(#colorActivity)"
              className={`${LAYER_FADE} ${focusActive ? 'opacity-100' : 'opacity-0'}`}
              dot={<CommitDayDot repos={focusView?.focus.repos.map((repo) => repo.name) ?? []} active={focusActive} />}
              activeDot={false}
              isAnimationActive={false}
            />

            {/* Capa invisible solo para los puntos de repos, siempre por encima de las curvas */}
            <Area
              type="monotoneX"
              dataKey="level"
              stroke="none"
              fill="none"
              dot={<RepoMarker onHover={handleHover} />}
              activeDot={false}
              isAnimationActive={false}
            />

          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Cortina de reveal izquierda→derecha */}
      <motion.div
        className="absolute left-0 right-0 bottom-[5%] pointer-events-none z-20"
        style={{ top: chartTop ?? '10%', background: '#0a0a0a', transformOrigin: 'right' }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 6, ease: [0.4, 0, 0.2, 1] }}
      />

    </motion.div>

    {/* Capa del tooltip: misma caja que el gráfico (mismas coordenadas), por encima de los fundidos */}
    <div
      ref={setTooltipLayer}
      className="absolute left-0 right-0 bottom-[5%] pointer-events-none z-20"
      style={{ top: chartTop ?? '10%' }}
    />

    {/* Label de la gráfica — fuera del z-0 para no quedar tapado por los gradients */}
    <div className="absolute bottom-4 right-6 flex items-center gap-2 pointer-events-none z-20">
      {/* Punto "en directo": halo que late alrededor de un punto fijo */}
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
      </span>
      <span className="text-[10px] font-mono uppercase tracking-[0.2em]">
        <span className="text-cyan-300/90">Actividad en tiempo real</span>
        <span className="text-white/30"> · commits del último año</span>
      </span>
    </div>
    </>
  );
}
