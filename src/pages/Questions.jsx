import React, { useState } from 'react';
import { Question, Year, Module, Submodule, UserQuestionProgress } from '@/api/entities';
import { client } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Play, 
  CheckCircle2, 
  XCircle,
  Target,
  Filter,
  X,
  ChevronDown,
  BarChart3,
  Pencil,
  Trash2,
  MoreVertical
} from 'lucide-react';
import DifficultyBadge from '@/components/questions/DifficultyBadge';
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import QuestionDataPanel from '@/components/admin/QuestionDataPanel';
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



export default function Questions() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState('browse'); // 'browse' or 'create-set'
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  
  // Practice set filters (multi-select)
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [selectedSubmodules, setSelectedSubmodules] = useState([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState(['all']);
  const [questionCount, setQuestionCount] = useState(20);
  const [deleteQuestionId, setDeleteQuestionId] = useState(null);

  const queryClient = useQueryClient();

  const { data: questions = [], isLoading: loadingQuestions } = useQuery({
    queryKey: ['questions'],
    queryFn: () => Question.list()
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id) => Question.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      setDeleteQuestionId(null);
    }
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

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => client.auth.me()
  });

  const { data: progress = [], isLoading: loadingProgress } = useQuery({
    queryKey: ['userProgress', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return UserQuestionProgress.filter({ user_id: user.id });
    },
    enabled: !!user
  });

  // Browse mode: search filter
  const browsedQuestions = questions.filter(q => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const year = years.find(y => y.id === q.year_id);
    const module = modules.find(m => m.id === q.module_id);
    const submodule = submodules.find(s => s.id === q.submodule_id);
    
    return (
      q.question_stem?.toLowerCase().includes(query) ||
      q.question_text?.toLowerCase().includes(query) ||
      year?.name?.toLowerCase().includes(query) ||
      module?.name?.toLowerCase().includes(query) ||
      submodule?.name?.toLowerCase().includes(query)
    );
  });

  // Practice set: filter logic
  const filteredForPractice = questions.filter(q => {
    if (selectedYears.length > 0 && !selectedYears.includes(q.year_id)) return false;
    if (selectedModules.length > 0 && !selectedModules.includes(q.module_id)) return false;
    if (selectedSubmodules.length > 0 && !selectedSubmodules.includes(q.submodule_id)) return false;
    if (selectedDifficulties.length > 0 && !selectedDifficulties.includes(q.difficulty)) return false;
    
    if (!selectedStatuses.includes('all')) {
      const prog = progress.find(p => p.question_id === q.id);
      if (selectedStatuses.includes('unanswered') && prog && prog.status !== "unseen") return false;
      if (selectedStatuses.includes('answered') && (!prog || prog.status === "unseen")) return false;
      if (selectedStatuses.includes('correct') && (!prog || prog.status !== "correct")) return false;
      if (selectedStatuses.includes('incorrect') && (!prog || prog.status !== "attempted")) return false;
      
      if (!selectedStatuses.includes('unanswered') && !selectedStatuses.includes('answered') && 
          !selectedStatuses.includes('correct') && !selectedStatuses.includes('incorrect')) {
        return false;
      }
    }
    
    return true;
  });

  const handleStartPracticeSet = () => {
    const questionIds = filteredForPractice.slice(0, questionCount).map(q => q.id);
    navigate(createPageUrl(`PracticeSet?ids=${questionIds.join(',')}`));
  };

  const toggleMultiSelect = (arr, setArr, value) => {
    if (arr.includes(value)) {
      setArr(arr.filter(v => v !== value));
    } else {
      setArr([...arr, value]);
    }
  };

  const toggleStatusSelect = (value) => {
    if (value === 'all') {
      setSelectedStatuses(['all']);
    } else {
      let newStatuses = selectedStatuses.filter(s => s !== 'all');
      if (newStatuses.includes(value)) {
        newStatuses = newStatuses.filter(s => s !== value);
      } else {
        newStatuses.push(value);
      }
      if (newStatuses.length === 0) newStatuses = ['all'];
      setSelectedStatuses(newStatuses);
    }
  };

  const getFilterSummary = () => {
    const parts = [];
    if (selectedYears.length > 0) {
      parts.push(`${selectedYears.length} year(s)`);
    }
    if (selectedModules.length > 0) {
      parts.push(`${selectedModules.length} module(s)`);
    }
    if (selectedSubmodules.length > 0) {
      parts.push(`${selectedSubmodules.length} submodule(s)`);
    }
    if (selectedDifficulties.length > 0) {
      parts.push(`${selectedDifficulties.join(', ')}`);
    }
    if (!selectedStatuses.includes('all')) {
      parts.push(`${selectedStatuses.join(', ')}`);
    }
    return parts.length > 0 ? parts.join(' • ') : 'No filters applied';
  };

  const isLoading = loadingQuestions || loadingProgress;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Questions</h1>
          <p className="text-slate-500">{questions.length} questions total</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={() => setMode('browse')}
            variant={mode === 'browse' ? 'default' : 'outline'}
            className={mode === 'browse' ? 'bg-teal-600 hover:bg-teal-700' : ''}
          >
            <Search className="h-4 w-4 mr-2" />
            Browse All Questions
          </Button>
          <Button
            onClick={() => setMode('create-set')}
            variant={mode === 'create-set' ? 'default' : 'outline'}
            className={mode === 'create-set' ? 'bg-teal-600 hover:bg-teal-700' : ''}
          >
            <Target className="h-4 w-4 mr-2" />
            Create Practice Set
          </Button>
        </div>

        {/* Browse Mode */}
        {mode === 'browse' && (
          <>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <Card key={i} className="border-0 shadow-sm">
                    <CardContent className="p-5">
                      <Skeleton className="h-4 w-24 mb-3" />
                      <Skeleton className="h-5 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </CardContent>
                  </Card>
                ))
              ) : browsedQuestions.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <p className="text-slate-500">No questions found</p>
                  </CardContent>
                </Card>
              ) : (
                browsedQuestions.map((question) => {
                  const prog = progress.find(p => p.question_id === question.id);
                  const year = years.find(y => y.id === question.year_id);
                  const module = modules.find(m => m.id === question.module_id);
                  const submodule = submodules.find(s => s.id === question.submodule_id);
                  const isExpanded = expandedQuestionId === question.id;

                  return (
                    <div key={question.id}>
                      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <Badge variant="outline" className="text-slate-600 border-slate-200">
                                  {year?.name || 'Unknown Year'}
                                </Badge>
                                <Badge variant="outline" className="text-slate-600 border-slate-200">
                                  {module?.name || 'Unknown Module'}
                                </Badge>
                                {submodule && (
                                  <Badge variant="outline" className="text-slate-500 border-slate-200">
                                    {submodule.name}
                                  </Badge>
                                )}
                                <DifficultyBadge question={question} />

                                {prog && (
                                  prog.status === "correct" ? (
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Correct
                                    </Badge>
                                  ) : prog.status === "attempted" ? (
                                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 border">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Incorrect
                                    </Badge>
                                  ) : null
                                )}
                              </div>

                              <Link 
                                to={createPageUrl(`PracticeSet?ids=${question.id}`)}
                                className="block"
                              >
                                <p className="text-slate-800 font-medium line-clamp-2">
                                  {question.question_text}
                                </p>
                                <p className="text-slate-500 text-sm mt-1 line-clamp-1">
                                  {question.question_stem?.substring(0, 100)}...
                                </p>
                              </Link>
                              </div>

                              <div className="flex items-center gap-2">
                              {user?.app_role === 'committee' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpandedQuestionId(isExpanded ? null : question.id)}
                                  >
                                    <BarChart3 className="h-4 w-4 mr-2" />
                                    Analytics
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <Link to={createPageUrl(`AddQuestion?id=${question.id}`)}>
                                        <DropdownMenuItem>
                                          <Pencil className="h-4 w-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                      </Link>
                                      <DropdownMenuItem
                                        className="text-rose-600"
                                        onClick={() => setDeleteQuestionId(question.id)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </>
                              )}
                              </div>
                          </div>
                        </CardContent>
                      </Card>

                      {isExpanded && user?.app_role === 'committee' && (
                        <div className="mt-2 mb-4">
                          <QuestionDataPanel questionId={question.id} embedded />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteQuestionId} onOpenChange={() => setDeleteQuestionId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Question?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this question and all associated user progress data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteQuestionMutation.mutate(deleteQuestionId)}
                className="bg-rose-600 hover:bg-rose-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create Practice Set Mode */}
        {mode === 'create-set' && (
          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Configure Practice Set</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Question Count */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">Number of Questions</Label>
                  <div className="flex gap-2">
                    {[10, 20, 30, 50].map(num => (
                      <Button
                        key={num}
                        variant={questionCount === num ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setQuestionCount(num)}
                        className={questionCount === num ? 'bg-teal-600 hover:bg-teal-700' : ''}
                      >
                        {num}
                      </Button>
                    ))}
                    <Input
                      type="number"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value) || 10)}
                      className="w-20"
                      min="1"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Filter className="h-4 w-4" />
                    <span className="text-sm font-medium">Filters (Multi-select)</span>
                  </div>

                  {/* Year */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <span className="text-sm font-medium text-slate-700">
                        Year {selectedYears.length > 0 && `(${selectedYears.length} selected)`}
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 p-3 border border-slate-200 rounded-lg space-y-2">
                      {years.map(year => (
                        <div key={year.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`year-${year.id}`}
                            checked={selectedYears.includes(year.id)}
                            onCheckedChange={() => toggleMultiSelect(selectedYears, setSelectedYears, year.id)}
                          />
                          <label htmlFor={`year-${year.id}`} className="text-sm text-slate-700 cursor-pointer">
                            {year.name}
                          </label>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Module */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <span className="text-sm font-medium text-slate-700">
                        Module {selectedModules.length > 0 && `(${selectedModules.length} selected)`}
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 p-3 border border-slate-200 rounded-lg space-y-2 max-h-64 overflow-y-auto">
                      {modules.map(module => (
                        <div key={module.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`module-${module.id}`}
                            checked={selectedModules.includes(module.id)}
                            onCheckedChange={() => toggleMultiSelect(selectedModules, setSelectedModules, module.id)}
                          />
                          <label htmlFor={`module-${module.id}`} className="text-sm text-slate-700 cursor-pointer">
                            {module.name}
                          </label>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Submodule */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <span className="text-sm font-medium text-slate-700">
                        Submodule {selectedSubmodules.length > 0 && `(${selectedSubmodules.length} selected)`}
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 p-3 border border-slate-200 rounded-lg space-y-2 max-h-64 overflow-y-auto">
                      {submodules.map(submodule => (
                        <div key={submodule.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`submodule-${submodule.id}`}
                            checked={selectedSubmodules.includes(submodule.id)}
                            onCheckedChange={() => toggleMultiSelect(selectedSubmodules, setSelectedSubmodules, submodule.id)}
                          />
                          <label htmlFor={`submodule-${submodule.id}`} className="text-sm text-slate-700 cursor-pointer">
                            {submodule.name}
                          </label>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Difficulty */}
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <span className="text-sm font-medium text-slate-700">
                        Difficulty {selectedDifficulties.length > 0 && `(${selectedDifficulties.length} selected)`}
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 p-3 border border-slate-200 rounded-lg space-y-2">
                      {['Easy', 'Medium', 'Hard'].map(diff => (
                        <div key={diff} className="flex items-center space-x-2">
                          <Checkbox
                            id={`diff-${diff}`}
                            checked={selectedDifficulties.includes(diff)}
                            onCheckedChange={() => toggleMultiSelect(selectedDifficulties, setSelectedDifficulties, diff)}
                          />
                          <label htmlFor={`diff-${diff}`} className="text-sm text-slate-700 cursor-pointer">
                            {diff}
                          </label>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Answer Status */}
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <span className="text-sm font-medium text-slate-700">
                        Answer Status
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 p-3 border border-slate-200 rounded-lg space-y-2">
                      {[
                        { value: 'all', label: 'All' },
                        { value: 'unanswered', label: 'Unanswered' },
                        { value: 'answered', label: 'Answered' },
                        { value: 'correct', label: 'Correct' },
                        { value: 'incorrect', label: 'Incorrect' }
                      ].map(status => (
                        <div key={status.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${status.value}`}
                            checked={selectedStatuses.includes(status.value)}
                            onCheckedChange={() => toggleStatusSelect(status.value)}
                          />
                          <label htmlFor={`status-${status.value}`} className="text-sm text-slate-700 cursor-pointer">
                            {status.label}
                          </label>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </CardContent>
            </Card>

            {/* Summary & Start */}
            <Card className="border-0 shadow-sm bg-teal-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-teal-900 mb-1">
                      {Math.min(questionCount, filteredForPractice.length)} questions ready
                    </p>
                    <p className="text-xs text-teal-700">{getFilterSummary()}</p>
                  </div>
                  <Button
                    onClick={handleStartPracticeSet}
                    disabled={filteredForPractice.length === 0}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Practice Set
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}