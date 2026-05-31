import { useState } from 'react';
import { Plus, Paperclip, Palette, MessageSquare, AudioLines, ArrowUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const HeroSection = () => {
  const [inputValue, setInputValue] = useState('');
  const { isAuthenticated, isLoading } = useAuth();

  const handleSubmit = () => {
    if (inputValue.trim()) {
      console.log('User input:', inputValue);
      // Handle the submission - could redirect to demo or show a response
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden flex flex-col bg-background">
      {/* Soft orange gradient glow from left side */}
      <div 
        className="absolute top-0 left-0 w-[70%] h-full pointer-events-none"
        style={{ 
          background: 'radial-gradient(ellipse at 0% 50%, rgba(249,115,22,0.35) 0%, rgba(251,146,60,0.2) 25%, rgba(234,88,12,0.1) 45%, transparent 70%)'
        }}
      />
      {/* Secondary softer glow */}
      <div 
        className="absolute top-0 left-0 w-[50%] h-full pointer-events-none"
        style={{ 
          background: 'radial-gradient(ellipse at 0% 50%, rgba(251,191,36,0.2) 0%, rgba(249,115,22,0.1) 30%, transparent 60%)'
        }}
      />
      {/* Inner warm glow */}
      <div 
        className="absolute top-1/4 left-0 w-[40%] h-1/2 pointer-events-none blur-3xl"
        style={{ 
          background: 'radial-gradient(ellipse at 0% 50%, rgba(251,146,60,0.25) 0%, transparent 70%)'
        }}
      />

      {/* Content */}
      <div className="container mx-auto px-6 relative z-10 flex-1 flex flex-col justify-center items-center pt-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]">
            Vibe coding, done<br />the right way.
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Design, generate, and ship scalable web apps using AI — with real system design, not broken code.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <a
              href="#demo"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 bg-white/5 backdrop-blur-sm text-foreground font-medium rounded-full hover:bg-white/10 transition-all"
            >
              Request a demo
            </a>
            {!isLoading && isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-full hover:bg-foreground/90 transition-all"
              >
                Dashboard
              </Link>
            ) : (
              <a
                href="#start"
                className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-background font-medium rounded-full hover:bg-foreground/90 transition-all"
              >
                Sign up for free
              </a>
            )}
          </div>
        </div>

        {/* Hero Chat Input Box */}
        <div className="relative max-w-3xl w-full mx-auto z-20">
          {/* Glassmorphic outer glow */}
          <div className="absolute -inset-1 rounded-[22px] bg-gradient-to-b from-white/10 to-transparent blur-sm pointer-events-none" />
          
          {/* Main chat input card */}
          <div className="relative bg-card/90 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-border">
            {/* Input area */}
            <div className="px-5 py-4">
              <div className="flex items-start gap-3">
              <div className="flex-1">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask runtime42 to build a SaaS dashboard with auth, APIs, and a scalable backend..."
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 outline-none w-full caret-primary"
                    style={{ caretColor: 'hsl(25, 95%, 55%)' }}
                  />
                </div>
                {/* Status indicator */}
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg shadow-green-500/30 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>
            </div>
            
            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
                <button className="h-8 px-3 rounded-lg bg-muted/50 hover:bg-muted flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
                  <Paperclip className="w-4 h-4" />
                  <span>Attach</span>
                </button>
                <button className="h-8 px-3 rounded-lg bg-muted/50 hover:bg-muted flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
                  <Palette className="w-4 h-4" />
                  <span>Theme</span>
                  <span className="text-[10px] opacity-50">▼</span>
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button className="h-8 px-3 rounded-lg bg-muted/50 hover:bg-muted flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat</span>
                </button>
                <button className="w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <AudioLines className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleSubmit}
                  className="w-8 h-8 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center text-foreground transition-colors"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;