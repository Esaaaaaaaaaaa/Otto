import React, { useState, useEffect } from 'react';
import { Question, Year, Module, Submodule, UserPracticeProgress, UserQuestionProgress, QuestionAttempt } from '@/api/entities';
import { client } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  List,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactMarkdown from 'react-markdown';
import ReportQuestionDialog from '@/components/questions/ReportQuestionDialog';
import DifficultyBadge from '@/components/questions/DifficultyBadge';

export default function PracticeSet() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const questionIds = urlParams.get('ids')?.split(',') || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [navigatorFilter, setNavigatorFilter] = useState('all');

  const { data: allQuestions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => Question.list()
  });

  const questions = allQuestions.filter(q => questionIds.includes(q.id));

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

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => client.auth.me()
  });

  const { data: practiceProgress = [] } = useQuery({
    queryKey: ['practiceProgress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return UserPracticeProgress.filter({ user_id: user.id });
    },
    enabled: !!user
  });

  const { data: userProgress = [] } = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return UserQuestionProgress.filter({ user_id: user.id });
    },
    enabled: !!user
  });

  const upsertPracticeMutation = useMutation({
    mutationFn: async (data) => {
      const existing = practiceProgress.find(p => p.question_id === data.question_id);
      if (existing) {
        return UserPracticeProgress.update(existing.id, data);
      }
      return UserPracticeProgress.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practiceProgress'] });
    }
  });

  const upsertProgressMutation = useMutation({
    mutationFn: async (data) => {
      const existing = userProgress.find(p => p.question_id === data.question_id);
      if (existing) {
        return UserQuestionProgress.update(existing.id, {
          status: data.status,
          attempt_count: data.attempt_count,
          last_answered_at: data.last_answered_at
        });
      }
      return UserQuestionProgress.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProgress'] });
    }
  });

  const createAttemptMutation = useMutation({
    mutationFn: (data) => QuestionAttempt.create(data),
  });

  const currentQuestion = questions[currentIndex];
  const currentPractice = practiceProgress.find(p => p.question_id === currentQuestion?.id);
  const [localSelected, setLocalSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setLocalSelected(null);
    setRevealed(false);
  }, [currentIndex, currentQuestion?.id]);

  const handleSelectAnswer = (answer) => {
    if (revealed) return;
    setLocalSelected(answer);
  };

  const handleTypedAnswer = (value) => {
    if (revealed) return;
    setLocalSelected(value);
  };

  const handleSubmit = async () => {
    if (!localSelected || !currentQuestion || !user) return;
    
    setRevealed(true);

    // Save practice progress
    await upsertPracticeMutation.mutateAsync({
      user_id: user.id,
      question_id: currentQuestion.id,
      selected_answer: localSelected,
      flagged: currentPractice?.flagged || false,
      skipped: false
    });

    // Save overall progress
    const isCorrect = currentQuestion.question_type === 'typed' 
      ? localSelected.trim().toLowerCase() === currentQuestion.correct_answer.trim().toLowerCase()
      : localSelected === currentQuestion.correct_answer;
    const existing = userProgress.find(p => p.question_id === currentQuestion.id);

    await upsertProgressMutation.mutateAsync({
      user_id: user.id,
      question_id: currentQuestion.id,
      status: isCorrect ? "correct" : "attempted",
      attempt_count: (existing?.attempt_count || 0) + 1,
      last_answered_at: new Date().toISOString()
    });

    // Create question attempt record for analytics
    await createAttemptMutation.mutateAsync({
      question_id: currentQuestion.id,
      selected_answer: localSelected,
      is_correct: isCorrect,
      flagged: currentPractice?.flagged || false
    });
  };

  const handleSkip = async () => {
    if (!currentQuestion || !user || revealed) return;

    await upsertPracticeMutation.mutateAsync({
      user_id: user.id,
      question_id: currentQuestion.id,
      selected_answer: currentPractice?.selected_answer,
      flagged: currentPractice?.flagged || false,
      skipped: true
    });

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleToggleFlag = async () => {
    if (!currentQuestion || !user) return;

    await upsertPracticeMutation.mutateAsync({
      user_id: user.id,
      question_id: currentQuestion.id,
      selected_answer: currentPractice?.selected_answer,
      flagged: !currentPractice?.flagged,
      skipped: currentPractice?.skipped || false
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const getFilteredQuestions = () => {
    if (navigatorFilter === 'all') return questions;
    if (navigatorFilter === 'flagged') {
      return questions.filter(q => {
        const prog = practiceProgress.find(p => p.question_id === q.id);
        return prog?.flagged;
      });
    }
    if (navigatorFilter === 'answered') {
      return questions.filter(q => {
        const prog = practiceProgress.find(p => p.question_id === q.id);
        return prog?.selected_answer;
      });
    }
    if (navigatorFilter === 'unanswered') {
      return questions.filter(q => {
        const prog = practiceProgress.find(p => p.question_id === q.id);
        return !prog?.selected_answer;
      });
    }
    return questions;
  };

  const answeredCount = practiceProgress.filter(p => 
    questionIds.includes(p.question_id) && p.selected_answer
  ).length;

  const flaggedCount = practiceProgress.filter(p => 
    questionIds.includes(p.question_id) && p.flagged
  ).length;

  const progressPercent = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const isCorrect = localSelected === currentQuestion?.correct_answer;
  const filteredQuestions = getFilteredQuestions();

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">No questions found</p>
      </div>
    );
  }

  const year = years.find(y => y.id === currentQuestion?.year_id);
  const module = modules.find(m => m.id === currentQuestion?.module_id);
  const submodule = submodules.find(s => s.id === currentQuestion?.submodule_id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Practice Set</h1>
            <p className="text-sm text-slate-500">
              Question {currentIndex + 1} of {questions.length} • {answeredCount} answered
              {flaggedCount > 0 && ` • ${flaggedCount} flagged`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <List className="h-4 w-4 mr-2" />
                  Navigator
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
                      <SelectItem value="flagged">Flagged ({flaggedCount})</SelectItem>
                      <SelectItem value="answered">Answered ({answeredCount})</SelectItem>
                      <SelectItem value="unanswered">Unanswered ({questions.length - answeredCount})</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-5 gap-2">
                    {filteredQuestions.map((q) => {
                      const idx = questions.findIndex(qu => qu.id === q.id);
                      const prog = practiceProgress.find(p => p.question_id === q.id);
                      return (
                        <button
                          key={q.id}
                          onClick={() => setCurrentIndex(idx)}
                          className={cn(
                            "h-12 rounded-lg font-medium text-sm transition-colors relative",
                            idx === currentIndex ? "ring-2 ring-teal-500 ring-offset-2" : "",
                            prog?.selected_answer ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {idx + 1}
                          {prog?.flagged && (
                            <Flag className="h-3 w-3 absolute top-1 right-1 fill-amber-500 text-amber-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  </div>
                  </SheetContent>
            </Sheet>
            <Button variant="outline" size="sm" onClick={() => navigate(createPageUrl('Questions'))}>
              Exit
            </Button>
          </div>
        </div>

        <Progress value={progressPercent} className="h-1.5 mb-6" />

        {/* Question Card */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-6">
            {/* Header with tags and flag */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex flex-wrap items-center gap-2">
                {year && (
                  <Badge variant="outline" className="text-slate-600 border-slate-200">
                    {year.name}
                  </Badge>
                )}
                {module && (
                  <Badge variant="outline" className="text-slate-600 border-slate-200">
                    {module.name}
                  </Badge>
                )}
                {submodule && (
                  <Badge variant="outline" className="text-slate-500 border-slate-200">
                    {submodule.name}
                  </Badge>
                )}
                <DifficultyBadge question={currentQuestion} />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleFlag}
                className={cn(
                  currentPractice?.flagged ? "text-amber-500" : "text-slate-400"
                )}
              >
                <Flag className={cn("h-5 w-5", currentPractice?.flagged && "fill-current")} />
              </Button>
            </div>

            {/* Question stem */}
            {currentQuestion?.question_stem && (
              <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-base text-slate-700 whitespace-pre-wrap">
                  {currentQuestion.question_stem}
                </p>
                {currentQuestion.question_stem_image && (
                  <img src={currentQuestion.question_stem_image} alt="Question context" className="mt-3 max-w-full rounded-lg border" />
                )}
              </div>
            )}

            {/* Question text */}
            <h2 className="text-lg font-semibold text-slate-900 mb-6">
              {currentQuestion?.question_text}
            </h2>

            {/* Options or Typed Input */}
            {currentQuestion?.question_type === 'typed' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Answer</Label>
                  <Textarea
                    placeholder="Type your answer here..."
                    value={localSelected || ''}
                    onChange={(e) => handleTypedAnswer(e.target.value)}
                    disabled={revealed}
                    className="text-base min-h-[100px]"
                    rows={4}
                  />
                </div>
                {revealed && (
                  <div className="p-4 rounded-lg border-2 bg-emerald-50 border-emerald-400">
                    <p className="text-sm font-medium text-emerald-900 mb-1">Correct Answer:</p>
                    <p className="text-base text-emerald-800">{currentQuestion.correct_answer}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {currentQuestion?.options?.map((option) => {
                const isSelected = localSelected === option.label;
                const isCorrectOption = option.label === currentQuestion.correct_answer;
                
                let optionStyle = "bg-white border-slate-200 hover:border-teal-300 hover:bg-teal-50/50";
                
                if (revealed) {
                  if (isCorrectOption) {
                    optionStyle = "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-100";
                  } else if (isSelected && !isCorrectOption) {
                    optionStyle = "bg-rose-50 border-rose-400 ring-2 ring-rose-100";
                  } else {
                    optionStyle = "bg-slate-50 border-slate-200 opacity-60";
                  }
                } else if (isSelected) {
                  optionStyle = "bg-teal-50 border-teal-400 ring-2 ring-teal-100";
                }

                return (
                  <button
                    key={option.label}
                    onClick={() => handleSelectAnswer(option.label)}
                    disabled={revealed}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
                      optionStyle
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm transition-colors",
                        revealed && isCorrectOption ? "bg-emerald-500 text-white" :
                        revealed && isSelected && !isCorrectOption ? "bg-rose-500 text-white" :
                        isSelected ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-600"
                      )}>
                        {option.label}
                      </div>
                      <div className="flex-1">
                        <span className={cn(
                          "block pt-1",
                          revealed && isCorrectOption ? "text-emerald-800 font-medium" :
                          revealed && isSelected && !isCorrectOption ? "text-rose-800" :
                          "text-slate-700"
                        )}>
                          {option.text}
                        </span>
                        {option.image && (
                          <img src={option.image} alt={`Option ${option.label}`} className="mt-2 max-w-xs rounded-lg border" />
                        )}
                      </div>
                      {revealed && isCorrectOption && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-1" />
                      )}
                      {revealed && isSelected && !isCorrectOption && (
                        <XCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                );
              })}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-100">
              {!revealed ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!localSelected}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-5 rounded-xl font-medium"
                  >
                    Check Answer
                  </Button>
                </>
              ) : (
                <div className="w-full">
                  <div className={cn(
                    "px-4 py-2 rounded-lg font-medium flex items-center gap-2 mb-4",
                    isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  )}>
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        Correct!
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5" />
                        Incorrect
                      </>
                    )}
                  </div>

                  {/* Explanation */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Explanation</p>
                    <div className="text-sm text-blue-800 prose prose-sm max-w-none prose-p:my-3 prose-ul:my-2 prose-li:my-1 whitespace-pre-line">
                      <ReactMarkdown>{currentQuestion.explanation}</ReactMarkdown>
                    </div>
                    {currentQuestion.explanation_image && (
                      <img src={currentQuestion.explanation_image} alt="Explanation" className="mt-3 max-w-full rounded-lg border" />
                    )}
                  </div>

                  {/* Key Learning Points */}
                  {currentQuestion.key_learning_points?.length > 0 && (
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 mt-3">
                      <p className="text-sm font-semibold text-amber-900 mb-2">Key Learning Points</p>
                      <ul className="space-y-1.5">
                        {currentQuestion.key_learning_points.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-amber-800">
                            <CheckCircle2 className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Report Issue */}
                  <div className="mt-3 flex items-center gap-2">
                    <ReportQuestionDialog
                      questionId={currentQuestion.id}
                      trigger={
                        <Button variant="outline" size="sm">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Report issue
                        </Button>
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <Button
            variant="outline"
            onClick={handleNext}
            disabled={currentIndex >= questions.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}