/**
 * Magnetic mouse-tracking hook for interactive elements.
 * Uses GSAP quickTo for butter-smooth 60fps performance.
 */
import { useEffect, useRef, type RefObject } from 'react'
import { gsap } from './gsap'

export function useMagnetic(ref: RefObject<HTMLElement | null>, strength: number = 0.3) {
  const quickX = useRef<gsap.QuickToFunc | null>(null)
  const quickY = useRef<gsap.QuickToFunc | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    quickX.current = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3.out' })
    quickY.current = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3.out' })

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const deltaX = (e.clientX - centerX) * strength
      const deltaY = (e.clientY - centerY) * strength

      quickX.current?.(deltaX)
      quickY.current?.(deltaY)
    }

    const handleMouseLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.4)',
      })
    }

    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseleave', handleMouseLeave)
      gsap.set(el, { x: 0, y: 0 })
    }
  }, [ref, strength])
}
