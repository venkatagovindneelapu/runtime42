import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Plus, MessageSquare, AudioLines, ArrowUp, ChevronDown,
  Globe, Code, BarChart3, Share2,
  History, Smartphone, Tablet, Monitor, RefreshCcw, ExternalLink, Check,
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
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import logo from '@/assets/runtime42-logo.png';
import {
  getProject,
  getMessages,
  sendMessage,
  generateProjectStream,
  type ChatMessage,
  type GenerationSummary,
  type PipelineCheckpoint,
  type CheckpointStatus,
} from '@/lib/api';
import { logCheckpoint } from '@/lib/pipelineLog';
import { BASE_NEXT_SCAFFOLD } from '@/lib/baseScaffold';
import { useWebContainer, type WebContainerFiles } from '@/hooks/useWebContainer';
import FileSearch from '@/components/FileSearch';
import FileTree from '@/components/editor/FileTree';
import TerminalPanel from '@/components/editor/TerminalPanel';
import CodeTypingEditor from '@/components/editor/CodeTypingEditor';
import ThinkingInstruction from '@/components/editor/ThinkingInstruction';
import StreamingAssistantResponse from '@/components/editor/StreamingAssistantResponse';
import SuggestionsList from '@/components/editor/SuggestionsList';
import FileDiffViewer from '@/components/editor/FileDiffViewer';
import BuildingScreen from '@/components/BuildingScreen';
import { sandboxErrorsToSuggestions } from '@/lib/sandboxErrors';
import type { FileChange } from '@/components/editor/EditedFilesList';
import { toast } from 'sonner';

type DeviceType = 'mobile' | 'tablet' | 'desktop';
type TabType = 'preview' | 'code' | 'analytics';

type PipelineStep = {
  agent: number;
  label: string;
  status: CheckpointStatus;
  detail?: string;
};

function upsertPipelineStep(
  prev: PipelineStep[],
  event: PipelineCheckpoint
): PipelineStep[] {
  if (!event.agent) return prev;
  const next = prev.map((s) =>
    event.status === 'active' && s.agent !== event.agent && s.status === 'active'
      ? { ...s, status: 'done' as CheckpointStatus }
      : s
  );
  const row: PipelineStep = {
    agent: event.agent,
    label: event.label,
    status: (event.status ?? 'active') as CheckpointStatus,
    detail: event.detail,
  };
  const idx = next.findIndex((s) => s.agent === event.agent);
  if (idx >= 0) next[idx] = row;
  else next.push(row);
  return next;
}

function sortFilePaths(paths: string[]) {
  const order = (p: string) => {
    if (p === 'package.json') return 0;
    if (p.endsWith('.config.js') || p.endsWith('.json')) return 1;
    if (p.startsWith('app/')) return 2;
    if (p.startsWith('components/')) return 3;
    return 4;
  };
  return [...paths].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
}

function computeGenerationProgress(steps: PipelineStep[]) {
  if (steps.length === 0) return 8;
  const maxAgent = Math.max(6, ...steps.map((step) => step.agent));
  const score = steps.reduce((sum, step) => {
    if (step.status === 'done') return sum + 1;
    if (step.status === 'active') return sum + 0.55;
    return sum;
  }, 0);
  return Math.min(62, 8 + (score / maxAgent) * 54);
}

function parseMetadata<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

type ChatTurn = {
  user: ChatMessage;
  summary?: ChatMessage;
  error?: ChatMessage;
};

type LivePhase = 'thinking' | 'done' | 'streaming';

function groupChatTurns(messages: ChatMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      turns.push({ user: msg });
      continue;
    }
    const current = turns[turns.length - 1];
    if (!current) continue;
    if (msg.messageType === 'summary') current.summary = msg;
    else if (msg.messageType === 'error') current.error = msg;
  }
  return turns;
}

function computeFileChanges(
  before: WebContainerFiles,
  after: WebContainerFiles
): FileChange[] {
  const paths = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: FileChange[] = [];
  for (const path of paths) {
    const prev = before[path];
    const next = after[path];
    if (prev !== next) {
      changes.push({ path, before: prev ?? '', after: next ?? '' });
    }
  }
  return changes.sort((a, b) => a.path.localeCompare(b.path));
}

