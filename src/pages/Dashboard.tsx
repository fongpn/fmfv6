import React, { useEffect, useState } from 'react';
import { Users, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';

interface DashboardStats {
  activeMembers: number;
  revenueToday: number;
  activeShifts: number;
  pendingRequests: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeMembers: 0,
    revenueToday: 0,
    activeShifts: 0,
    pendingRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Get active members count
      const { count: membersCount } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get today's revenue
      const today = new Date().toISOString().split('T')[0];
      const { data: todayTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .gte('created_at', today)
        .eq('status', 'PAID');

      const revenueToday = todayTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

      // Get active shifts count
      const { count: shiftsCount } = await supabase
        .from('shifts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE');

      // Get pending access requests count
      const { count: requestsCount } = await supabase
        .from('access_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING');

      setStats({
        activeMembers: membersCount || 0,
        revenueToday,
        activeShifts: shiftsCount || 0,
        pendingRequests: requestsCount || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Active Members',
      value: stats.activeMembers.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(stats.revenueToday),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Active Shifts',
      value: stats.activeShifts.toString(),
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Pending Requests',
      value: stats.pendingRequests.toString(),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <Button onClick={loadDashboardStats}>
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Add New Member
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Start New Shift
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <DollarSign className="h-4 w-4 mr-2" />
              Process Sale
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span className="text-gray-600">New member registration</span>
                <span className="ml-auto text-gray-400">2 min ago</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-gray-600">Membership renewal</span>
                <span className="ml-auto text-gray-400">5 min ago</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                <span className="text-gray-600">Shift started</span>
                <span className="ml-auto text-gray-400">1 hour ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      {stats.pendingRequests > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-orange-800">
                  {stats.pendingRequests} pending access request{stats.pendingRequests > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-orange-700">
                  Review and approve staff access requests from new locations.
                </p>
              </div>
              <Button size="sm" className="ml-auto">
                Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}