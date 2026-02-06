import React from 'react';
import { MockExam, Year, UserMockExamAttempt } from '@/api/entities';
import { client } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock, 
  FileText, 
  Play,
  CheckCircle2,
  Award,
  Plus,
  Pencil,
  MoreVertical,
  Trash2,
  History
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import AttemptsHistoryDialog from '@/components/mocks/AttemptsHistoryDialog';

export default function MockExams() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = React.useState(null);
  const [historyExam, setHistoryExam] = React.useState(null);

  const { data: mockExams = [], isLoading: loadingExams } = useQuery({
    queryKey: ['mockExams'],
    queryFn: () => MockExam.list()
  });

  const { data: years = [] } = useQuery({
    queryKey: ['years'],
    queryFn: () => Year.list()
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => client.auth.me()
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['mockExamAttempts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return UserMockExamAttempt.filter({ user_id: user.id });
    },
    enabled: !!user
  });

  // Group by year and semester
  const groupedExams = mockExams.reduce((acc, exam) => {
    const year = years.find(y => y.id === exam.year_id);
    const key = `${year?.name || 'Unknown'} - Semester ${exam.semester}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(exam);
    return acc;
  }, {});

  const getExamAttempts = (examId) => {
    return attempts.filter(a => a.mock_exam_id === examId && a.status === 'completed');
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => MockExam.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockExams'] });
      setDeleteId(null);
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mock Exams</h1>
            <p className="text-slate-500 mt-1"></p>
          </div>
          {user?.app_role === 'committee' && (
            <Link to={createPageUrl('AddMockExam')}>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Mock Exam
              </Button>
            </Link>
          )}
        </div>

        {/* Exam Groups */}
        {loadingExams ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : Object.keys(groupedExams).length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">Coming Soon!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedExams).map(([groupName, exams]) => (
              <div key={groupName}>
                <h2 className="text-lg font-semibold text-slate-800 mb-4">{groupName}</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {exams.map(exam => {
                    const completedAttempts = getExamAttempts(exam.id);
                    const bestScore = completedAttempts.length > 0
                      ? Math.max(...completedAttempts.map(a => {
                          const percentage = (a.score / a.total_questions) * 100;
                          return Math.round(Math.min(percentage, 100));
                        }))
                      : null;

                    return (
                      <Card key={exam.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{exam.name}</CardTitle>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1 text-sm text-slate-600">
                                  <FileText className="h-4 w-4" />
                                  {exam.mock_question_ids?.length || 0} questions
                                  </div>
                              </div>
                            </div>
                            {bestScore !== null && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                <Award className="h-3 w-3 mr-1" />
                                Best: {bestScore}%
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="text-sm">
                              {completedAttempts.length > 0 ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setHistoryExam(exam)}
                                  className="text-slate-600 hover:text-slate-900 -ml-3"
                                >
                                  <History className="h-4 w-4 mr-2" />
                                  Attempted {completedAttempts.length} time{completedAttempts.length !== 1 ? 's' : ''}
                                </Button>
                              ) : (
                                <span className="text-slate-500">Not attempted yet</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Link to={createPageUrl(`MockExamPractice?examId=${exam.id}`)}>
                                <Button className="bg-teal-600 hover:bg-teal-700">
                                  <Play className="h-4 w-4 mr-2" />
                                  Start Exam
                                </Button>
                              </Link>
                              {user?.app_role === 'committee' && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <Link to={createPageUrl(`AddMockExam?id=${exam.id}`)}>
                                      <DropdownMenuItem>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                    </Link>
                                    <DropdownMenuItem 
                                      className="text-rose-600"
                                      onClick={() => setDeleteId(exam.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Mock Exam</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this mock exam? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Attempts History Dialog */}
      <AttemptsHistoryDialog 
        mockExam={historyExam}
        open={!!historyExam}
        onOpenChange={(open) => !open && setHistoryExam(null)}
      />
    </div>
  );
}