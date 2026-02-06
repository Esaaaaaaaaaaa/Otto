import React, { useState, useEffect } from 'react';
import { UserQuestionProgress, User } from '@/api/entities';
import { client } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, TrendingUp, Download, TrendingDown, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function AdminAnalytics() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30); // 7, 30, 90, 180, 365

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const currentUser = await client.auth.me();
        if (currentUser.app_role !== 'committee') {
          window.location.href = '/';
          return;
        }
        setUser(currentUser);
      } catch (error) {
        await client.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, []);

  const { data: allProgress = [] } = useQuery({
    queryKey: ['allProgress'],
    queryFn: () => UserQuestionProgress.list()
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => User.list()
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // User & Growth Analytics
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Filter out excluded users
  const excludedUserIds = new Set(allUsers.filter(u => u.exclude_from_analytics).map(u => u.id));
  const includedUsers = allUsers.filter(u => !u.exclude_from_analytics);
  const includedProgress = allProgress.filter(p => !excludedUserIds.has(p.user_id));

  const totalUsers = includedUsers.length;
  const newUsersLast7Days = includedUsers.filter(u => new Date(u.created_date) >= sevenDaysAgo).length;
  const newUsersLast30Days = includedUsers.filter(u => new Date(u.created_date) >= thirtyDaysAgo).length;

  // Active users (completed at least one question)
  const activeUsersLast7Days = new Set(
    includedProgress.filter(p => p.status !== "unseen" && new Date(p.last_answered_at) >= sevenDaysAgo)
      .map(p => p.user_id)
  ).size;
  
  const activeUsersLast30Days = new Set(
    includedProgress.filter(p => p.status !== "unseen" && new Date(p.last_answered_at) >= thirtyDaysAgo)
      .map(p => p.user_id)
  ).size;

  // Engagement metrics
  const totalQuestionsCompleted = includedProgress.filter(p => p.status !== "unseen").length;
  const attemptsLast7Days = includedProgress.filter(p => 
    p.status !== "unseen" && new Date(p.last_answered_at) >= sevenDaysAgo
  ).length;
  const attemptsLast30Days = includedProgress.filter(p => 
    p.status !== "unseen" && new Date(p.last_answered_at) >= thirtyDaysAgo
  ).length;

  // Questions per user distribution
  const questionsPerUser = {};
  includedProgress.forEach(p => {
    if (p.status !== "unseen") {
      questionsPerUser[p.user_id] = (questionsPerUser[p.user_id] || 0) + 1;
    }
  });

  const completionCounts = Object.values(questionsPerUser);
  const avgQuestionsPerUser = completionCounts.length > 0 
    ? Math.round(completionCounts.reduce((a, b) => a + b, 0) / completionCounts.length)
    : 0;
  
  const medianQuestionsPerUser = completionCounts.length > 0
    ? (() => {
        const sorted = [...completionCounts].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 
          ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
          : sorted[mid];
      })()
    : 0;

  const bucket_0_10 = completionCounts.filter(c => c >= 0 && c <= 10).length;
  const bucket_11_50 = completionCounts.filter(c => c >= 11 && c <= 50).length;
  const bucket_51_150 = completionCounts.filter(c => c >= 51 && c <= 150).length;
  const bucket_150_plus = completionCounts.filter(c => c > 150).length;

  // Time-based trends (configurable range)
  const getDaysInRange = () => {
    const days = [];
    for (let i = timeRange - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  const daysInRange = getDaysInRange();
  const dailySignups = daysInRange.map(date => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return {
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      signups: includedUsers.filter(u => {
        const created = new Date(u.created_date);
        return created >= date && created < nextDay;
      }).length
    };
  });

  const dailyActivity = daysInRange.map(date => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayProgress = includedProgress.filter(p => {
      if (!p.last_answered_at) return false;
      const answered = new Date(p.last_answered_at);
      return answered >= date && answered < nextDay;
    });
    return {
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      attempts: dayProgress.length,
      activeUsers: new Set(dayProgress.map(p => p.user_id)).size
    };
  });

  // Predictive analytics
  const predictNextWeekSignups = () => {
    const last7DaysSignups = dailySignups.slice(-7).reduce((sum, day) => sum + day.signups, 0);
    const avg = last7DaysSignups / 7;
    return Math.round(avg * 7);
  };

  const predictNextWeekActivity = () => {
    const last7DaysAttempts = dailyActivity.slice(-7).reduce((sum, day) => sum + day.attempts, 0);
    const avg = last7DaysAttempts / 7;
    return Math.round(avg * 7);
  };

  const calculateGrowthRate = () => {
    const firstWeekSignups = dailySignups.slice(0, 7).reduce((sum, day) => sum + day.signups, 0);
    const lastWeekSignups = dailySignups.slice(-7).reduce((sum, day) => sum + day.signups, 0);
    if (firstWeekSignups === 0) return 0;
    return Math.round(((lastWeekSignups - firstWeekSignups) / firstWeekSignups) * 100);
  };

  const calculateRetentionRate = () => {
    const retentionDate = new Date(now);
    retentionDate.setDate(retentionDate.getDate() - Math.min(timeRange, 30));
    const usersFromRetentionDate = includedUsers.filter(u => new Date(u.created_date) <= retentionDate);
    const activeFromRetentionDate = new Set(
      includedProgress.filter(p => {
        const userCreated = includedUsers.find(u => u.id === p.user_id)?.created_date;
        return userCreated && new Date(userCreated) <= retentionDate && p.status !== "unseen";
      }).map(p => p.user_id)
    );
    if (usersFromRetentionDate.length === 0) return 0;
    return Math.round((activeFromRetentionDate.size / usersFromRetentionDate.length) * 100);
  };

  // Export functionality
  const exportToCSV = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Total Users', totalUsers],
      ['New Users (7 days)', newUsersLast7Days],
      ['New Users (30 days)', newUsersLast30Days],
      ['Active Users (7 days)', activeUsersLast7Days],
      ['Active Users (30 days)', activeUsersLast30Days],
      ['Total Completions', totalQuestionsCompleted],
      ['Avg Questions per User', avgQuestionsPerUser],
      ['Median Questions per User', medianQuestionsPerUser],
      ['Retention Rate (30d)', `${calculateRetentionRate()}%`],
      ['Growth Rate', `${calculateGrowthRate()}%`],
      ['Predicted Signups (next 7d)', predictNextWeekSignups()],
      ['Predicted Attempts (next 7d)', predictNextWeekActivity()],
    ];

    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-slate-700 flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">User Analytics</h1>
              </div>
              <p className="text-slate-600">User growth and engagement metrics</p>
            </div>
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
        {/* User & Growth Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-800">User & Growth Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* User Stats */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-slate-900">{totalUsers}</p>
                </div>
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">New Sign-ups (7 days)</p>
                  <p className="text-xl font-semibold text-teal-700">{newUsersLast7Days}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">New Sign-ups (30 days)</p>
                  <p className="text-xl font-semibold text-teal-700">{newUsersLast30Days}</p>
                </div>
              </div>

              {/* Active Users */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Active Users (7d)</p>
                  <p className="text-3xl font-bold text-slate-900">{activeUsersLast7Days}</p>
                  <p className="text-xs text-slate-500 mt-1">Completed ≥1 question</p>
                </div>
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Active Users (30 days)</p>
                  <p className="text-xl font-semibold text-blue-700">{activeUsersLast30Days}</p>
                </div>
              </div>

              {/* Engagement */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Completed</p>
                  <p className="text-3xl font-bold text-slate-900">{totalQuestionsCompleted}</p>
                  <p className="text-xs text-slate-500 mt-1">All-time attempts</p>
                </div>
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">Attempts (7 days)</p>
                  <p className="text-xl font-semibold text-amber-700">{attemptsLast7Days}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Attempts (30 days)</p>
                  <p className="text-xl font-semibold text-amber-700">{attemptsLast30Days}</p>
                </div>
              </div>

              {/* Distribution */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Questions per User</p>
                  <div className="flex items-baseline gap-3">
                    <div>
                      <p className="text-xs text-slate-500">Avg</p>
                      <p className="text-2xl font-bold text-slate-900">{avgQuestionsPerUser}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Median</p>
                      <p className="text-2xl font-bold text-slate-900">{medianQuestionsPerUser}</p>
                    </div>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-200 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">0–10</span>
                    <span className="font-semibold text-slate-900">{bucket_0_10}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">11–50</span>
                    <span className="font-semibold text-slate-900">{bucket_11_50}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">51–150</span>
                    <span className="font-semibold text-slate-900">{bucket_51_150}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">150+</span>
                    <span className="font-semibold text-slate-900">{bucket_150_plus}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Trends */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-800">Engagement Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-5 bg-teal-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="h-6 w-6 text-teal-600" />
                  <h3 className="font-semibold text-slate-800">7 Day Activity</h3>
                </div>
                <p className="text-2xl font-bold text-teal-900 mb-1">{activeUsersLast7Days}</p>
                <p className="text-sm text-teal-700">active users</p>
                <p className="text-lg font-semibold text-teal-800 mt-2">{attemptsLast7Days}</p>
                <p className="text-xs text-teal-600">total attempts</p>
              </div>

              <div className="p-5 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                  <h3 className="font-semibold text-slate-800">30 Day Activity</h3>
                </div>
                <p className="text-2xl font-bold text-blue-900 mb-1">{activeUsersLast30Days}</p>
                <p className="text-sm text-blue-700">active users</p>
                <p className="text-lg font-semibold text-blue-800 mt-2">{attemptsLast30Days}</p>
                <p className="text-xs text-blue-600">total attempts</p>
              </div>

              <div className="p-5 bg-slate-100 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="h-6 w-6 text-slate-600" />
                  <h3 className="font-semibold text-slate-800">All Time</h3>
                </div>
                <p className="text-2xl font-bold text-slate-900 mb-1">{totalUsers}</p>
                <p className="text-sm text-slate-700">total users</p>
                <p className="text-lg font-semibold text-slate-800 mt-2">{totalQuestionsCompleted}</p>
                <p className="text-xs text-slate-600">total completions</p>
              </div>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <div className="flex justify-end mb-4">
              <div className="flex gap-2">
                {[7, 30, 90, 180, 365].map(days => (
                  <Button
                    key={days}
                    variant={timeRange === days ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTimeRange(days)}
                    className={timeRange === days ? 'bg-teal-600 hover:bg-teal-700' : ''}
                  >
                    {days === 7 ? '7D' : days === 30 ? '30D' : days === 90 ? '3M' : days === 180 ? '6M' : '1Y'}
                  </Button>
                ))}
              </div>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>User Signups (Last {timeRange} Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailySignups}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="signups" stroke="#0d9488" fill="#99f6e4" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Daily Activity (Last {timeRange} Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="attempts" stroke="#3b82f6" name="Attempts" />
                    <Line yAxisId="right" type="monotone" dataKey="activeUsers" stroke="#10b981" name="Active Users" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Weekly Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">First Week (Days 1-7)</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {dailySignups.slice(0, 7).reduce((sum, day) => sum + day.signups, 0)} signups
                      </p>
                      <p className="text-sm text-slate-500">
                        {dailyActivity.slice(0, 7).reduce((sum, day) => sum + day.attempts, 0)} attempts
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Last Week (Days 24-30)</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {dailySignups.slice(-7).reduce((sum, day) => sum + day.signups, 0)} signups
                      </p>
                      <p className="text-sm text-slate-500">
                        {dailyActivity.slice(-7).reduce((sum, day) => sum + day.attempts, 0)} attempts
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        {calculateGrowthRate() >= 0 ? (
                          <TrendingUp className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-rose-600" />
                        )}
                        <p className="text-lg font-semibold">
                          {calculateGrowthRate() >= 0 ? '+' : ''}{calculateGrowthRate()}% growth
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Retention & Engagement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">30-Day Retention Rate</p>
                      <p className="text-3xl font-bold text-slate-900">{calculateRetentionRate()}%</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Users who signed up 30+ days ago and are still active
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-sm text-slate-600 mb-1">Avg Daily Active Users (Last 7d)</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {Math.round(dailyActivity.slice(-7).reduce((sum, day) => sum + day.activeUsers, 0) / 7)}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-sm text-slate-600 mb-1">Avg Attempts per Active User (Last 7d)</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {(() => {
                          const totalAttempts = dailyActivity.slice(-7).reduce((sum, day) => sum + day.attempts, 0);
                          const totalActive = dailyActivity.slice(-7).reduce((sum, day) => sum + day.activeUsers, 0);
                          return totalActive > 0 ? Math.round(totalAttempts / totalActive) : 0;
                        })()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  7-Day Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="p-5 bg-teal-50 rounded-lg">
                    <p className="text-sm text-teal-700 mb-1">Predicted Signups</p>
                    <p className="text-3xl font-bold text-teal-900">{predictNextWeekSignups()}</p>
                    <p className="text-xs text-teal-600 mt-1">Next 7 days</p>
                  </div>
                  <div className="p-5 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700 mb-1">Predicted Attempts</p>
                    <p className="text-3xl font-bold text-blue-900">{predictNextWeekActivity()}</p>
                    <p className="text-xs text-blue-600 mt-1">Next 7 days</p>
                  </div>
                  <div className="p-5 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-700 mb-1">Projected Total Users</p>
                    <p className="text-3xl font-bold text-purple-900">{totalUsers + predictNextWeekSignups()}</p>
                    <p className="text-xs text-purple-600 mt-1">By {new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Growth Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      {calculateGrowthRate() >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-emerald-600 mt-0.5" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-rose-600 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900">
                          {calculateGrowthRate() >= 0 ? 'Growing' : 'Declining'} signup rate
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          Signups have {calculateGrowthRate() >= 0 ? 'increased' : 'decreased'} by {Math.abs(calculateGrowthRate())}% 
                          over the past 30 days
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900">User engagement</p>
                        <p className="text-sm text-slate-600 mt-1">
                          {activeUsersLast7Days > 0 && totalUsers > 0 
                            ? `${Math.round((activeUsersLast7Days / totalUsers) * 100)}% of users were active in the last 7 days`
                            : 'Not enough data yet'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900">Retention outlook</p>
                        <p className="text-sm text-slate-600 mt-1">
                          {calculateRetentionRate() >= 50 
                            ? `Strong retention at ${calculateRetentionRate()}% - users are staying engaged`
                            : calculateRetentionRate() >= 30
                            ? `Moderate retention at ${calculateRetentionRate()}% - room for improvement`
                            : `Low retention at ${calculateRetentionRate()}% - focus on user engagement`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}