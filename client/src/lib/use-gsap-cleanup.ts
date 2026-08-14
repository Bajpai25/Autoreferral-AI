/**
 * Hook to safely collect and clean up GSAP timelines and ScrollTrigger instances
 * on component unmount, preventing memory leaks and layout misalignments.
 */
import { useRef, useEffect } from 'react'
import { gsap, ScrollTrigger } from './gsap'

export function useGsapCleanup() {
  const ctx = useRef<gsap.Context | null>(null)

  useEffect(() => {
    return () => {
      if (ctx.current) {
        ctx.current.revert()
      }
      ScrollTrigger.refresh()
    }
  }, [])

  /**
   * Creates a GSAP context scoped to a container element.
   * All GSAP animations created within the callback are auto-cleaned on unmount.
   */
  function createCtx(container: Element | string, callback: (self: gsap.Context) => void) {
    if (ctx.current) {
      ctx.current.revert()
    }
    ctx.current = gsap.context(callback, container)
    return ctx.current
  }

  return { createCtx, ctx }
}
