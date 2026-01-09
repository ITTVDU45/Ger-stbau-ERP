"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme } = useTheme()

  // Verhindert Hydration Mismatch - useEffect läuft nur auf dem Client
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Skeleton-Button während SSR, um Layout Shift zu vermeiden
  if (!mounted) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-9 w-9" 
        disabled
        aria-label="Theme wird geladen"
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Theme wechseln</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 relative transition-all hover:bg-accent"
          aria-label="Theme wechseln"
        >
          {/* Sonne-Icon: sichtbar im Light Mode, verschwindet im Dark Mode */}
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-200 dark:-rotate-90 dark:scale-0" />
          {/* Mond-Icon: sichtbar im Dark Mode, versteckt im Light Mode */}
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-200 dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Theme wechseln</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[9999]">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="cursor-pointer gap-2"
        >
          <Sun className="h-4 w-4" />
          <span>Hell</span>
          {theme === "light" && (
            <span className="ml-auto text-xs text-muted-foreground">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="cursor-pointer gap-2"
        >
          <Moon className="h-4 w-4" />
          <span>Dunkel</span>
          {theme === "dark" && (
            <span className="ml-auto text-xs text-muted-foreground">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="cursor-pointer gap-2"
        >
          <Monitor className="h-4 w-4" />
          <span>System</span>
          {theme === "system" && (
            <span className="ml-auto text-xs text-muted-foreground">✓</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Kompakte Version des ThemeToggles - wechselt direkt zwischen Light/Dark
 * ohne Dropdown. Ideal für mobile Ansichten oder minimalistisches UI.
 */
export function ThemeToggleSimple() {
  const [mounted, setMounted] = React.useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-9 w-9" 
        disabled
        aria-label="Theme wird geladen"
      >
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-9 w-9 relative transition-all hover:bg-accent"
      onClick={toggleTheme}
      aria-label={`Wechseln zu ${resolvedTheme === "dark" ? "hellem" : "dunklem"} Modus`}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-200 dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-200 dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
