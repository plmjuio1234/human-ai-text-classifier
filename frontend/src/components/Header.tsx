import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(174,72%,56%)] to-[hsl(280,80%,60%)] rounded-lg rotate-6 group-hover:rotate-12 transition-transform"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-[hsl(174,72%,56%)] to-[hsl(280,80%,60%)] rounded-lg flex items-center justify-center font-display font-bold text-[hsl(220,26%,6%)]">
                AI
              </div>
            </div>
            <span className="text-xl font-bold font-display group-hover:text-[hsl(174,72%,56%)] transition-colors">
              DETECT<span className="text-[hsl(174,72%,56%)]">TEXT</span>
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-display font-medium transition-colors hover:text-[hsl(174,72%,56%)] ${
                location.pathname === '/' ? 'text-[hsl(174,72%,56%)]' : 'text-muted-foreground'
              }`}
            >
              HOME
            </Link>
            <Link
              to="/analyze"
              className={`text-sm font-display font-medium transition-colors hover:text-[hsl(174,72%,56%)] ${
                location.pathname === '/analyze' ? 'text-[hsl(174,72%,56%)]' : 'text-muted-foreground'
              }`}
            >
              ANALYZE
            </Link>
            <Link
              to="/history"
              className={`text-sm font-display font-medium transition-colors hover:text-[hsl(174,72%,56%)] ${
                location.pathname === '/history' ? 'text-[hsl(174,72%,56%)]' : 'text-muted-foreground'
              }`}
            >
              HISTORY
            </Link>
            <Link
              to="/data"
              className={`text-sm font-display font-medium transition-colors hover:text-[hsl(174,72%,56%)] ${
                location.pathname === '/data' ? 'text-[hsl(174,72%,56%)]' : 'text-muted-foreground'
              }`}
            >
              DATA
            </Link>
            <Button
              asChild
              size="sm"
              className="bg-[hsl(174,72%,56%)] hover:bg-[hsl(174,72%,46%)] text-[hsl(220,26%,6%)] font-display font-bold shadow-[0_0_15px_hsla(174,72%,56%,0.3)]"
            >
              <Link to="/analyze">START →</Link>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
