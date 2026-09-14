'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceDot
} from 'recharts';
import { IconBrandGithub } from '@tabler/icons-react';
import { processGithubEvents } from '@/lib/github';

interface RepoDetail {
  name: string;
  totalCommits: number;
}

interface DataPoint {
  activity: number;
  commits: number;
  repos: string[];
  repoDetails: RepoDetail[];
  date: string;
}


/** Props que Recharts pasa a un dot/shape custom */
interface CustomShapeProps {
  cx?: number;
  cy?: number;
  payload?: DataPoint;
}

/** Props que Recharts pasa a un tooltip custom */
interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: DataPoint }[];
}

const CustomDot = (props: CustomShapeProps) => {
  const { cx, cy, payload } = props;

  if (!payload?.repos || payload.repos.length === 0) return null;

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

const CustomActiveDot = (props: CustomShapeProps) => {
  const { cx, cy, payload } = props;
  const hasActivity = payload?.repos && payload.repos.length > 0;
  if (hasActivity) return null; // Los puntos con actividad ya tienen tooltip
  if (cx == null || cy == null) return null; // Sin coordenadas no hay nada que dibujar

  const totalCommits: number = payload?.commits ?? 0;

  return (
    <g>
      <circle cx={cx} cy={cy} r="3.5" fill="#67e8f9" opacity="0.4" />
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fontSize="10"
        fontFamily="monospace"
        fill="#67e8f9"
        opacity="0.35"
      >
        {totalCommits}
      </text>
    </g>
  );
};

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (!data.repos || data.repos.length === 0) return null;

    const repoDetails: RepoDetail[] = data.repoDetails ?? data.repos.map((name: string) => ({ name, totalCommits: 0 }));
    const date = new Date(data.date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const totalCommits = repoDetails.reduce((acc, r) => acc + r.totalCommits, 0);

    return (
      <div className="pointer-events-none select-none" style={{ filter: 'drop-shadow(0 0 16px rgba(34,211,238,0.12))', position: 'relative', zIndex: 50 }}>
        <div className="relative bg-[#111]/80 backdrop-blur-2xl border border-cyan-400/30 rounded-xl overflow-hidden w-56" style={{ boxShadow: '0 0 12px rgba(34,211,238,0.06), inset 0 1px 0 rgba(255,255,255,0.04)' }}>

          {/* Barra superior de acento */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

          {/* Glow interno sutil */}
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />

          <div className="px-4 pt-3 pb-4 relative">

            {/* Fecha */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
              <span className="text-[10px] font-semibold text-cyan-400/80 uppercase tracking-[0.18em]">
                {date}
              </span>
            </div>

            {/* Repos */}
            <div className="space-y-1.5 mb-3">
              {repoDetails.map((repo, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <IconBrandGithub size={13} className="text-white/30 flex-shrink-0" />
                  <span className="text-[13px] font-semibold text-white/90 tracking-tight leading-tight truncate">
                    {repo.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer — barritas de actividad + total commits */}
            <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] text-white/30 uppercase tracking-widest">Actividad</span>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-[3px] items-end h-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[3px] rounded-full bg-cyan-400/60"
                      style={{ height: `${Math.min(100, (totalCommits / 150) * 100 * (0.4 + i * 0.15))}%` }}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-bold text-cyan-400">{totalCommits}</span>
                <span className="text-[10px] text-white/30">commits</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function ActivityGraph() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  // Solo interesa el efecto de re-render del setter; el valor nunca se lee
  const [, setRevealed] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/github/activity');
        const json = await response.json();
        
        const history = json.history || [];
        const repos = json.repos || [];
        
        const processedData = processGithubEvents(history, repos);
        setData(processedData);
      } catch (error) {
        console.error('Error loading activity graph:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    if (data.length > 0) {
      const timer = setTimeout(() => setRevealed(true), 50);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (loading || data.length === 0) return null;

  return (
    <>
    <motion.div
      className="absolute inset-0 w-full h-full pointer-events-none z-0 select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: 'easeIn' }}
    >
      {/* El chart ocupa la mitad superior del hero — los picos quedan en el área libre sobre el texto */}
      <div
        ref={chartRef}
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

            <CartesianGrid horizontal={false} vertical={false} />
            <XAxis hide />
            <YAxis hide />

            <Tooltip
              content={<CustomTooltip />}
              cursor={false}
              offset={16}
              wrapperStyle={{ zIndex: 200 }}
            />

            <ReferenceDot
              x={data.length - 1}
              y={data[data.length - 1].activity}
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

            <Area
              type="natural"
              dataKey="activity"
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

    {/* Label Actividad en Tiempo Real — fuera del z-0 para no quedar tapado por gradients */}
    <div className="absolute bottom-4 right-6 flex items-center gap-2 pointer-events-none z-20">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
      <span className="text-[10px] font-mono text-white/25 uppercase tracking-[0.2em]">
        Actividad en Tiempo Real (Commits)
</span>
    </div>
    </>
  );
}
