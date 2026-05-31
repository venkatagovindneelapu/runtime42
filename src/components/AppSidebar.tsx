import {
  Home,
  Search,
  LayoutGrid,
  Star,
  Users,
  Compass,
  FileBox,
  GraduationCap,
  Settings,
  Sun,
  Moon,
  HelpCircle,
  FileText,
  Users2,
  LogOut,
  ChevronRight,
  Check,
  PanelLeft,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTheme } from 'next-themes';
import logo from '@/assets/runtime42-logo.png';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/** 36px rail: logo, toggle, VG, and nav icons share one centered grid */
const RAIL_ROW = 'flex h-8 w-full items-center justify-center';
const RAIL_MARK = 'size-8 shrink-0 rounded-full';
const RAIL_ICON = 'size-5 shrink-0 stroke-[2.5] text-foreground';
const LOGO_WRAP = cn(RAIL_MARK, 'overflow-hidden shadow-md');
const LOGO_IMG = 'h-full w-full scale-[1.45] object-cover';
const AVATAR_MARK = cn(
  RAIL_MARK,
  'flex items-center justify-center bg-gradient-to-br from-green-400 to-emerald-600 text-[11px] font-bold leading-none text-white shadow-md',
);

const sidebarShellClass = [
  'group-data-[collapsible=icon]:!left-0 group-data-[collapsible=icon]:!top-[var(--sidebar-rail-gutter,0.5rem)] group-data-[collapsible=icon]:!bottom-[var(--sidebar-rail-gutter,0.5rem)] group-data-[collapsible=icon]:!right-auto group-data-[collapsible=icon]:!h-[calc(100svh-(var(--sidebar-rail-gutter,0.5rem)*2))]',
  'group-data-[collapsible=icon]:box-border group-data-[collapsible=icon]:!max-w-[calc(var(--sidebar-width-icon)+var(--sidebar-rail-gutter,0px))] group-data-[collapsible=icon]:!min-w-[calc(var(--sidebar-width-icon)+var(--sidebar-rail-gutter,0px))] group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!w-[calc(var(--sidebar-width-icon)+var(--sidebar-rail-gutter,0px))]',
  'group-data-[collapsible=icon]:[&_[data-sidebar=sidebar]]:box-border group-data-[collapsible=icon]:[&_[data-sidebar=sidebar]]:flex group-data-[collapsible=icon]:[&_[data-sidebar=sidebar]]:w-[calc(var(--sidebar-width-icon)+var(--sidebar-rail-gutter,0px))] group-data-[collapsible=icon]:[&_[data-sidebar=sidebar]]:max-w-[calc(var(--sidebar-width-icon)+var(--sidebar-rail-gutter,0px))] group-data-[collapsible=icon]:[&_[data-sidebar=sidebar]]:flex-col group-data-[collapsible=icon]:[&_[data-sidebar=sidebar]]:items-stretch group-data-[collapsible=icon]:[&_[data-sidebar=sidebar]]:overflow-visible group-data-[collapsible=icon]:[&_[data-sidebar=sidebar]]:!rounded-none group-data-[collapsible=icon]:[&_[data-sidebar=sidebar]]:!px-0',
  'group-data-[collapsible=icon]:[&_[data-sidebar=header]]:!mx-0 group-data-[collapsible=icon]:[&_[data-sidebar=header]]:!p-0 group-data-[collapsible=icon]:[&_[data-sidebar=header]]:w-full group-data-[collapsible=icon]:[&_[data-sidebar=header]]:items-center',
  'group-data-[collapsible=icon]:[&_[data-sidebar=footer]]:!mx-0 group-data-[collapsible=icon]:[&_[data-sidebar=footer]]:!p-0 group-data-[collapsible=icon]:[&_[data-sidebar=footer]]:mt-auto group-data-[collapsible=icon]:[&_[data-sidebar=footer]]:w-full group-data-[collapsible=icon]:[&_[data-sidebar=footer]]:items-center',
  'group-data-[collapsible=icon]:[&_[data-sidebar=content]]:!mx-0 group-data-[collapsible=icon]:[&_[data-sidebar=content]]:!ml-0 group-data-[collapsible=icon]:[&_[data-sidebar=content]]:!mr-0 group-data-[collapsible=icon]:[&_[data-sidebar=content]]:!px-0 group-data-[collapsible=icon]:[&_[data-sidebar=content]]:w-full group-data-[collapsible=icon]:[&_[data-sidebar=content]]:max-w-full group-data-[collapsible=icon]:[&_[data-sidebar=content]]:flex group-data-[collapsible=icon]:[&_[data-sidebar=content]]:flex-col group-data-[collapsible=icon]:[&_[data-sidebar=content]]:items-stretch group-data-[collapsible=icon]:[&_[data-sidebar=content]]:!overflow-visible',
  'group-data-[collapsible=icon]:[&_[data-sidebar=group]]:!m-0 group-data-[collapsible=icon]:[&_[data-sidebar=group]]:!p-0 group-data-[collapsible=icon]:[&_[data-sidebar=group]]:w-full',
  'group-data-[collapsible=icon]:[&_[data-sidebar=group-content]]:!m-0 group-data-[collapsible=icon]:[&_[data-sidebar=group-content]]:!p-0 group-data-[collapsible=icon]:[&_[data-sidebar=group-content]]:w-full',
  'group-data-[collapsible=icon]:[&_[data-sidebar=menu]]:m-0 group-data-[collapsible=icon]:[&_[data-sidebar=menu]]:list-none group-data-[collapsible=icon]:[&_[data-sidebar=menu]]:w-full group-data-[collapsible=icon]:[&_[data-sidebar=menu]]:items-center group-data-[collapsible=icon]:[&_[data-sidebar=menu]]:p-0',
  'group-data-[collapsible=icon]:[&_[data-sidebar=menu-item]]:m-0 group-data-[collapsible=icon]:[&_[data-sidebar=menu-item]]:flex group-data-[collapsible=icon]:[&_[data-sidebar=menu-item]]:w-full group-data-[collapsible=icon]:[&_[data-sidebar=menu-item]]:justify-center group-data-[collapsible=icon]:[&_[data-sidebar=menu-item]]:p-0',
  'group-data-[collapsible=icon]:[&_[data-sidebar=menu-button]]:!mx-0 group-data-[collapsible=icon]:[&_[data-sidebar=menu-button]]:!h-8 group-data-[collapsible=icon]:[&_[data-sidebar=menu-button]]:!w-full group-data-[collapsible=icon]:[&_[data-sidebar=menu-button]]:!min-h-8 group-data-[collapsible=icon]:[&_[data-sidebar=menu-button]]:!items-center group-data-[collapsible=icon]:[&_[data-sidebar=menu-button]]:!justify-center group-data-[collapsible=icon]:[&_[data-sidebar=menu-button]]:!overflow-visible group-data-[collapsible=icon]:[&_[data-sidebar=menu-button]]:!p-0',
  '[&_[data-sidebar=menu-button]]:h-auto [&_[data-sidebar=menu-button]]:min-h-0',
].join(' ');

function RailRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(RAIL_ROW, className)}>{children}</div>;
}

function RailToggle({ className }: { className?: string }) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      type="button"
      aria-label="Toggle sidebar"
      onClick={toggleSidebar}
      className={cn(RAIL_ROW, 'rounded-lg text-foreground hover:bg-muted/60', className)}
    >
      <PanelLeft className={RAIL_ICON} strokeWidth={2.5} />
    </button>
  );
}

const mainItems = [
  { title: 'Home', url: '/dashboard', icon: Home },
  { title: 'Search', url: '/search', icon: Search },
];

const projectItems = [
  { title: 'All projects', url: '/projects', icon: LayoutGrid },
  { title: 'Starred', url: '/starred', icon: Star },
  { title: 'Shared with me', url: '/shared', icon: Users },
];

const resourceItems = [
  { title: 'Discover', url: '/discover', icon: Compass },
  { title: 'Templates', url: '/templates', icon: FileBox },
  { title: 'Learn', url: '/learn', icon: GraduationCap },
];

function navIconClass(collapsed: boolean, active?: boolean) {
  return cn(
    RAIL_ICON,
    collapsed
      ? active
        ? 'text-foreground'
        : 'text-foreground/90'
      : active
        ? 'text-foreground'
        : 'text-foreground/70',
  );
}

