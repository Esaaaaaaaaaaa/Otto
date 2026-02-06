import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { client } from '@/api/supabaseClient';
import {
  LayoutDashboard,
  BookOpen,
  PlayCircle,
  Plus,
  GraduationCap,
  Menu,
  X,
  BarChart3,
  TrendingUp,
  Settings,
  Users,
  LogOut
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', showToAll: true },
  { name: 'Questions', icon: BookOpen, page: 'Questions', showToAll: true },
  { name: 'Mock Exams', icon: GraduationCap, page: 'MockExams', showToAll: true },
  { name: 'Settings', icon: Settings, page: 'Settings', showToAll: true },
  { name: 'Manage Users', icon: Users, page: 'ManageUsers', adminOnly: true },
  { name: 'Add Question', icon: Plus, page: 'AddQuestion', committeeOnly: true },
  { name: 'User Analytics', icon: BarChart3, page: 'AdminAnalytics', committeeOnly: true },
  { name: 'Question Analytics', icon: TrendingUp, page: 'MockAnalytics', committeeOnly: true },
  { name: 'Reported Questions', icon: Menu, page: 'ReportedQuestions', committeeOnly: true },
];

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    const getUser = async () => {
      try {
        const currentUser = await client.auth.me();
        setUser(currentUser);
      } catch (error) {
        // User not logged in
      }
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await client.auth.logout();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-slate-200 pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 pb-6 border-b border-slate-100">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694b186fdd71b4c018f29977/bc91afc83_Aimlogo.jpg"
              alt="AIM Logo"
              className="h-10 w-10 object-contain"
            />
            <div>
              <h1 className="text-lg font-bold text-slate-900">Accessibility in Medicine</h1>
              <p className="text-xs text-slate-500">Preclinical Questionbank</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-6 flex-1 px-3 space-y-1">
            {navItems.map((item) => {
              if (item.adminOnly && user?.role !== 'admin') return null;
              if (item.committeeOnly && user?.app_role !== 'committee') return null;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-teal-50 text-teal-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5",
                    isActive ? "text-teal-600" : "text-slate-400"
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 space-y-3">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-slate-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
            <p className="text-xs text-slate-400 text-center">
              © 2026 by Accessibility in Medicine
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694b186fdd71b4c018f29977/bc91afc83_Aimlogo.jpg"
              alt="AIM Logo"
              className="h-8 w-8 object-contain"
            />
            <span className="font-bold text-slate-900">AIM</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white pb-4">
            <nav className="px-3 pt-2 space-y-1">
              {navItems.map((item) => {
                if (item.adminOnly && user?.role !== 'admin') return null;
                if (item.committeeOnly && user?.app_role !== 'committee') return null;
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-teal-50 text-teal-700"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <item.icon className={cn(
                      "h-5 w-5",
                      isActive ? "text-teal-600" : "text-slate-400"
                    )} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 pt-2 border-t border-slate-100 mt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full justify-start text-slate-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
