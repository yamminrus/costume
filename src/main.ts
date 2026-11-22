/**
 * main.ts — entry point for COSTUME.
 *
 * Initialises the WebGL figure and wires the textarea input through the full
 * parser pipeline to updateFigure().
 *
 * Input is debounced at 150 ms so the parser does not run on every keystroke.
 *
 * Task 10 scroll reveal:
 *   - The page body is made tall enough for six peel stages plus a settle.
 *   - Scroll position is mapped to a reveal stage index (200px per stage).
 *   - Scroll reveal begins only below the initial viewport so the scope
 *     statement and textarea remain visible on first paint.
 *
 * Task 11 mirror:
 *   - No additional wiring needed here; figure.ts drives the mirror from
 *     the RECHECK register state inside drawMirror().
 */

import { initFigure, updateFigure, setRevealStage } from './renderer/figure'
import { buildRegisterMap } from './parser/index'
import type { Register } from './parser/types'

// ─── Scroll-reveal constants ──────────────────────────────────────────────────

/** Pixels of scroll distance required to advance one peel stage. */
const PX_PER_STAGE = 200

/**
 * Number of peel stages (one per register that can be COSTUME).
 * Six registers: RECHECK, EDGES, PRICE, PROOF, WHAT, WHO.
 */
const NUM_STAGES = 6

/**
 * Extra settle distance at the end so the final peel has room to fully
 * complete before the user reaches the page bottom.
 */
const SETTLE_PX = PX_PER_STAGE

/**
 * Human-readable names for the layers in peel order, used in the status line.
 * Must match PEEL_ORDER in figure.ts.
 */
const STAGE_LABELS: Record<number, string> = {
  0: 'mirror',
  1: 'silhouette',
  2: 'ground',
  3: 'hands',
  4: 'body',
  5: 'mask',
}

// ─── DOM references ───────────────────────────────────────────────────────────

const canvas = document.getElementById('figure-canvas') as HTMLCanvasElement | null
const textarea = document.getElementById('claim-input') as HTMLTextAreaElement | null
const revealStatus = document.getElementById('reveal-status') as HTMLParagraphElement | null
const pageMain = document.getElementById('page-main') as HTMLElement | null

if (!canvas) {
  console.error('[main] #figure-canvas not found in the DOM.')
} else {
  initFigure(canvas)
}

// ─── Page height ──────────────────────────────────────────────────────────────

/**
 * Ensure the page is tall enough for six scroll stages plus a settle gap.
 *
 * Reveal stages start below the initial fold so the scope statement and
 * textarea stay visible without scrolling. The scroll distance is added on
 * top of the existing content height.
 *
 * We set min-height on the <main> element rather than <body> to avoid
 * interfering with the layout grid.
 */
function ensureScrollHeight(): void {
  if (!pageMain) return

  const scrollHeight = NUM_STAGES * PX_PER_STAGE + SETTLE_PX
  const contentHeight = pageMain.getBoundingClientRect().height
  const needed = contentHeight + scrollHeight

  const current = parseFloat(pageMain.style.minHeight) || 0
  if (current < needed) {
    pageMain.style.minHeight = `${needed}px`
  }
}

ensureScrollHeight()
window.addEventListener('resize', ensureScrollHeight)

// ─── Scroll reveal handler ────────────────────────────────────────────────────

/**
 * Map the current window scroll position to a reveal stage index and pass it
 * to the renderer.
 *
 * Reveal begins only after the user has scrolled past the initial viewport
 * height, so the scope statement and textarea are always visible on first paint.
 *
 *   offset = scrollY - innerHeight
 *   stage  = floor(max(0, offset) / PX_PER_STAGE), clamped to [0, NUM_STAGES]
 */
function handleScroll(): void {
  const initialViewport = window.innerHeight
  const offset = Math.max(0, window.scrollY - initialViewport)
  const stage = Math.min(NUM_STAGES, Math.floor(offset / PX_PER_STAGE))
  setRevealStage(stage)
  updateRevealStatus(stage)
}

/** Update the status text below the canvas to name the layer being peeled. */
function updateRevealStatus(stage: number): void {
  if (!revealStatus) return
  if (stage === 0) {
    revealStatus.textContent = ''
    return
  }
  const label = STAGE_LABELS[stage - 1]
  if (label !== undefined) {
    revealStatus.textContent = `Revealing: ${label}`
  } else {
    revealStatus.textContent = ''
  }
}

window.addEventListener('scroll', handleScroll, { passive: true })

// Apply initial stage in case the browser restores a mid-scroll position.
handleScroll()

// ─── Debounced input handler ──────────────────────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 150

function handleInput(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    const text = textarea?.value ?? ''
    const map = buildRegisterMap(text)
    updateFigure(map)
    // Re-apply current scroll stage so the reveal index is correct
    // after the register map (and thus the set of COSTUME parts) changes.
    handleScroll()
  }, DEBOUNCE_MS)
}

if (textarea) {
  textarea.addEventListener('input', handleInput)
}
