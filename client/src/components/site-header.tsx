
import {Link} from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Menu, Settings } from 'lucide-react'
import { useState } from 'react'

type SiteHeaderProps = {
  onOpenSettings?: () => void
}

export function SiteHeader({ onOpenSettings = () => {} }: SiteHeaderProps) {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex items-center justify-center rounded-md border p-2 lg:hidden"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="size-4" />
          </button>
          <Link to="/" className="font-semibold tracking-tight">
            AutoReferrals
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-6 text-sm text-neutral-700">
          <Link to="/#how-it-works">How it works</Link>
          <Link to="/dashboard">Dashboard</Link>
          <button
            className="inline-flex items-center gap-2 text-neutral-700"
            onClick={onOpenSettings}
          >
            <Settings className="size-4" /> Settings
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link to="/dashboard">Open app</Link>
          </Button>
        </div>
      </div>

      {open ? (
        <div className="lg:hidden border-t bg-white">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-3">
            <Link to="/#how-it-works" onClick={() => setOpen(false)}>How it works</Link>
            <Link to="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
            <button className="text-left" onClick={() => { setOpen(false); onOpenSettings() }}>
              Settings
            </button>
          </div>
        </div>
      ) : null}
    </header>
  )
}
