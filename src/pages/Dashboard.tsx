import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Plus, AudioLines, ArrowUp, ExternalLink, Loader2, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardShell } from '@/components/DashboardShell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import {
  getProjects,
  createProject,
  deleteProject,
  updateProjectTitle,
  type Project,
} from '@/lib/api';

function truncatePrompt(prompt: string, max = 100) {
  const t = prompt.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function formatCreatedAt(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'ready':
      return 'bg-green-500/90 text-white';
    case 'failed':
      return 'bg-destructive/90 text-white';
    case 'generating':
    case 'pending':
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'failed':
      return 'Failed';
    case 'generating':
      return 'Generating';
    case 'pending':
      return 'Pending';
    default:
      return status;
  }
}

const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const titleInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const userName = user?.name || user?.email?.split('@')[0] || 'there';

  const { data: projects = [], isLoading, isError } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  });

  const createMutation = useMutation({
    mutationFn: ({ prompt, title }: { prompt: string; title: string }) =>
      createProject(prompt, title),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setInputValue('');
      navigate(`/editor/${project.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create project');
    },
  });

  const updateTitleMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      updateProjectTitle(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingProjectId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to rename project');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete project');
    },
  });

  useEffect(() => {
    if (!editingProjectId) return;
    const input = titleInputRefs.current[editingProjectId];
    input?.focus();
    input?.select();
  }, [editingProjectId]);

  const handleSubmit = () => {
    const prompt = inputValue.trim();
    if (!prompt || createMutation.isPending) return;
    createMutation.mutate({
      prompt,
      title: prompt.slice(0, 50),
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleOpenProject = (projectId: string) => {
    navigate(`/editor/${projectId}`);
  };

  const startRenaming = (project: Project) => {
    setEditingProjectId(project.id);
    setDraftTitle(project.title || 'Untitled');
  };

  const saveTitle = (project: Project) => {
    const nextTitle = draftTitle.trim();
    setEditingProjectId(null);
    if (!nextTitle || nextTitle === project.title || updateTitleMutation.isPending) return;
    updateTitleMutation.mutate({ id: project.id, title: nextTitle });
  };

  const handleDeleteProject = (project: Project) => {
    if (!window.confirm(`Delete "${project.title || 'Untitled'}"?`)) return;
    deleteMutation.mutate(project.id);
  };

  return (
    <DashboardShell>
          <section className="relative min-h-[70vh] overflow-hidden flex flex-col shrink-0">
            {/* Gradient background */}
        <div 
          className="absolute top-0 left-0 w-[70%] h-full pointer-events-none"
          style={{ 
            background: 'radial-gradient(ellipse at 0% 50%, rgba(249,115,22,0.35) 0%, rgba(251,146,60,0.2) 25%, rgba(234,88,12,0.1) 45%, transparent 70%)'
          }}
        />
        <div 
          className="absolute top-0 left-0 w-[50%] h-full pointer-events-none"
          style={{ 
            background: 'radial-gradient(ellipse at 0% 50%, rgba(251,191,36,0.2) 0%, rgba(249,115,22,0.1) 30%, transparent 60%)'
          }}
        />
        <div 
          className="absolute top-1/4 left-0 w-[40%] h-1/2 pointer-events-none blur-3xl"
          style={{ 
            background: 'radial-gradient(ellipse at 0% 50%, rgba(251,146,60,0.25) 0%, transparent 70%)'
          }}
        />

        {/* Content */}
        <div className="container mx-auto px-6 relative z-10 flex-1 flex flex-col justify-center items-center pt-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Greeting */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-4 leading-[1.1]">
              Hello, {userName}
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground mb-12">
              What are you building today?
            </p>
          </div>

          {/* Chat Input Box */}
          <div className="relative z-20 mx-auto w-full max-w-2xl">
            <div className="pointer-events-none absolute -inset-1 rounded-[2.25rem] bg-gradient-to-b from-white/10 to-transparent blur-sm" />
            
            <div className="relative min-h-28 overflow-hidden rounded-[2rem] border border-border bg-card/90 shadow-2xl shadow-black/50 backdrop-blur-xl">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to build..."
                className="h-16 w-full resize-none bg-transparent px-7 pt-6 text-base text-foreground outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
                style={{ caretColor: 'hsl(25, 95%, 55%)' }}
                disabled={createMutation.isPending}
              />

              <div className="flex items-center justify-between px-6 pb-4">
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                  aria-label="Add attachment"
                >
                  <Plus className="size-5" />
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    aria-label="Voice input"
                  >
                    <AudioLines className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!inputValue.trim() || createMutation.isPending}
                    className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
                    aria-label="Create project"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowUp className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Your Projects Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Your Projects
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Continue working on your projects or start something new.
            </p>
          </div>

          {isError && (
            <p className="text-center text-sm text-destructive mb-6">
              Failed to load projects. Please refresh the page.
            </p>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  <Skeleton className="h-48 w-full rounded-none" />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex justify-between pt-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-16 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-xl border border-dashed border-border bg-card/30">
              <p className="text-muted-foreground text-lg">
                No projects yet. Describe something above to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project: Project) => (
                <div 
                  key={project.id}
                  className="group relative bg-card rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10"
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Project actions"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => startRenaming(project)}>
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleDeleteProject(project)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/30 via-primary/10 to-muted flex items-center justify-center">
                    <span className="text-4xl font-bold text-primary/40 select-none">
                      {(project.title || 'P').charAt(0).toUpperCase()}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(project.status)}`}>
                        {statusLabel(project.status)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                      onClick={() => handleOpenProject(project.id)}
                      aria-label="Open project"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="p-5">
                    {editingProjectId === project.id ? (
                      <input
                        ref={(node) => {
                          titleInputRefs.current[project.id] = node;
                        }}
                        type="text"
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onBlur={() => saveTitle(project)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                        }}
                        disabled={updateTitleMutation.isPending}
                        className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1 bg-transparent outline-none w-full disabled:opacity-60"
                      />
                    ) : (
                      <h3
                        className={`text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1 cursor-text ${
                          updateTitleMutation.isPending && updateTitleMutation.variables?.id === project.id ? 'opacity-60' : ''
                        }`}
                        onClick={() => startRenaming(project)}
                      >
                        {project.title || 'Untitled'}
                      </h3>
                    )}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {truncatePrompt(project.prompt)}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatCreatedAt(project.createdAt)}
                      </span>
                      <button 
                        type="button"
                        onClick={() => handleOpenProject(project.id)}
                        className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
};

export default Dashboard;
