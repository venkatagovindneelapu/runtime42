import { useState, useCallback, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Save } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Highlight, themes, type PrismTheme } from 'prism-react-renderer';
import { toast } from 'sonner';

// Custom light theme similar to the reference image
const lightTheme: PrismTheme = {
  plain: {
    color: '#1e1e1e',
    backgroundColor: 'transparent',
  },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: '#6a9955' } },
    { types: ['punctuation'], style: { color: '#1e1e1e' } },
    { types: ['property', 'tag', 'boolean', 'number', 'constant', 'symbol'], style: { color: '#0000ff' } },
    { types: ['selector', 'attr-name', 'string', 'char', 'builtin', 'inserted'], style: { color: '#a31515' } },
    { types: ['operator', 'entity', 'url'], style: { color: '#1e1e1e' } },
    { types: ['atrule', 'attr-value', 'keyword'], style: { color: '#0000ff' } },
    { types: ['function', 'class-name'], style: { color: '#795e26' } },
    { types: ['regex', 'important', 'variable'], style: { color: '#ee0000' } },
  ],
};

// Custom grey theme
const greyTheme: PrismTheme = {
  plain: {
    color: '#d4d4d4',
    backgroundColor: 'transparent',
  },
  styles: [
    { types: ['comment', 'prolog', 'doctype', 'cdata'], style: { color: '#6a9955' } },
    { types: ['punctuation'], style: { color: '#d4d4d4' } },
    { types: ['property', 'tag', 'boolean', 'number', 'constant', 'symbol'], style: { color: '#4fc1ff' } },
    { types: ['selector', 'attr-name', 'string', 'char', 'builtin', 'inserted'], style: { color: '#ce9178' } },
    { types: ['operator', 'entity', 'url'], style: { color: '#d4d4d4' } },
    { types: ['atrule', 'attr-value', 'keyword'], style: { color: '#569cd6' } },
    { types: ['function', 'class-name'], style: { color: '#dcdcaa' } },
    { types: ['regex', 'important', 'variable'], style: { color: '#d16969' } },
  ],
};

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
}

