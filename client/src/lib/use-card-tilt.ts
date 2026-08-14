/**
 * 3D card tilt hover hook.
 * Calculates cursor position relative to card center and applies
 * perspective-based rotateX/rotateY transforms via GSAP.
 */
import { useEffect, type RefObject } from 'react'
import { gsap } from './gsap'
import { theme } from './gsap'

export function useCardTilt(ref: RefObject<HTMLElement | null>, intensity: number = 12) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Ensure perspective is set on the element
    gsap.set(el, { transformPerspective: 800, transformStyle: 'preserve-3d' })

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const percentX = (e.clientX - centerX) / (rect.width / 2)
      const percentY = (e.clientY - centerY) / (rect.height / 2)

      gsap.to(el, {
        rotateY: percentX * intensity,
        rotateX: -percentY * intensity,
        scale: 1.03,
        boxShadow: `${percentX * -8}px ${percentY * 8}px 30px rgba(0, 255, 255, 0.12), 0 0 20px rgba(0, 255, 255, 0.06)`,
        duration: 0.4,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      gsap.to(el, {
        rotateY: 0,
        rotateX: 0,
        scale: 1,
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        duration: 0.6,
        ease: 'elastic.out(1, 0.5)',
      })
    }

    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseleave', handleMouseLeave)
      gsap.set(el, { rotateY: 0, rotateX: 0, scale: 1, boxShadow: 'none' })
    }
  }, [ref, intensity])
}
