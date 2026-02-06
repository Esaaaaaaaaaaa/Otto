import React, { useState, useEffect } from 'react';
import { Year, Module, Submodule, Question, QuestionReport } from '@/api/entities';
import { client } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import TaxonomyMigration from '@/components/admin/TaxonomyMigration';
import QuestionDataPanel from '@/components/admin/QuestionDataPanel';

const INITIAL_QUESTION = {
  question_type: "mcq",
  year_id: "",
  module_id: "",
  submodule_id: "",
  difficulty: "Medium",
  question_stem: "",
  question_stem_image: "",
  question_text: "",
  options: [
    { label: "A", text: "", image: "" },
    { label: "B", text: "", image: "" },
    { label: "C", text: "", image: "" },
    { label: "D", text: "", image: "" },
    { label: "E", text: "", image: "" }
  ],
  correct_answer: "",
  explanation: "",
  explanation_image: "",
  key_learning_points: [""]
};

export default function AddQuestion() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('id');
  const fromReport = urlParams.get('fromReport') === 'true';

  const [question, setQuestion] = useState(INITIAL_QUESTION);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch taxonomy data
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

  // Check if user is admin
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await client.auth.me();
        setUser(currentUser);
        if (currentUser.app_role !== 'committee') {
          toast.error('Committee access required');
          navigate(createPageUrl('Dashboard'));
        }
      } catch (error) {
        toast.error('Please log in');
        client.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  // Load existing question for editing
  const { data: existingQuestion } = useQuery({
    queryKey: ['question', editId],
    queryFn: async () => {
      if (!editId) return null;
      const questions = await Question.filter({ id: editId });
      return questions[0] || null;
    },
    enabled: !!editId
  });

  // Load reports if from report page
  const { data: reports = [] } = useQuery({
    queryKey: ['questionReports', editId],
    queryFn: async () => {
      if (!editId || !fromReport) return [];
      const allReports = await QuestionReport.list();
      return allReports.filter(r => r.question_id === editId && r.status === 'open');
    },
    enabled: !!editId && fromReport
  });

  useEffect(() => {
    if (existingQuestion) {
      setQuestion({
        ...existingQuestion,
        key_learning_points: existingQuestion.key_learning_points?.length > 0 
          ? existingQuestion.key_learning_points 
          : [""]
      });
    }
  }, [existingQuestion]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editId) {
        return Question.update(editId, data);
      }
      return Question.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      if (editId) {
        toast.success('Question updated!');
        navigate(createPageUrl('Questions'));
      } else {
        toast.success('Question created! Add another or go back to questions.');
        // Reset form but preserve taxonomy selections
        setQuestion({
          ...INITIAL_QUESTION,
          year_id: question.year_id,
          module_id: question.module_id,
          submodule_id: question.submodule_id,
          difficulty: question.difficulty,
          manual_difficulty: question.manual_difficulty
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  });

  const handleOptionChange = (index, value) => {
    const newOptions = [...question.options];
    newOptions[index] = { ...newOptions[index], text: value };
    setQuestion({ ...question, options: newOptions });
  };

  const addOption = () => {
    const nextLabel = String.fromCharCode(65 + question.options.length);
    setQuestion({
      ...question,
      options: [...question.options, { label: nextLabel, text: "", image: "" }]
    });
  };

  const handleImageUpload = async (file, field, optionIndex = null) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      // TODO: Implement file upload with Supabase Storage
      const { file_url } = await client.integrations.Core.UploadFile({ file });
      if (optionIndex !== null) {
        const newOptions = [...question.options];
        newOptions[optionIndex] = { ...newOptions[optionIndex], image: file_url };
        setQuestion({ ...question, options: newOptions });
      } else {
        setQuestion({ ...question, [field]: file_url });
      }
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeOption = (index) => {
    if (question.options.length <= 2) return;
    const newOptions = question.options.filter((_, i) => i !== index);
    // Relabel
    const relabeled = newOptions.map((opt, i) => ({
      ...opt,
      label: String.fromCharCode(65 + i)
    }));
    setQuestion({ ...question, options: relabeled });
  };

  const handleLearningPointChange = (index, value) => {
    const newPoints = [...question.key_learning_points];
    newPoints[index] = value;
    setQuestion({ ...question, key_learning_points: newPoints });
  };

  const addLearningPoint = () => {
    setQuestion({
      ...question,
      key_learning_points: [...question.key_learning_points, ""]
    });
  };

  const removeLearningPoint = (index) => {
    if (question.key_learning_points.length <= 1) return;
    setQuestion({
      ...question,
      key_learning_points: question.key_learning_points.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!question.year_id || !question.module_id || !question.question_stem || !question.question_text || !question.correct_answer) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (question.question_type === 'mcq') {
      const filledOptions = question.options.filter(o => o.text.trim());
      if (filledOptions.length < 2) {
        toast.error('Please provide at least 2 options');
        return;
      }
      saveMutation.mutate({
        ...question,
        submodule_id: question.submodule_id || null,
        options: filledOptions,
        key_learning_points: question.key_learning_points.filter(p => p.trim())
      });
    } else {
      // Typed answer
      saveMutation.mutate({
        ...question,
        submodule_id: question.submodule_id || null,
        options: [],
        key_learning_points: question.key_learning_points.filter(p => p.trim())
      });
    }
  };

  // Get filtered modules and submodules
  const filteredModules = question.year_id 
    ? modules.filter(m => m.year_id === question.year_id)
    : [];
  
  const filteredSubmodules = question.module_id
    ? submodules.filter(s => s.module_id === question.module_id)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(createPageUrl('Questions'))}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {editId ? 'Edit Question' : 'Create Question'}
                </h1>
                <Badge className="bg-teal-100 text-teal-700 border-teal-200">
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  Admin Only
                </Badge>
                {fromReport && reports.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                    {reports.length} Open Report{reports.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <p className="text-slate-500 mt-1">
                {editId ? 'Update question details' : 'Add a new question to your bank'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Reports from Reported Questions */}
          {fromReport && reports.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-lg text-amber-900">Reported Issues</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reports.map(report => (
                  <div key={report.id} className="p-3 bg-white rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        {report.category.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(report.created_date).toLocaleDateString("en-gb")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{report.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Migration Tool */}
          {!editId && years.length === 0 && (
            <TaxonomyMigration />
          )}

          {/* Basic Info */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question Type *</Label>
                <Select 
                  value={question.question_type} 
                  onValueChange={(v) => setQuestion({ ...question, question_type: v, correct_answer: "", options: v === 'mcq' ? INITIAL_QUESTION.options : [] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                    <SelectItem value="typed">Typed Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year *</Label>
                  <Select 
                    value={question.year_id} 
                    onValueChange={(v) => setQuestion({ ...question, year_id: v, module_id: "", submodule_id: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(y => (
                        <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Module *</Label>
                  <Select 
                    value={question.module_id} 
                    onValueChange={(v) => setQuestion({ ...question, module_id: v, submodule_id: "" })}
                    disabled={!question.year_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredModules.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Submodule (optional)</Label>
                  <Select 
                    value={question.submodule_id || ""} 
                    onValueChange={(v) => setQuestion({ ...question, submodule_id: v })}
                    disabled={!question.module_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select submodule" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSubmodules.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Difficulty (Manual Override)</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="manual-difficulty"
                        checked={question.manual_difficulty || false}
                        onChange={(e) => setQuestion({ 
                          ...question, 
                          manual_difficulty: e.target.checked,
                          difficulty: e.target.checked ? (question.difficulty || 'Medium') : 'Medium'
                        })}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <Label htmlFor="manual-difficulty" className="text-sm cursor-pointer">
                        Set difficulty manually (otherwise calculated from user performance)
                      </Label>
                    </div>
                    {question.manual_difficulty && (
                      <Select 
                        value={question.difficulty} 
                        onValueChange={(v) => setQuestion({ ...question, difficulty: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Easy">Easy</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {!question.manual_difficulty && (
                      <p className="text-xs text-slate-500">
                        Difficulty will be calculated based on user performance (70%+ = Easy, 50-70% = Medium, &lt;50% = Hard). Shows after 20+ attempts.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Question Content */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Question Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Clinical Vignette / Stem *</Label>
                <Textarea
                  placeholder="A 65-year-old man presents to the emergency department with sudden onset chest pain..."
                  value={question.question_stem}
                  onChange={(e) => setQuestion({ ...question, question_stem: e.target.value })}
                  className="min-h-[120px]"
                />
                <div className="flex items-center gap-2">
                  <Label htmlFor="stem-image" className="text-sm cursor-pointer">
                    <Button type="button" variant="outline" size="sm" disabled={uploadingImage} asChild>
                      <span>
                        {uploadingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                        Add Image
                      </span>
                    </Button>
                  </Label>
                  <input
                    id="stem-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files[0], 'question_stem_image')}
                  />
                  {question.question_stem_image && (
                    <div className="flex items-center gap-2">
                      <img src={question.question_stem_image} alt="Stem" className="h-8 w-8 object-cover rounded border" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuestion({ ...question, question_stem_image: "" })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Question *</Label>
                <Input
                  placeholder="What is the most likely diagnosis?"
                  value={question.question_text}
                  onChange={(e) => setQuestion({ ...question, question_text: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Answer Options */}
          {question.question_type === 'mcq' ? (
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Answer Options</CardTitle>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={addOption}
                  disabled={question.options.length >= 8}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {question.options.map((option, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuestion({ ...question, correct_answer: option.label })}
                        className={cn(
                          "w-10 h-10 rounded-lg font-semibold text-sm transition-all flex-shrink-0",
                          question.correct_answer === option.label
                            ? "bg-emerald-500 text-white ring-2 ring-emerald-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        {option.label}
                      </button>
                      <Input
                        placeholder={`Option ${option.label}`}
                        value={option.text}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        className="flex-1"
                      />
                      {question.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(idx)}
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-[52px]">
                      <Label htmlFor={`option-image-${idx}`} className="text-xs cursor-pointer">
                        <Button type="button" variant="ghost" size="sm" disabled={uploadingImage} asChild>
                          <span className="text-xs">
                            {uploadingImage ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                            Add Image
                          </span>
                        </Button>
                      </Label>
                      <input
                        id={`option-image-${idx}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e.target.files[0], null, idx)}
                      />
                      {option.image && (
                        <div className="flex items-center gap-2">
                          <img src={option.image} alt={`Option ${option.label}`} className="h-6 w-6 object-cover rounded border" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newOptions = [...question.options];
                              newOptions[idx] = { ...newOptions[idx], image: "" };
                              setQuestion({ ...question, options: newOptions });
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <p className="text-sm text-slate-500">
                  Click the letter to mark as correct answer
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Correct Answer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label>Type the correct answer *</Label>
                <Input
                  placeholder="e.g., Myocardial infarction"
                  value={question.correct_answer}
                  onChange={(e) => setQuestion({ ...question, correct_answer: e.target.value })}
                />
                <p className="text-sm text-slate-500">
                  Answer checking is case-insensitive
                </p>
              </CardContent>
            </Card>
          )}

          {/* Explanation */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Explanation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Detailed Explanation *</Label>
                <Textarea
                  placeholder="Explain why the correct answer is correct and why other options are incorrect..."
                  value={question.explanation}
                  onChange={(e) => setQuestion({ ...question, explanation: e.target.value })}
                  className="min-h-[150px]"
                />
                <div className="flex items-center gap-2">
                  <Label htmlFor="explanation-image" className="text-sm cursor-pointer">
                    <Button type="button" variant="outline" size="sm" disabled={uploadingImage} asChild>
                      <span>
                        {uploadingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                        Add Image
                      </span>
                    </Button>
                  </Label>
                  <input
                    id="explanation-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e.target.files[0], 'explanation_image')}
                  />
                  {question.explanation_image && (
                    <div className="flex items-center gap-2">
                      <img src={question.explanation_image} alt="Explanation" className="h-8 w-8 object-cover rounded border" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuestion({ ...question, explanation_image: "" })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Key Learning Points</Label>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={addLearningPoint}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Point
                  </Button>
                </div>
                {question.key_learning_points.map((point, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-teal-500 flex-shrink-0" />
                    <Input
                      placeholder="Key learning point..."
                      value={point}
                      onChange={(e) => handleLearningPointChange(idx, e.target.value)}
                      className="flex-1"
                    />
                    {question.key_learning_points.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLearningPoint(idx)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Question Data Panel */}
          {editId && (
            <QuestionDataPanel questionId={editId} />
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button 
              type="button"
              variant="outline"
              onClick={() => navigate(fromReport ? createPageUrl('ReportedQuestions') : createPageUrl('Questions'))}
            >
              {editId ? 'Cancel' : 'Back to Questions'}
            </Button>
            <Button 
              type="submit"
              className="bg-teal-600 hover:bg-teal-700"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editId ? 'Update Question' : 'Save & Add Another'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}