import React, { useState, useEffect } from 'react';
import { Year, MockExamQuestion, MockExam } from '@/api/entities';
import { client } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  ArrowLeft,
  Loader2,
  ShieldAlert,
  Search,
  Plus,
  Pencil
} from 'lucide-react';
import { toast } from "sonner";

export default function AddMockExam() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('id');

  const [mockExam, setMockExam] = useState({
    name: "",
    year_id: "",
    semester: 1,
    mock_question_ids: [],
    instructions: ""
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is admin
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

  const { data: years = [] } = useQuery({
    queryKey: ['years'],
    queryFn: () => Year.list()
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['mockQuestions'],
    queryFn: () => MockExamQuestion.list()
  });



  // Load existing mock exam for editing
  const { data: existingMockExam } = useQuery({
    queryKey: ['mockExam', editId],
    queryFn: async () => {
      if (!editId) return null;
      const exams = await MockExam.filter({ id: editId });
      return exams[0] || null;
    },
    enabled: !!editId
  });

  useEffect(() => {
    if (existingMockExam) {
      setMockExam({
        ...existingMockExam,
        mock_question_ids: existingMockExam.mock_question_ids || []
      });
    }
  }, [existingMockExam]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editId) {
        return MockExam.update(editId, data);
      }
      return MockExam.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mockExams'] });
      toast.success(editId ? 'Mock exam updated!' : 'Mock exam created!');
      navigate(createPageUrl('MockExams'));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!mockExam.name || !mockExam.year_id || mockExam.mock_question_ids.length === 0) {
      toast.error('Please fill in all required fields and select at least one question');
      return;
    }

    saveMutation.mutate(mockExam);
  };

  const toggleQuestion = (questionId) => {
    setMockExam(prev => ({
      ...prev,
      mock_question_ids: prev.mock_question_ids.includes(questionId)
        ? prev.mock_question_ids.filter(id => id !== questionId)
        : [...prev.mock_question_ids, questionId]
    }));
  };

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return q.question_text?.toLowerCase().includes(query) ||
             q.question_stem?.toLowerCase().includes(query);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(createPageUrl('MockExams'))}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {editId ? 'Edit Mock Exam' : 'Create Mock Exam'}
                </h1>
                <Badge className="bg-teal-100 text-teal-700 border-teal-200">
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  Admin Only
                </Badge>
              </div>
              <p className="text-slate-500 mt-1">
                {editId ? 'Update mock exam details' : 'Create a new timed mock exam'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Exam Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Exam Name *</Label>
                <Input
                  placeholder="e.g., Y1S1 Mock 1"
                  value={mockExam.name}
                  onChange={(e) => setMockExam({ ...mockExam, name: e.target.value })}
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Year *</Label>
                  <Select 
                    value={mockExam.year_id} 
                    onValueChange={(v) => setMockExam({ ...mockExam, year_id: v })}
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
                  <Label>Semester *</Label>
                  <Select 
                    value={mockExam.semester.toString()} 
                    onValueChange={(v) => setMockExam({ ...mockExam, semester: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Semester 1</SelectItem>
                      <SelectItem value="2">Semester 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Instructions (optional)</Label>
                <Textarea
                  placeholder="Any special instructions for this exam..."
                  value={mockExam.instructions}
                  onChange={(e) => setMockExam({ ...mockExam, instructions: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Question Selection */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">
                  Select Mock Questions ({mockExam.mock_question_ids.length} selected)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Link to={createPageUrl('AddMockQuestion')}>
                    <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
                      <Plus className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">New</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredQuestions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No questions found
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredQuestions.map((q) => {
                    const isSelected = mockExam.mock_question_ids.includes(q.id);

                    return (
                      <div 
                        key={q.id} 
                        className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleQuestion(q.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 line-clamp-2">
                            {q.question_text}
                          </p>
                        </div>
                        <Link to={createPageUrl(`AddMockQuestion?id=${q.id}`)}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button 
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl('MockExams'))}
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
                  {editId ? 'Update Mock Exam' : 'Create Mock Exam'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}