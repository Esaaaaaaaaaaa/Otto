import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { QuestionAttempt } from '@/api/entities';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const difficultyColors = {
  Easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Hard: "bg-rose-50 text-rose-700 border-rose-200"
};

export function calculateDifficulty(questionId, attempts) {
  const questionAttempts = attempts.filter(a => a.question_id === questionId);
  
  if (questionAttempts.length < 20) {
    return null; // Not enough data
  }
  
  const correctCount = questionAttempts.filter(a => a.is_correct).length;
  const percentage = (correctCount / questionAttempts.length) * 100;
  
  if (percentage >= 70) return 'Easy';
  if (percentage >= 50) return 'Medium';
  return 'Hard';
}

export default function DifficultyBadge({ question, className }) {
  const { data: attempts = [] } = useQuery({
    queryKey: ['allAttempts'],
    queryFn: () => QuestionAttempt.list(),
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // If manually set, use manual difficulty
  if (question.manual_difficulty) {
    return (
      <Badge className={cn("border", difficultyColors[question.difficulty || 'Medium'], className)}>
        {question.difficulty || 'Medium'}
      </Badge>
    );
  }

  // Otherwise calculate from data
  const calculatedDifficulty = calculateDifficulty(question.id, attempts);
  
  if (!calculatedDifficulty) {
    return null; // Don't show badge if not enough data
  }

  return (
    <Badge className={cn("border", difficultyColors[calculatedDifficulty], className)}>
      {calculatedDifficulty}
    </Badge>
  );
}