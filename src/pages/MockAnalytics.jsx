import React, { useState, useEffect } from 'react';
import { Question, Year, Module, Submodule, UserQuestionProgress, QuestionAttempt, MockExam, MockExamFeedback, UserMockExamAttempt, User } from '@/api/entities';
import { client } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BarChart3, Star, MessageSquare, TrendingUp, Clock, Trash2, Filter, AlertCircle, Database, Download, TrendingDown } from 'lucide-react';
import { cn } from "@/lib/utils";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function MockAnalytics() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMock, setSelectedMock] = useState('all');
  const [minAttempts, setMinAttempts] = useState(15);
  const [filters, setFilters] = useState({
    year_id: "all",
    module_id: "all",
    submodule_id: "all"
  });
  const [sortBy, setSortBy] = useState("lowest_accuracy");
  const [showRawData, setShowRawData] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => Question.list()
  });

  const { data: years = [] } = useQuery({
    queryKey: ['years'],
    queryFn: () => Year.list()
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: () => Module.list()
  });

  const { data: submodules = [] } = useQuery({
    queryKey: ['submodules'],
    queryFn: () => Submodule.list()
  });

  const { data: allProgress = [] } = useQuery({
    queryKey: ['allProgress'],
    queryFn: () => UserQuestionProgress.list()
  });

  const { data: allAttempts = [] } = useQuery({
    queryKey: ['allAttempts'],
    queryFn: () => QuestionAttempt.list()
  });

  const { data: mockExams = [] } = useQuery({
    queryKey: ['mockExams'],
    queryFn: () => MockExam.list()
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['mockFeedback'],
    queryFn: () => MockExamFeedback.list('-created_date')
  });

  const { data: mockAttempts = [] } = useQuery({
    queryKey: ['mockAttempts'],
    queryFn: () => UserMockExamAttempt.filter({ status: 'completed' })
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => User.list()
  });

  const deleteProgressMutation = useMutation({
    mutationFn: (id) => UserQuestionProgress.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allProgress'] });
      setDeleteConfirm(null);
    }
  });

  const deleteAttemptMutation = useMutation({
    mutationFn: (id) => QuestionAttempt.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAttempts'] });
      setDeleteConfirm(null);
    }
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: (id) => MockExamFeedback.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockFeedback'] });
      setDeleteConfirm(null);
    }
  });

  const deleteMockAttemptMutation = useMutation({
    mutationFn: (id) => UserMockExamAttempt.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockAttempts'] });
      setDeleteConfirm(null);
    }
  });

  const handleDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'progress') {
      deleteProgressMutation.mutate(deleteConfirm.id);
    } else if (deleteConfirm.type === 'attempt') {
      deleteAttemptMutation.mutate(deleteConfirm.id);
    } else if (deleteConfirm.type === 'feedback') {
      deleteFeedbackMutation.mutate(deleteConfirm.id);
    } else if (deleteConfirm.type === 'mockAttempt') {
      deleteMockAttemptMutation.mutate(deleteConfirm.id);
    }
  };

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

  // Filter out excluded users
  const excludedUserIds = new Set(allUsers.filter(u => u.exclude_from_analytics).map(u => u.id));
  const includedProgress = allProgress.filter(p => !excludedUserIds.has(p.user_id));
  const includedAttempts = allAttempts.filter(a => !excludedUserIds.has(a.created_by));

  // Calculate statistics per question
  const questionStats = questions.map(question => {
    const attempts = includedProgress.filter(p => p.question_id === question.id && p.status !== "unseen");
    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter(p => p.status === "correct").length;
    const percentCorrect = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

    const wrongAnswers = includedAttempts.filter(a => 
      a.question_id === question.id && 
      a.selected_answer !== question.correct_answer
    );
    const answerCounts = {};
    wrongAnswers.forEach(a => {
      answerCounts[a.selected_answer] = (answerCounts[a.selected_answer] || 0) + 1;
    });
    const mostCommonWrong = Object.entries(answerCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      ...question,
      totalAttempts,
      percentCorrect,
      mostCommonWrongAnswer: mostCommonWrong ? mostCommonWrong[0] : 'N/A',
      mostCommonWrongCount: mostCommonWrong ? mostCommonWrong[1] : 0
    };
  });

  // Filter questions
  const filteredQuestions = questionStats.filter(q => {
    if (q.totalAttempts < minAttempts) return false;
    if (filters.year_id !== "all" && q.year_id !== filters.year_id) return false;
    if (filters.module_id !== "all" && q.module_id !== filters.module_id) return false;
    if (filters.submodule_id !== "all" && q.submodule_id !== filters.submodule_id) return false;
    return true;
  });

  // Sort questions
  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    if (sortBy === "lowest_accuracy") {
      return a.percentCorrect - b.percentCorrect;
    } else if (sortBy === "highest_attempts") {
      return b.totalAttempts - a.totalAttempts;
    }
    return 0;
  });

  // Calculate topic-level statistics
  const topicStats = {};
  
  questions.forEach(q => {
    const key = q.submodule_id || q.module_id;
    if (!key) return;

    if (!topicStats[key]) {
      let displayName = 'Unknown';
      if (q.submodule_id) {
        const submodule = submodules.find(s => s.id === q.submodule_id);
        const module = modules.find(m => m.id === q.module_id);
        displayName = module?.name && submodule?.name 
          ? `${module.name} - ${submodule.name}`
          : submodule?.name || 'Unknown';
      } else if (q.module_id) {
        const module = modules.find(m => m.id === q.module_id);
        displayName = module?.name || 'Unknown';
      }

      const year = years.find(y => y.id === q.year_id);
      
      topicStats[key] = {
        name: displayName,
        yearName: year?.name || 'Unknown',
        totalQuestions: 0,
        totalAttempts: 0,
        correctAttempts: 0
      };
    }

    topicStats[key].totalQuestions++;
    const attempts = includedProgress.filter(p => p.question_id === q.id && p.status !== "unseen");
    topicStats[key].totalAttempts += attempts.length;
    topicStats[key].correctAttempts += attempts.filter(p => p.status === "correct").length;
  });

  const topicStatsArray = Object.values(topicStats)
    .map(topic => ({
      ...topic,
      accuracy: topic.totalAttempts > 0 
        ? Math.round((topic.correctAttempts / topic.totalAttempts) * 100) 
        : 0
    }))
    .filter(topic => topic.totalAttempts >= minAttempts)
    .sort((a, b) => a.accuracy - b.accuracy);

  const filteredModules = filters.year_id && filters.year_id !== "all"
    ? modules.filter(m => m.year_id === filters.year_id)
    : [];

  const filteredSubmodules = filters.module_id && filters.module_id !== "all"
    ? submodules.filter(s => s.module_id === filters.module_id)
    : [];

  // Mock exam analytics
  const filteredFeedback = selectedMock === 'all' 
    ? feedback 
    : feedback.filter(f => f.mock_exam_id === selectedMock);

  const filteredMockAttempts = selectedMock === 'all'
    ? mockAttempts
    : mockAttempts.filter(a => a.mock_exam_id === selectedMock);

  const totalFeedback = filteredFeedback.length;
  const avgRating = totalFeedback > 0
    ? (filteredFeedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback).toFixed(1)
    : 0;

  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
    rating,
    count: filteredFeedback.filter(f => f.rating === rating).length
  }));

  const totalMockAttempts = filteredMockAttempts.length;
  const scores = filteredMockAttempts.map(a => (a.score / a.total_questions) * 100);
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
  
  const sortedScores = [...scores].sort((a, b) => a - b);
  const medianScore = sortedScores.length > 0
    ? sortedScores.length % 2 === 0
      ? ((sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2).toFixed(1)
      : sortedScores[Math.floor(sortedScores.length / 2)].toFixed(1)
    : 0;

  const maxRatingCount = Math.max(...ratingDistribution.map(r => r.count), 1);

  // Time-based trends for question performance
  const getDaysInRange = () => {
    const days = [];
    const now = new Date();
    for (let i = timeRange - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  const daysInRange = getDaysInRange();
  const dailyQuestionActivity = daysInRange.map(date => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayAttempts = includedAttempts.filter(a => {
      const created = new Date(a.created_date);
      return created >= date && created < nextDay;
    });
    const correct = dayAttempts.filter(a => a.is_correct).length;
    return {
      date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
      attempts: dayAttempts.length,
      accuracy: dayAttempts.length > 0 ? Math.round((correct / dayAttempts.length) * 100) : 0
    };
  });

  // Predictive analytics
  const predictNextWeekAccuracy = () => {
    const last7Days = dailyQuestionActivity.slice(-7);
    const avgAccuracy = last7Days.reduce((sum, day) => sum + day.accuracy, 0) / 7;
    return Math.round(avgAccuracy);
  };

  const calculateAccuracyTrend = () => {
    const firstWeek = dailyQuestionActivity.slice(0, 7);
    const lastWeek = dailyQuestionActivity.slice(-7);
    const firstAvg = firstWeek.reduce((sum, day) => sum + day.accuracy, 0) / 7;
    const lastAvg = lastWeek.reduce((sum, day) => sum + day.accuracy, 0) / 7;
    return Math.round(lastAvg - firstAvg);
  };

  // Export functionality
  const exportQuestionData = () => {
    const csvData = [
      ['Question', 'Year', 'Module', 'Attempts', 'Accuracy %', 'Most Common Wrong'],
      ...sortedQuestions.map(q => {
        const year = years.find(y => y.id === q.year_id);
        const module = modules.find(m => m.id === q.module_id);
        return [
          q.question_text.substring(0, 100),
          year?.name || 'Unknown',
          module?.name || 'Unknown',
          q.totalAttempts,
          q.percentCorrect,
          q.mostCommonWrongAnswer
        ];
      })
    ];
    const csv = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `question-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportTopicData = () => {
    const csvData = [
      ['Topic', 'Year', 'Questions', 'Attempts', 'Accuracy %'],
      ...topicStatsArray.map(t => [t.name, t.yearName, t.totalQuestions, t.totalAttempts, t.accuracy])
    ];
    const csv = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `topic-analytics-${new Date().toISOString().split('T')[0]}.csv`;
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
                <div className="h-10 w-10 rounded-xl bg-teal-600 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">Question Analytics</h1>
              </div>
              <p className="text-slate-600">Question performance and mock exam analytics</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="mocks">Mock Exams</TabsTrigger>
          </TabsList>

          {/* Question Performance Tab */}
          <TabsContent value="questions" className="space-y-6">
            <div className="flex justify-end">
              <div className="flex gap-2">
                <Button onClick={exportTopicData} variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Topics
                </Button>
                <Button onClick={exportQuestionData} variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Questions
                </Button>
              </div>
            </div>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-sm text-slate-600 mb-1">Total Questions</p>
                  <p className="text-3xl font-bold text-slate-900">{questions.length}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-sm text-slate-600 mb-1">Total Attempts</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {includedProgress.filter(p => p.status !== "unseen").length}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-sm text-slate-600 mb-1">Questions Above Threshold</p>
                  <p className="text-3xl font-bold text-slate-900">{filteredQuestions.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">Filters</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Min Attempts:</label>
                    <Input
                      type="number"
                      value={minAttempts}
                      onChange={(e) => setMinAttempts(parseInt(e.target.value) || 0)}
                      className="w-20"
                      min="0"
                    />
                  </div>

                  <Select 
                    value={filters.year_id} 
                    onValueChange={(v) => setFilters({ ...filters, year_id: v, module_id: "all", submodule_id: "all" })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {years.map(y => (
                        <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={filters.module_id} 
                    onValueChange={(v) => setFilters({ ...filters, module_id: v, submodule_id: "all" })}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Modules" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modules</SelectItem>
                      {filteredModules.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={filters.submodule_id} 
                    onValueChange={(v) => setFilters({ ...filters, submodule_id: v })}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Submodules" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Submodules</SelectItem>
                      {filteredSubmodules.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lowest_accuracy">Lowest Accuracy</SelectItem>
                      <SelectItem value="highest_attempts">Most Attempts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <Button
                    variant="outline"
                    onClick={() => setShowRawData(!showRawData)}
                    className="gap-2"
                  >
                    <Database className="h-4 w-4" />
                    {showRawData ? 'Hide' : 'Show'} Raw Data (Delete Test Records)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Raw Data Tables */}
            {showRawData && (
              <div className="space-y-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">User Progress Records</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-slate-200 sticky top-0 bg-white">
                          <tr>
                            <th className="text-left py-3 px-4 font-medium text-slate-700">Question ID</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-700">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-700">Attempt Count</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-700">Last Answered</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {includedProgress.map((prog) => (
                            <tr key={prog.id} className="border-b border-slate-100">
                              <td className="py-3 px-4 text-slate-700 font-mono text-xs">{prog.question_id.substring(0, 8)}...</td>
                              <td className="py-3 px-4 text-slate-700">{prog.status}</td>
                              <td className="py-3 px-4 text-slate-700">{prog.attempt_count || 0}</td>
                              <td className="py-3 px-4 text-slate-500">
                                {prog.last_answered_at ? new Date(prog.last_answered_at).toLocaleDateString("en-GB") : '—'}
                              </td>
                              <td className="py-3 px-4">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteConfirm({ type: 'progress', id: prog.id })}
                                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Question Attempts Records</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-slate-200 sticky top-0 bg-white">
                          <tr>
                            <th className="text-left py-3 px-4 font-medium text-slate-700">Question ID</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-700">Selected Answer</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-700">Correct</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-700">Created</th>
                            <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {includedAttempts.map((att) => (
                            <tr key={att.id} className="border-b border-slate-100">
                              <td className="py-3 px-4 text-slate-700 font-mono text-xs">{att.question_id.substring(0, 8)}...</td>
                              <td className="py-3 px-4 text-slate-700">{att.selected_answer}</td>
                              <td className="py-3 px-4">
                                {att.is_correct ? (
                                  <span className="text-emerald-700">✓ Yes</span>
                                ) : (
                                  <span className="text-rose-700">✗ No</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {new Date(att.created_date).toLocaleDateString("en-gb")}
                              </td>
                              <td className="py-3 px-4">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteConfirm({ type: 'attempt', id: att.id })}
                                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Topic Stats */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800">Topic Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                  {topicStatsArray.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">
                      No topics meet the minimum attempts threshold
                    </p>
                  ) : (
                    topicStatsArray.map((topic, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{topic.name}</p>
                            <p className="text-xs text-slate-500">{topic.yearName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-slate-900">{topic.accuracy}%</p>
                            <p className="text-xs text-slate-500">{topic.totalAttempts} attempts</p>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-slate-600 transition-all"
                            style={{ width: `${topic.accuracy}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Question Stats */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-slate-800">Question Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                  {sortedQuestions.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">
                      No questions meet the current filters
                    </p>
                  ) : (
                    sortedQuestions.map((q, idx) => {
                      const year = years.find(y => y.id === q.year_id);
                      const module = modules.find(m => m.id === q.module_id);
                      
                      return (
                        <div key={q.id} className="p-4 bg-slate-50 rounded-lg space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 pr-4">
                              <p className="text-sm font-medium text-slate-800 line-clamp-2">
                                {q.question_text}
                              </p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs text-slate-500">{year?.name}</span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs text-slate-500">{module?.name}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-slate-900">{q.percentCorrect}%</p>
                              <p className="text-xs text-slate-500">{q.totalAttempts} attempts</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                            <span className="text-slate-600">
                              Most common wrong: <span className="font-medium">{q.mostCommonWrongAnswer}</span>
                              {q.mostCommonWrongCount > 0 && (
                                <span className="text-slate-400 ml-1">({q.mostCommonWrongCount}x)</span>
                              )}
                            </span>
                          </div>

                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-slate-600 transition-all"
                              style={{ width: `${q.percentCorrect}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
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
                <CardTitle>Daily Question Attempts (Last {timeRange} Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyQuestionActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="attempts" fill="#0d9488" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Accuracy Trend (Last {timeRange} Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyQuestionActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">First Week Avg</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">
                    {Math.round(dailyQuestionActivity.slice(0, 7).reduce((sum, day) => sum + day.accuracy, 0) / 7)}%
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Days 1-7</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Last Week Avg</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">
                    {Math.round(dailyQuestionActivity.slice(-7).reduce((sum, day) => sum + day.accuracy, 0) / 7)}%
                  </p>
                  <p className="text-sm text-slate-500 mt-1">Days 24-30</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {calculateAccuracyTrend() >= 0 ? (
                      <TrendingUp className="h-6 w-6 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-rose-600" />
                    )}
                    <p className="text-3xl font-bold text-slate-900">
                      {calculateAccuracyTrend() >= 0 ? '+' : ''}{calculateAccuracyTrend()}%
                    </p>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Change over 30 days</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Performance Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-5 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700 mb-1">Predicted Accuracy (Next 7d)</p>
                    <p className="text-4xl font-bold text-blue-900">{predictNextWeekAccuracy()}%</p>
                    <p className="text-xs text-blue-600 mt-1">Based on recent trends</p>
                  </div>

                  <div className="p-5 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-700 mb-1">Performance Trend</p>
                    <div className="flex items-center gap-2">
                      {calculateAccuracyTrend() >= 0 ? (
                        <TrendingUp className="h-8 w-8 text-emerald-600" />
                      ) : (
                        <TrendingDown className="h-8 w-8 text-rose-600" />
                      )}
                      <p className="text-4xl font-bold text-purple-900">
                        {calculateAccuracyTrend() >= 0 ? '+' : ''}{calculateAccuracyTrend()}%
                      </p>
                    </div>
                    <p className="text-xs text-purple-600 mt-1">{timeRange}-day change</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Topics Needing Attention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topicStatsArray.slice(0, 5).map((topic, idx) => (
                    <div key={idx} className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-amber-900">{topic.name}</p>
                          <p className="text-xs text-amber-700">{topic.yearName}</p>
                        </div>
                        <p className="text-2xl font-bold text-amber-900">{topic.accuracy}%</p>
                      </div>
                      <p className="text-sm text-amber-700">
                        {topic.accuracy < 50 
                          ? 'Critical - Consider review sessions or additional resources'
                          : topic.accuracy < 60
                          ? 'Low performance - May need targeted practice'
                          : 'Below average - Monitor and support'}
                      </p>
                    </div>
                  ))}
                  {topicStatsArray.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-8">Not enough data for predictions</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Insights & Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="font-medium text-slate-900 mb-1">Overall Performance</p>
                    <p className="text-sm text-slate-600">
                      {(() => {
                        const avgAccuracy = dailyQuestionActivity.reduce((sum, day) => sum + day.accuracy, 0) / dailyQuestionActivity.length;
                        if (avgAccuracy >= 70) return 'Strong performance across the board. Users are demonstrating good understanding.';
                        if (avgAccuracy >= 60) return 'Moderate performance. Consider additional support for challenging topics.';
                        return 'Performance below target. Review question difficulty and provide more learning resources.';
                      })()}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="font-medium text-slate-900 mb-1">Difficulty Balance</p>
                    <p className="text-sm text-slate-600">
                      {sortedQuestions.length > 0 && (() => {
                        const veryHard = sortedQuestions.filter(q => q.percentCorrect < 40).length;
                        const hard = sortedQuestions.filter(q => q.percentCorrect >= 40 && q.percentCorrect < 60).length;
                        const moderate = sortedQuestions.filter(q => q.percentCorrect >= 60 && q.percentCorrect < 80).length;
                        const easy = sortedQuestions.filter(q => q.percentCorrect >= 80).length;
                        return `Distribution: ${veryHard} very hard, ${hard} hard, ${moderate} moderate, ${easy} easy questions.`;
                      })()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mock Exam Tab */}
          <TabsContent value="mocks" className="space-y-6">
            {/* Mock Filter */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-slate-700">Filter by Mock Exam:</label>
                  <Select value={selectedMock} onValueChange={setSelectedMock}>
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Mock Exams</SelectItem>
                      {mockExams.map(exam => (
                        <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-8 w-8 text-teal-600" />
                    <div>
                      <p className="text-sm text-slate-600">Total Feedback</p>
                      <p className="text-2xl font-bold text-slate-900">{totalFeedback}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <Star className="h-8 w-8 text-amber-500" />
                    <div>
                      <p className="text-sm text-slate-600">Avg Rating</p>
                      <p className="text-2xl font-bold text-slate-900">{avgRating} / 5</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-slate-600">Total Attempts</p>
                      <p className="text-2xl font-bold text-slate-900">{totalMockAttempts}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-8 w-8 text-emerald-600" />
                    <div>
                      <p className="text-sm text-slate-600">Avg Score</p>
                      <p className="text-2xl font-bold text-slate-900">{avgScore}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Rating Distribution */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ratingDistribution.map(({ rating, count }) => (
                      <div key={rating} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-700 flex items-center gap-1">
                            {rating} <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                          </span>
                          <span className="font-semibold text-slate-900">{count}</span>
                        </div>
                        <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 transition-all"
                            style={{ width: `${(count / maxRatingCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Comments */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Comments</CardTitle>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto space-y-3">
                  {filteredFeedback.filter(f => f.comment).length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">No comments yet</p>
                  ) : (
                    filteredFeedback.filter(f => f.comment).map((f, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3 w-3",
                                  i < f.rating ? "text-amber-500 fill-amber-500" : "text-slate-300"
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(f.created_date).toLocaleDateString("en-GB")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">{f.comment}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Raw Feedback Table */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Raw Mock Exam Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Mock Exam</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Rating</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Comment</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFeedback.map((f, idx) => {
                        const exam = mockExams.find(e => e.id === f.mock_exam_id);
                        return (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="py-3 px-4 text-slate-700">{exam?.name || 'Unknown'}</td>
                            <td className="py-3 px-4">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      "h-3 w-3",
                                      i < f.rating ? "text-amber-500 fill-amber-500" : "text-slate-300"
                                    )}
                                  />
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-700">{f.comment || '—'}</td>
                            <td className="py-3 px-4 text-slate-500">
                              {new Date(f.created_date).toLocaleDateString('en-GB')}
                            </td>
                            <td className="py-3 px-4">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirm({ type: 'feedback', id: f.id })}
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Data</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}