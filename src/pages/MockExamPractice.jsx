import React, { useState, useEffect, useRef } from 'react';
import { MockExam, UserMockExamAttempt, UserMockExamAnswer, MockExamQuestion, MockExamFeedback } from '@/api/entities';
import { client } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Flag,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  List
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import ReportQuestionDialog from '@/components/questions/ReportQuestionDialog';
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export default function MockExamPractice() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const examId = urlParams.get('examId');
  const attemptId = urlParams.get('attemptId');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [timeSetting, setTimeSetting] = useState(null);
  const [navigatorFilter, setNavigatorFilter] = useState('all'); // 'all', 'flagged', 'answered', 'unanswered'
  const timerRef = useRef(null);

  const { data: exam } = useQuery({
    queryKey: ['mockExam', examId],
    queryFn: async () => {
      const exams = await MockExam.filter({ id: examId });
      return exams[0];
    },
    enabled: !!examId
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => client.auth.me()
  });

  const { data: attempt, refetch: refetchAttempt } = useQuery({
    queryKey: ['mockExamAttempt', attemptId],
    queryFn: async () => {
      if (attemptId) {
        const attempts = await UserMockExamAttempt.filter({ id: attemptId });
        return attempts[0];
      }
      return null;
    },
    enabled: !!attemptId
  });

  const { data: answers = [] } = useQuery({
    queryKey: ['mockExamAnswers', attemptId],
    queryFn: async () => {
      if (!attemptId) return [];
      return UserMockExamAnswer.filter({ attempt_id: attemptId });
    },
    enabled: !!attemptId
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['mockExamQuestions', exam?.mock_question_ids],
    queryFn: async () => {
      if (!exam?.mock_question_ids) return [];
      const allQuestions = await MockExamQuestion.list();
      return exam.mock_question_ids.map(id => allQuestions.find(q => q.id === id)).filter(Boolean);
    },
    enabled: !!exam?.mock_question_ids
  });

  const createAttemptMutation = useMutation({
    mutationFn: (data) => UserMockExamAttempt.create(data),
    onSuccess: (newAttempt) => {
      window.location.href = createPageUrl(`MockExamPractice?examId=${examId}&attemptId=${newAttempt.id}`);
    }
  });

  const updateAttemptMutation = useMutation({
    mutationFn: ({ id, data }) => UserMockExamAttempt.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockExamAttempt'] });
    }
  });

  const upsertAnswerMutation = useMutation({
    mutationFn: async (data) => {
      const existing = answers.find(a => a.question_id === data.question_id);
      if (existing) {
        return UserMockExamAnswer.update(existing.id, data);
      }
      return UserMockExamAnswer.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockExamAnswers'] });
    }
  });

  const startExam = () => {
    if (!exam || !user || !timeSetting) return;
    
    createAttemptMutation.mutate({
      user_id: user.id,
      mock_exam_id: exam.id,
      started_at: new Date().toISOString(),
      time_setting: timeSetting,
      status: 'in_progress',
      total_questions: exam.mock_question_ids.length
    });
  };

  // Setup timer
  useEffect(() => {
    if (!exam || !attempt || attempt.status === 'completed') return;

    if (attempt.time_setting === 'untimed') {
      setTimeRemaining(null);
      return;
    }

    const limit = parseInt(attempt.time_setting);

    const startTime = new Date(attempt.started_at).getTime();
    const endTime = startTime + (limit * 60 * 1000);

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setTimeRemaining(Math.floor(remaining / 1000));

      if (remaining <= 0) {
        handleSubmit(true);
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [exam, attempt]);

  // Check if already completed
  useEffect(() => {
    if (attempt?.status === 'completed') {
      setShowResults(true);
    }
  }, [attempt]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers.find(a => a.question_id === currentQuestion?.id);

  const handleSelectAnswer = async (answer) => {
    if (!currentQuestion || !attemptId || showResults) return;

    await upsertAnswerMutation.mutateAsync({
      user_id: user.id,
      attempt_id: attemptId,
      question_id: currentQuestion.id,
      selected_answer: answer,
      eliminated_options: currentAnswer?.eliminated_options || []
    });
  };

  const handleTypedAnswer = async (value) => {
    if (!currentQuestion || !attemptId || showResults) return;

    await upsertAnswerMutation.mutateAsync({
      user_id: user.id,
      attempt_id: attemptId,
      question_id: currentQuestion.id,
      selected_answer: value,
      eliminated_options: []
    });
  };

  const handleToggleEliminate = async (option) => {
    if (!currentQuestion || !attemptId || showResults) return;

    const currentEliminated = currentAnswer?.eliminated_options || [];
    const newEliminated = currentEliminated.includes(option)
      ? currentEliminated.filter(o => o !== option)
      : [...currentEliminated, option];

    await upsertAnswerMutation.mutateAsync({
      user_id: user.id,
      attempt_id: attemptId,
      question_id: currentQuestion.id,
      selected_answer: currentAnswer?.selected_answer,
      eliminated_options: newEliminated
    });
  };

  const handleToggleFlag = async () => {
    if (!currentQuestion || !attemptId || showResults) return;

    await upsertAnswerMutation.mutateAsync({
      user_id: user.id,
      attempt_id: attemptId,
      question_id: currentQuestion.id,
      selected_answer: currentAnswer?.selected_answer,
      eliminated_options: currentAnswer?.eliminated_options || [],
      flagged: !currentAnswer?.flagged
    });
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit) {
      setShowSubmitDialog(false);
    }

    const correctCount = answers.filter(a => {
      const q = questions.find(q => q.id === a.question_id);
      return q && a.selected_answer === q.correct_answer;
    }).length;

    await updateAttemptMutation.mutateAsync({
      id: attemptId,
      data: {
        status: 'completed',
        completed_at: new Date().toISOString(),
        score: correctCount,
        total_questions: questions.length
      }
    });

    await refetchAttempt();
    setShowResults(true);
    setShowFeedbackDialog(true);
  };

  const submitFeedbackMutation = useMutation({
    mutationFn: (data) => MockExamFeedback.create(data),
    onSuccess: () => {
      setShowFeedbackDialog(false);
      setFeedbackRating(0);
      setFeedbackComment('');
    }
  });

  const handleSubmitFeedback = async () => {
    if (feedbackRating === 0 || !exam || !attemptId) return;

    await submitFeedbackMutation.mutateAsync({
      mock_exam_id: exam.id,
      attempt_id: attemptId,
      rating: feedbackRating,
      comment: feedbackComment || undefined
    });
  };

  const handleOpenFeedback = () => {
    setFeedbackRating(0);
    setFeedbackComment('');
    setShowFeedbackDialog(true);
  };

  const getAnsweredCount = () => {
    return answers.filter(a => a.selected_answer).length;
  };

  const getFlaggedCount = () => {
    return answers.filter(a => a.flagged).length;
  };

  const getFilteredQuestions = () => {
    if (navigatorFilter === 'all') return questions;
    if (navigatorFilter === 'flagged') {
      return questions.filter(q => {
        const ans = answers.find(a => a.question_id === q.id);
        return ans?.flagged;
      });
    }
    if (navigatorFilter === 'answered') {
      return questions.filter(q => {
        const ans = answers.find(a => a.question_id === q.id);
        return ans?.selected_answer;
      });
    }
    if (navigatorFilter === 'unanswered') {
      return questions.filter(q => {
        const ans = answers.find(a => a.question_id === q.id);
        return !ans?.selected_answer;
      });
    }
    return questions;
  };

  // Time setting selection screen
  if (!attemptId && exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Select Timing Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">Choose your timing preference for this exam:</p>
            <Select 
              value={timeSetting || user?.mock_exam_time_preference || '100'} 
              onValueChange={(v) => setTimeSetting(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">Standard Time (100 minutes)</SelectItem>
                <SelectItem value="125">Extra Time +25% (125 minutes)</SelectItem>
                <SelectItem value="150">Extra Time +50% (150 minutes)</SelectItem>
                <SelectItem value="untimed">Untimed (No time limit)</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              className="w-full bg-teal-600 hover:bg-teal-700"
              onClick={startExam}
              disabled={!timeSetting}
            >
              Start Exam
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!exam || !attempt || questions.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Results view
  if (showResults) {
    const correctCount = answers.filter(a => {
      const q = questions.find(q => q.id === a.question_id);
      return q && a.selected_answer === q.correct_answer;
    }).length;
    const percentage = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">Exam Complete!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-teal-600">{percentage}%</p>
                  <p className="text-sm text-slate-500">Score</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-800">{correctCount}/{questions.length}</p>
                  <p className="text-sm text-slate-500">Correct</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-800">{questions.length - correctCount}</p>
                  <p className="text-sm text-slate-500">Incorrect</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleOpenFeedback} className="flex-1 bg-teal-600 hover:bg-teal-700">
                  Leave Feedback
                </Button>
                <Button onClick={() => navigate(createPageUrl('MockExams'))} variant="outline" className="flex-1">
                  Back to Mock Exams
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Question Review */}
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const ans = answers.find(a => a.question_id === q.id);
              const isCorrect = ans?.selected_answer === q.correct_answer;

              return (
                <Card key={q.id} className="border-0 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm",
                        isCorrect ? "bg-emerald-500" : ans?.selected_answer ? "bg-rose-500" : "bg-slate-400"
                      )}>
                        {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : ans?.selected_answer ? <XCircle className="h-5 w-5" /> : idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{q.question_text}</p>

                        {q.question_type === 'typed' ? (
                          <div className="mt-3 space-y-3">
                            <div className="p-3 rounded-lg border bg-slate-50 border-slate-200">
                              <p className="text-sm font-medium text-slate-700 mb-1">Your Answer:</p>
                              <p className="text-base">{ans?.selected_answer || '(No answer)'}</p>
                            </div>
                            <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-200">
                              <p className="text-sm font-medium text-emerald-900 mb-1">Correct Answer:</p>
                              <p className="text-base text-emerald-800">{q.correct_answer}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {q.options.map(opt => (
                            <div 
                              key={opt.label}
                              className={cn(
                                "p-3 rounded-lg border",
                                opt.label === q.correct_answer && "bg-emerald-50 border-emerald-200",
                                ans?.selected_answer === opt.label && opt.label !== q.correct_answer && "bg-rose-50 border-rose-200",
                                opt.label !== q.correct_answer && ans?.selected_answer !== opt.label && "bg-slate-50 border-slate-200"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{opt.label}.</span>
                                <span>{opt.text}</span>
                                {opt.label === q.correct_answer && (
                                  <Badge className="ml-auto bg-emerald-100 text-emerald-700">Correct</Badge>
                                )}
                                {ans?.selected_answer === opt.label && opt.label !== q.correct_answer && (
                                  <Badge className="ml-auto bg-rose-100 text-rose-700">Your answer</Badge>
                                )}
                              </div>
                              </div>
                              ))}
                              </div>
                              )}
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                         <p className="text-sm font-semibold text-blue-900 mb-2">Explanation:</p>
                         <p className="text-sm text-blue-800 whitespace-pre-wrap">{q.explanation}</p>
                         {q.explanation_image && (
                           <img src={q.explanation_image} alt="Explanation" className="mt-3 max-w-full rounded-lg border" />
                         )}
                        </div>

                        {/* Report Issue */}
                        <div className="mt-3">
                          <ReportQuestionDialog
                            questionId={q.id}
                            trigger={
                              <Button variant="outline" size="sm">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Report issue
                              </Button>
                            }
                          />
                        </div>
                        </div>
                        </div>
                        </CardContent>
                        </Card>
                        );
                        })}
                        </div>
                        </div>

                        {/* Feedback Dialog */}
        <AlertDialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>How was the mock exam?</AlertDialogTitle>
              <AlertDialogDescription>
                Your feedback helps us improve. Please rate your experience.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Rating (optional)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className={cn(
                        "text-3xl transition-colors",
                        feedbackRating >= star ? "text-amber-400" : "text-slate-300 hover:text-amber-200"
                      )}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Comments (optional)</label>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Any additional feedback..."
                  className="w-full p-3 border border-slate-200 rounded-lg resize-none"
                  rows={4}
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setFeedbackRating(0);
                setFeedbackComment('');
              }}>
                Skip
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleSubmitFeedback}
                disabled={feedbackRating === 0}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Submit Feedback
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Exam interface
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = getAnsweredCount();
  const flaggedCount = getFlaggedCount();
  const filteredQuestions = getFilteredQuestions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{exam.name}</h1>
            <p className="text-sm text-slate-500">
              Question {currentIndex + 1} of {questions.length} • {answeredCount} answered
            </p>
          </div>
          <div className="flex items-center gap-4">
            {timeRemaining !== null && (
              <Badge variant="outline" className={cn(
                "text-lg px-4 py-2",
                timeRemaining < 300 && "border-rose-500 text-rose-700"
              )}>
                <Clock className="h-4 w-4 mr-2" />
                {formatTime(timeRemaining)}
              </Badge>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <List className="h-4 w-4 mr-2" />
                  Questions {flaggedCount > 0 && `(${flaggedCount} flagged)`}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Question Navigator</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <Select value={navigatorFilter} onValueChange={setNavigatorFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Questions</SelectItem>
                      <SelectItem value="flagged">Flagged Only ({flaggedCount})</SelectItem>
                      <SelectItem value="answered">Answered ({answeredCount})</SelectItem>
                      <SelectItem value="unanswered">Unanswered ({questions.length - answeredCount})</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-5 gap-2">
                    {filteredQuestions.map((q) => {
                      const idx = questions.findIndex(qu => qu.id === q.id);
                      const ans = answers.find(a => a.question_id === q.id);
                      return (
                        <button
                          key={q.id}
                          onClick={() => setCurrentIndex(idx)}
                          className={cn(
                            "h-12 rounded-lg font-medium text-sm transition-colors relative",
                            idx === currentIndex ? "ring-2 ring-teal-500 ring-offset-2" : "",
                            ans?.selected_answer ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {idx + 1}
                          {ans?.flagged && (
                            <Flag className="h-3 w-3 absolute top-1 right-1 fill-amber-500 text-amber-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Button onClick={() => setShowSubmitDialog(true)} variant="outline">
              Submit Exam
            </Button>
          </div>
        </div>

        <Progress value={progress} className="h-1.5 mb-6" />

        {/* Question */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                {currentQuestion?.question_stem && (
                  <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                    <p className="text-base text-slate-700 whitespace-pre-wrap">{currentQuestion.question_stem}</p>
                    {currentQuestion.question_stem_image && (
                      <img src={currentQuestion.question_stem_image} alt="Question context" className="mt-3 max-w-full rounded-lg border" />
                    )}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleFlag}
                className={cn(
                  "flex-shrink-0",
                  currentAnswer?.flagged ? "text-amber-500" : "text-slate-400"
                )}
              >
                <Flag className={cn("h-5 w-5", currentAnswer?.flagged && "fill-current")} />
              </Button>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-6">{currentQuestion?.question_text}</h2>

            {currentQuestion?.question_type === 'typed' ? (
              <div className="space-y-2">
                <Label>Your Answer</Label>
                <Textarea
                  placeholder="Type your answer here..."
                  value={currentAnswer?.selected_answer || ''}
                  onChange={(e) => handleTypedAnswer(e.target.value)}
                  className="text-base min-h-[100px]"
                  rows={4}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {currentQuestion?.options.map(option => {
                  const isSelected = currentAnswer?.selected_answer === option.label;
                const isEliminated = currentAnswer?.eliminated_options?.includes(option.label);

                return (
                  <div key={option.label} className="flex items-center gap-3">
                    <button
                      onClick={() => handleSelectAnswer(option.label)}
                      className={cn(
                        "flex-1 text-left p-4 rounded-xl border-2 transition-all",
                        isSelected
                          ? "border-teal-500 bg-teal-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center font-semibold flex-shrink-0",
                            isSelected
                              ? "bg-teal-500 text-white"
                              : "bg-slate-100 text-slate-700"
                          )}>
                            {option.label}
                          </div>
                          <span className={cn(
                            "text-slate-700",
                            isEliminated && "line-through text-slate-400"
                          )}>
                            {option.text}
                          </span>
                        </div>
                        {option.image && (
                          <img src={option.image} alt={`Option ${option.label}`} className="mt-2 ml-11 max-w-xs rounded-lg border" />
                        )}
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleEliminate(option.label)}
                      className={cn(isEliminated && "text-rose-500")}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="text-center">
            <p className="text-sm text-slate-600 mb-2">
              {answeredCount} of {questions.length} answered
              {flaggedCount > 0 && ` • ${flaggedCount} flagged`}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
            disabled={currentIndex === questions.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Submit Confirmation */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} out of {questions.length} questions.
              {answeredCount < questions.length && (
                <span className="block mt-2 text-amber-600 font-medium">
                  <AlertCircle className="inline h-4 w-4 mr-1" />
                  {questions.length - answeredCount} question{questions.length - answeredCount !== 1 ? 's' : ''} unanswered
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit()} className="bg-teal-600 hover:bg-teal-700">
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}