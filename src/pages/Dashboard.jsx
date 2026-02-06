import React, { useState } from 'react';
import { Question, Submodule, UserQuestionProgress } from '@/api/entities';
import { client } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { 
  PlayCircle, 
  BookOpen, 
  TrendingUp, 
  Target,
  Plus,
  ArrowRight,
  BarChart3,
  ArrowUpDown,
  ExternalLink
} from 'lucide-react';

import StatsOverview from '@/components/questions/StatsOverview';
import SpecialtyProgress from '@/components/questions/SpecialtyProgress';

export default function Dashboard() {
  const [user, setUser] = React.useState(null);
  const [activityOrder, setActivityOrder] = React.useState('earliest'); // 'earliest' or 'latest'
  const [activityFilter, setActivityFilter] = React.useState('all'); // 'all', 'correct', 'incorrect'

  React.useEffect(() => {
    const getUser = async () => {
      try {
        const currentUser = await client.auth.me();
        setUser(currentUser);
      } catch (error) {
        // Not logged in
      }
    };
    getUser();
  }, []);

  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['questions'],
    queryFn: () => Question.list()
  });

  const { data: submodules = [] } = useQuery({
    queryKey: ['submodules'],
    queryFn: () => Submodule.list()
  });

  const { data: progress = [], isLoading: loadingProgress } = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return UserQuestionProgress.filter({ user_id: user.id });
    },
    enabled: !!user
  });

  const isLoading = loadingQuestions || loadingProgress;

  // Get recent activity (past 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const allRecentActivity = progress
    .filter(p => {
      if (p.status === "unseen") return false;
      if (!p.last_answered_at) return false;
      const attemptDate = new Date(p.last_answered_at);
      return attemptDate >= sevenDaysAgo;
    });

  const getFilteredActivity = (activities, filter, order) => {
    let filtered = [...activities];
    
    // Apply status filter
    if (filter === 'correct') {
      filtered = filtered.filter(p => p.status === 'correct');
    } else if (filter === 'incorrect') {
      filtered = filtered.filter(p => p.status === 'attempted');
    }
    
    // Apply ordering
    filtered.sort((a, b) => {
      const dateA = new Date(a.last_answered_at);
      const dateB = new Date(b.last_answered_at);
      return order === 'earliest' ? dateA - dateB : dateB - dateA;
    });
    
    return filtered;
  };

  const filteredActivity = getFilteredActivity(allRecentActivity, activityFilter, activityOrder);
  const recentActivity = filteredActivity.slice(0, 15);

  // Helper to get relative time label
  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        </div>

        {/* Quick Action - Question Bank */}
        <Link to={createPageUrl('Questions')} className="block mb-8">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-500 to-teal-600 text-white hover:shadow-lg transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <BookOpen className="h-12 w-12 mb-4 opacity-90" />
                  <h3 className="font-semibold text-xl">Question Bank</h3>
                  <p className="text-teal-100 text-sm mt-1">
                    Browse all questions or create a practice set • {questions.length} questions available
                  </p>
                </div>
                <ArrowRight className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Stats Overview */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mb-8">
            <StatsOverview progress={progress} totalQuestions={questions.length} />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Specialty Progress */}
          <div className="lg:col-span-2">
            {isLoading ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <SpecialtyProgress questions={questions} progress={progress} />
            )}
          </div>

          {/* Recent Activity */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Target className="h-5 w-5 text-slate-600" />
                  Recent Activity
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActivityOrder(activityOrder === 'earliest' ? 'latest' : 'earliest')}
                  className="text-slate-600"
                >
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                  {activityOrder === 'earliest' ? 'Earliest' : 'Latest'}
                </Button>
              </div>
              
              {/* Segmented Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setActivityFilter('all')}
                  className={cn(
                    "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    activityFilter === 'all'
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setActivityFilter('incorrect')}
                  className={cn(
                    "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    activityFilter === 'incorrect'
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Incorrect
                </button>
                <button
                  onClick={() => setActivityFilter('correct')}
                  className={cn(
                    "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    activityFilter === 'correct'
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Correct
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6">
                  No activity in the last 7 days
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {recentActivity.map((prog) => {
                      const question = questions.find(q => q.id === prog.question_id);
                      if (!question) return null;
                      
                      return (
                        <Link
                          key={prog.id}
                          to={createPageUrl(`PracticeSet?ids=${question.id}`)}
                          className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-slate-700 line-clamp-2 flex-1">
                              {question.question_text}
                            </p>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full whitespace-nowrap",
                              prog.status === "correct" 
                                ? "bg-slate-200 text-slate-700"
                                : "bg-slate-200 text-slate-700"
                            )}>
                              {prog.status === "correct" ? "Correct" : "Incorrect"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {getRelativeTime(prog.last_answered_at)}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                  
                  {filteredActivity.length > 15 && (
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" className="w-full mt-4" size="sm">
                          See all ({filteredActivity.length})
                          <ExternalLink className="h-3.5 w-3.5 ml-2" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                        <SheetHeader className="mb-4">
                          <SheetTitle>Recent Activity (Last 7 Days)</SheetTitle>
                        </SheetHeader>
                        <div className="space-y-3">
                          {filteredActivity.map((prog) => {
                            const question = questions.find(q => q.id === prog.question_id);
                            if (!question) return null;
                            
                            return (
                              <Link
                                key={prog.id}
                                to={createPageUrl(`PracticeSet?ids=${question.id}`)}
                                className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm text-slate-700 line-clamp-2 flex-1">
                                    {question.question_text}
                                  </p>
                                  <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full whitespace-nowrap",
                                    prog.status === "correct" 
                                      ? "bg-slate-200 text-slate-700"
                                      : "bg-slate-200 text-slate-700"
                                  )}>
                                    {prog.status === "correct" ? "Correct" : "Incorrect"}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                  {getRelativeTime(prog.last_answered_at)}
                                </p>
                              </Link>
                            );
                          })}
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}