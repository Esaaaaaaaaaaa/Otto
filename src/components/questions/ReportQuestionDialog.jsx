import React, { useState } from 'react';
import { QuestionReport } from '@/api/entities';
import { client } from '@/api/supabaseClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const categories = [
  { value: 'wrong_answer', label: 'Wrong answer' },
  { value: 'ambiguous_wording', label: 'Ambiguous wording' },
  { value: 'typo_formatting', label: 'Typo/formatting' },
  { value: 'explanation_issue', label: 'Explanation issue' },
  { value: 'tag_module_incorrect', label: 'Tag/module incorrect' },
  { value: 'other', label: 'Other' }
];

export default function ReportQuestionDialog({ questionId, trigger }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => client.auth.me()
  });

  // Check if user has already reported this question
  const { data: existingReports = [] } = useQuery({
    queryKey: ['myReports', questionId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      return QuestionReport.filter({
        question_id: questionId,
        user_id: user.id
      });
    },
    enabled: !!user && open
  });

  const hasReported = existingReports.length > 0;

  const submitReportMutation = useMutation({
    mutationFn: async (data) => {
      return QuestionReport.create(data);
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['myReports'] });
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setCategory('');
        setDescription('');
      }, 2000);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!category || !description.trim() || !user) return;

    submitReportMutation.mutate({
      question_id: questionId,
      user_id: user.id,
      category,
      description: description.trim(),
      status: 'open'
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {submitted ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-teal-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Thanks — we've reported this to the admins.
            </h3>
            <p className="text-sm text-slate-600">
              They'll review it as soon as possible.
            </p>
          </div>
        ) : hasReported ? (
          <div className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              You've already reported this question
            </h3>
            <p className="text-sm text-slate-600">
              Admins will review your report soon.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Report issue</DialogTitle>
              <DialogDescription>
                What's wrong with this question?
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe the issue..."
                  rows={4}
                  required
                  className="resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!category || !description.trim() || submitReportMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {submitReportMutation.isPending ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}