/**
 * Central GSAP initialization module.
 * Registers ScrollTrigger, exports configured instances and theme constants.
 */
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register plugins
gsap.registerPlugin(ScrollTrigger)

// ── Global GSAP Defaults ──
gsap.defaults({
  ease: 'power3.out',
  duration: 0.8,
})

// ── Theme Constants (mapped from CSS custom properties) ──
export const theme = {
  cyanGlow: '#00ffff',
  violetGlow: '#8f00ff',
  obsidian: '#131313',
  obsidianLowest: '#0e0e0e',
  obsidianSurface: '#201f1f',
  obsidianHigh: '#2a2a2a',
  goldAlert: '#fce442',
  primaryBlue: '#0A66C2',
  background: '#030712',
  foreground: '#ffffff',
  mutedForeground: '#a3a3a3',
} as const

// ── Easing presets ──
export const eases = {
  smooth: 'power3.out',
  snappy: 'power4.out',
  elastic: 'elastic.out(1, 0.5)',
  bounce: 'back.out(1.7)',
  expo: 'expo.out',
  circ: 'circ.out',
} as const

// ── Duration presets ──
export const durations = {
  fast: 0.3,
  normal: 0.6,
  slow: 1.0,
  cinematic: 1.4,
} as const

// ── Reusable animation presets (from state) ──
export const fromPresets = {
  fadeUp: { autoAlpha: 0, y: 60 },
  fadeDown: { autoAlpha: 0, y: -40 },
  fadeLeft: { autoAlpha: 0, x: -60 },
  fadeRight: { autoAlpha: 0, x: 60 },
  scaleUp: { autoAlpha: 0, scale: 0.85 },
  heroWord: { autoAlpha: 0, y: 50, rotateX: -40 },
} as const

// ── Reusable animation presets (to state) ──
export const toPresets = {
  visible: { autoAlpha: 1, y: 0, x: 0, scale: 1, rotateX: 0 },
} as const

export { gsap, ScrollTrigger }
