import React, { useState, useEffect } from 'react';
import { UserQuestionProgress, UserMockExamAttempt, UserPracticeProgress, Question, Module, Submodule } from '@/api/entities';
import { client } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, LogOut, Trash2, Download, Database, FileText, UserX, Shield } from 'lucide-react';
import { toast } from "sonner";

export default function Settings() {
  const queryClient = useQueryClient();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');

  const { data: user, refetch: refetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => client.auth.me()
  });

  const { data: userProgress = [] } = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return UserQuestionProgress.filter({ user_id: user.id });
    },
    enabled: !!user
  });

  const { data: mockAttempts = [] } = useQuery({
    queryKey: ['userMockAttempts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return UserMockExamAttempt.filter({ user_id: user.id });
    },
    enabled: !!user
  });

  const { data: practiceProgress = [] } = useQuery({
    queryKey: ['practiceProgress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return UserPracticeProgress.filter({ user_id: user.id });
    },
    enabled: !!user
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => Question.list()
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules'],
    queryFn: () => Module.list()
  });

  const { data: submodules = [] } = useQuery({
    queryKey: ['submodules'],
    queryFn: () => Submodule.list()
  });



  const updateUserMutation = useMutation({
    mutationFn: (data) => client.auth.updateMe(data),
    onSuccess: () => {
      refetchUser();
      toast.success('Settings updated successfully');
    }
  });



  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      // Note: This is simplified - in production you'd call a backend endpoint
      // that properly deletes user data across all tables
      await Promise.all([
        ...userProgress.map(p => UserQuestionProgress.delete(p.id)),
        ...practiceProgress.map(p => UserPracticeProgress.delete(p.id)),
        ...mockAttempts.map(a => UserMockExamAttempt.delete(a.id))
      ]);
      // Then logout and redirect
      client.auth.logout();
    }
  });

  const resetProgressMutation = useMutation({
    mutationFn: async () => {
      // Delete all user progress
      const progressIds = userProgress.map(p => p.id);
      const practiceIds = practiceProgress.map(p => p.id);
      const attemptIds = mockAttempts.map(a => a.id);

      await Promise.all([
        ...progressIds.map(id => UserQuestionProgress.delete(id)),
        ...practiceIds.map(id => UserPracticeProgress.delete(id)),
        ...attemptIds.map(id => UserMockExamAttempt.delete(id))
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProgress'] });
      queryClient.invalidateQueries({ queryKey: ['practiceProgress'] });
      queryClient.invalidateQueries({ queryKey: ['userMockAttempts'] });
      setShowResetConfirm(false);
    }
  });

  const handleExportData = (format) => {
    if (!user) return;

    // Enrich progress data with actual question details
    const enrichedProgress = userProgress.map(p => {
      const question = questions.find(q => q.id === p.question_id);
      const module = modules.find(m => m.id === question?.module_id);
      const submodule = submodules.find(s => s.id === question?.submodule_id);
      
      return {
        question_text: question?.question_text || 'Unknown',
        question_stem: question?.question_stem || '',
        module: module?.name || 'Unknown',
        submodule: submodule?.name || 'N/A',
        difficulty: question?.difficulty || 'Unknown',
        your_answer: practiceProgress.find(pp => pp.question_id === p.question_id)?.selected_answer || 'Not answered',
        correct_answer: question?.correct_answer || 'Unknown',
        status: p.status,
        attempt_count: p.attempt_count,
        last_answered: p.last_answered_at
      };
    });

    const data = {
      user: {
        email: user.email,
        role: user.role,
        created: user.created_date
      },
      questionProgress: enrichedProgress,
      mockAttempts: mockAttempts.map(a => ({
        mock_exam_id: a.mock_exam_id,
        score: a.score,
        total_questions: a.total_questions,
        percentage: a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : 0,
        started: a.started_at,
        completed: a.completed_at,
        status: a.status
      }))
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aim-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // CSV format with enriched data
      let csv = 'Question,Module,Submodule,Difficulty,Your Answer,Correct Answer,Status,Attempts,Last Answered\n';
      enrichedProgress.forEach(p => {
        const questionText = p.question_text.replace(/"/g, '""').substring(0, 100);
        const yourAnswer = String(p.your_answer).replace(/"/g, '""');
        const correctAnswer = String(p.correct_answer).replace(/"/g, '""');
        csv += `"${questionText}","${p.module}","${p.submodule}",${p.difficulty},"${yourAnswer}","${correctAnswer}",${p.status},${p.attempt_count},${p.last_answered || ''}\n`;
      });
      
      csv += '\n\nMock Exam Attempts\n';
      csv += 'Mock Exam ID,Score,Total Questions,Percentage,Status,Started,Completed\n';
      mockAttempts.forEach(a => {
        const percentage = a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : 0;
        csv += `${a.mock_exam_id},${a.score},${a.total_questions},${percentage}%,${a.status},${a.started_at},${a.completed_at || ''}\n`;
      });
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aim-data-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    toast.success(`Data exported as ${format.toUpperCase()}`);
  };

  const handleSignOut = () => {
    client.auth.logout();
  };



  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-slate-700 flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          </div>
          <p className="text-slate-600">Manage your account, preferences and data</p>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="mt-1.5">
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="bg-slate-50"
                  />
                  <p className="text-xs text-slate-500 mt-1">Email address cannot be changed</p>
                </div>
              </div>
              <div>
                <Label>Account Type</Label>
                <div className="mt-1.5">
                  {user.app_role === 'committee' ? (
                    <Badge className="bg-teal-100 text-teal-700 border-teal-200">
                      <Shield className="h-3 w-3 mr-1" />
                      Committee Member
                    </Badge>
                  ) : (
                    <Badge variant="outline">User</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Data & Privacy */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Your Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-3">
                  Download your activity data including questions attempted, progress, and mock exam results.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleExportData('json')} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export as JSON
                  </Button>
                  <Button variant="outline" onClick={() => handleExportData('csv')} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Export as CSV
                  </Button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-200">
                <div className="bg-slate-50 p-4 rounded-lg mb-3">
                  <p className="text-sm font-medium text-slate-800 mb-2">Current Progress Summary</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-600">Questions Attempted</p>
                      <p className="font-semibold text-slate-900">{userProgress.length}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Mock Exam Attempts</p>
                      <p className="font-semibold text-slate-900">{mockAttempts.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full justify-start gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm(true)}
                className="w-full justify-start gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
              >
                <Trash2 className="h-4 w-4" />
                Reset My Progress
              </Button>
              <p className="text-xs text-slate-500">
                Resetting progress will delete all your question attempts and mock exam results. This cannot be undone.
              </p>

              <Button
                variant="outline"
                onClick={() => setShowDeleteAccountConfirm(true)}
                className="w-full justify-start gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
              >
                <UserX className="h-4 w-4" />
                Delete My Account
              </Button>
              <p className="text-xs text-slate-500">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Progress?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete:
              <ul className="list-disc list-inside mt-3 space-y-1">
                <li>{userProgress.length} question progress records</li>
                <li>{practiceProgress.length} practice session records</li>
                <li>{mockAttempts.length} mock exam attempts</li>
              </ul>
              <p className="mt-3 font-semibold text-amber-600">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => resetProgressMutation.mutate()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Reset Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAccountConfirm} onOpenChange={setShowDeleteAccountConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all associated data.
              <p className="mt-3 font-semibold text-rose-600">This action cannot be undone. You will be signed out immediately.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteAccountMutation.mutate()}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  );
}