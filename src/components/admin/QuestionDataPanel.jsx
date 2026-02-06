import React, { useState } from 'react';
import { QuestionAttempt, UserQuestionProgress, Question, UserMockExamAnswer, QuestionReport } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Clock, Target, AlertTriangle, AlertCircle, Table as TableIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MIN_ATTEMPTS = 5;

const categoryLabels = {
  wrong_answer: 'Wrong answer',
  ambiguous_wording: 'Ambiguous wording',
  typo_formatting: 'Typo/formatting',
  explanation_issue: 'Explanation issue',
  tag_module_incorrect: 'Tag/module incorrect',
  other: 'Other'
};

export default function QuestionDataPanel({ questionId, embedded = false }) {
  const queryClient = useQueryClient();
  const [showRawData, setShowRawData] = useState(false);
  const { data: attempts = [] } = useQuery({
    queryKey: ['questionAttempts', questionId],
    queryFn: async () => {
      const allAttempts = await QuestionAttempt.list();
      return allAttempts.filter(a => a.question_id === questionId);
    },
    enabled: !!questionId
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['questionProgress', questionId],
    queryFn: async () => {
      const allProgress = await UserQuestionProgress.list();
      return allProgress.filter(p => p.question_id === questionId);
    },
    enabled: !!questionId
  });

  const { data: question } = useQuery({
    queryKey: ['question', questionId],
    queryFn: async () => {
      const questions = await Question.filter({ id: questionId });
      return questions[0];
    },
    enabled: !!questionId
  });

  const { data: mockAnswers = [] } = useQuery({
    queryKey: ['mockAnswers', questionId],
    queryFn: async () => {
      const allAnswers = await UserMockExamAnswer.list();
      return allAnswers.filter(a => a.question_id === questionId);
    },
    enabled: !!questionId
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['questionReports', questionId],
    queryFn: async () => {
      const allReports = await QuestionReport.list();
      return allReports.filter(r => r.question_id === questionId);
    },
    enabled: !!questionId
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, data }) => {
      return QuestionReport.update(reportId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionReports'] });
    }
  });

  if (!questionId) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-lg">
        <p className="text-slate-500">Save the question to view performance data</p>
      </div>
    );
  }

  const totalAttempts = attempts.length;
  const correctCount = attempts.filter(a => a.is_correct).length;
  const incorrectCount = totalAttempts - correctCount;
  const correctPercent = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

  // Answer distribution
  const answerDistribution = {};
  question?.options?.forEach(opt => {
    answerDistribution[opt.label] = 0;
  });
  attempts.forEach(a => {
    if (answerDistribution[a.selected_answer] !== undefined) {
      answerDistribution[a.selected_answer]++;
    }
  });

  const distributionData = Object.entries(answerDistribution).map(([label, count]) => ({
    label,
    count,
    percentage: totalAttempts > 0 ? Math.round((count / totalAttempts) * 100) : 0,
    isCorrect: label === question?.correct_answer
  }));

  // Find most common incorrect answer
  const incorrectOptions = distributionData.filter(d => !d.isCorrect);
  const mostCommonIncorrect = incorrectOptions.sort((a, b) => b.count - a.count)[0];

  // Time statistics
  const timesInSeconds = attempts.filter(a => a.time_taken_seconds).map(a => a.time_taken_seconds);
  timesInSeconds.sort((a, b) => a - b);
  
  const avgTime = timesInSeconds.length > 0 
    ? Math.round(timesInSeconds.reduce((a, b) => a + b, 0) / timesInSeconds.length) 
    : 0;
  
  const medianTime = timesInSeconds.length > 0 
    ? timesInSeconds[Math.floor(timesInSeconds.length / 2)] 
    : 0;
  
  const p25 = timesInSeconds.length > 0 
    ? timesInSeconds[Math.floor(timesInSeconds.length * 0.25)] 
    : 0;
  
  const p75 = timesInSeconds.length > 0 
    ? timesInSeconds[Math.floor(timesInSeconds.length * 0.75)] 
    : 0;
  
  const p95 = timesInSeconds.length > 0 
    ? timesInSeconds[Math.floor(timesInSeconds.length * 0.95)] 
    : 0;

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  const lowData = totalAttempts < MIN_ATTEMPTS;

  // Context breakdown
  const practiceAttempts = attempts;
  const mockAttemptsData = mockAnswers.filter(a => a.selected_answer);
  const practiceCorrect = practiceAttempts.filter(a => a.is_correct).length;
  const mockCorrect = mockAttemptsData.filter(a => a.selected_answer === question?.correct_answer).length;

  const practiceAccuracy = practiceAttempts.length > 0 ? Math.round((practiceCorrect / practiceAttempts.length) * 100) : 0;
  const mockAccuracy = mockAttemptsData.length > 0 ? Math.round((mockCorrect / mockAttemptsData.length) * 100) : 0;

  const handleReportAction = async (reportId, status) => {
    await updateReportMutation.mutateAsync({
      reportId,
      data: { status }
    });
  };

  const CardWrapper = embedded ? 'div' : Card;

  return (
    <Tabs defaultValue="analytics" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
        <TabsTrigger value="raw">Raw Data</TabsTrigger>
      </TabsList>

      <TabsContent value="analytics" className="space-y-6 mt-6">
      {lowData && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              Limited data available ({totalAttempts} attempt{totalAttempts !== 1 ? 's' : ''}). 
              Stats become more reliable after {MIN_ATTEMPTS}+ attempts.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Attempt & Accuracy Metrics */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-teal-600" />
            Attempt & Accuracy Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{totalAttempts}</p>
              <p className="text-sm text-slate-500">Total Attempts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{correctPercent}%</p>
              <p className="text-sm text-slate-500">Correct</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{correctCount}</p>
              <p className="text-sm text-slate-500">Correct Answers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-rose-600">{incorrectCount}</p>
              <p className="text-sm text-slate-500">Incorrect</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Accuracy</span>
              <span>{correctPercent}%</span>
            </div>
            <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="absolute h-full bg-emerald-500 transition-all"
                style={{ width: `${correctPercent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Answer Option Breakdown */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-teal-600" />
            Answer Option Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-6">
            {distributionData.map(d => (
              <div key={d.label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-semibold text-sm px-2 py-1 rounded",
                      d.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                    )}>
                      {d.label}
                    </span>
                    {d.isCorrect && (
                      <Badge className="bg-emerald-100 text-emerald-700">Correct</Badge>
                    )}
                    {mostCommonIncorrect?.label === d.label && !d.isCorrect && (
                      <Badge variant="outline" className="text-rose-600 border-rose-300">
                        Most Common Incorrect
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-slate-600">
                    {d.count} ({d.percentage}%)
                  </span>
                </div>
                <Progress value={d.percentage} className="h-2" />
              </div>
            ))}
          </div>

          {totalAttempts > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`${value} selections`, 'Count']}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {distributionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isCorrect ? '#10b981' : '#94a3b8'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Analytics */}
      {timesInSeconds.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-teal-600" />
              Time-on-Question Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-xl font-bold text-slate-900">{formatTime(avgTime)}</p>
                <p className="text-xs text-slate-500">Average</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-slate-900">{formatTime(medianTime)}</p>
                <p className="text-xs text-slate-500">Median</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-slate-900">{formatTime(p25)}</p>
                <p className="text-xs text-slate-500">25th Percentile</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-slate-900">{formatTime(p75)}</p>
                <p className="text-xs text-slate-500">75th Percentile</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-slate-900">{formatTime(p95)}</p>
                <p className="text-xs text-slate-500">95th Percentile</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 text-center">
              Based on {timesInSeconds.length} timed attempt{timesInSeconds.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Context Breakdown */}
      {(practiceAttempts.length > 0 || mockAttemptsData.length > 0) && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Performance by Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Practice Sessions</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Attempts</span>
                    <span className="font-semibold">{practiceAttempts.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Accuracy</span>
                    <span className="font-semibold text-emerald-600">{practiceAccuracy}%</span>
                  </div>
                  <Progress value={practiceAccuracy} className="h-2" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Mock Exams</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Attempts</span>
                    <span className="font-semibold">{mockAttemptsData.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Accuracy</span>
                    <span className="font-semibold text-emerald-600">{mockAccuracy}%</span>
                  </div>
                  <Progress value={mockAccuracy} className="h-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </TabsContent>

      {/* Reports Tab */}
      <TabsContent value="reports" className="mt-6">
        {reports.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-lg">
            <p className="text-slate-500">No reports for this question</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <Card key={report.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[report.category]}
                        </Badge>
                        <Badge className={cn(
                          "text-xs",
                          report.status === 'open' && "bg-amber-100 text-amber-700",
                          report.status === 'resolved' && "bg-teal-100 text-teal-700",
                          report.status === 'dismissed' && "bg-slate-100 text-slate-700"
                        )}>
                          {report.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700">{report.description}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(report.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    {report.status === 'open' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReportAction(report.id, 'resolved')}
                        >
                          Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReportAction(report.id, 'dismissed')}
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Raw Data Tab */}
      <TabsContent value="raw" className="mt-6">
        {attempts.length === 0 && mockAttemptsData.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-lg">
            <p className="text-slate-500">No attempt data available</p>
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TableIcon className="h-5 w-5" />
                Anonymized Attempt Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Context</TableHead>
                      <TableHead>Selected</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      ...attempts.map(a => ({
                        timestamp: a.created_date,
                        context: 'Practice',
                        selected: a.selected_answer,
                        correct: a.is_correct,
                        time: a.time_taken_seconds
                      })),
                      ...mockAttemptsData.map(a => ({
                        timestamp: a.created_date,
                        context: 'Mock',
                        selected: a.selected_answer,
                        correct: a.selected_answer === question?.correct_answer,
                        time: null
                      }))
                    ]
                      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                      .slice(0, 100)
                      .map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">
                            {new Date(row.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {row.context}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold">{row.selected}</TableCell>
                          <TableCell>
                            {row.correct ? (
                              <Badge className="bg-emerald-100 text-emerald-700 text-xs">Correct</Badge>
                            ) : (
                              <Badge className="bg-rose-100 text-rose-700 text-xs">Incorrect</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.time ? `${row.time}s` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
              {(attempts.length + mockAttemptsData.length) > 100 && (
                <p className="text-xs text-slate-500 mt-3 text-center">
                  Showing most recent 100 attempts
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}