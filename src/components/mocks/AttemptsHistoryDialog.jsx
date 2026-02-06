import React from 'react';
import { UserMockExamAttempt, UserMockExamAnswer } from '@/api/entities';
import { client } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, CheckCircle2, XCircle, Eye, Trash2, Calendar } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function AttemptsHistoryDialog({ mockExam, open, onOpenChange }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteAttemptId, setDeleteAttemptId] = React.useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => client.auth.me()
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['mockAttempts', mockExam?.id, user?.id],
    queryFn: async () => {
      if (!mockExam || !user) return [];
      const allAttempts = await UserMockExamAttempt.filter({
        mock_exam_id: mockExam.id,
        user_id: user.id,
        status: 'completed'
      });
      return allAttempts.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
    },
    enabled: !!mockExam && !!user
  });

  const deleteAttemptMutation = useMutation({
    mutationFn: async (attemptId) => {
      await UserMockExamAttempt.delete(attemptId);
      // Also delete associated answers
      const answers = await UserMockExamAnswer.filter({ attempt_id: attemptId });
      await Promise.all(answers.map(a => UserMockExamAnswer.delete(a.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockAttempts'] });
      setDeleteAttemptId(null);
    }
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (started, completed) => {
    if (!started || !completed) return '-';
    const diff = new Date(completed) - new Date(started);
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min`;
  };

  const handleReviewAttempt = (attemptId) => {
    navigate(createPageUrl(`MockExamPractice?examId=${mockExam.id}&attemptId=${attemptId}`));
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attempts History</DialogTitle>
            <DialogDescription>
              {mockExam?.name} — {attempts.length} attempt{attempts.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          {attempts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No completed attempts yet
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((attempt, idx) => {
                const score = attempt.score || 0;
                const total = attempt.total_questions || 0;
                const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
                const incorrect = total - score;

                return (
                  <Card key={attempt.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              Attempt #{attempts.length - idx}
                            </Badge>
                            <Badge className={cn(
                              percentage >= 70 ? "bg-emerald-100 text-emerald-700" :
                              percentage >= 50 ? "bg-amber-100 text-amber-700" :
                              "bg-rose-100 text-rose-700"
                            )}>
                              {percentage}%
                            </Badge>
                          </div>
                          <div className="text-sm text-slate-600 space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(attempt.completed_at)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDuration(attempt.started_at, attempt.completed_at)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleReviewAttempt(attempt.id)}
                            className="bg-teal-600 hover:bg-teal-700"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                          {user?.role === 'admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteAttemptId(attempt.id)}
                              className="text-rose-600 hover:text-rose-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-lg font-bold">{score}</span>
                          </div>
                          <p className="text-xs text-slate-500">Correct</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 text-rose-600 mb-1">
                            <XCircle className="h-4 w-4" />
                            <span className="text-lg font-bold">{incorrect}</span>
                          </div>
                          <p className="text-xs text-slate-500">Incorrect</p>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-slate-700 mb-1">
                            {total}
                          </div>
                          <p className="text-xs text-slate-500">Total</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAttemptId} onOpenChange={() => setDeleteAttemptId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attempt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this attempt and all associated answers. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteAttemptMutation.mutate(deleteAttemptId)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}