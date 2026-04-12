"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useConnection, useSwitchChain } from "wagmi"
import { sepolia } from "wagmi/chains"
import { Leaf, Menu, AlertTriangle } from "lucide-react"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { ConnectKitButton } from "connectkit"

export function Header() {
  const { isConnected, chain } = useConnection()
  const { switchChain } = useSwitchChain()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const isCorrectNetwork = chain?.id === sepolia.id

  const handleSwitchToSepolia = () => {
    switchChain({ chainId: sepolia.id })
  }

  const navItems = [
    { href: "/", label: "Marketplace" },
    { href: "/landowner", label: "Landowner" },
    { href: "/agent", label: "Agent" },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-5 w-5" />
            </div>
            <span>CarbonCredit</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === item.href ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isConnected && !isCorrectNetwork && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleSwitchToSepolia}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Switch to Sepolia</span>
            </Button>
          )}

          {isConnected && isCorrectNetwork && (
            <Badge variant="outline" className="hidden sm:flex gap-1 bg-accent/20 text-accent border-accent/50">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              Sepolia
            </Badge>
          )}

          <ConnectKitButton />

          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`text-lg font-medium transition-colors hover:text-primary px-2 py-2 rounded-md ${
                      pathname === item.href ? "text-foreground bg-muted" : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
