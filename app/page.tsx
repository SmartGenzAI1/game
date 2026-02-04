
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, BarChart3, Palette, Sparkles, Zap, CheckCircle2 } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <Link className="flex items-center justify-center gap-2 font-bold text-xl" href="#">
          <Zap className="h-6 w-6 text-primary" />
          <span>LinkHub AI</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:text-primary transition-colors flex items-center" href="/login">
            Login
          </Link>
          <Link className="text-sm font-medium hover:text-primary transition-colors flex items-center" href="/signup">
            Sign Up
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-b from-background via-muted/50 to-background border-b">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center animate-in fade-in zoom-in duration-700">
              <div className="space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600 pb-2">
                  One Link for Everything
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl leading-relaxed">
                  Share your socials, music, and content with a single bio link. Powered by AI to make you look professional in seconds.
                </p>
              </div>
              <div className="space-x-4 pt-4">
                <Button size="lg" className="h-12 px-8 rounded-full shadow-lg hover:shadow-xl transition-all" asChild>
                  <Link href="/signup">
                    Get Started for Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-12 px-8 rounded-full" asChild>
                  <Link href="/login">
                    View Demo
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/20">
          <div className="container px-4 md:px-6">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              <div className="group relative overflow-hidden rounded-2xl border bg-background p-8 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 inline-block rounded-lg bg-primary/10 p-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold mb-2">AI Powered</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Generate professional bios and link titles instantly with our integrated AI assistant. Stop wasting time on copy.
                </p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border bg-background p-8 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 inline-block rounded-lg bg-primary/10 p-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Palette className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold mb-2">Custom Themes</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Choose from beautiful pre-built themes to match your brand and style. Dark mode, Light mode, and more.
                </p>
              </div>
              <div className="group relative overflow-hidden rounded-2xl border bg-background p-8 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 inline-block rounded-lg bg-primary/10 p-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold mb-2">Analytics</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Track your clicks and understand your audience with detailed insights. Know what works.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 border-t">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                  Ready to upgrade your bio?
                </h2>
                <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl">
                  Join thousands of creators who use LinkHub AI to share their world.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <Button size="lg" className="w-full h-12 rounded-full" asChild>
                  <Link href="/signup">
                    Create Your Page for Free
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  No credit card required. Cancel anytime.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-8 w-full shrink-0 items-center px-4 md:px-6 border-t bg-muted/20">
        <p className="text-xs text-muted-foreground">© 2026 LinkHub AI. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4 text-muted-foreground" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4 text-muted-foreground" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  )
}
