/**
 * figure.ts — WebGL figure renderer for COSTUME.
 *
 * Renders a six-part figure whose anatomy maps to the six registers:
 *   WHO     → the mask
 *   WHAT    → the costume body
 *   PROOF   → what the hands carry
 *   PRICE   → the ground and shadow
 *   EDGES   → the silhouette
 *   RECHECK → the mirror to the right (smaller figure, same anatomy, from behind)
 *
 * Visual constants are named so the look is reproducible rather than tweaked.
 *
 * Aesthetic constraints:
 *   - Dark ground, one warm light source.
 *   - No horror clichés, no blood, no jump scares.
 *   - The unsettling thing is the truth.
 *
 * Task 10 scroll reveal:
 *   - COSTUME parts peel outermost-first on scroll.
 *   - Peel order: RECHECK → EDGES → PRICE → PROOF → WHAT → WHO.
 *   - Transition: 400ms ease-out (per-part alpha lerp in the render loop).
 *   - SOLID, DECLINED, and HOLE parts are never peeled.
 *
 * Task 11 mirror:
 *   - The mirror to the right is fully driven by the RECHECK register state.
 *   - HOLE: glowing outlined gap. COSTUME: translucent. DECLINED: clean outline.
 *   - SOLID: lit and opaque.
 */

import type { Register, RegisterMap, State } from '../parser/types'

// ─── Visual constants ────────────────────────────────────────────────────────

/** Warm incandescent light colour (R, G, B, A). */
export const LIGHT_COLOR: [number, number, number, number] = [1.0, 0.88, 0.62, 1.0]

/** Dark ground colour (R, G, B, A). */
export const GROUND_COLOR: [number, number, number, number] = [0.07, 0.06, 0.08, 1.0]

/** Ambient light intensity — enough to read silhouettes, not enough to flatten. */
export const AMBIENT_LEVEL: number = 0.18

/** Glow colour for HOLE state edges. */
const HOLE_GLOW_COLOR: [number, number, number, number] = [0.55, 0.82, 1.0, 1.0]

/** Translucent alpha for COSTUME state. */
const COSTUME_ALPHA: number = 0.28

/** Duration of the COSTUME→DECLINED peel animation in milliseconds. */
const PEEL_DURATION_MS = 400

// ─── Peel order: outermost → innermost ───────────────────────────────────────

/**
 * The order in which COSTUME parts dissolve during scroll reveal.
 * RECHECK (the mirror silhouette) is outermost; WHO (the mask) is innermost.
 * SOLID, DECLINED, and HOLE parts are never in this list at runtime.
 */
const PEEL_ORDER: Register[] = ['RECHECK', 'EDGES', 'PRICE', 'PROOF', 'WHAT', 'WHO']

// ─── Vertex and fragment shaders ─────────────────────────────────────────────

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_uv;
  uniform vec2 u_resolution;
  uniform vec2 u_offset;
  uniform float u_scale;
  varying vec2 v_uv;

  void main() {
    vec2 pos = (a_position * u_scale + u_offset) / u_resolution * 2.0 - 1.0;
    pos.y = -pos.y;
    gl_Position = vec4(pos, 0.0, 1.0);
    v_uv = a_uv;
  }
`

const FRAGMENT_SHADER = `
  precision mediump float;

  varying vec2 v_uv;

  uniform vec4 u_light_color;
  uniform float u_ambient;
  uniform vec4 u_part_color;
  uniform float u_alpha;
  uniform int u_mode;       // 0=solid, 1=costume, 2=declined, 3=hole
  uniform float u_time;

  void main() {
    // Normal-map approximation: treat UV gradient as a bump.
    vec2 centered = v_uv * 2.0 - 1.0;
    float rim = 1.0 - smoothstep(0.7, 1.0, length(centered));

    if (u_mode == 0) {
      // SOLID: lit, opaque, full weight.
      vec4 lit = u_part_color * u_light_color;
      vec3 colour = mix(lit.rgb * u_ambient, lit.rgb, rim);
      gl_FragColor = vec4(colour, 1.0);

    } else if (u_mode == 1) {
      // COSTUME: translucent fabric — warm highlight at rim.
      vec3 fabric = mix(u_part_color.rgb * 0.6, u_light_color.rgb, rim * 0.4);
      gl_FragColor = vec4(fabric, u_alpha * (0.6 + rim * 0.4));

    } else if (u_mode == 2) {
      // DECLINED: absent, clean outline only — a deliberate gap.
      float edge = smoothstep(0.85, 0.95, length(centered));
      if (edge < 0.05) discard;
      gl_FragColor = vec4(u_light_color.rgb * 0.5, edge);

    } else {
      // HOLE: glowing edge — unacknowledged absence.
      float dist = length(centered);
      float glow = exp(-pow((dist - 0.92) * 12.0, 2.0));
      // Pulse the glow slowly.
      float pulse = 0.7 + 0.3 * sin(u_time * 1.8);
      if (dist < 0.88) discard;
      gl_FragColor = vec4(u_part_color.rgb, glow * pulse);
    }
  }
