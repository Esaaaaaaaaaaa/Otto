import React, { useState, useEffect } from 'react';
import { MockExamQuestion } from '@/api/entities';
import { client } from '@/api/supabaseClient';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const INITIAL_QUESTION = {
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
  explanation_image: ""
};

export default function AddMockQuestion() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('id');

  const [question, setQuestion] = useState(INITIAL_QUESTION);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await client.auth.me();
        setUser(currentUser);
        if (currentUser.app_role !== 'committee') {
          toast.error('Committee access required');
          navigate(createPageUrl('MockExams'));
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

  const { data: existingQuestion } = useQuery({
    queryKey: ['mockQuestion', editId],
    queryFn: async () => {
      if (!editId) return null;
      const questions = await MockExamQuestion.filter({ id: editId });
      return questions[0] || null;
    },
    enabled: !!editId
  });

  useEffect(() => {
    if (existingQuestion) {
      setQuestion(existingQuestion);
    }
  }, [existingQuestion]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editId) {
        return MockExamQuestion.update(editId, data);
      }
      return MockExamQuestion.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockQuestions'] });
      toast.success(editId ? 'Question updated!' : 'Question created!');
      navigate(createPageUrl('AddMockExam'));
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
    const relabeled = newOptions.map((opt, i) => ({
      ...opt,
      label: String.fromCharCode(65 + i)
    }));
    setQuestion({ ...question, options: relabeled });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!question.question_stem || !question.question_text || !question.correct_answer) {
      toast.error('Please fill in all required fields');
      return;
    }

    const filledOptions = question.options.filter(o => o.text.trim());
    if (filledOptions.length < 2) {
      toast.error('Please provide at least 2 options');
      return;
    }

    saveMutation.mutate({
      ...question,
      options: filledOptions
    });
  };

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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(createPageUrl('AddMockExam'))}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {editId ? 'Edit Mock Question' : 'Create Mock Question'}
                </h1>
                <Badge className="bg-teal-100 text-teal-700 border-teal-200">
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  Admin Only
                </Badge>
              </div>
              <p className="text-slate-500 mt-1">For mock exams only</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Question Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Clinical Vignette / Stem *</Label>
                <Textarea
                  placeholder="A 65-year-old man presents to the emergency department..."
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

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Explanation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Detailed Explanation *</Label>
                <Textarea
                  placeholder="Explain why the correct answer is correct..."
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
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button 
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl('AddMockExam'))}
            >
              Cancel
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
                  {editId ? 'Update Question' : 'Save Question'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}