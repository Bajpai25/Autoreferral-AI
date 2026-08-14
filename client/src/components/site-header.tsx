import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { checkLogout } from '@/utils/auth'
import { gsap } from '@/lib/gsap'
import { useMagnetic } from '@/lib/use-magnetic'

type SiteHeaderProps = {
  onOpenSettings?: () => void
}

export function SiteHeader({ onOpenSettings = () => {} }: SiteHeaderProps) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const navLinksRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const logoRef = useRef<HTMLAnchorElement>(null)

  useMagnetic(logoRef, 0.2)

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // GSAP pill morph on scroll
  useEffect(() => {
    const pill = pillRef.current
    if (!pill) return

    if (scrolled) {
      gsap.to(pill, {
        borderRadius: '9999px',
        backdropFilter: 'blur(24px)',
        borderColor: 'rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,255,255,0.08)',
        duration: 0.5,
        ease: 'power3.out',
      })
    } else {
      gsap.to(pill, {
        borderRadius: '0px',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(255,255,255,0.05)',
        boxShadow: 'none',
        duration: 0.5,
        ease: 'power3.out',
      })
    }
  }, [scrolled])

  // Desktop nav link hover tweens
  useEffect(() => {
    const links = document.querySelectorAll('.gsap-nav-link')
    links.forEach((link) => {
      const el = link as HTMLElement
      const enter = () => {
        gsap.to(el, {
          color: '#00ffff',
          textShadow: '0 0 12px rgba(0,255,255,0.6)',
          y: -2,
          duration: 0.3,
          ease: 'power2.out',
        })
      }
      const leave = () => {
        gsap.to(el, {
          color: '#d4d4d4',
          textShadow: 'none',
          y: 0,
          duration: 0.3,
          ease: 'power2.out',
        })
      }
      el.addEventListener('mouseenter', enter)
      el.addEventListener('mouseleave', leave)
    })
  }, [])

  // Build mobile menu timeline
  useEffect(() => {
    if (!overlayRef.current || !navLinksRef.current) return

    const links = navLinksRef.current.querySelectorAll('.mobile-nav-link')

    const tl = gsap.timeline({ paused: true })
    tl.to(overlayRef.current, {
      clipPath: 'circle(150% at calc(100% - 2rem) 2rem)',
      duration: 0.6,
      ease: 'power4.inOut',
    })
    tl.fromTo(links, 
      { autoAlpha: 0, y: 30 },
      { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.4, ease: 'power3.out' },
      '-=0.2'
    )

    tlRef.current = tl
    return () => { tl.kill() }
  }, [])

  const toggleMenu = useCallback(() => {
    if (!tlRef.current) return
    if (open) {
      tlRef.current.reverse()
    } else {
      tlRef.current.play()
    }
    setOpen(!open)
  }, [open])

  const closeMenu = useCallback(() => {
    if (open && tlRef.current) {
      tlRef.current.reverse()
      setOpen(false)
    }
  }, [open])

  return (
    <header
      ref={headerRef}
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-500 ease-in-out flex justify-center",
        scrolled ? "pt-4" : "pt-0 border-b border-white/5 bg-[#030712]/80 backdrop-blur-md"
      )}
    >
      <div
        ref={pillRef}
        className={cn(
          "flex h-14 items-center justify-between px-4 transition-all duration-500",
          scrolled
            ? "w-[90%] md:w-[70%] max-w-5xl rounded-full bg-[#030712]/60 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,255,255,0.1)] px-6"
            : "container mx-auto"
        )}
      >
        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center justify-center rounded-md border border-white/10 p-2 lg:hidden text-white"
            aria-label="Toggle menu"
            onClick={toggleMenu}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <Link ref={logoRef} to="/" className="font-bold tracking-tight text-white flex items-center gap-2">
            <div className="size-6 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-[0_0_10px_rgba(0,255,255,0.5)]">
              <span className="text-[10px] font-black text-black">AR</span>
            </div>
            AutoReferrals
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-6 text-sm text-neutral-300">
          <Link to="/#how-it-works" className="gsap-nav-link transition-colors">How it works</Link>
          <Link
            className="gsap-nav-link transition-colors"
            to={sessionStorage.getItem("authToken") ? "/dashboard" : "#"}
            onClick={(e) => {
              if (!sessionStorage.getItem("authToken")) {
                e.preventDefault()
                alert("User needs to be Logged IN")
              }
            }}
          >
            Dashboard
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {sessionStorage.getItem("authToken") ? (
            <Button asChild size="sm" className="rounded-full px-6">
              <Link to="*" onClick={(e) => { checkLogout(); e.preventDefault() }}>
                Logout
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Mobile Nav Overlay */}
      <div
        ref={overlayRef}
        className="nav-overlay fixed inset-0 z-40 bg-[#030712]/98 backdrop-blur-2xl lg:hidden flex items-center justify-center"
      >
        <div ref={navLinksRef} className="flex flex-col items-center gap-8">
          <Link to="/#how-it-works" onClick={closeMenu} className="mobile-nav-link text-2xl font-semibold text-white hover:text-cyan-400 transition-colors invisible">
            How it works
          </Link>
          <Link to="/dashboard" onClick={closeMenu} className="mobile-nav-link text-2xl font-semibold text-white hover:text-cyan-400 transition-colors invisible">
            Dashboard
          </Link>
          <button
            className="mobile-nav-link text-2xl font-semibold text-white hover:text-cyan-400 transition-colors invisible"
            onClick={() => { closeMenu(); onOpenSettings() }}
          >
            Settings
          </button>
        </div>
      </div>
    </header>
  )
}