const initialDemoProjectFiles: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    children: [
      {
        name: 'components',
        type: 'folder',
        children: [
          {
            name: 'ui',
            type: 'folder',
            children: [
              {
                name: 'Button.tsx',
                type: 'file',
                content: `import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all';
    
    const variants = {
      primary: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90',
      secondary: 'bg-white/10 text-white hover:bg-white/20',
      outline: 'border border-white/20 text-white hover:bg-white/10',
      ghost: 'text-gray-300 hover:text-white hover:bg-white/5',
    };
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-8 py-4 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;`
              },
              {
                name: 'Card.tsx',
                type: 'file',
                content: `import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-white/5 border border-white/10',
      elevated: 'bg-white/10 shadow-xl',
      outlined: 'border-2 border-purple-500/50',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-2xl p-6', variants[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
export default Card;`
              },
              {
                name: 'index.ts',
                type: 'file',
                content: `export { default as Button } from './Button';
export { default as Card } from './Card';`
              }
            ]
          },
          {
            name: 'layout',
            type: 'folder',
            children: [
              {
                name: 'Header.tsx',
                type: 'file',
                content: `import { Link } from 'react-router-dom';
import Button from '../ui/Button';

const Header = () => {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/70 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg" />
          <span className="font-bold text-xl text-white">SaaSify</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link to="/#features" className="text-sm text-gray-300 hover:text-white">Features</Link>
          <Link to="/pricing" className="text-sm text-gray-300 hover:text-white">Pricing</Link>
          <Link to="/about" className="text-sm text-gray-300 hover:text-white">About</Link>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm">Login</Button>
          <Button variant="primary" size="sm">Get Started</Button>
        </div>
      </div>
    </nav>
  );
};

export default Header;`
              },
              {
                name: 'Footer.tsx',
                type: 'file',
                content: `import { Link } from 'react-router-dom';

const Footer = () => {
  const links = {
    Product: ['Features', 'Pricing', 'Integrations', 'Changelog'],
    Company: ['About', 'Blog', 'Careers', 'Press'],
    Resources: ['Documentation', 'Help Center', 'Community', 'Contact'],
    Legal: ['Privacy', 'Terms', 'Security', 'Cookies'],
  };

  return (
    <footer className="bg-slate-900 border-t border-white/10 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg" />
              <span className="font-bold text-xl text-white">SaaSify</span>
            </Link>
            <p className="text-sm text-gray-400">Build products 10x faster.</p>
          </div>
          
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="font-semibold text-white mb-4">{title}</h4>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-gray-400 hover:text-white">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/10 text-center text-sm text-gray-400">
          © 2024 SaaSify. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;`
              },
              {
                name: 'AppShell.tsx',
                type: 'file',
                content: `import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface AppShellProps {
  children: ReactNode;
}

const AppShell = ({ children }: AppShellProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
};

export default AppShell;`
              },
              {
                name: 'index.ts',
                type: 'file',
                content: `export { default as Header } from './Header';
export { default as Footer } from './Footer';
export { default as AppShell } from './AppShell';`
              }
            ]
          },
          {
            name: 'features',
            type: 'folder',
            children: [
              {
                name: 'FeatureCard.tsx',
                type: 'file',
                content: `import { LucideIcon } from 'lucide-react';
import Card from '../ui/Card';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
  return (
    <Card className="hover:border-purple-500/50 transition-colors">
      <Icon className="w-10 h-10 text-purple-400 mb-4" />
      <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </Card>
  );
};

export default FeatureCard;`
              },
              {
                name: 'PricingCard.tsx',
                type: 'file',
                content: `import { Check } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface PricingCardProps {
  name: string;
  price: string;
  features: string[];
  popular?: boolean;
}

const PricingCard = ({ name, price, features, popular }: PricingCardProps) => {
  return (
    <Card 
      variant={popular ? 'outlined' : 'default'}
      className={popular ? 'bg-purple-500/20' : ''}
    >
      {popular && (
        <div className="text-purple-400 text-sm font-medium mb-4">Most Popular</div>
      )}
      <h3 className="text-2xl font-bold mb-2 text-white">{name}</h3>
      <div className="text-4xl font-bold mb-6 text-white">
        {price}<span className="text-lg text-gray-400">/mo</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-gray-300">
            <Check className="w-5 h-5 text-purple-400" />
            {feature}
          </li>
        ))}
      </ul>
      <Button 
        variant={popular ? 'primary' : 'secondary'} 
        className="w-full"
      >
        Get Started
      </Button>
    </Card>
  );
};

export default PricingCard;`
              },
              {
                name: 'index.ts',
                type: 'file',
                content: `export { default as FeatureCard } from './FeatureCard';
export { default as PricingCard } from './PricingCard';`
              }
            ]
          }
        ]
      },
      {
        name: 'pages',
        type: 'folder',
        children: [
          {
            name: 'Home.tsx',
            type: 'file',
            content: `import { ArrowRight, Star, Zap, Shield, Users } from 'lucide-react';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui';
import { FeatureCard } from '@/components/features';

const features = [
  { icon: Zap, title: 'Lightning Fast', description: 'Build and deploy in minutes.' },
  { icon: Shield, title: 'Enterprise Security', description: 'Bank-grade security built-in.' },
  { icon: Users, title: 'Team Collaboration', description: 'Work together seamlessly.' },
];

const Home = () => {
  return (
    <AppShell>
      {/* Hero Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full text-purple-300 text-sm mb-8">
            <Star className="w-4 h-4" />
            Rated #1 SaaS Platform 2024
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
            Build Products
            <br />
            10x Faster
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            The all-in-one platform that helps teams ship beautiful products faster than ever before.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-gray-100">
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="outline" size="lg">Watch Demo</Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Why Choose SaaSify?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <FeatureCard key={i} {...feature} />
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
};

export default Home;`
          },
          {
            name: 'Pricing.tsx',
            type: 'file',
            content: `import { AppShell } from '@/components/layout';
import { PricingCard } from '@/components/features';

const plans = [
  { 
    name: 'Starter', 
    price: '$9', 
    features: ['5 Projects', '10GB Storage', 'Basic Support'] 
  },
  { 
    name: 'Pro', 
    price: '$29', 
    popular: true, 
    features: ['Unlimited Projects', '100GB Storage', 'Priority Support', 'Analytics'] 
  },
  { 
    name: 'Enterprise', 
    price: '$99', 
    features: ['Everything in Pro', 'Unlimited Storage', '24/7 Support', 'Custom SLA'] 
  },
];

const Pricing = () => {
  return (
    <AppShell>
      <div className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
            Simple Pricing
          </h1>
          <p className="text-xl text-gray-400 text-center mb-16">
            Choose the plan that works for you
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, i) => (
              <PricingCard key={i} {...plan} />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default Pricing;`
          },
          {
            name: 'About.tsx',
            type: 'file',
            content: `import { AppShell } from '@/components/layout';
import { Button, Card } from '@/components/ui';

const About = () => {
  return (
    <AppShell>
      <div className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-8">
            About SaaSify
          </h1>
          <p className="text-xl text-gray-300 text-center mb-12">
            We are on a mission to democratize software development.
          </p>
          
          <div className="grid md:grid-cols-2 gap-12 mt-16">
            <Card>
              <h3 className="text-2xl font-bold mb-4">Our Story</h3>
              <p className="text-gray-400">
                Founded in 2024, SaaSify started with a simple idea: 
                anyone should be able to build software without barriers.
              </p>
            </Card>
            <Card>
              <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
              <p className="text-gray-400">
                We remove the barriers between imagination and creation, 
                empowering teams to build faster than ever.
              </p>
            </Card>
          </div>

          <Card className="mt-16 text-center">
            <h3 className="text-3xl font-bold mb-4">Join 10,000+ Teams</h3>
            <Button size="lg">Get Started Free</Button>
          </Card>
        </div>
      </div>
    </AppShell>
  );
};

export default About;`
          },
          {
            name: 'NotFound.tsx',
            type: 'file',
            content: `import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout';
import { Button } from '@/components/ui';

const NotFound = () => {
  return (
    <AppShell>
      <div className="py-24 px-6 min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-8xl font-bold text-purple-500 mb-4">404</h1>
          <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
          <p className="text-gray-400 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link to="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
};

export default NotFound;`
          },
          {
            name: 'index.ts',
            type: 'file',
            content: `export { default as Home } from './Home';
export { default as Pricing } from './Pricing';
export { default as About } from './About';
export { default as NotFound } from './NotFound';`
          }
        ]
      },
      {
        name: 'hooks',
        type: 'folder',
        children: [
          {
            name: 'useDebounce.ts',
            type: 'file',
            content: `import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;`
          },
          {
            name: 'useLocalStorage.ts',
            type: 'file',
            content: `import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}

export default useLocalStorage;`
          },
          {
            name: 'index.ts',
            type: 'file',
            content: `export { useDebounce } from './useDebounce';
export { useLocalStorage } from './useLocalStorage';`
          }
        ]
      },
      {
        name: 'lib',
        type: 'folder',
        children: [
          {
            name: 'utils.ts',
            type: 'file',
            content: `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function truncate(str: string, length: number): string {
  return str.length > length ? \`\${str.substring(0, length)}...\` : str;
}`
          },
          {
            name: 'constants.ts',
            type: 'file',
            content: `export const APP_NAME = 'SaaSify';
export const APP_VERSION = '1.0.0';

export const ROUTES = {
  HOME: '/',
  PRICING: '/pricing',
  ABOUT: '/about',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
} as const;

export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  PROJECTS: '/api/projects',
} as const;

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
} as const;`
          },
          {
            name: 'index.ts',
            type: 'file',
            content: `export * from './utils';
export * from './constants';`
          }
        ]
      },
      {
        name: 'types',
        type: 'folder',
        children: [
          {
            name: 'common.types.ts',
            type: 'file',
            content: `export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}`
          },
          {
            name: 'index.ts',
            type: 'file',
            content: `export * from './common.types';`
          }
        ]
      },
      {
        name: 'styles',
        type: 'folder',
        children: [
          {
            name: 'globals.css',
            type: 'file',
            content: `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 263 70% 50%;
    --primary-foreground: 210 40% 98%;
    --secondary: 217.2 32.6% 17.5%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --border: 217.2 32.6% 17.5%;
  }
}

@layer utilities {
  .text-gradient {
    @apply bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent;
  }
}`
          }
        ]
      },
      {
        name: 'routes.tsx',
        type: 'file',
        content: `import { createBrowserRouter } from 'react-router-dom';
import { Home, Pricing, About, NotFound } from '@/pages';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/pricing',
    element: <Pricing />,
  },
  {
    path: '/about',
    element: <About />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default router;`
      },
      {
        name: 'App.tsx',
        type: 'file',
        content: `import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

function App() {
  return <RouterProvider router={router} />;
}

export default App;`
      },
      {
        name: 'main.tsx',
        type: 'file',
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
      }
    ]
  },
  {
    name: 'public',
    type: 'folder',
    children: [
      {
        name: 'favicon.ico',
        type: 'file',
        content: '// Binary favicon file'
      },
      {
        name: 'robots.txt',
        type: 'file',
        content: `User-agent: *
Allow: /

Sitemap: https://saasify.com/sitemap.xml`
      }
    ]
  },
  {
    name: 'package.json',
    type: 'file',
    content: `{
  "name": "saasify",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx",
    "format": "prettier --write src"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.1",
    "lucide-react": "^0.462.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.3",
    "vite": "^5.4.2",
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.35",
    "autoprefixer": "^10.4.18",
    "eslint": "^8.57.0",
    "prettier": "^3.2.5"
  }
}`
  },
  {
    name: 'vite.config.ts',
    type: 'file',
    content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});`
  },
  {
    name: 'tsconfig.json',
    type: 'file',
    content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`
  },
  {
    name: 'tailwind.config.ts',
    type: 'file',
    content: `import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: 'hsl(var(--primary))',
        secondary: 'hsl(var(--secondary))',
        muted: 'hsl(var(--muted))',
        accent: 'hsl(var(--accent))',
        border: 'hsl(var(--border))',
      },
    },
  },
  plugins: [],
} satisfies Config;`
  },
  {
    name: 'README.md',
    type: 'file',
    content: `# SaaSify

A modern SaaS landing page built with React, TypeScript, and Tailwind CSS.

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
\`\`\`

## Project Structure

\`\`\`
src/
├── components/     # Reusable UI components
│   ├── ui/        # Atomic UI elements
│   ├── layout/    # Layout components
│   └── features/  # Feature-specific components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── lib/           # Core utilities & helpers
├── types/         # TypeScript type definitions
├── styles/        # Global styles
├── routes.tsx     # Route configuration
├── App.tsx        # Root component
└── main.tsx       # Entry point
\`\`\`

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide Icons`
  }
];

