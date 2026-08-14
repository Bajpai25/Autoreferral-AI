import * as React from "react"
import { cn } from "@/lib/utils"
import { gsap } from "@/lib/gsap"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const el = inputRef.current
    if (!el) return

    const handleFocus = () => {
      gsap.to(el, {
        boxShadow: '0 0 0 3px rgba(0, 255, 255, 0.15), 0 0 20px rgba(0, 255, 255, 0.1)',
        borderColor: 'rgba(0, 255, 255, 0.5)',
        scale: 1.01,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const handleBlur = () => {
      gsap.to(el, {
        boxShadow: 'none',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        scale: 1,
        duration: 0.4,
        ease: 'power2.out',
      })
    }

    el.addEventListener('focus', handleFocus)
    el.addEventListener('blur', handleBlur)
    return () => {
      el.removeEventListener('focus', handleFocus)
      el.removeEventListener('blur', handleBlur)
    }
  }, [])

  return (
    <input
      ref={inputRef}
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
