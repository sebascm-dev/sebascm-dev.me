'use client';

import { useEffect, useState } from 'react';
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
import { scaleActivity, yDomainMax, type HeroPoint, type ScaledHeroPoint } from '@/lib/github/hero';

/** Max public repos listed in the tooltip before collapsing the rest */
const TOOLTIP_REPO_LIMIT = 4;

/** Props que Recharts pasa a un dot/shape custom */
interface CustomShapeProps {
  cx?: number;
  cy?: number;
  payload?: ScaledHeroPoint;
}

/** Props que Recharts pasa a un tooltip custom, más el máximo de commits para las barritas */
interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: ScaledHeroPoint }[];
  maxCommits: number;
}

const dayFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const yearFormatter = new Intl.DateTimeFormat('es-ES', { year: 'numeric', timeZone: 'UTC' });

/** "8 sept – 14 sept 2026": las fechas son días de calendario, se leen a mediodía UTC */
function formatWeek(start: string, end: string): string {
  const toDate = (day: string) => new Date(`${day}T12:00:00Z`);
  return `${dayFormatter.format(toDate(start))} – ${dayFormatter.format(toDate(end))} ${yearFormatter.format(toDate(end))}`;
}

/** Punto brillante: semanas en las que se creó un repo público */
const CustomDot = ({ cx, cy, payload }: CustomShapeProps) => {
  if (cx == null || cy == null || !payload?.newRepos.length) return null;

  return (
    <g>
      {/* Halo exterior */}
      <circle cx={cx} cy={cy} r="10" fill="#22d3ee" opacity="0.08" />
      {/* Halo medio */}
      <circle cx={cx} cy={cy} r="6" fill="#22d3ee" opacity="0.15" />
      {/* Punto principal */}
      <circle cx={cx} cy={cy} r="3.5" fill="#67e8f9" />
      {/* Brillo central */}
      <circle cx={cx} cy={cy} r="1.5" fill="white" opacity="0.8" />
    </g>
  );
};

/** Punto discreto bajo el cursor; el detalle lo da el tooltip */
const CustomActiveDot = ({ cx, cy }: CustomShapeProps) => {
  if (cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r="3" fill="#67e8f9" opacity="0.5" />;
};

const CustomTooltip = ({ active, payload, maxCommits }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const week = payload[0].payload;
  if (week.commits === 0) return null;

  const visibleRepos = week.repos.slice(0, TOOLTIP_REPO_LIMIT);
  const hiddenRepos = week.repos.length - visibleRepos.length;
  // Intensidad relativa a la mejor semana del año
  const intensity = maxCommits > 0 ? week.commits / maxCommits : 0;

  return (
    <div className="pointer-events-none select-none" style={{ filter: 'drop-shadow(0 0 16px rgba(34,211,238,0.12))', position: 'relative', zIndex: 50 }}>
      <div className="relative bg-[#111]/80 backdrop-blur-2xl border border-cyan-400/30 rounded-xl overflow-hidden w-60" style={{ boxShadow: '0 0 12px rgba(34,211,238,0.06), inset 0 1px 0 rgba(255,255,255,0.04)' }}>

        {/* Barra superior de acento */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        {/* Glow interno sutil */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />

        <div className="px-4 pt-3 pb-4 relative">

          {/* Semana */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            <span className="text-[10px] font-semibold text-cyan-400/80 uppercase tracking-[0.18em]">
              {formatWeek(week.start, week.end)}
            </span>
          </div>

          {/* Repos públicos con sus commits de esa semana */}
          <div className="space-y-1.5 mb-3">
            {visibleRepos.map((repo) => (
              <div key={repo.name} className="flex items-center gap-2">
                <IconBrandGithub size={13} className="text-white/30 flex-shrink-0" />
                <span className="text-[13px] font-semibold text-white/90 tracking-tight leading-tight truncate">
                  {repo.name}
                </span>
                {week.newRepos.includes(repo.name) && (
                  <IconSparkles size={12} className="text-cyan-300 flex-shrink-0" aria-label="Repositorio nuevo" />
                )}
                <span className="ml-auto text-[11px] font-mono text-white/40">{repo.commits}</span>
              </div>
            ))}
            {hiddenRepos > 0 && (
              <span className="block text-[11px] text-white/30">+{hiddenRepos} repos más</span>
            )}
            {week.privateCommits > 0 && (
              <div className="flex items-center gap-2 text-white/40">
                <IconLock size={13} className="flex-shrink-0" />
                <span className="text-[12px]">Repos privados</span>
                <span className="ml-auto text-[11px] font-mono">{week.privateCommits}</span>
              </div>
            )}
          </div>

          {/* Footer — barritas de intensidad + total commits */}
          <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-white/30 uppercase tracking-widest">Semana</span>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-[3px] items-end h-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full bg-cyan-400/60"
                    style={{ height: `${Math.max(15, Math.min(100, intensity * 100 * (0.4 + i * 0.15)))}%` }}
                  />
                ))}
              </div>
              <span className="text-[11px] font-bold text-cyan-400">{week.commits}</span>
              <span className="text-[10px] text-white/30">{week.commits === 1 ? 'commit' : 'commits'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ActivityGraph() {
  const [data, setData] = useState<ScaledHeroPoint[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading || data.length === 0) return null;

  // Techo fijo con margen: el pico nunca llega al borde superior
  const yMax = yDomainMax(data.map((point) => point.level));
  const maxCommits = Math.max(...data.map((point) => point.commits));
  const last = data[data.length - 1];

  return (
    <>
    <motion.div
      className="absolute inset-0 w-full h-full pointer-events-none z-0 select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: 'easeIn' }}
    >
      {/* El chart ocupa casi todo el hero; el margen del eje Y mantiene los picos por debajo del texto */}
      <div
        className="absolute top-[10%] left-0 right-0 h-[85%] pointer-events-auto"
        style={{ overflow: 'visible' }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 30 }}>
            <defs>
              <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.12} />
                <stop offset="60%" stopColor="#22d3ee" stopOpacity={0.06} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis hide />
            <YAxis hide domain={[0, yMax]} />

            <Tooltip
              content={<CustomTooltip maxCommits={maxCommits} />}
              cursor={false}
              offset={16}
              wrapperStyle={{ zIndex: 200 }}
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

            {/* monotoneX: curva suave que nunca se pasa de los datos (sin valles bajo cero) */}
            <Area
              type="monotoneX"
              dataKey="level"
              baseValue={0}
              stroke="#22d3ee"
              strokeWidth={1.2}
              strokeOpacity={0.7}
              fillOpacity={1}
              fill="url(#colorActivity)"
              dot={<CustomDot />}
              activeDot={<CustomActiveDot />}
              isAnimationActive={false}
            />

          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Cortina de reveal izquierda→derecha */}
      <motion.div
        className="absolute top-[10%] left-0 right-0 h-[85%] pointer-events-none z-20"
        style={{ background: '#0a0a0a', transformOrigin: 'right' }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 6, ease: [0.4, 0, 0.2, 1] }}
      />

    </motion.div>

    {/* Label de la gráfica — fuera del z-0 para no quedar tapado por los gradients */}
    <div className="absolute bottom-4 right-6 flex items-center gap-2 pointer-events-none z-20">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
      <span className="text-[10px] font-mono text-white/25 uppercase tracking-[0.2em]">
        Commits · últimas 52 semanas
      </span>
    </div>
    </>
  );
}
