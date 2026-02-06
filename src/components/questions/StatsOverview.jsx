import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Target, CheckCircle2, XCircle, Circle } from 'lucide-react';

export default function StatsOverview({ progress = [], totalQuestions = 0 }) {
  const totalAttempted = progress.filter(p => p.status !== "unseen").length;
  const correctCount = progress.filter(p => p.status === "correct").length;
  const incorrectCount = progress.filter(p => p.status === "attempted").length;
  const incompleteCount = totalQuestions - totalAttempted;
  const accuracy = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;

  const correctPercent = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
  const incorrectPercent = totalQuestions > 0 ? (incorrectCount / totalQuestions) * 100 : 0;
  const incompletePercent = totalQuestions > 0 ? (incompleteCount / totalQuestions) * 100 : 0;

  const stats = [
    {
      label: "Correct",
      value: correctCount,
      subtext: `${accuracy}% accuracy`,
      icon: CheckCircle2,
      color: "bg-teal-100 text-teal-700"
    },
    {
      label: "Incorrect",
      value: incorrectCount,
      icon: XCircle,
      color: "bg-slate-200 text-slate-700"
    },
    {
      label: "Questions Completed",
      value: totalAttempted,
      subtext: `of ${totalQuestions}`,
      icon: Target,
      color: "bg-slate-100 text-slate-600"
    }
  ];

  return (
    <div className="space-y-4">
      {/* Progress Bar - 3 segments */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Overall Progress</h3>
            <span className="text-sm text-slate-600">{totalQuestions} total questions</span>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
            {correctPercent > 0 && (
              <div 
                className="bg-teal-500 h-full transition-all duration-500"
                style={{ width: `${correctPercent}%` }}
              />
            )}
            {incorrectPercent > 0 && (
              <div 
                className="bg-amber-400 h-full transition-all duration-500"
                style={{ width: `${incorrectPercent}%` }}
              />
            )}
            {incompletePercent > 0 && (
              <div 
                className="bg-slate-200 h-full transition-all duration-500"
                style={{ width: `${incompletePercent}%` }}
              />
            )}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-teal-700 font-medium">{correctCount} correct</span>
            <span className="text-amber-600 font-medium">{incorrectCount} incorrect</span>
            <span className="text-slate-500 font-medium">{incompleteCount} incomplete</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-0 shadow-sm bg-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
                  {stat.subtext && (
                    <p className="text-xs text-slate-400 mt-1">{stat.subtext}</p>
                  )}
                </div>
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}