import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Cpu,
  Layers,
  GitBranch,
  GitMerge,
  Users,
  History,
  Settings,
  Menu,
  X,
  LayoutGrid,
  Palette,
  Shapes,
  Brush,
  MessageSquareWarning,
  UserCircle,
  Zap,
  Compass,
  Combine,
  Workflow,
  Eye,
  Repeat,
  Monitor,
  Component,
  Network,
  Target,
  Map,
  Activity,
  Globe,
  Boxes,
  Route,
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

/**
 * Sidebar groups. "Estate" is the network view (which organs draw which
 * methods from the registry); "Story" is the executive path (what we wanted →
 * how we planned it → what actually ran); "Definitions" keeps the catalog pages
 * in their historical order.
 */
const navigation: NavGroup[] = [
  {
    name: 'Estate',
    items: [
      { name: 'Map', href: '/', icon: Globe },
      { name: 'Organs', href: '/organs', icon: Boxes },
      { name: 'Processes', href: '/processes', icon: Route },
    ],
  },
  {
    name: 'Story',
    items: [
      { name: 'Objectives', href: '/objectives', icon: Target },
      { name: 'Plans', href: '/plans', icon: Map },
      { name: 'Runs', href: '/jobs', icon: Activity },
    ],
  },
  {
    name: 'Definitions',
    items: [
      { name: 'Engines', href: '/engines', icon: Cpu },
      { name: 'Paradigms', href: '/paradigms', icon: Layers },
      { name: 'Audiences', href: '/audiences', icon: UserCircle },
      { name: 'Chains', href: '/chains', icon: Network },
      { name: 'Pipelines', href: '/pipelines', icon: GitBranch },
      { name: 'Workflows', href: '/workflows', icon: GitMerge },
      { name: 'Implementations', href: '/implementations', icon: Workflow },
      { name: 'Grids', href: '/grids', icon: LayoutGrid },
      { name: 'Styles', href: '/styles', icon: Palette },
      { name: 'Primitives', href: '/primitives', icon: Shapes },
      { name: 'Display', href: '/display', icon: Brush },
      { name: 'Functions', href: '/functions', icon: Zap },
      { name: 'Stances', href: '/stances', icon: Compass },
      { name: 'Views', href: '/views', icon: Eye },
      { name: 'Renderers', href: '/renderers', icon: Monitor },
      { name: 'Sub-Renderers', href: '/sub-renderers', icon: Component },
      { name: 'Transformations', href: '/transformations', icon: Repeat },
      { name: 'Operationalizations', href: '/operationalizations', icon: Combine },
      { name: 'Rhetoric', href: '/rhetoric', icon: MessageSquareWarning },
      { name: 'Consumers', href: '/consumers', icon: Users },
      { name: 'Changes', href: '/changes', icon: History },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={clsx(
        'flex items-center gap-3 px-3 py-1.5 text-[13px] rounded-sm transition-colors border-l-2',
        isActive
          ? 'border-gold-500 bg-ink-800 text-paper'
          : 'border-transparent text-ink-300 hover:bg-ink-800 hover:text-ink-100'
      )}
    >
      <Icon className={clsx('h-4 w-4', isActive ? 'text-gold-500' : 'text-ink-400')} />
      {item.name}
    </Link>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-baseline gap-2">
      <span className="font-display text-xl text-paper tracking-tight">The Mastermind</span>
      <span className="mono-label text-gold-500 whitespace-nowrap">Method Registry</span>
    </Link>
  );
}

function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto scrollbar-thin">
      {navigation.map((group) => (
        <div key={group.name}>
          <div className="mono-label px-3 mb-1.5">{group.name}</div>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink key={item.name} item={item} isActive={isActivePath(pathname, item.href)} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>The Mastermind</title>
      </Head>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-ink-900 bg-opacity-70 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 w-64 bg-ink-900 shadow-lg z-30 transform transition-transform lg:hidden flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-ink-700">
          <Brand />
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-ink-400 hover:text-paper"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarNav pathname={router.pathname} />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-ink-900 border-r border-ink-700">
          <div className="flex items-center h-16 px-5 border-b border-ink-700">
            <Brand />
          </div>
          <SidebarNav pathname={router.pathname} />
          <div className="px-3 py-3 border-t border-ink-700">
            <NavLink
              item={{ name: 'Settings', href: '/settings', icon: Settings }}
              isActive={isActivePath(router.pathname, '/settings')}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 flex items-center h-16 px-4 bg-ink-900 border-b border-ink-700 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-ink-300 hover:text-paper"
            aria-label="Open navigation"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-4">
            <Brand />
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
