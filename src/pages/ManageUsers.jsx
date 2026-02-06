import React, { useState } from 'react';
import { User } from '@/api/entities';
import { client } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, UserCheck, UserX, AlertCircle, CheckCircle2, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
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

export default function ManageUsers() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [promoteEmail, setPromoteEmail] = useState('');
  const [revokeUserId, setRevokeUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => client.auth.me()
  });

  const { data: allUsers = [], isLoading, error } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => User.list(),
    enabled: !!currentUser
  });

  // Fetch committee members specifically (accessible to all committee members)
  const { data: committeeMembers = [] } = useQuery({
    queryKey: ['committeeUsers'],
    queryFn: () => User.filter({ app_role: 'committee' }),
    enabled: !!currentUser
  });

  // Redirect if not Base44 admin
  React.useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const promoteMutation = useMutation({
    mutationFn: async (email) => {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Try to find user in allUsers first
      let targetUser = allUsers.find(u => u.email.toLowerCase() === normalizedEmail);
      
      // If not found, try to fetch by filter (in case list is restricted)
      if (!targetUser) {
        try {
          const users = await User.filter({ email: normalizedEmail });
          targetUser = users[0];
        } catch (err) {
          throw new Error('User not found — ask them to sign up first');
        }
      }
      
      if (!targetUser) {
        throw new Error('User not found — ask them to sign up first');
      }
      
      if (targetUser.app_role === 'committee') {
        throw new Error('User is already a committee member');
      }
      
      await User.update(targetUser.id, { app_role: 'committee' });
      return targetUser;
    },
    onSuccess: (targetUser) => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['committeeUsers'] });
      toast.success(`${targetUser.email} is now a committee member`, {
        icon: <CheckCircle2 className="h-4 w-4" />,
        duration: 5000
      });
      setPromoteEmail('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to grant committee access', {
        icon: <AlertCircle className="h-4 w-4" />
      });
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async (userId) => {
      const targetUser = committeeMembers.find(u => u.id === userId) || allUsers.find(u => u.id === userId);
      
      if (!targetUser) {
        throw new Error('User not found');
      }

      if (targetUser.id === currentUser.id) {
        throw new Error('You cannot revoke your own admin access');
      }

      if (targetUser.app_role !== 'committee') {
        throw new Error('User is not a committee member');
      }
      
      await User.update(userId, { app_role: 'user' });
      return targetUser;
    },
    onSuccess: (targetUser) => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['committeeUsers'] });
      toast.success(`Committee access revoked for ${targetUser.email}`, {
        icon: <CheckCircle2 className="h-4 w-4" />
      });
      setRevokeUserId(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to revoke committee access', {
        icon: <AlertCircle className="h-4 w-4" />
      });
      setRevokeUserId(null);
    }
  });

  const toggleExcludeMutation = useMutation({
    mutationFn: async ({ userId, currentValue }) => {
      await User.update(userId, { exclude_from_analytics: !currentValue });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['committeeUsers'] });
      toast.success('Analytics exclusion updated', {
        icon: <CheckCircle2 className="h-4 w-4" />
      });
    },
    onError: (error) => {
      toast.error('Failed to update analytics exclusion', {
        icon: <AlertCircle className="h-4 w-4" />
      });
    }
  });

  const handlePromote = () => {
    if (!promoteEmail || !promoteEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    promoteMutation.mutate(promoteEmail);
  };

  const handleRevoke = () => {
    if (revokeUserId) {
      revokeMutation.mutate(revokeUserId);
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  const regularUsers = allUsers.filter(u => u.app_role !== 'committee');

  // Filter regular users by search
  const filteredRegularUsers = regularUsers.filter(u => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return u.email.toLowerCase().includes(query) || 
           u.full_name?.toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Manage User Roles</h1>
          <p className="text-slate-500">Grant or revoke committee access for existing users</p>
        </div>

        {/* Promote User to Committee */}
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Grant Committee Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              To add a committee member: ask them to sign up normally, then enter their email below.
            </p>
            <div>
              <Label htmlFor="promote-email" className="text-sm">Email Address</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  id="promote-email"
                  type="email"
                  placeholder="user@example.com"
                  value={promoteEmail}
                  onChange={(e) => setPromoteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePromote()}
                  className="flex-1"
                />
                <Button 
                  onClick={handlePromote}
                  disabled={promoteMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  {promoteMutation.isPending ? 'Processing...' : 'Grant Committee'}
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-500 border-t border-slate-200 pt-3">
              Committee members can manage questions, view analytics, and moderate content.
            </p>
          </CardContent>
        </Card>

        {/* Current Committee Members */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Committee Members
              </span>
              <Badge variant="outline">{committeeMembers.length} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : committeeMembers.length === 0 ? (
              <p className="text-sm text-slate-500">No committee members found</p>
            ) : (
              <div className="space-y-2">
                {committeeMembers.map(user => (
                  <div 
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-teal-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                          {user.email}
                          {user.exclude_from_analytics && (
                            <Badge variant="outline" className="text-xs text-slate-500">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Excluded
                            </Badge>
                          )}
                        </p>
                        {user.full_name && (
                          <p className="text-xs text-slate-500">{user.full_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExcludeMutation.mutate({ userId: user.id, currentValue: user.exclude_from_analytics })}
                        className={user.exclude_from_analytics ? "text-slate-600" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}
                      >
                        <EyeOff className="h-4 w-4 mr-2" />
                        {user.exclude_from_analytics ? 'Include' : 'Exclude'}
                      </Button>
                      {user.id === currentUser.id ? (
                        <Badge className="bg-teal-100 text-teal-700">You</Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRevokeUserId(user.id)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Regular Users (for reference) */}
        {regularUsers.length > 0 && (
          <Card className="border-0 shadow-sm mt-6">
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span>Regular Users</span>
                  <Badge variant="outline">{regularUsers.length} total</Badge>
                </CardTitle>
              </div>
              <div className="relative">
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredRegularUsers.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No users found</p>
                ) : (
                  filteredRegularUsers.map(user => (
                  <div 
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        {user.email}
                        {user.exclude_from_analytics && (
                          <Badge variant="outline" className="text-xs text-slate-500">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Excluded
                          </Badge>
                        )}
                      </p>
                      {user.full_name && (
                        <p className="text-xs text-slate-500">{user.full_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExcludeMutation.mutate({ userId: user.id, currentValue: user.exclude_from_analytics })}
                        className={user.exclude_from_analytics ? "text-slate-600" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}
                      >
                        <EyeOff className="h-4 w-4 mr-2" />
                        {user.exclude_from_analytics ? 'Include' : 'Exclude'}
                      </Button>
                      <Badge variant="outline" className="text-slate-600">User</Badge>
                    </div>
                  </div>
                  ))
                  )}
                  </div>
                  </CardContent>
                  </Card>
                  )}
      </div>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!revokeUserId} onOpenChange={() => setRevokeUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Committee Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This user will lose access to committee features like question management, analytics, and moderation tools. 
              They will become a regular user but can still use the app normally.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevoke}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Revoke Committee Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}