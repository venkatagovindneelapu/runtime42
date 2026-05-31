import { Home, Search, LayoutGrid, Star, Users, Compass, FileBox, GraduationCap, Settings, Sun, Moon, HelpCircle, FileText, Users2, LogOut, ChevronRight, Check } from 'lucide-react';
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
  SidebarTrigger,
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

export function AppSidebar() {
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const collapsed = state === 'collapsed';

  const handleSignOut = () => {
    signOut();
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className={`${collapsed ? 'py-4 px-2' : 'p-4'}`}>
        <div className={`flex flex-col ${collapsed ? 'items-center gap-3' : 'gap-4'}`}>
          {/* Logo */}
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
            <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
              <div className={`${collapsed ? 'w-10 h-10' : 'w-9 h-9'} rounded-xl overflow-hidden flex-shrink-0 shadow-md`}>
                <img src={logo} alt="runtime42" className="w-full h-full object-cover" />
              </div>
              {!collapsed && <span className="font-semibold text-foreground text-lg">runtime42</span>}
            </div>
            {!collapsed && <SidebarTrigger className="text-muted-foreground hover:text-foreground" />}
          </div>
          
          {/* Collapse trigger when collapsed */}
          {collapsed && (
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          )}
          
          {/* User selector - only when expanded */}
          {!collapsed && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                V
              </div>
              <span className="text-sm font-medium text-foreground flex-1 truncate">Venkata's Space</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className={`${collapsed ? 'px-2' : 'px-3'}`}>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className={collapsed ? 'items-center gap-1' : 'gap-1'}>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title} className={collapsed ? 'flex justify-center' : ''}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => 
                        `flex items-center gap-3 ${collapsed ? 'justify-center w-10 h-10' : 'px-3 py-2.5'} rounded-xl transition-colors ${
                          isActive ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`
                      }
                    >
                      <item.icon className={`${collapsed ? 'w-5 h-5' : 'w-5 h-5'} flex-shrink-0`} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Projects */}
        <SidebarGroup className="mt-2">
          {!collapsed && <SidebarGroupLabel className="text-xs text-muted-foreground px-3 mb-1">Projects</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className={collapsed ? 'items-center gap-1' : 'gap-1'}>
              {projectItems.map((item) => (
                <SidebarMenuItem key={item.title} className={collapsed ? 'flex justify-center' : ''}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center gap-3 ${collapsed ? 'justify-center w-10 h-10' : 'px-3 py-2.5'} rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Resources */}
        <SidebarGroup className="mt-2">
          {!collapsed && <SidebarGroupLabel className="text-xs text-muted-foreground px-3 mb-1">Resources</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className={collapsed ? 'items-center gap-1' : 'gap-1'}>
              {resourceItems.map((item) => (
                <SidebarMenuItem key={item.title} className={collapsed ? 'flex justify-center' : ''}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center gap-3 ${collapsed ? 'justify-center w-10 h-10' : 'px-3 py-2.5'} rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={`${collapsed ? 'p-2' : 'p-3'}`}>
        {/* User Avatar with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`flex items-center gap-3 ${collapsed ? 'justify-center w-10 h-10 mx-auto' : 'p-2 w-full'} rounded-xl hover:bg-muted/50 transition-colors`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg">
                VG
              </div>
              {!collapsed && (
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">Venkata Govind</p>
                  <p className="text-xs text-muted-foreground truncate">venkatagovind@gmail.com</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={collapsed ? "center" : "start"} side="top" className="w-64 p-1">
            {/* User Info Header */}
            <div className="px-3 py-3 mb-1">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                  VG
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Venkata Govind</p>
                  <p className="text-xs text-muted-foreground">venkatagovind@gmail.com</p>
                </div>
              </div>
            </div>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem className="gap-3 py-2.5 px-3 cursor-pointer rounded-lg mx-1">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            
            {/* Appearance Submenu with Theme Toggle */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-3 py-2.5 px-3 cursor-pointer rounded-lg mx-1 data-[state=open]:bg-primary data-[state=open]:text-primary-foreground">
                <Moon className="w-4 h-4" />
                <span>Appearance</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-48 p-2">
                  {/* Theme Preview Images */}
                  <div className="flex gap-2 mb-3 px-1">
                    <div 
                      onClick={() => setTheme('light')}
                      className={`flex-1 h-12 rounded-lg cursor-pointer border-2 transition-all overflow-hidden ${theme === 'light' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                      style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #f59e0b 100%)' }}
                    />
                    <div 
                      onClick={() => setTheme('dark')}
                      className={`flex-1 h-12 rounded-lg cursor-pointer border-2 transition-all overflow-hidden ${theme === 'dark' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)' }}
                    />
                    <div 
                      onClick={() => setTheme('grey')}
                      className={`flex-1 h-12 rounded-lg cursor-pointer border-2 transition-all overflow-hidden backdrop-blur-xl ${theme === 'grey' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}`}
                      style={{ background: 'linear-gradient(135deg, rgba(30,30,40,0.9) 0%, rgba(50,50,65,0.8) 50%, rgba(70,70,90,0.9) 100%)' }}
                    />
                  </div>
                  
                  <DropdownMenuItem 
                    onClick={() => setTheme('light')} 
                    className="gap-3 py-2.5 px-3 cursor-pointer rounded-lg"
                  >
                    <Sun className="w-4 h-4" />
                    <span>Light</span>
                    {theme === 'light' && <Check className="w-4 h-4 ml-auto text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setTheme('dark')} 
                    className="gap-3 py-2.5 px-3 cursor-pointer rounded-lg"
                  >
                    <Moon className="w-4 h-4" />
                    <span>Dark</span>
                    {theme === 'dark' && <Check className="w-4 h-4 ml-auto text-primary" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setTheme('grey')} 
                    className="gap-3 py-2.5 px-3 cursor-pointer rounded-lg"
                  >
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-slate-400 to-slate-600" />
                    <span>Grey</span>
                    {theme === 'grey' && <Check className="w-4 h-4 ml-auto text-primary" />}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            
            <DropdownMenuItem className="gap-3 py-2.5 px-3 cursor-pointer rounded-lg mx-1">
              <HelpCircle className="w-4 h-4" />
              <span>Support</span>
              <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 py-2.5 px-3 cursor-pointer rounded-lg mx-1">
              <FileText className="w-4 h-4" />
              <span>Documentation</span>
              <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 py-2.5 px-3 cursor-pointer rounded-lg mx-1">
              <Users2 className="w-4 h-4" />
              <span>Community</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={handleSignOut} className="gap-3 py-2.5 px-3 cursor-pointer rounded-lg mx-1 text-orange-500 focus:text-orange-500 focus:bg-orange-500/10">
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
