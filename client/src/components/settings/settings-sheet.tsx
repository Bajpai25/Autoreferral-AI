

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Settings } from 'lucide-react'

type SettingsSheetProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

export function SettingsSheet({
  open = false,
  onOpenChange = () => {},
  trigger = (
    <Button variant="outline" className="gap-2">
      <Settings className="size-4" /> Settings
    </Button>
  ),
}: SettingsSheetProps) {
  const [tone, setTone] = useState('Warm')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Settings / Profile</SheetTitle>
          <SheetDescription>Manage your profile, preferences, and billing.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
            <Input id="linkedin" placeholder="https://www.linkedin.com/in/you" />
          </div>

          <div className="grid gap-2">
            <Label>Upload resume</Label>
            <Input type="file" />
          </div>

          <div className="grid gap-2">
            <Label>Outreach preferences</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger>
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Warm">Warm</SelectItem>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Casual">Casual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="api">OpenAI API key</Label>
            <Input id="api" placeholder="API key" type="password" />
          </div>

          <div className="pt-2">
            <Label>Billing</Label>
            <div className="mt-2">
              <Button variant="destructive" className="gap-2" type="button">
                <Trash2 className="size-4" />
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
