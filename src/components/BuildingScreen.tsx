import { useState, useEffect } from 'react';
import { History } from 'lucide-react';
import logo from '@/assets/runtime42-logo.png';

const tips = [
  { icon: History, text: 'Restore any previous version with Version History' },
  { icon: History, text: 'Use keyboard shortcuts for faster navigation' },
  { icon: History, text: 'Preview your app on different device sizes' },
  { icon: History, text: 'Edit code directly in the Code tab' },
];

interface BuildingScreenProps {
  message?: string;
  progress?: number;
}

const BuildingScreen = ({ message = 'Building your idea..', progress }: BuildingScreenProps) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [currentTip, setCurrentTip] = useState(0);
  const displayedProgress = Math.max(0, Math.min(100, progress ?? animatedProgress));

  useEffect(() => {
    if (progress !== undefined) return;

    // Animate progress bar
    const progressInterval = setInterval(() => {
      setAnimatedProgress(prev => {
        if (prev >= 85) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);

    // Rotate tips
    const tipInterval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
    }, 4000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(tipInterval);
    };
  }, [progress]);

  useEffect(() => {
    if (progress === undefined) return;
    const tipInterval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
    }, 4000);

    return () => clearInterval(tipInterval);
  }, [progress]);

  const CurrentTipIcon = tips[currentTip].icon;

  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative overflow-hidden bg-background">
      {/* Background gradient - uses semantic tokens */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-muted/50" />
      
      {/* Subtle radial glow using primary color */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_50%_80%,hsl(var(--primary)/0.3)_0%,transparent_60%)]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with ring - themed */}
        <div className="relative mb-10">
          <div className="w-24 h-24 rounded-full bg-gradient-to-b from-muted to-muted/80 flex items-center justify-center shadow-lg ring-8 ring-muted/50 dark:ring-muted/30">
            <img 
              src={logo} 
              alt="runtime42" 
              className="w-14 h-14 object-contain"
            />
          </div>
          {/* Subtle pulse animation */}
          <div className="absolute inset-0 w-24 h-24 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
        </div>

        {/* Message */}
        <h2 className="text-2xl font-semibold text-foreground mb-8 tracking-tight">
          {message}
        </h2>

        {/* Progress bar - themed */}
        <div className="w-64 h-1 bg-muted rounded-full overflow-hidden mb-16">
          <div 
            className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${displayedProgress}%` }}
          />
        </div>

        {/* Did you know section */}
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <span className="text-sm font-medium">Did you know?</span>
          <div className="flex items-center gap-2 transition-opacity duration-300">
            <CurrentTipIcon className="w-4 h-4" />
            <span className="text-sm">{tips[currentTip].text}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildingScreen;