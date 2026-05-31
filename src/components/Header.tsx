import { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Link } from 'react-router-dom';
import logo from '@/assets/runtime42-logo.png';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = ['Product', 'How it works', 'Pricing', 'Docs'];

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
      <div className="max-w-5xl mx-auto">
        {/* Glassmorphic floating pill header */}
        <div className="bg-background/80 backdrop-blur-2xl border border-border rounded-full px-6 py-2.5 shadow-lg shadow-black/10 dark:shadow-black/20">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5">
              <img src={logo} alt="runtime42" className="w-10 h-10" />
              <span className="text-lg font-semibold text-foreground">runtime42</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-7">
              {navItems.map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
                >
                  {item}
                </a>
              ))}
            </nav>

            {/* Desktop CTA + Theme Toggle */}
            <div className="hidden lg:flex items-center gap-2.5">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Toggle theme"
              >
                {mounted && (resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />)}
              </button>
              {!isLoading && isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-full hover:bg-foreground/90 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth"
                    className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-full hover:bg-foreground/90 transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/auth"
                    className="px-4 py-2 border border-border text-foreground text-sm font-medium rounded-full hover:bg-muted/50 transition-colors"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: Theme Toggle + Menu Button */}
            <div className="lg:hidden flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Toggle theme"
              >
                {mounted && (resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />)}
              </button>
              <button
                className="p-2 text-foreground"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden mt-2 bg-background/95 backdrop-blur-2xl border border-border rounded-2xl p-4 shadow-xl">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-muted-foreground hover:text-foreground transition-colors py-2 px-3 rounded-lg hover:bg-muted/50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item}
                </a>
              ))}
              <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border">
                {!isLoading && isAuthenticated ? (
                  <Link
                    to="/dashboard"
                    className="px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-full text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      className="px-5 py-2.5 bg-foreground text-background text-sm font-medium rounded-full text-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/auth"
                      className="px-5 py-2.5 border border-border text-foreground text-sm font-medium rounded-full text-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
