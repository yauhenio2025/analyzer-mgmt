import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Cpu, Layers, GitBranch, Users, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
}

function StatCard({ title, value, subtitle, icon: Icon, href, color }: StatCardProps) {
  return (
    <Link href={href} className="card p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg bg-gray-100`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
      <div className="mt-4 flex items-center text-sm text-primary-600 font-medium">
        View all
        <ArrowRight className="ml-1 h-4 w-4" />
      </div>
    </Link>
  );
}

export default function Home() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.stats.get(),
  });

  const { data: recentChanges } = useQuery({
    queryKey: ['changes', 'recent'],
    queryFn: () => api.changes.list({ limit: 5 }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        Failed to load dashboard data
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">
          Manage your analytical engines, paradigms, and pipelines
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Engines"
          value={stats?.engines.total ?? 0}
          subtitle={`${stats?.engines.active ?? 0} active`}
          icon={Cpu}
          href="/engines"
          color="text-blue-600"
        />
        <StatCard
          title="Paradigms"
          value={stats?.paradigms.total ?? 0}
          subtitle={`${stats?.paradigms.active ?? 0} active`}
          icon={Layers}
          href="/paradigms"
          color="text-purple-600"
        />
        <StatCard
          title="Pipelines"
          value={stats?.pipelines.total ?? 0}
          subtitle={`${stats?.pipelines.active ?? 0} active`}
          icon={GitBranch}
          href="/pipelines"
          color="text-green-600"
        />
        <StatCard
          title="Consumers"
          value={stats?.consumers.total ?? 0}
          subtitle={`${stats?.consumers.registered ?? 0} registered`}
          icon={Users}
          href="/consumers"
          color="text-orange-600"
        />
      </div>

      {/* Recent Changes */}
      <div className="card">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Changes</h2>
          <Link
            href="/changes"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center"
          >
            View all
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="divide-y">
          {recentChanges?.changes && recentChanges.changes.length > 0 ? (
            recentChanges.changes.map((change) => (
              <div key={change.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {change.change_type === 'create' && 'Created '}
                    {change.change_type === 'update' && 'Updated '}
                    {change.change_type === 'delete' && 'Deleted '}
                    <span className="text-primary-600">{change.construct_key}</span>
                  </p>
                  {change.change_summary && (
                    <p className="text-sm text-gray-500 mt-1">{change.change_summary}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`badge ${
                      change.propagation_status === 'completed'
                        ? 'badge-success'
                        : change.propagation_status === 'pending'
                        ? 'badge-warning'
                        : 'badge-gray'
                    }`}
                  >
                    {change.propagation_status}
                  </span>
                  <span className="text-sm text-gray-500">
                    {change.changed_at
                      ? new Date(change.changed_at).toLocaleDateString()
                      : ''}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              No recent changes
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/engines?action=create"
            className="btn-secondary justify-center"
          >
            Create Engine
          </Link>
          <Link
            href="/paradigms?action=create"
            className="btn-secondary justify-center"
          >
            Create Paradigm
          </Link>
          <Link
            href="/pipelines?action=create"
            className="btn-secondary justify-center"
          >
            Create Pipeline
          </Link>
          <Link
            href="/consumers?action=register"
            className="btn-secondary justify-center"
          >
            Register Consumer
          </Link>
        </div>
      </div>
    </div>
  );
}
