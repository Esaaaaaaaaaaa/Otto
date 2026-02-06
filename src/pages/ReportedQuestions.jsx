import React, { useState, useEffect } from 'react';
import { QuestionReport, Question, User } from '@/api/entities';
import { client } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Mail, MessageSquare, ExternalLink } from 'lucide-react';
import { cn } from "@/lib/utils";

const categoryLabels = {
  wrong_answer: 'Wrong answer',
  ambiguous_wording: 'Ambiguous wording',
  typo_formatting: 'Typo/formatting',
  explanation_issue: 'Explanation issue',
  tag_module_incorrect: 'Tag/module incorrect',
  other: 'Other'
};

const statusColors = {
  open: 'bg-amber-100 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  resolved: 'bg-teal-100 text-teal-700 border-teal-200',
  dismissed: 'bg-slate-100 text-slate-700 border-slate-200'
};

export default function ReportedQuestions() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [adminResponse, setAdminResponse] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const currentUser = await client.auth.me();
        if (currentUser.app_role !== 'committee') {
          window.location.href = '/';
          return;
        }
        setUser(currentUser);
      } catch (error) {
        await client.auth.redirectToLogin();
      } finally {
        setLoading(false);
      }
    };
    checkAdmin();
  }, []);

  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['questionReports'],
    queryFn: () => QuestionReport.list('-created_date')
  });

  const { data: questions = [] } = useQuery({
    queryKey: ['questions'],
    queryFn: () => Question.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => User.list()
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, data }) => {
      return QuestionReport.update(reportId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionReports'] });
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ userEmail, questionText, adminResponse }) => {
      return client.integrations.Core.SendEmail({
        to: userEmail,
        subject: 'Question Report Update',
        body: `Your reported issue for the question "${questionText}" has been marked as resolved.\n\n${adminResponse ? `Admin response: ${adminResponse}` : ''}\n\nThank you for helping us improve the question bank.`
      });
    }
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Group reports by question
  const groupedReports = {};
  reports.forEach(report => {
    if (!groupedReports[report.question_id]) {
      groupedReports[report.question_id] = [];
    }
    groupedReports[report.question_id].push(report);
  });

  const filteredGroups = Object.entries(groupedReports).filter(([questionId, questionReports]) => {
    if (statusFilter === 'all') return true;
    return questionReports.some(r => r.status === statusFilter);
  });

  const handleUpdateReport = async () => {
    if (!selectedReport) return;

    const updateData = {
      status: newStatus || selectedReport.status,
      admin_note: adminNote,
      admin_response: adminResponse
    };

    await updateReportMutation.mutateAsync({
      reportId: selectedReport.id,
      data: updateData
    });

    if (sendEmail && adminResponse) {
      const reporter = users.find(u => u.id === selectedReport.user_id);
      const question = questions.find(q => q.id === selectedReport.question_id);
      
      if (reporter?.email && question) {
        await sendEmailMutation.mutateAsync({
          userEmail: reporter.email,
          questionText: question.question_text,
          adminResponse
        });
      }
    }

    setSelectedReport(null);
    setAdminNote('');
    setAdminResponse('');
    setNewStatus('');
    setSendEmail(false);
  };

  const openReportDetails = (report) => {
    setSelectedReport(report);
    setAdminNote(report.admin_note || '');
    setAdminResponse(report.admin_response || '');
    setNewStatus(report.status);
    setSendEmail(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Reported Questions</h1>
          </div>
          <p className="text-slate-600"></p>
        </div>

        {/* Summary + Filter */}
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Total Reports</p>
              <p className="text-2xl font-bold text-slate-900">{reports.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Open</p>
              <p className="text-2xl font-bold text-amber-700">
                {reports.filter(r => r.status === 'open').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-700">
                {reports.filter(r => r.status === 'in_progress').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Resolved</p>
              <p className="text-2xl font-bold text-teal-700">
                {reports.filter(r => r.status === 'resolved').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Reports List */}
        {loadingReports ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">No reports found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredGroups.map(([questionId, questionReports]) => {
              const question = questions.find(q => q.id === questionId);
              const openCount = questionReports.filter(r => r.status === 'open').length;
              
              return (
                <Card key={questionId} className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 mb-2 line-clamp-2">
                          {question?.question_text || 'Question not found'}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {questionReports.length} {questionReports.length === 1 ? 'report' : 'reports'}
                          </Badge>
                          {openCount > 0 && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">
                              {openCount} open
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(createPageUrl(`AddQuestion?id=${questionId}&fromReport=true`))}
                        className="ml-4"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Edit Question
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {questionReports.map(report => {
                        const reporter = users.find(u => u.id === report.user_id);
                        
                        return (
                          <div
                            key={report.id}
                            className="p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                            onClick={() => openReportDetails(report)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge className={cn("text-xs border", statusColors[report.status])}>
                                  {report.status.replace('_', ' ')}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {categoryLabels[report.category]}
                                </Badge>
                              </div>
                              <span className="text-xs text-slate-500">
                                {new Date(report.created_date).toLocaleDateString("en-gb")}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 line-clamp-2">{report.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Report Detail Dialog */}
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Report Details</DialogTitle>
              <DialogDescription>
                Review and manage this report
              </DialogDescription>
            </DialogHeader>

            {selectedReport && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-900 mb-2">Question</p>
                  <p className="text-sm text-slate-700">
                    {questions.find(q => q.id === selectedReport.question_id)?.question_text}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-600">Category</Label>
                    <p className="text-sm font-medium">{categoryLabels[selectedReport.category]}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Reported</Label>
                    <p className="text-sm font-medium">
                      {new Date(selectedReport.created_date).toLocaleDateString("en-gb")}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-600">Description</Label>
                  <p className="text-sm text-slate-700 mt-1">{selectedReport.description}</p>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="admin-note">Admin Note (internal)</Label>
                  <Textarea
                    id="admin-note"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Internal notes..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="admin-response">Response to Reporter</Label>
                  <Textarea
                    id="admin-response"
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    placeholder="This will be sent to the user if you choose to send an email..."
                    rows={3}
                  />
                </div>

                {adminResponse && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="send-email"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="send-email" className="text-sm text-slate-700 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Send update email to reporter
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedReport(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateReport}
                    disabled={updateReportMutation.isPending || sendEmailMutation.isPending}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {updateReportMutation.isPending || sendEmailMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}