interface FileTreeItemProps {
  node: FileNode;
  depth: number;
  selectedFile: string | null;
  onSelectFile: (path: string, content: string) => void;
  path: string;
}

const FileTreeItem = ({ node, depth, selectedFile, onSelectFile, path }: FileTreeItemProps) => {
  const [isOpen, setIsOpen] = useState(depth === 0);
  const fullPath = path ? `${path}/${node.name}` : node.name;

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-muted/50 rounded text-left text-sm"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          )}
          {isOpen ? (
            <FolderOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
          )}
          <span className="text-foreground truncate">{node.name}</span>
        </button>
        {isOpen && node.children && (
          <div>
            {node.children.map((child, i) => (
              <FileTreeItem
                key={i}
                node={child}
                depth={depth + 1}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                path={fullPath}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => node.content && onSelectFile(fullPath, node.content)}
      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-left text-sm ${
        selectedFile === fullPath ? 'bg-primary/20 text-primary' : 'hover:bg-muted/50 text-foreground'
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <File className="w-4 h-4 text-blue-400 flex-shrink-0" />
      <span className="truncate">{node.name}</span>
    </button>
  );
};

const RAW_HTML_FILE = 'index.html';

const rawHtmlFileTree: FileNode[] = [
  {
    name: RAW_HTML_FILE,
    type: 'file',
    content: '',
  },
];

interface CodeViewerProps {
  className?: string;
  onCodeChange?: (filePath: string, newCode: string) => void;
  /** When set, shows generated landing page HTML instead of demo file tree */
  rawHtml?: string | null;
}

const CodeViewer = ({ className, onCodeChange, rawHtml }: CodeViewerProps) => {
  const useRawHtml = rawHtml != null;

  // Get initial Home.tsx content from nested structure
  const getInitialContent = () => {
    const src = initialDemoProjectFiles[0];
    const pages = src?.children?.find(c => c.name === 'pages');
    const home = pages?.children?.find(c => c.name === 'Home.tsx');
    return home?.content || '';
  };
  
  const [selectedFile, setSelectedFile] = useState<string | null>(
    useRawHtml ? RAW_HTML_FILE : 'src/pages/Home.tsx'
  );
  const [fileContent, setFileContent] = useState<string>(
    useRawHtml ? rawHtml : getInitialContent()
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string>(
    useRawHtml ? rawHtml : ''
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'grey'>('dark');

  useEffect(() => {
    if (useRawHtml) {
      setSelectedFile(RAW_HTML_FILE);
      setFileContent(rawHtml);
      setEditedContent(rawHtml);
      setHasUnsavedChanges(false);
      setIsEditing(false);
    }
  }, [rawHtml, useRawHtml]);

  // Detect current theme
  useEffect(() => {
    const detectTheme = () => {
      const html = document.documentElement;
      if (html.classList.contains('grey')) {
        setCurrentTheme('grey');
      } else if (html.classList.contains('dark')) {
        setCurrentTheme('dark');
      } else {
        setCurrentTheme('light');
      }
    };

    detectTheme();
    
    // Observe class changes on html element
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  // Get the appropriate theme for syntax highlighting
  const getCodeTheme = () => {
    switch (currentTheme) {
      case 'light':
        return lightTheme;
      case 'grey':
        return greyTheme;
      default:
        return themes.vsDark;
    }
  };

  const handleSelectFile = (path: string, content: string) => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Discard them?');
      if (!confirm) return;
    }
    setSelectedFile(path);
    setFileContent(content);
    setEditedContent(content);
    setHasUnsavedChanges(false);
    setIsEditing(false);
  };

  const handleCodeEdit = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value);
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    setFileContent(editedContent);
    setHasUnsavedChanges(false);
    if (selectedFile && onCodeChange) {
      onCodeChange(selectedFile, editedContent);
    }
    toast.success('Changes saved! Preview updated.');
  }, [editedContent, selectedFile, onCodeChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  return (
    <div className={`flex h-full ${className}`}>
      {/* File Tree */}
      <div className="w-56 border-r border-border flex flex-col bg-card/50">
        <div className="p-3 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Files</h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {(useRawHtml ? rawHtmlFileTree : initialDemoProjectFiles).map((node, i) => (
              <FileTreeItem
                key={i}
                node={node}
                depth={0}
                selectedFile={selectedFile}
                onSelectFile={handleSelectFile}
                path=""
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Code Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Bar */}
        {selectedFile && (
          <div className="h-10 border-b border-border flex items-center justify-between px-2 bg-card/50">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-t text-sm text-foreground">
              <File className="w-3.5 h-3.5 text-blue-400" />
              {selectedFile.split('/').pop()}
              {hasUnsavedChanges && <span className="text-amber-400 ml-1">●</span>}
            </div>
            <div className="flex items-center gap-2">
              {!useRawHtml && (
              <>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  isEditing ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {isEditing ? 'View Mode' : 'Edit Mode'}
              </button>
              {hasUnsavedChanges && (
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1 px-3 py-1 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  <Save className="w-3 h-3" />
                  Save
                </button>
              )}
              </>
              )}
            </div>
          </div>
        )}

        {/* Code Editor / Viewer */}
        <div className="flex-1 overflow-hidden bg-background relative">
          {isEditing ? (
            <div className="relative h-full">
              {/* Syntax highlighted background */}
              <div className="absolute inset-0 overflow-auto pointer-events-none">
                <Highlight
                  theme={getCodeTheme()}
                  code={editedContent || fileContent}
                  language={useRawHtml ? 'html' : 'tsx'}
                >
                  {({ style, tokens, getLineProps, getTokenProps }) => (
                    <pre
                      className="p-4 text-sm font-mono leading-relaxed min-h-full"
                      style={{ ...style, background: 'transparent' }}
                    >
                      {tokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line })} className="flex">
                          <span className="w-10 text-right pr-4 text-muted-foreground/60 select-none text-xs">
                            {i + 1}
                          </span>
                          <span>
                            {line.map((token, key) => (
                              <span key={key} {...getTokenProps({ token })} />
                            ))}
                          </span>
                        </div>
                      ))}
                    </pre>
                  )}
                </Highlight>
              </div>
              {/* Transparent textarea for editing */}
              <textarea
                value={editedContent || fileContent}
                onChange={handleCodeEdit}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                className="absolute inset-0 w-full h-full p-4 pl-14 font-mono text-sm bg-transparent text-transparent caret-foreground resize-none outline-none leading-relaxed overflow-auto"
                style={{ tabSize: 2, caretColor: 'hsl(var(--foreground))' }}
              />
            </div>
          ) : (
            <ScrollArea className="h-full">
              {fileContent ? (
                <Highlight
                  theme={getCodeTheme()}
                  code={fileContent}
                  language={useRawHtml ? 'html' : 'tsx'}
                >
                  {({ style, tokens, getLineProps, getTokenProps }) => (
                    <pre
                      className="p-4 text-sm font-mono leading-relaxed overflow-x-auto"
                      style={{ ...style, background: 'transparent' }}
                    >
                      {tokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line })} className="flex">
                          <span className="w-10 text-right pr-4 text-muted-foreground/60 select-none text-xs">
                            {i + 1}
                          </span>
                          <span>
                            {line.map((token, key) => (
                              <span key={key} {...getTokenProps({ token })} />
                            ))}
                          </span>
                        </div>
                      ))}
                    </pre>
                  )}
                </Highlight>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Select a file to view its contents
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeViewer;