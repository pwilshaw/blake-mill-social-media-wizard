import { NavLink, Outlet } from 'react-router-dom'
import { signOut } from '@/lib/auth'
import {
  LayoutDashboard,
  Megaphone,
  CalendarDays,
  Radio,
  Users,
  Zap,
  Wallet,
  MessageSquare,
  Bot,
  BarChart3,
  Globe,
  Layers,
  KeyRound,
  Sparkles,
  FlaskConical,
  Users2,
  Palette,
  Video,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { useState } from 'react'

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/team', label: 'Team', icon: Users2 },
      { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
      { to: '/creative-templates', label: 'Templates', icon: Layers },
      { to: '/videos', label: 'Videos', icon: Video },
      { to: '/calendar', label: 'Calendar', icon: CalendarDays },
    ],
  },
  {
    label: 'Channels',
    items: [
      { to: '/channels', label: 'Connections', icon: Radio },
      { to: '/media-buyer', label: 'AI Media Buyer', icon: Bot },
      { to: '/conversions', label: 'Conversions', icon: BarChart3 },
      { to: '/insights', label: 'Insights', icon: Sparkles },
      { to: '/wtp-study', label: 'WTP Study', icon: FlaskConical },
      { to: '/search', label: 'Search Intel', icon: Globe },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/segments', label: 'Segments', icon: Users },
      { to: '/triggers', label: 'Triggers', icon: Zap },
      { to: '/budget', label: 'Budget', icon: Wallet },
      { to: '/engagement', label: 'Engagement', icon: MessageSquare },
      { to: '/brand', label: 'Brand', icon: Palette },
      { to: '/integrations', label: 'Integrations', icon: KeyRound },
    ],
  },
]

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-all md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'md:w-16' : 'md:w-60'} w-60`}
      >
        {/* Brand header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
              BM
            </div>
            {!collapsed && (
              <span className="text-sm font-bold text-foreground whitespace-nowrap">
                Blake Mill
              </span>
            )}
          </div>
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            className="hidden md:block text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2" aria-label="Main navigation">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si} className={si > 0 ? 'mt-4' : ''}>
              {section.label && !collapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {section.label}
                </p>
              )}
              {collapsed && si > 0 && (
                <div className="mx-3 mb-2 border-t border-border" />
              )}
              <div className="space-y-0.5">
                {section.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        collapsed ? 'justify-center' : ''
                      } ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-2">
          <button
            onClick={() => signOut()}
            title={collapsed ? 'Sign out' : undefined}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 items-center border-b border-border px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-[10px] font-bold">
              BM
            </div>
            <span className="text-sm font-bold">Blake Mill</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
