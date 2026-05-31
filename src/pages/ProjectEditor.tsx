import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, MessageSquare, AudioLines, ArrowUp, ChevronDown,
  Globe, Code, BarChart3, Lightbulb, Share2,
  History, Smartphone, Tablet, Monitor, RefreshCcw, Lock, ExternalLink, Check,
  ArrowLeft, Settings, Copy, PenLine, Star, Gift, Palette, HelpCircle, ChevronRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import logo from '@/assets/runtime42-logo.png';
import CodeViewer from '@/components/CodeViewer';
import { getProject } from '@/lib/api';
import FileSearch from '@/components/FileSearch';
import BuildingScreen from '@/components/BuildingScreen';
import { toast } from 'sonner';

interface Message {
  id: number;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';
type TabType = 'preview' | 'code' | 'analytics';

const ProjectEditor = () => {
  const { projectId } = useParams();
  const location = useLocation();
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [projectName, setProjectName] = useState('New Project');
  const [previewRoute, setPreviewRoute] = useState('/');
  const [activeDevice, setActiveDevice] = useState<DeviceType>('desktop');
  const [activeTab, setActiveTab] = useState<TabType>('preview');
  const [previewKey, setPreviewKey] = useState(0);
  const [isFileSearchOpen, setIsFileSearchOpen] = useState(false);
  
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const availableRoutes = [
    { path: '/', label: 'Home' },
    { path: '/features', label: 'Features' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/about', label: 'About' },
    { path: '/blog', label: 'Blog' },
    { path: '/contact', label: 'Contact' },
    { path: '/login', label: 'Login' },
    { path: '/signup', label: 'Sign Up' },
  ];

  const handleRouteChange = (route: string) => {
    setPreviewRoute(route);
    // Scroll to top of preview when route changes
    setTimeout(() => {
      if (previewContainerRef.current) {
        previewContainerRef.current.scrollTop = 0;
      }
    }, 10);
  };

  // Scroll to top when route changes via dropdown
  useEffect(() => {
    if (previewContainerRef.current) {
      previewContainerRef.current.scrollTop = 0;
    }
  }, [previewRoute]);

  const deviceSizes = {
    mobile: 'w-[375px]',
    tablet: 'w-[768px]',
    desktop: 'w-full'
  };

  const handleRefreshPreview = () => {
    setPreviewKey(prev => prev + 1);
  };

  const cycleDevice = () => {
    const deviceOrder: DeviceType[] = ['desktop', 'tablet', 'mobile'];
    const currentIndex = deviceOrder.indexOf(activeDevice);
    const nextIndex = (currentIndex + 1) % deviceOrder.length;
    setActiveDevice(deviceOrder[nextIndex]);
  };

  const getDeviceIcon = () => {
    switch (activeDevice) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  const DeviceIcon = getDeviceIcon();

  const handleCodeChange = useCallback((filePath: string, newCode: string) => {
    setPreviewKey(prev => prev + 1);
    console.log(`Code changed in ${filePath}:`, newCode.substring(0, 100) + '...');
  }, []);

  const handleFileSelect = useCallback((path: string) => {
    setActiveTab('code');
    toast.success(`Opening ${path.split('/').pop()}`);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setIsFileSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const {
    data: page,
    isLoading: isPageLoading,
    isError: isPageError,
    refetch: refetchPage,
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      return data.status === 'generating' || data.status === 'pending';
    },
  });

  useEffect(() => {
    if (page?.title) {
      setProjectName(page.title);
    }
  }, [page?.title]);

  useEffect(() => {
    const state = location.state as { initialPrompt?: string } | null;
    if (state?.initialPrompt) {
      const newMessage: Message = {
        id: Date.now(),
        type: 'user',
        content: state.initialPrompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([newMessage]);
      setIsThinking(true);
      
      setTimeout(() => {
        setIsThinking(false);
        setShowPreview(true);
        const aiResponse: Message = {
          id: Date.now() + 1,
          type: 'assistant',
          content: "I've created a SaaS landing page for you! The preview is now showing on the right.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, aiResponse]);
      }, 3500);
    }
  }, [location.state]);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      const newMessage: Message = {
        id: Date.now(),
        type: 'user',
        content: inputValue,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...messages, newMessage]);
      setInputValue('');
      setIsThinking(true);

      setTimeout(() => {
        setIsThinking(false);
        setShowPreview(true);
        const aiResponse: Message = {
          id: Date.now() + 1,
          type: 'assistant',
          content: "Done! I've updated the preview with your changes.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, aiResponse]);
      }, 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* File Search Modal */}
      <FileSearch 
        isOpen={isFileSearchOpen} 
        onClose={() => setIsFileSearchOpen(false)}
        onSelectFile={handleFileSelect}
      />

      {/* Top Header */}
      <header className="h-14 flex items-center px-4 bg-card flex-shrink-0">
        {/* Left - Logo & Project Name */}
        <div className="flex items-center gap-3 w-[30%]">
          <img src={logo} alt="runtime42" className="w-7 h-7 rounded-lg" />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 px-2 py-1.5 rounded-lg transition-colors outline-none">
              <span className="font-semibold text-foreground truncate max-w-[180px]">{projectName}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 bg-popover border border-border z-50 p-2">
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer py-2.5">
                <ArrowLeft className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="my-2" />
              
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1">
                runtime42 Workspace
              </DropdownMenuLabel>
              
              <div className="px-2 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Credits</span>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>185.5 left</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-[60%] bg-primary rounded-full" />
                </div>
                <span className="text-xs text-muted-foreground mt-1 block">Using monthly credits</span>
              </div>
              
              <DropdownMenuSeparator className="my-2" />
              
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer py-2.5 text-primary">
                <Gift className="w-4 h-4" />
                <span>Get free credits</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="my-2" />
              
              <DropdownMenuItem className="flex items-center justify-between cursor-pointer py-2.5">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </div>
                <kbd className="text-xs text-muted-foreground">Ctrl.</kbd>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer py-2.5">
                <Copy className="w-4 h-4" />
                <span>Remix this project</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer py-2.5">
                <PenLine className="w-4 h-4" />
                <span>Rename project</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer py-2.5">
                <Star className="w-4 h-4" />
                <span>Star project</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer py-2.5">
                <Gift className="w-4 h-4" />
                <span>Bonuses</span>
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full font-medium">New</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator className="my-2" />
              
              <DropdownMenuItem className="flex items-center justify-between cursor-pointer py-2.5">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  <span>Appearance</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </DropdownMenuItem>
              
              <DropdownMenuItem className="flex items-center justify-between cursor-pointer py-2.5">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <span>Help</span>
                </div>
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          {/* History at end of chat panel */}
          <button className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <History className="w-5 h-5" />
          </button>
        </div>

        {/* Preview area controls - aligned with preview panel start */}
        <div className="flex-1 flex items-center pl-3">
          {/* Tabs - left side */}
          <div className="flex items-center gap-0.5 bg-muted/50 rounded-full p-1">
            <button 
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${
                activeTab === 'preview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Globe className="w-4 h-4" />
              Preview
            </button>
            <button 
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-3 py-2 rounded-full font-medium transition-colors ${
                activeTab === 'code' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Code className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3 py-2 rounded-full font-medium transition-colors ${
                activeTab === 'analytics' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-full text-muted-foreground hover:text-foreground transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          {/* Address Bar - centered in preview area */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center bg-muted rounded-full px-1">
              {/* Device toggle button */}
              <button 
                onClick={cycleDevice}
                className="flex items-center gap-2 px-3 py-2 hover:bg-muted-foreground/10 rounded-lg transition-colors"
                title={`Current: ${activeDevice}. Click to switch.`}
              >
                <DeviceIcon className="w-4 h-4 text-muted-foreground transition-all duration-300" />
              </button>
              
              {/* Route dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-3 px-3 py-2 hover:bg-muted-foreground/10 rounded-lg transition-colors outline-none">
                  <span className="text-sm text-muted-foreground">{previewRoute}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="min-w-[200px] bg-popover border border-border z-50">
                  {availableRoutes.map((route) => (
                    <DropdownMenuItem 
                      key={route.path}
                      onClick={() => setPreviewRoute(route.path)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <span>{route.path}</span>
                      {previewRoute === route.path && (
                        <Check className="w-4 h-4 text-foreground" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Refresh button */}
              <button 
                type="button"
                onClick={() => refetchPage()}
                className="p-2 hover:bg-muted-foreground/10 rounded-lg transition-colors"
              >
                <RefreshCcw className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
              
              {/* External link button */}
              <button className="p-2 hover:bg-muted-foreground/10 rounded-lg transition-colors">
                <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </div>
          
          {/* Right side - Search */}
          <button
            onClick={() => setIsFileSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-muted/50 rounded-full border border-border/50 hover:border-border transition-colors"
          >
            <span>Search</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">⌘P</kbd>
          </button>
        </div>

        {/* Right - Share, Publish */}
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 font-medium text-foreground hover:bg-muted/50 rounded-full transition-colors">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button 
            className="px-6 py-2 text-white font-medium rounded-full transition-all hover:opacity-90"
            style={{ background: 'var(--gradient-orange)' }}
          >
            Publish
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3 bg-muted/30">
        {/* Left Panel - Chat */}
        <div className="w-[30%] flex flex-col bg-card rounded-3xl overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                Start a conversation to build your app
              </div>
            )}
            
            {messages.map((message) => (
              <div key={message.id} className="space-y-1">
                <div className="text-xs text-muted-foreground text-center">
                  {message.timestamp}
                </div>
                <div className={`p-4 rounded-xl ${
                  message.type === 'user' 
                    ? 'bg-muted ml-8' 
                    : 'bg-background border border-border mr-8'
                }`}>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lightbulb className="w-4 h-4" />
                <span className="text-sm">Thinking</span>
                <div className="flex gap-1">
                  <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="relative bg-muted/80 border border-border/50 rounded-2xl overflow-hidden">
              <div className="p-4 pb-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask runtime42..."
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-1">
                  <button className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button className="h-8 px-3 rounded-full hover:bg-muted flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </button>
                  <button className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <AudioLines className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleSubmit}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors hover:opacity-90"
                    style={{ background: 'var(--gradient-orange)' }}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Preview/Code/Analytics */}
        <div className="flex-1 flex flex-col bg-card rounded-3xl overflow-hidden">
          <div className="flex-1 overflow-hidden bg-background rounded-3xl">
            {activeTab === 'preview' && (
              <div className="h-full flex flex-col">
                {!projectId ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Invalid project
                  </div>
                ) : isPageError ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
                    <p className="text-destructive text-sm">Failed to load this project.</p>
                    <button
                      type="button"
                      onClick={() => refetchPage()}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                    >
                      Try again
                    </button>
                  </div>
                ) : isPageLoading || !page || page.status === 'generating' || page.status === 'pending' ? (
                  <BuildingScreen message="Generating your landing page..." />
                ) : page.status === 'failed' ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
                    <p className="text-destructive text-sm">
                      {page.errorMessage || 'Generation failed.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => refetchPage()}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <div className={`h-full flex items-center justify-center ${activeDevice !== 'desktop' ? 'bg-muted/30 p-4' : ''} overflow-auto transition-all duration-500 ease-out scrollbar-hide`}>
                    <div className={`h-full ${deviceSizes[activeDevice]} transition-all duration-500 ease-out ${activeDevice !== 'desktop' ? 'border border-border rounded-3xl shadow-2xl bg-background overflow-hidden' : ''}`}>
                      <div ref={previewContainerRef} className="h-full w-full overflow-auto scrollbar-hide">
                        <iframe
                          key={page.updatedAt}
                          title="Preview"
                          srcDoc={page.html ?? ''}
                          className="w-full h-full border-0 bg-white"
                          sandbox="allow-scripts allow-same-origin"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'code' && (
              <CodeViewer className="h-full" rawHtml={page?.html ?? ''} />
            )}

            {activeTab === 'analytics' && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Analytics Coming Soon</h3>
                  <p className="text-muted-foreground text-sm">
                    Track your app performance, user engagement, and more.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectEditor;