/**
 * GSAP-powered skeleton loader with continuous shimmer animation.
 * Uses hardware-accelerated transforms for smooth 60fps rendering.
 */
import { useRef, useEffect } from 'react'
import { gsap } from '@/lib/gsap'

type SkeletonLoaderProps = {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
  count?: number
}

export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 8,
  className = '',
  count = 1,
}: SkeletonLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const shimmerElements = containerRef.current.querySelectorAll('.skeleton-shimmer')

    const ctx = gsap.context(() => {
      shimmerElements.forEach((el, i) => {
        gsap.fromTo(
          el,
          { x: '-100%' },
          {
            x: '200%',
            duration: 1.5,
            ease: 'power1.inOut',
            repeat: -1,
            delay: i * 0.15,
          }
        )
      })
    }, containerRef.current)

    return () => ctx.revert()
  }, [count])

  return (
    <div ref={containerRef} className={`flex flex-col gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden bg-white/5 border border-white/5"
          style={{
            width,
            height,
            borderRadius,
          }}
        >
          <div
            className="skeleton-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            style={{ width: '50%' }}
          />
        </div>
      ))}
    </div>
  )
}