function UserQuestion({ text }: { text: string }) {
  return (
    <p
      className="text-sm text-primary-foreground px-4 py-3 rounded-2xl leading-relaxed"
      style={{ background: 'var(--gradient-orange)' }}
    >
      {text}
    </p>
  );
}

const ProjectEditor = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [livePhase, setLivePhase] = useState<LivePhase | null>(null);
  const [liveSummary, setLiveSummary] = useState<GenerationSummary | null>(null);
  const [writingFilePath, setWritingFilePath] = useState<string | null>(null);
  const [animatingCode, setAnimatingCode] = useState(false);
  const [projectName, setProjectName] = useState('New Project');
  const [previewRoute, setPreviewRoute] = useState('/');
  const [activeDevice, setActiveDevice] = useState<DeviceType>('desktop');
  const [activeTab, setActiveTab] = useState<TabType>('preview');
  const [previewKey, setPreviewKey] = useState(0);
  const [isFileSearchOpen, setIsFileSearchOpen] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<WebContainerFiles>({});
  const [selectedCodeFile, setSelectedCodeFile] = useState('app/page.tsx');
  const [diffView, setDiffView] = useState<FileChange | null>(null);
  const [liveFileChanges, setLiveFileChanges] = useState<FileChange[]>([]);
  const [turnFileChanges, setTurnFileChanges] = useState<Record<string, FileChange[]>>({});
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const autoStartedProjectIdRef = useRef<string | null>(null);
  const webContainerRunningRef = useRef(false);
  const filesBeforeGenerationRef = useRef<WebContainerFiles>({});
  const lastGeneratedFilesRef = useRef<WebContainerFiles>({});
  const prevProjectIdRef = useRef<string | undefined>(undefined);
  const webContainer = useWebContainer();

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

  useEffect(() => {
    if (previewContainerRef.current) {
      previewContainerRef.current.scrollTop = 0;
    }
  }, [previewRoute]);

  const deviceSizes = {
    mobile: 'max-w-sm w-full',
    tablet: 'max-w-2xl w-full',
    desktop: 'w-full'
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

  const handleFileSelect = useCallback((path: string) => {
    setActiveTab('code');
    toast.success(`Opening ${path.split('/').pop()}`);
  }, []);

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
    data: project,
    isError: isProjectError,
    refetch: refetchProject,
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });

  const {
    data: chatMessages = [],
    isFetched: messagesFetched,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['messages', projectId],
    queryFn: () => getMessages(projectId!),
    enabled: !!projectId,
  });

  const projectFiles = useMemo<WebContainerFiles>(() => {
    if (!project?.files) return {};
    try {
      const parsed = JSON.parse(project.files);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }, [project?.files]);

  const workspaceFiles = useMemo(
    () => ({ ...projectFiles, ...generatedFiles }),
    [projectFiles, generatedFiles]
  );

  const filePaths = useMemo(() => Object.keys(workspaceFiles).sort(), [workspaceFiles]);
  const selectedFileContent = workspaceFiles[selectedCodeFile] ?? '';

  useEffect(() => {
    if (Object.keys(projectFiles).length === 0) return;
    setGeneratedFiles((prev) =>
      Object.keys(prev).length === 0 ? projectFiles : { ...projectFiles, ...prev }
    );
    lastGeneratedFilesRef.current = { ...projectFiles, ...lastGeneratedFilesRef.current };
  }, [projectFiles]);

  const getLanguage = (path: string) => {
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'tsx';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'jsx';
    return 'tsx';
  };

  const pendingPreviewRef = useRef(false);

  const activePipelineLabel = pipelineSteps.find((s) => s.status === 'active')?.label;

  const statusMessage = (() => {
    if (isGenerating && activePipelineLabel) return activePipelineLabel;
    switch (webContainer.status) {
      case 'booting':
        return 'Starting sandbox environment...';
      case 'installing':
        return 'Installing packages... this takes ~30s';
      case 'starting':
        return 'Starting Next.js dev server...';
      case 'error':
        return webContainer.error || 'Preview failed to start';
      case 'ready':
        return webContainer.terminal.split('\n').filter(Boolean).slice(-1)[0] || '';
      default:
        return '';
    }
  })();

  const previewProgress = useMemo(() => {
    if (webContainer.previewUrl) return 100;
    if (webContainer.status === 'starting') return 92;
    if (webContainer.status === 'installing') return 78;
    if (webContainer.status === 'booting') return 68;
    if (livePhase === 'done') return 64;
    if (isGenerating) return computeGenerationProgress(pipelineSteps);
    return 10;
  }, [isGenerating, livePhase, pipelineSteps, webContainer.previewUrl, webContainer.status]);

  const showPreviewLoader = !webContainer.previewUrl && webContainer.status !== 'error' && !webContainer.error;

  useEffect(() => {
    if (
      pendingPreviewRef.current &&
      webContainer.status === 'ready' &&
      webContainer.previewUrl
    ) {
      setActiveTab('preview');
      pendingPreviewRef.current = false;
    }
  }, [webContainer.status, webContainer.previewUrl]);

  const sandboxBootstrappedRef = useRef(false);

  const bootWithFiles = useCallback(async (files: WebContainerFiles, changedOnly?: WebContainerFiles) => {
    if (!sandboxBootstrappedRef.current) {
      try {
        await webContainer.initializeSandbox(files);
        sandboxBootstrappedRef.current = true;
        webContainerRunningRef.current = true;
        pendingPreviewRef.current = true;
        setGeneratedFiles((prev) => ({ ...files, ...prev }));
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to boot preview');
      }
      return;
    }

    const delta = changedOnly ?? files;
    if (Object.keys(delta).length === 0) return;
    const patched = await webContainer.writeFileDeltas(delta);
    setGeneratedFiles((prev) => ({ ...prev, ...patched }));
  }, [webContainer]);

  const resolveFileContent = useCallback(
    (path: string, change?: FileChange) => {
      const fromChange = change?.after?.trim();
      if (fromChange) return fromChange;
      return (
        generatedFiles[path] ??
        projectFiles[path] ??
        lastGeneratedFilesRef.current[path] ??
        ''
      );
    },
    [generatedFiles, projectFiles]
  );

  const openFileFromChat = useCallback(
    async (change: FileChange) => {
      let after = resolveFileContent(change.path, change);
      let before = change.before ?? '';

      if (!after && projectId) {
        try {
          const fresh = await queryClient.fetchQuery({
            queryKey: ['project', projectId],
            queryFn: () => getProject(projectId),
          });
          if (fresh.files) {
            const parsed = JSON.parse(fresh.files) as WebContainerFiles;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              after = parsed[change.path] ?? '';
              setGeneratedFiles((prev) => ({ ...parsed, ...prev }));
              lastGeneratedFilesRef.current = { ...parsed, ...lastGeneratedFilesRef.current };
            }
          }
        } catch {
          // keep empty
        }
      }

      setGeneratedFiles((prev) => {
        const next = { ...projectFiles, ...lastGeneratedFilesRef.current, ...prev };
        if (after) next[change.path] = after;
        return next;
      });

      setSelectedCodeFile(change.path);
      setActiveTab('code');

      const showDiff = Boolean(before.trim() && after && before !== after);
      if (showDiff) {
        setDiffView({ path: change.path, before, after });
      } else {
        setDiffView(null);
      }
    },
    [projectFiles, projectId, queryClient, resolveFileContent]
  );

  useEffect(() => {
    if (!projectId) return;
    if (prevProjectIdRef.current === projectId) return;
    prevProjectIdRef.current = projectId;
    webContainer.prepareNewProject();
    webContainerRunningRef.current = false;
    sandboxBootstrappedRef.current = false;
    autoStartedProjectIdRef.current = null;
    setDiffView(null);
  }, [projectId, webContainer]);

  useEffect(() => {
    if (project?.title) setProjectName(project.title);
    if (project?.chatTitle) setProjectName(project.chatTitle);
  }, [project?.title, project?.chatTitle]);

  const applyLiveFileDelta = useCallback(
    async (path: string, content: string) => {
      setGeneratedFiles((prev) => ({ ...prev, [path]: content }));
      setSelectedCodeFile(path);
      setWritingFilePath(path);

      if (!sandboxBootstrappedRef.current) {
        try {
          await webContainer.initializeSandbox(BASE_NEXT_SCAFFOLD);
          sandboxBootstrappedRef.current = true;
          webContainerRunningRef.current = true;
          pendingPreviewRef.current = true;
        } catch {
          // bootstrap will retry on complete
        }
      }

      if (sandboxBootstrappedRef.current) {
        webContainer.writeFileDeltas({ [path]: content }).catch(() => {
          // non-fatal — complete event will sync
        });
      }
    },
    [webContainer]
  );

  const applyGenerationResult = useCallback(
    async (files: WebContainerFiles) => {
      const before = filesBeforeGenerationRef.current;
      const changedOnly: WebContainerFiles = {};
      for (const [path, content] of Object.entries(files)) {
        if (before[path] !== content) changedOnly[path] = content;
      }

      if (Object.keys(changedOnly).length > 0) {
        const firstPath = sortFilePaths(Object.keys(changedOnly))[0];
        if (firstPath) setSelectedCodeFile(firstPath);
        await bootWithFiles(files, changedOnly);
      } else if (!sandboxBootstrappedRef.current) {
        await bootWithFiles(files);
      }

      pendingPreviewRef.current = true;
      setWritingFilePath(null);
    },
    [bootWithFiles]
  );

  const finishLiveTurn = useCallback(() => {
    setLivePhase(null);
    setLiveSummary(null);
    setActivePrompt(null);
    setPipelineSteps([]);
  }, []);

  const finishStreamingResponse = useCallback(() => {
    for (const turn of groupChatTurns(chatMessages)) {
      if (
        activePrompt &&
        turn.user.content === activePrompt &&
        turn.summary &&
        liveFileChanges.length > 0
      ) {
        setTurnFileChanges((tc) => ({
          ...tc,
          [turn.summary!.id]: liveFileChanges,
        }));
        break;
      }
    }
    finishLiveTurn();
  }, [activePrompt, chatMessages, finishLiveTurn, liveFileChanges]);

  const runGeneration = useCallback(async (prompt: string, errors?: string[]) => {
    if (!projectId) return;

    setActivePrompt(prompt);
    setLivePhase('thinking');
    setLiveSummary(null);
    setLiveFileChanges([]);
    filesBeforeGenerationRef.current = { ...generatedFiles };
    setIsGenerating(true);
    setActiveTab('preview');
    setPipelineSteps([]);

    // Bootstrap fixed scaffold immediately so install + dev start while AI writes
    if (!sandboxBootstrappedRef.current) {
      webContainer.initializeSandbox(BASE_NEXT_SCAFFOLD).then(() => {
        sandboxBootstrappedRef.current = true;
        webContainerRunningRef.current = true;
        pendingPreviewRef.current = true;
      }).catch(() => {
        // will retry during file deltas / complete
      });
    }

    const handleStreamEvent = (event: PipelineCheckpoint) => {
      logCheckpoint(event);
      if (event.type === 'checkpoint') {
        setPipelineSteps((prev) => upsertPipelineStep(prev, event));
      }
      if (event.type === 'files_delta' && event.files) {
        for (const [path, content] of Object.entries(event.files)) {
          void applyLiveFileDelta(path, content);
          setLiveFileChanges((prev) => {
            const idx = prev.findIndex((c) => c.path === path);
            const entry = {
              path,
              before: filesBeforeGenerationRef.current[path] ?? '',
              after: content,
            };
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = entry;
              return next;
            }
            return [...prev, entry];
          });
        }
      }
    };

    try {
      let response;
      try {
        response = await generateProjectStream(
          projectId,
          prompt,
          handleStreamEvent,
          errors
        );
      } catch {
        response = await sendMessage(projectId, prompt, errors);
      }

      const changes = computeFileChanges(filesBeforeGenerationRef.current, response.files);
      lastGeneratedFilesRef.current = response.files;
      setGeneratedFiles((prev) => ({ ...prev, ...response.files }));
      setLiveFileChanges(changes);
      setLivePhase('done');
      await applyGenerationResult(response.files);
      setLiveSummary(response.summary);
      await refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setPipelineSteps([]);
      window.setTimeout(() => setLivePhase('streaming'), 500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate app';
      toast.error(errorMessage);
      await refetchMessages();

      if (!errors?.length && webContainerRunningRef.current) {
        const errorLines = webContainer.getErrorLines();
        if (errorLines.length > 0) {
          toast.message('Fixing build errors');
          try {
            const fixResponse = await generateProjectStream(
              projectId,
              prompt,
              handleStreamEvent,
              errorLines
            );
            const fixChanges = computeFileChanges(filesBeforeGenerationRef.current, fixResponse.files);
            lastGeneratedFilesRef.current = fixResponse.files;
            setGeneratedFiles((prev) => ({ ...prev, ...fixResponse.files }));
            setLiveFileChanges(fixChanges);
            setLivePhase('done');
            await applyGenerationResult(fixResponse.files);
            setLiveSummary(fixResponse.summary);
            await refetchMessages();
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            setPipelineSteps([]);
            window.setTimeout(() => setLivePhase('streaming'), 500);
          } catch {
            finishLiveTurn();
          }
        } else {
          finishLiveTurn();
        }
      } else {
        finishLiveTurn();
      }
    } finally {
      setIsGenerating(false);
    }
  }, [
    applyGenerationResult,
    applyLiveFileDelta,
    finishLiveTurn,
    projectId,
    queryClient,
    refetchMessages,
    webContainer,
  ]);

  useEffect(() => {
    if (!project || !projectId || !messagesFetched) return;
    if (autoStartedProjectIdRef.current === projectId) return;

    autoStartedProjectIdRef.current = projectId;

    if (Object.keys(projectFiles).length > 0) {
      setGeneratedFiles(projectFiles);
      setActiveTab('preview');
      pendingPreviewRef.current = true;
      bootWithFiles(projectFiles).catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to boot preview');
      });
      return;
    }

    if (chatMessages.length === 0) {
      setActivePrompt(project.prompt);
      runGeneration(project.prompt);
    }
  }, [bootWithFiles, chatMessages, messagesFetched, project, projectFiles, projectId, runGeneration]);

  const handleSubmit = (overrideMessage?: string, fixSandboxErrors?: boolean) => {
    const nextMessage = (overrideMessage ?? inputValue).trim();
    if (!nextMessage || isGenerating) return;
    setInputValue('');
    const errorLines =
      fixSandboxErrors && webContainer.sandboxErrors.length > 0
        ? webContainer.getErrorLines()
        : undefined;
    runGeneration(nextMessage, errorLines);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const chatTurns = useMemo(() => groupChatTurns(chatMessages), [chatMessages]);

  const previewErrorSuggestions = useMemo(
    () => sandboxErrorsToSuggestions(webContainer.sandboxErrors),
    [webContainer.sandboxErrors]
  );

  const showLiveTurn = Boolean(
    activePrompt && (isGenerating || livePhase === 'done' || livePhase === 'streaming')
  );

  const historicTurns = useMemo(() => {
    if (!showLiveTurn || !activePrompt) return chatTurns;
    const last = chatTurns[chatTurns.length - 1];
    if (last?.user.content === activePrompt) return chatTurns.slice(0, -1);
    return chatTurns;
  }, [activePrompt, chatTurns, showLiveTurn]);

  const activeThinkingLabel = useMemo(() => {
    const active = pipelineSteps.find((s) => s.status === 'active');
    if (active) return active.label;
    const lastDone = [...pipelineSteps].reverse().find((s) => s.status === 'done');
    return lastDone?.label ?? null;
  }, [pipelineSteps]);

  const renderCompletedTurn = (turn: ChatTurn) => {
    const summary = turn.summary
      ? parseMetadata<GenerationSummary>(turn.summary.metadata)
      : null;

    return (
      <div key={turn.user.id} className="space-y-3">
        <UserQuestion text={turn.user.content} />
        {turn.error && (
          <p className="text-sm text-destructive pl-1">{turn.error.content}</p>
        )}
        {summary && turn.summary && (
          <StreamingAssistantResponse
            summary={summary}
            fileChanges={
              turnFileChanges[turn.summary.id] ??
              summary.filesSummary?.map((f) => ({
                path: f.file,
                before: '',
                after: workspaceFiles[f.file] ?? '',
              })) ??
              []
            }
            animate={false}
            onSuggestion={(text) => handleSubmit(text)}
            onSelectFile={openFileFromChat}
          />
        )}
        {!summary && turn.summary && (
          <p className="text-sm text-muted-foreground pl-1">{turn.summary.content}</p>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <FileSearch 
        isOpen={isFileSearchOpen} 
        onClose={() => setIsFileSearchOpen(false)}
        onSelectFile={handleFileSelect}
      />

      <header className="h-14 flex items-center px-4 bg-card flex-shrink-0">
        <div className="flex items-center gap-3 w-[30%]">
          <img src={logo} alt="runtime42" className="w-7 h-7 rounded-lg" />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 px-2 py-1.5 rounded-lg transition-colors outline-none">
              <span className="font-semibold text-foreground truncate max-w-[180px]">{projectName}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 bg-popover border border-border z-50 p-2">
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer py-2.5"
                onClick={() => navigate('/dashboard')}
              >
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
              </div>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem className="flex items-center gap-2 cursor-pointer py-2.5 text-primary">
                <Gift className="w-4 h-4" />
                <span>Get free credits</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          <button type="button" className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <History className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex items-center pl-3">
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
          </div>
          
          <div className="flex-1 flex justify-center">
            <div className="flex items-center bg-muted rounded-full px-1">
              <button 
                onClick={cycleDevice}
                className="flex items-center gap-2 px-3 py-2 hover:bg-muted-foreground/10 rounded-lg transition-colors"
              >
                <DeviceIcon className="w-4 h-4 text-muted-foreground" />
              </button>
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
                      {previewRoute === route.path && <Check className="w-4 h-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <button 
                type="button"
                onClick={() => {
                  setPreviewKey(prev => prev + 1);
                  refetchProject();
                }}
                className="p-2 hover:bg-muted-foreground/10 rounded-lg transition-colors"
              >
                <RefreshCcw className="w-4 h-4 text-muted-foreground" />
              </button>
              <button type="button" className="p-2 hover:bg-muted-foreground/10 rounded-lg transition-colors">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setIsFileSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground bg-muted/50 rounded-full border border-border/50"
          >
            <span>Search</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded">⌘P</kbd>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" className="flex items-center gap-2 px-4 py-2 font-medium text-foreground hover:bg-muted/50 rounded-full">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button 
            type="button"
            className="px-6 py-2 text-white font-medium rounded-full hover:opacity-90"
            style={{ background: 'var(--gradient-orange)' }}
          >
            Publish
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden p-3 gap-3 bg-muted/30">
        <div className="w-[30%] flex flex-col bg-card rounded-3xl overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {historicTurns.length === 0 && !showLiveTurn && (
              <div className="text-center text-muted-foreground text-sm py-8">
                Start a conversation to build your app
              </div>
            )}

            {historicTurns.map(renderCompletedTurn)}

            {showLiveTurn && activePrompt && (
              <div className="space-y-3">
                <UserQuestion text={activePrompt} />
                {(isGenerating || livePhase === 'thinking' || livePhase === 'done') && (
                  <ThinkingInstruction
                    label={activeThinkingLabel}
                    phase={livePhase === 'done' ? 'done' : 'thinking'}
                  />
                )}
                {livePhase === 'streaming' && liveSummary && (
                  <StreamingAssistantResponse
                    key={activePrompt ?? 'live'}
                    summary={liveSummary}
                    fileChanges={liveFileChanges}
                    animate
                    onAnimationComplete={finishStreamingResponse}
                    onSuggestion={(text) => handleSubmit(text, previewErrorSuggestions.length > 0)}
                    onSelectFile={openFileFromChat}
                    errorSuggestions={previewErrorSuggestions}
                  />
                )}
              </div>
            )}
          </div>

          {previewErrorSuggestions.length > 0 && !isGenerating && (
            <div className="px-4 pb-2">
              <SuggestionsList
                title="Preview errors"
                variant="error"
                suggestions={previewErrorSuggestions}
                onSelect={(text) =>
                  handleSubmit(
                    `${text} Use exact WebContainer dependency versions (Next 14.2.29, shadcn/radix pins).`,
                    true
                  )
                }
              />
            </div>
          )}

          <div className="p-4">
            <div className="relative bg-muted/80 border border-border/50 rounded-2xl overflow-hidden">
              <div className="p-4 pb-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask runtime42..."
                  disabled={isGenerating}
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-60"
                />
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <button type="button" className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
                  <Plus className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  <button type="button" className="h-8 px-3 rounded-full hover:bg-muted flex items-center gap-2 text-muted-foreground text-sm">
                    <MessageSquare className="w-4 h-4" />
                    Chat
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={isGenerating || !inputValue.trim()}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'var(--gradient-orange)' }}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-card rounded-3xl overflow-hidden">
          <div className="flex-1 overflow-hidden bg-background rounded-3xl">
            {activeTab === 'preview' && (
              <div className="h-full flex flex-col">
                {!projectId ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Invalid project</div>
                ) : isProjectError ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 p-6">
                    <p className="text-destructive text-sm">Failed to load project.</p>
                    <button type="button" onClick={() => refetchProject()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">Try again</button>
                  </div>
                ) : (
                  <>
                    {(webContainer.previewUrl || webContainer.status === 'error' || webContainer.error) && (
                      <div className={`h-9 px-4 flex items-center gap-2 text-xs ${webContainer.status === 'error' || webContainer.error ? 'text-destructive' : 'text-muted-foreground'} border-b border-border/50`}>
                        {webContainer.status === 'ready' && <span className="w-2 h-2 rounded-full bg-green-500" />}
                        <span>
                          {webContainer.error ||
                            statusMessage ||
                            'Preview ready'}
                        </span>
                      </div>
                    )}
                    <div className={`flex-1 flex items-center justify-center ${activeDevice !== 'desktop' ? 'bg-muted/30 p-4' : ''} overflow-auto scrollbar-hide`}>
                      <div className={`h-full ${deviceSizes[activeDevice]} ${activeDevice !== 'desktop' ? 'border border-border rounded-3xl shadow-2xl bg-background overflow-hidden' : ''}`}>
                        <div ref={previewContainerRef} className="h-full w-full overflow-auto scrollbar-hide">
                          {webContainer.previewUrl ? (
                            <iframe
                              key={previewKey}
                              title="Preview"
                              src={webContainer.previewUrl}
                              width="100%"
                              height="100%"
                              className="w-full h-full border-0 bg-white"
                            />
                          ) : showPreviewLoader ? (
                            <BuildingScreen
                              message="Getting ready.."
                              progress={previewProgress}
                            />
                          ) : (
                            <div className="h-full flex items-center justify-center p-6">
                              <div className="w-full max-w-md space-y-3">
                                <div className="h-5 bg-muted rounded animate-pulse" />
                                <div className="h-5 bg-muted rounded animate-pulse w-5/6" />
                                <div className="h-32 bg-muted rounded animate-pulse" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'code' && (
              <div className="h-full flex flex-col">
                <div className="flex-1 flex min-h-0">
                  <div className="w-56 border-r border-border bg-card/50 overflow-y-auto shrink-0">
                    <div className="p-3 border-b border-border">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Explorer</h3>
                    </div>
                    <FileTree
                      paths={filePaths}
                      selectedPath={selectedCodeFile}
                      writingPath={writingFilePath}
                      onSelect={(path) => {
                        setDiffView(null);
                        setSelectedCodeFile(path);
                      }}
                    />
                  </div>
                  <div className="flex-1 overflow-auto bg-background min-w-0 flex flex-col min-h-0">
                    {diffView &&
                    diffView.path === selectedCodeFile &&
                    diffView.before.trim() &&
                    selectedFileContent ? (
                      <FileDiffViewer
                        path={diffView.path}
                        before={diffView.before}
                        after={diffView.after || selectedFileContent}
                      />
                    ) : selectedFileContent ? (
                      <CodeTypingEditor
                        code={selectedFileContent}
                        language={getLanguage(selectedCodeFile)}
                        isAnimating={animatingCode && selectedCodeFile === writingFilePath}
                      />
                    ) : selectedCodeFile ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
                        Could not load <span className="font-mono text-foreground">{selectedCodeFile}</span>.
                        Regenerate or refresh the project.
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        No files yet
                      </div>
                    )}
                  </div>
                </div>
                <div className="h-[240px] shrink-0">
                  <TerminalPanel
                    output={webContainer.terminal}
                    status={webContainer.status}
                    error={webContainer.error}
                    sandboxErrors={webContainer.sandboxErrors}
                  />
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Analytics Coming Soon</h3>
                  <p className="text-muted-foreground text-sm">Track your app performance, user engagement, and more.</p>
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