function navLinkClass(collapsed: boolean, active?: boolean) {
  return cn(
    'flex min-w-0 items-center rounded-xl transition-colors',
    collapsed ? cn(RAIL_ROW, 'justify-center') : 'h-10 w-full gap-3 px-3 py-2',
    active
      ? 'bg-muted/80 text-foreground'
      : collapsed
        ? 'text-foreground hover:bg-muted/60'
        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
  );
}

type NavItem = { title: string; url: string; icon: typeof Home };

function SidebarNavItems({ items, collapsed }: { items: NavItem[]; collapsed: boolean }) {
  return (
    <>
      {items.map((item) => (
        <SidebarMenuItem key={item.title} className={collapsed ? 'm-0 flex w-full justify-center overflow-visible p-0' : ''}>
          <SidebarMenuButton asChild size="lg" tooltip={item.title} className={cn(collapsed && 'w-full justify-center overflow-visible p-0')}>
            <NavLink to={item.url} className={({ isActive }) => navLinkClass(collapsed, isActive)}>
              {({ isActive }) =>
                collapsed ? (
                  <item.icon className={navIconClass(collapsed, isActive)} strokeWidth={2.5} />
                ) : (
                  <>
                    <item.icon className={navIconClass(collapsed, isActive)} strokeWidth={2} />
                    <span className="truncate text-[15px] font-medium leading-none">{item.title}</span>
                  </>
                )
              }
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );
}

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const collapsed = state === 'collapsed';
  const sectionPad = collapsed ? '!p-0 w-full items-center' : 'px-3';
  const collapsedMenuClass = 'm-0 w-full list-none items-center gap-1 p-0';

  return (
    <Sidebar
      collapsible="icon"
      variant="inset"
      className={cn(
        '[&_[data-sidebar=sidebar]]:bg-sidebar [&_[data-sidebar=sidebar]]:rounded-2xl sm:[&_[data-sidebar=sidebar]]:rounded-3xl',
        sidebarShellClass,
      )}
    >
      <SidebarHeader className={cn(sectionPad, collapsed ? 'pt-[30px] pb-1' : 'pt-3 pb-2')}>
        <div className={cn('flex w-full flex-col', collapsed ? 'w-full items-stretch gap-1' : 'gap-3')}>
          {collapsed ? (
            <RailRow>
              <button
                type="button"
                aria-label="Open sidebar"
                onClick={toggleSidebar}
                className={cn(LOGO_WRAP, 'group relative translate-y-3')}
              >
                <img src={logo} alt="runtime42" className={cn(LOGO_IMG, 'transition-opacity group-hover:opacity-0')} />
                <PanelLeft
                  className="absolute inset-0 m-auto size-5 opacity-0 transition-opacity group-hover:opacity-100"
                  strokeWidth={2.5}
                />
              </button>
            </RailRow>
          ) : (
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="shrink-0">
                  <div className={LOGO_WRAP}>
                    <img src={logo} alt="runtime42" className={LOGO_IMG} />
                  </div>
                </div>
                <span className="truncate text-xl font-semibold tracking-tight text-foreground">runtime42</span>
              </div>
              <RailToggle className="h-9 w-9 shrink-0 rounded-lg" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent
        className={cn(
          collapsed ? '!m-0 !mt-8 !w-full !max-w-full !shrink-0 self-stretch !p-0 !gap-1' : cn(sectionPad, 'mt-8 gap-1'),
        )}
      >
        {collapsed ? (
          <SidebarMenu className={collapsedMenuClass}>
            <SidebarNavItems items={mainItems} collapsed />
            <SidebarNavItems items={projectItems} collapsed />
            <SidebarNavItems items={resourceItems} collapsed />
          </SidebarMenu>
        ) : (
          <>
            <SidebarGroup className="p-0">
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  <SidebarNavItems items={mainItems} collapsed={false} />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-0 p-0">
              <SidebarGroupLabel className="mb-1 h-7 px-3 text-[13px] font-medium uppercase tracking-wide text-muted-foreground/80">
                Projects
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  <SidebarNavItems items={projectItems} collapsed={false} />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-0 p-0">
              <SidebarGroupLabel className="mb-1 h-7 px-3 text-[13px] font-medium uppercase tracking-wide text-muted-foreground/80">
                Resources
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  <SidebarNavItems items={resourceItems} collapsed={false} />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className={cn(sectionPad, collapsed ? 'pb-4 pt-2' : 'pb-3 pt-1')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'rounded-xl transition-colors hover:bg-muted/50',
                collapsed ? RAIL_ROW : 'flex h-11 w-full min-w-0 items-center gap-3 px-1 py-1',
              )}
            >
              <span className={cn('shrink-0', collapsed && 'flex w-full justify-center')}>
                <span className={AVATAR_MARK}>VG</span>
              </span>
              {!collapsed && (
                <span className="min-w-0 flex-1 text-left pl-0.5">
                  <span className="block truncate text-[15px] font-medium leading-tight text-foreground">
                    Venkata Govind
                  </span>
                  <span className="block truncate text-[13px] text-muted-foreground">venkatagovind@gmail.com</span>
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={collapsed ? 'center' : 'start'} side="top" className="w-64 p-1">
            <div className="mb-1 px-3 py-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-[15px] font-bold text-white shadow-md">
                  VG
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Venkata Govind</p>
                  <p className="text-xs text-muted-foreground">venkatagovind@gmail.com</p>
                </div>
              </div>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="mx-1 cursor-pointer gap-3 rounded-lg px-3 py-2.5">
              <Settings className="size-4" />
              <span>Settings</span>
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="mx-1 cursor-pointer gap-3 rounded-lg px-3 py-2.5 data-[state=open]:bg-primary data-[state=open]:text-primary-foreground">
                <Moon className="size-4" />
                <span>Appearance</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-48 p-2">
                  <div className="mb-3 flex gap-2 px-1">
                    <div
                      onClick={() => setTheme('light')}
                      className={`h-12 flex-1 cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${theme === 'light' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                      style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #f59e0b 100%)' }}
                    />
                    <div
                      onClick={() => setTheme('dark')}
                      className={`h-12 flex-1 cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${theme === 'dark' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)' }}
                    />
                    <div
                      onClick={() => setTheme('grey')}
                      className={`h-12 flex-1 cursor-pointer overflow-hidden rounded-lg border-2 backdrop-blur-xl transition-all ${theme === 'grey' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(30,30,40,0.9) 0%, rgba(50,50,65,0.8) 50%, rgba(70,70,90,0.9) 100%)',
                      }}
                    />
                  </div>

                  <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer gap-3 rounded-lg px-3 py-2.5">
                    <Sun className="size-4" />
                    <span>Light</span>
                    {theme === 'light' && <Check className="ml-auto size-4 text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer gap-3 rounded-lg px-3 py-2.5">
                    <Moon className="size-4" />
                    <span>Dark</span>
                    {theme === 'dark' && <Check className="ml-auto size-4 text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('grey')} className="cursor-pointer gap-3 rounded-lg px-3 py-2.5">
                    <div className="size-4 rounded-full bg-gradient-to-br from-slate-400 to-slate-600" />
                    <span>Grey</span>
                    {theme === 'grey' && <Check className="ml-auto size-4 text-primary" />}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuItem className="mx-1 cursor-pointer gap-3 rounded-lg px-3 py-2.5">
              <HelpCircle className="size-4" />
              <span>Support</span>
              <ChevronRight className="ml-auto size-4 opacity-50" />
            </DropdownMenuItem>
            <DropdownMenuItem className="mx-1 cursor-pointer gap-3 rounded-lg px-3 py-2.5">
              <FileText className="size-4" />
              <span>Documentation</span>
              <ChevronRight className="ml-auto size-4 opacity-50" />
            </DropdownMenuItem>
            <DropdownMenuItem className="mx-1 cursor-pointer gap-3 rounded-lg px-3 py-2.5">
              <Users2 className="size-4" />
              <span>Community</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => signOut()}
              className="mx-1 cursor-pointer gap-3 rounded-lg px-3 py-2.5 text-orange-500 focus:bg-orange-500/10 focus:text-orange-500"
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
