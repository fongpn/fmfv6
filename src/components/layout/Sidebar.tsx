import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Settings,
  UserCheck,
  Clock,
  Shield,
  Database,
  Ticket,
  ShoppingCart,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { hasRole } from '../../lib/auth';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['ADMIN', 'CS'] },
  { name: 'Members', href: '/members', icon: Users, roles: ['ADMIN', 'CS'] },
  { name: 'Check-In', href: '/checkin', icon: UserCheck, roles: ['ADMIN', 'CS'] },
  { name: 'Membership Plans', href: '/membership-plans', icon: CreditCard, roles: ['ADMIN'] },
  { name: 'Coupon Templates', href: '/coupon-templates', icon: Ticket, roles: ['ADMIN'] },
  { name: 'POS & Inventory', href: '/pos', icon: Package, roles: ['ADMIN', 'CS'] },
  { name: 'Sales', href: '/sales', icon: ShoppingCart, roles: ['ADMIN', 'CS'] },
  { name: 'Shifts', href: '/shifts', icon: Clock, roles: ['ADMIN', 'CS'] },
  { name: 'Staff Management', href: '/staff', icon: Shield, roles: ['ADMIN'] },
  { name: 'Network Access', href: '/network-access', icon: Shield, roles: ['ADMIN'] },
  { name: 'Data Management', href: '/data', icon: Database, roles: ['ADMIN'] },
  { name: 'System Settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
];

export function Sidebar() {
  const { profile } = useAuthStore();

  const filteredNavigation = navigation.filter(item => 
    item.roles.some(role => hasRole(profile, role as 'ADMIN' | 'CS'))
  );

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center justify-center bg-gray-800">
        <h1 className="text-xl font-bold text-white">FMF Gym</h1>
      </div>
      
      <nav className="flex-1 space-y-1 px-2 py-4">
        {filteredNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-700 p-4">
        <div className="text-sm text-gray-400">
          Logged in as: <span className="text-white">{profile?.full_name}</span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Role: {profile?.role}
        </div>
      </div>
    </div>
  );
}