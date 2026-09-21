'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconChevronLeft, IconChevronRight, IconCircleOff, IconDice5, IconRefresh } from '@tabler/icons-react'
import { EASE, SPRING } from './motion'
import {
  SCENES,
  SHADOW_SCENES,
  SHAPE_COMPOSITIONS,
  SHAPE_KINDS,
  buildShapes,
  type MockupState,
  type SceneId,
  type ShadowScene,
} from '@/lib/mockup'
import { SHAPE_COLORS, ShapeView } from './Shapes'
import { BarSlider, Section, SectionLabel, Segmented, Tile } from './ui'

type Props = {
  state: MockupState
  update: (patch: Partial<MockupState>) => void
}

function ShadowTile({ scene }: { scene: ShadowScene }) {
  return (
    <span className="relative w-full h-full bg-[#ecebe8] overflow-hidden">
      <span
        className="absolute inset-0"
        style={{ background: scene.css, filter: `blur(${Math.max(1, scene.blur / 8)}px)`, transform: scene.transform ?? 'scale(1.15)', mixBlendMode: 'multiply' }}
      />
    </span>
  )
}

function ScenePreview({ sceneId }: { sceneId: SceneId }) {
  if (sceneId === 'none') return <IconCircleOff size={20} className="text-gray-400" />
  if (sceneId === 'shadow') return <ShadowTile scene={SHADOW_SCENES[6]} />
  return (
    <span className="relative w-full h-full bg-[#15122b] overflow-hidden">
      {buildShapes({ composition: 0, kind: null, seed: null }).map((item, i) => (
        <ShapeView key={i} item={item} colors={SHAPE_COLORS} />
      ))}
    </span>
  )
}

export function SceneSection({ state, update }: Props) {
  const total = SHAPE_COMPOSITIONS.length
  const composition = ((state.shapesComposition % total) + total) % total
  const shapes = buildShapes({ composition, kind: state.shapesKind, seed: state.shapesSeed })
  // Which way the carousel last moved, so the next slide enters from that side.
  const [direction, setDirection] = useState<1 | -1>(1)
  const go = (step: 1 | -1) => {
    setDirection(step)
    update({ shapesComposition: composition + step, shapesSeed: null })
  }

  return (
    <Section label="Scene">
      <div className="grid grid-cols-3 gap-2">
        {SCENES.map((scene) => (
          <Tile key={scene.id} label={scene.label} active={state.sceneId === scene.id} onClick={() => update({ sceneId: scene.id })}>
            <ScenePreview sceneId={scene.id} />
          </Tile>
        ))}
      </div>

      {state.sceneId === 'shadow' && (
        <motion.div className="mt-4 space-y-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={EASE}>
          <SectionLabel>Shadow scene</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {SHADOW_SCENES.map((scene) => (
              <Tile key={scene.id} title={scene.label} active={state.sceneShadowId === scene.id} onClick={() => update({ sceneShadowId: scene.id })}>
                <ShadowTile scene={scene} />
              </Tile>
            ))}
          </div>
          <BarSlider label="Opacity" value={state.sceneOpacity} min={0} max={100} onChange={(sceneOpacity) => update({ sceneOpacity })} />
          <Segmented
            options={[
              { id: 'underlay', label: 'Underlay', title: 'Solo sobre el fondo, por detrás del mockup' },
              { id: 'overlay', label: 'Overlay', title: 'Por encima de todo, también del mockup' },
            ]}
            value={state.sceneLayer}
            onChange={(sceneLayer) => update({ sceneLayer })}
          />
        </motion.div>
      )}

      {state.sceneId === 'shapes' && (
        <motion.div className="mt-4 space-y-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={EASE}>
          <SectionLabel>Shapes scene</SectionLabel>

          {/* Composition carousel */}
          <div className="relative">
            <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-gradient-to-br from-[#1e1b4b] to-[#0f172a]">
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={`${composition}-${state.shapesSeed}-${state.shapesKind}`}
                  className="absolute inset-0"
                  initial={{ opacity: 0, x: `${direction * 30}%` }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: `${direction * -30}%` }}
                  transition={SPRING}
                >
                  {shapes.map((item, i) => (
                    <ShapeView key={i} item={item} colors={SHAPE_COLORS} />
                  ))}
                </motion.div>
              </AnimatePresence>
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[38%] aspect-[4/3] rounded-md bg-white/15 border border-white/20" />
            </div>
            <button
              type="button"
              aria-label="Composición anterior"
              onClick={() => go(-1)}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer"
            >
              <IconChevronLeft size={15} />
            </button>
            <button
              type="button"
              aria-label="Composición siguiente"
              onClick={() => go(1)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center cursor-pointer"
            >
              <IconChevronRight size={15} />
            </button>
          </div>
          <div className="flex justify-center gap-1.5">
            {SHAPE_COMPOSITIONS.map((_, i) => {
              const current = i === composition && state.shapesSeed === null
              return (
                <motion.span
                  key={i}
                  animate={{ width: current ? 14 : 6, opacity: current ? 1 : 0.3 }}
                  transition={SPRING}
                  className="h-1.5 rounded-full bg-white"
                />
              )
            })}
          </div>

          {/* Shape kind: mix, or every shape as one kind */}
          <div className="grid grid-cols-4 gap-2">
            <Tile label="Mezcla" active={state.shapesKind === null} onClick={() => update({ shapesKind: null })}>
              <span className="relative w-full h-full">
                <ShapeView item={{ kind: 'sphere', x: 35, y: 40, size: 42, rotate: 0 }} colors={SHAPE_COLORS} />
                <ShapeView item={{ kind: 'cube', x: 66, y: 64, size: 40, rotate: 0 }} colors={SHAPE_COLORS} />
              </span>
            </Tile>
            {SHAPE_KINDS.map((kind) => (
              <Tile key={kind.id} label={kind.label} active={state.shapesKind === kind.id} onClick={() => update({ shapesKind: kind.id })}>
                <span className="relative w-full h-full">
                  <ShapeView item={{ kind: kind.id, x: 50, y: 50, size: 62, rotate: kind.id === 'pill' ? -30 : 0 }} colors={SHAPE_COLORS} />
                </span>
              </Tile>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => update({ shapesSeed: null, shapesKind: null })}
              className="h-12 rounded-xl bg-[#111] border border-[#1a1a1a] text-[11px] text-gray-300 hover:text-white flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <IconRefresh size={15} />
              Original
            </button>
            <button
              type="button"
              // Random in the click handler only: the seed is stored, so the
              // scene redraws identically after undo, re-render or export.
              onClick={() => update({ shapesSeed: Math.floor(Math.random() * 1_000_000_000) })}
              className="h-12 rounded-xl bg-[#111] border border-[#1a1a1a] text-[11px] text-gray-300 hover:text-white flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              {/* Keyed by seed: the dice rolls every time a new scene is drawn */}
              <motion.span
                key={state.shapesSeed ?? 'none'}
                initial={{ rotate: -200, scale: 0.6 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={SPRING}
                className="inline-flex"
              >
                <IconDice5 size={15} />
              </motion.span>
              Randomize
            </button>
          </div>
        </motion.div>
      )}
    </Section>
  )
}