`

// ─── Geometry helpers ─────────────────────────────────────────────────────────

/** A quad defined by its bounding box in local figure space [0..1]. */
interface Quad {
  x: number  // left edge, 0–1
  y: number  // top edge, 0–1
  w: number  // width, 0–1
  h: number  // height, 0–1
}

/**
 * Six-part figure layout in normalised figure-local coordinates.
 * The figure occupies a 1×1 box; these proportions define each part.
 *
 * EDGES wraps the full figure, so it is rendered as an outer silhouette ring.
 */
const FIGURE_PARTS: Record<Register, Quad> = {
  EDGES:   { x: 0.02, y: 0.02, w: 0.96, h: 0.96 }, // silhouette — full figure
  WHO:     { x: 0.28, y: 0.04, w: 0.44, h: 0.24 }, // mask — upper face area
  WHAT:    { x: 0.20, y: 0.28, w: 0.60, h: 0.32 }, // costume body — torso
  PROOF:   { x: 0.10, y: 0.44, w: 0.80, h: 0.24 }, // hands and what they carry
  PRICE:   { x: 0.00, y: 0.80, w: 1.00, h: 0.20 }, // ground and shadow
  RECHECK: { x: 0.00, y: 0.00, w: 1.00, h: 1.00 }, // mirror — rendered separately
}

/**
 * Draw order: PRICE → EDGES → WHAT → PROOF → WHO.
 * RECHECK is rendered separately as the mirror figure.
 */
const DRAW_ORDER: Register[] = ['PRICE', 'EDGES', 'WHAT', 'PROOF', 'WHO']

/** Base colours per register part. */
const PART_COLORS: Record<Register, [number, number, number, number]> = {
  WHO:     [0.92, 0.78, 0.55, 1.0], // warm skin tone
  WHAT:    [0.32, 0.22, 0.45, 1.0], // deep violet costume
  PROOF:   [0.62, 0.82, 0.90, 1.0], // cool blue — the hands carry light
  PRICE:   [0.14, 0.11, 0.09, 1.0], // near-ground brown
  EDGES:   [0.50, 0.40, 0.60, 1.0], // muted purple silhouette
  RECHECK: [0.70, 0.85, 0.95, 1.0], // mirror — pale blue
}

// ─── Renderer state ───────────────────────────────────────────────────────────

/**
 * Per-part peel animation state.
 * progress goes 0→1 over PEEL_DURATION_MS with an ease-out curve.
 * 0 = fully COSTUME; 1 = fully DECLINED (transparent/outline).
 */
interface PeelAnim {
  startTime: number   // performance.now() when peel started
  progress: number    // 0–1 (eased)
}

interface FigureRenderer {
  gl: WebGLRenderingContext
  program: WebGLProgram
  canvas: HTMLCanvasElement
  currentMap: RegisterMap
  /**
   * Scroll-driven reveal stage index.
   * 0 = no peels; N = first N COSTUME parts have been (or are being) peeled.
   */
  revealStage: number
  /** Running time in seconds for glow animation. */
  startTime: number
  rafHandle: number
  /**
   * COSTUME parts ordered outermost→innermost per PEEL_ORDER.
   * Only parts whose state is COSTUME at the time updateFigure() runs.
   */
  costumeParts: Register[]
  /** Active peel animations, keyed by register. */
  peelAnims: Map<Register, PeelAnim>
}

// Module-level singleton — one canvas per page.
let renderer: FigureRenderer | null = null

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise the WebGL figure renderer on the given canvas.
 * Hard-codes all registers to SOLID as the Task 8 baseline.
 * Call updateFigure() afterwards to drive it from live state.
 */
export function initFigure(canvas: HTMLCanvasElement): void {
  const gl = canvas.getContext('webgl')
  if (!gl) {
    console.error('[figure] WebGL not available in this environment.')
    return
  }

  const program = buildProgram(gl)
  if (!program) return

  const solidMap: RegisterMap = {
    WHO: 'SOLID',
    WHAT: 'SOLID',
    PROOF: 'SOLID',
    PRICE: 'SOLID',
    EDGES: 'SOLID',
    RECHECK: 'SOLID',
  }

  renderer = {
    gl,
    program,
    canvas,
    currentMap: solidMap,
    revealStage: 0,
    startTime: performance.now() / 1000,
    rafHandle: 0,
    costumeParts: [],
    peelAnims: new Map(),
  }

  startLoop(renderer)
}

/**
 * Update the figure with a new RegisterMap from the parser.
 * Each register's part changes visual to reflect its state.
 * COSTUME parts are collected in peel order (outermost → innermost).
 * Resets all scroll-reveal state when the document changes.
 */
export function updateFigure(map: RegisterMap): void {
  if (!renderer) return

  renderer.currentMap = map
  renderer.revealStage = 0
  renderer.peelAnims = new Map()

  // Collect the parts that are currently COSTUME, in outermost-first peel order.
  renderer.costumeParts = PEEL_ORDER.filter(r => map[r] === 'COSTUME')
}

/**
 * Set the scroll reveal stage to a specific index.
 *
 * Called by main.ts as the user scrolls. Each stage means one more COSTUME
 * part has been revealed (dissolved from translucent to absent).
 * Stages beyond the number of COSTUME parts are clamped silently.
 *
 * When a new stage is entered, a 400ms ease-out peel animation starts for
 * that part (if one isn't already running).
 */
export function setRevealStage(stage: number): void {
  if (!renderer) return

  const max = renderer.costumeParts.length
  const clamped = Math.max(0, Math.min(stage, max))

  const prev = renderer.revealStage
  renderer.revealStage = clamped

  // Start peel animations for any newly-entered stages.
  const now = performance.now()
  for (let i = prev; i < clamped; i++) {
    const reg = renderer.costumeParts[i]
    if (reg !== undefined && !renderer.peelAnims.has(reg)) {
      renderer.peelAnims.set(reg, { startTime: now, progress: 0 })
    }
  }

  // If scrolling back (stage decreased), remove peel animations for
  // parts that are no longer peeled so they return to COSTUME.
  for (let i = clamped; i < prev; i++) {
    const reg = renderer.costumeParts[i]
    if (reg !== undefined) {
      renderer.peelAnims.delete(reg)
    }
  }
}

/**
 * Advance the scroll reveal by one stage.
 * Each call dissolves the next outermost COSTUME part (translucent → absent).
 * SOLID, DECLINED, and HOLE parts are unaffected.
 *
 * @deprecated Use setRevealStage() directly from the scroll handler.
 */
export function advanceReveal(): void {
  if (!renderer) return
  setRevealStage(renderer.revealStage + 1)
}

// ─── Render loop ──────────────────────────────────────────────────────────────

function startLoop(r: FigureRenderer): void {
  function tick() {
    drawFrame(r)
    r.rafHandle = requestAnimationFrame(tick)
  }
  r.rafHandle = requestAnimationFrame(tick)
}

function drawFrame(r: FigureRenderer): void {
  const { gl, canvas } = r

  // Keep canvas pixel dimensions in sync with its CSS dimensions.
  resizeCanvas(canvas, gl)

  const w = canvas.width
  const h = canvas.height

  gl.viewport(0, 0, w, h)
  gl.clearColor(...GROUND_COLOR)
  gl.clear(gl.COLOR_BUFFER_BIT)

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  const t = performance.now() / 1000 - r.startTime

  // Advance peel animation progress values.
  tickPeelAnims(r)

  // ── Main figure — centred left of canvas ──────────────────────────────────
  const figH = Math.min(h * 0.82, w * 0.38)
  const figW = figH * 0.55
  const figX = w * 0.30 - figW / 2
  const figY = h * 0.10

  drawFigure(r, figX, figY, figW, figH, t)

  // ── RECHECK mirror — smaller, to the right ────────────────────────────────
  const mirrorH = figH * 0.72
  const mirrorW = mirrorH * 0.55
  const mirrorX = w * 0.70 - mirrorW / 2
  const mirrorY = figY + (figH - mirrorH) * 0.5

  drawMirror(r, mirrorX, mirrorY, mirrorW, mirrorH, t)
}

/**
 * Advance all active peel animation progress values.
 * Uses ease-out cubic: f(t) = 1 - (1 - t)^3
 */
function tickPeelAnims(r: FigureRenderer): void {
  const now = performance.now()
  for (const [reg, anim] of r.peelAnims) {
    const elapsed = now - anim.startTime
    const linear = Math.min(elapsed / PEEL_DURATION_MS, 1)
    // Ease-out cubic.
    anim.progress = 1 - Math.pow(1 - linear, 3)
  }
}

function drawFigure(
  r: FigureRenderer,
  ox: number, oy: number,
  fw: number, fh: number,
  t: number,
): void {
  const { gl, program, canvas, currentMap, costumeParts, revealStage } = r

  for (const reg of DRAW_ORDER) {
    const quad = FIGURE_PARTS[reg]
    const state = currentMap[reg]

    // Resolve effective state considering scroll reveal.
    const { effectiveState, alpha } = revealedState(
      state, reg, costumeParts, revealStage, r.peelAnims
    )

    const qx = ox + quad.x * fw
    const qy = oy + quad.y * fh
    const qw = quad.w * fw
    const qh = quad.h * fh

    drawQuad(gl, program, canvas, qx, qy, qw, qh, PART_COLORS[reg], effectiveState, alpha, t)
  }
}

/**
 * Draw the mirror figure.
 *
 * Task 11: the mirror is fully driven by the RECHECK register state.
 * Every part of the mirror renders with the RECHECK state visual:
 *   HOLE     → glowing outlined gap
 *   COSTUME  → translucent
 *   DECLINED → clean outline
 *   SOLID    → lit and opaque
 *
 * The mirror also participates in scroll reveal when RECHECK is COSTUME:
 * its peel animation is read from the RECHECK entry in peelAnims.
 */
function drawMirror(
  r: FigureRenderer,
  ox: number, oy: number,
  fw: number, fh: number,
  t: number,
): void {
  const { gl, program, canvas, currentMap, costumeParts, revealStage } = r

  const recheckState = currentMap['RECHECK']

  // Resolve effective RECHECK state including its peel animation.
  const { effectiveState: mirrorEffective, alpha: mirrorAlpha } = revealedState(
    recheckState, 'RECHECK', costumeParts, revealStage, r.peelAnims
  )

  for (const reg of DRAW_ORDER) {
    const quad = FIGURE_PARTS[reg]

    const qx = ox + quad.x * fw
    const qy = oy + quad.y * fh
    const qw = quad.w * fw
    const qh = quad.h * fh

    // Mirror colour: blend part colour toward the RECHECK blue.
    const base = PART_COLORS[reg]
    const mirrored: [number, number, number, number] = [
      base[0] * 0.55 + PART_COLORS.RECHECK[0] * 0.45,
      base[1] * 0.55 + PART_COLORS.RECHECK[1] * 0.45,
      base[2] * 0.55 + PART_COLORS.RECHECK[2] * 0.45,
      base[3],
    ]

    drawQuad(gl, program, canvas, qx, qy, qw, qh, mirrored, mirrorEffective, mirrorAlpha, t)
  }
}

// ─── State + scroll-reveal logic ──────────────────────────────────────────────

/**
 * Returns the effective visual state for a register part, accounting for how
 * many COSTUME parts have been peeled off by scroll reveal, and the current
 * peel animation progress for smooth 400ms ease-out transitions.
 *
 * Returns both the state to use and an alpha override:
 *   - When state is COSTUME and a peel is in progress, the part crossfades
 *     from COSTUME_ALPHA toward 0 (alpha override used).
 *   - When fully peeled (progress = 1), state becomes DECLINED (outline).
 *   - alpha = -1 signals "use the shader's default for this mode".
 */
function revealedState(
  state: State,
  reg: Register,
  costumeParts: Register[],
  revealStage: number,
  peelAnims: Map<Register, PeelAnim>,
): { effectiveState: State; alpha: number } {
  if (state !== 'COSTUME') {
    return { effectiveState: state, alpha: -1 }
  }

  const idx = costumeParts.indexOf(reg)
  if (idx === -1) {
    // Not in costumeParts (shouldn't happen), just show COSTUME.
    return { effectiveState: 'COSTUME', alpha: COSTUME_ALPHA }
  }

  const anim = peelAnims.get(reg)

  if (idx < revealStage) {
    // This part has been triggered to peel.
    if (anim !== undefined && anim.progress < 1) {
      // Animation in progress: crossfade from COSTUME toward invisible.
      // We stay in COSTUME mode so the fabric shader runs, but fade alpha.
      const alpha = COSTUME_ALPHA * (1 - anim.progress)
      return { effectiveState: 'COSTUME', alpha }
    }
    // Fully peeled: show as DECLINED (the deliberate absence outline).
    return { effectiveState: 'DECLINED', alpha: -1 }
  }

  // Not yet peeled: normal COSTUME rendering.
  return { effectiveState: 'COSTUME', alpha: COSTUME_ALPHA }
}

// ─── WebGL drawing primitives ────────────────────────────────────────────────

/**
 * Draw a quad at (x, y, w, h) in screen-space pixels with the given state.
 * alpha: override for u_alpha; pass -1 to use the shader's per-mode default.
 */
function drawQuad(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  canvas: HTMLCanvasElement,
  x: number, y: number, w: number, h: number,
  color: [number, number, number, number],
  state: State,
  alphaOverride: number,
  t: number,
): void {
  // Build a unit quad in screen-space.
  const x1 = x, y1 = y, x2 = x + w, y2 = y + h

  const positions = new Float32Array([
    x1, y1,   x2, y1,   x1, y2,
    x1, y2,   x2, y1,   x2, y2,
  ])

  const uvs = new Float32Array([
    0, 0,   1, 0,   0, 1,
    0, 1,   1, 0,   1, 1,
  ])

  gl.useProgram(program)

  // Upload positions.
  const posBuf = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  // Upload UVs.
  const uvBuf = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf)
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW)
  const aUV = gl.getAttribLocation(program, 'a_uv')
  gl.enableVertexAttribArray(aUV)
  gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0)

  // Uniforms.
  setUniform2f(gl, program, 'u_resolution', canvas.width, canvas.height)
  setUniform2f(gl, program, 'u_offset', 0, 0)
  setUniform1f(gl, program, 'u_scale', 1)
  setUniform4f(gl, program, 'u_light_color', ...LIGHT_COLOR)
  setUniform1f(gl, program, 'u_ambient', AMBIENT_LEVEL)
  setUniform1f(gl, program, 'u_time', t)

  // Part colour — HOLE uses glow colour.
  const partCol = state === 'HOLE' ? HOLE_GLOW_COLOR : color
  setUniform4f(gl, program, 'u_part_color', ...partCol)

  // Alpha: use override if provided, else COSTUME_ALPHA as default for mode=1.
  const alpha = alphaOverride >= 0 ? alphaOverride : COSTUME_ALPHA
  setUniform1f(gl, program, 'u_alpha', alpha)

  const mode = stateToMode(state)
  const modeLocation = gl.getUniformLocation(program, 'u_mode')
  gl.uniform1i(modeLocation, mode)

  gl.drawArrays(gl.TRIANGLES, 0, 6)

  // Clean up buffers to avoid leaks.
  gl.deleteBuffer(posBuf)
  gl.deleteBuffer(uvBuf)
}

function stateToMode(state: State): number {
  switch (state) {
    case 'SOLID':    return 0
    case 'COSTUME':  return 1
    case 'DECLINED': return 2
    case 'HOLE':     return 3
  }
}

// ─── WebGL setup helpers ──────────────────────────────────────────────────────

function buildProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  if (!vs || !fs) return null

  const program = gl.createProgram()!
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[figure] Program link error:', gl.getProgramInfoLog(program))
    return null
  }

  return program
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[figure] Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  return shader
}

function resizeCanvas(canvas: HTMLCanvasElement, gl: WebGLRenderingContext): void {
  const dpr = window.devicePixelRatio || 1
  const displayW = Math.floor(canvas.clientWidth * dpr)
  const displayH = Math.floor(canvas.clientHeight * dpr)

  if (canvas.width !== displayW || canvas.height !== displayH) {
    canvas.width = displayW
    canvas.height = displayH
  }
}

// ─── Uniform helpers ──────────────────────────────────────────────────────────

function setUniform1f(gl: WebGLRenderingContext, prog: WebGLProgram, name: string, v: number): void {
  gl.uniform1f(gl.getUniformLocation(prog, name), v)
}

function setUniform2f(gl: WebGLRenderingContext, prog: WebGLProgram, name: string, x: number, y: number): void {
  gl.uniform2f(gl.getUniformLocation(prog, name), x, y)
}

function setUniform4f(
  gl: WebGLRenderingContext,
  prog: WebGLProgram,
  name: string,
  r: number, g: number, b: number, a: number,
): void {
  gl.uniform4f(gl.getUniformLocation(prog, name), r, g, b, a)
}
