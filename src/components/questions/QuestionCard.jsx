import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flag, CheckCircle2, XCircle, ChevronRight, Lightbulb, BookOpen, AlertCircle } from 'lucide-react';
import ReportQuestionDialog from './ReportQuestionDialog';
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';

const difficultyColors = {
  Easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Hard: "bg-rose-50 text-rose-700 border-rose-200"
};

export default function QuestionCard({ 
  question, 
  onSubmit, 
  onFlag, 
  isFlagged = false,
  showAnswer = false,
  selectedAnswer = null,
  setSelectedAnswer,
  onNext
}) {
  const [localSelected, setLocalSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  // Reset when question changes
  React.useEffect(() => {
    setLocalSelected(null);
    setRevealed(false);
  }, [question.id]);

  const handleSelect = (label) => {
    if (revealed) return;
    setLocalSelected(label);
  };

  const handleSubmit = () => {
    if (!localSelected) return;
    setRevealed(true);
    if (onSubmit) onSubmit(localSelected);
  };

  const isCorrect = localSelected === question.correct_answer;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-medium text-slate-600 border-slate-200">
            {question.year}
          </Badge>
          <Badge variant="outline" className="font-medium text-slate-600 border-slate-200">
            {question.module}
          </Badge>
          {question.submodule && (
            <Badge variant="outline" className="font-medium text-slate-500 border-slate-200">
              {question.submodule}
            </Badge>
          )}
          <Badge className={cn("border", difficultyColors[question.difficulty || 'Medium'])}>
            {question.difficulty || 'Medium'}
          </Badge>
        </div>
        <ReportQuestionDialog
          questionId={question.id}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-slate-600"
            >
              <AlertCircle className="h-5 w-5" />
            </Button>
          }
        />
      </div>

      {/* Question Stem */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-white">
        <CardContent className="p-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-teal-600" />
            </div>
            <div className="space-y-3 flex-1">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {question.question_stem}
              </p>
              <p className="text-slate-900 font-semibold text-lg">
                {question.question_text}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      <div className="space-y-3">
        {question.options?.map((option, idx) => {
          const isSelected = localSelected === option.label;
          const isCorrectOption = option.label === question.correct_answer;
          
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
            <motion.button
              key={option.label}
              whileHover={!revealed ? { scale: 1.01 } : {}}
              whileTap={!revealed ? { scale: 0.99 } : {}}
              onClick={() => handleSelect(option.label)}
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
                <span className={cn(
                  "flex-1 pt-1",
                  revealed && isCorrectOption ? "text-emerald-800 font-medium" :
                  revealed && isSelected && !isCorrectOption ? "text-rose-800" :
                  "text-slate-700"
                )}>
                  {option.text}
                </span>
                {revealed && isCorrectOption && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-1" />
                )}
                {revealed && isSelected && !isCorrectOption && (
                  <XCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-1" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-2">
        {!revealed ? (
          <Button
            onClick={handleSubmit}
            disabled={!localSelected}
            className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-5 rounded-xl font-medium"
          >
            Check Answer
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <div className={cn(
              "px-4 py-2 rounded-lg font-medium flex items-center gap-2",
              isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            )}>
              {isCorrect ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Correct! +1
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5" />
                  Incorrect
                </>
              )}
            </div>
          </div>
        )}
        
        {revealed && onNext && (
          <Button
            onClick={onNext}
            className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-5 rounded-xl font-medium"
          >
            Next Question
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
              <CardContent className="p-6">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-200 flex items-center justify-center">
                    <Lightbulb className="h-5 w-5 text-amber-700" />
                  </div>
                  <div className="space-y-4 flex-1">
                    <h4 className="font-semibold text-amber-900">Explanation</h4>
                    <div className="text-amber-900/80 leading-relaxed prose prose-sm max-w-none">
                      <ReactMarkdown>{question.explanation}</ReactMarkdown>
                    </div>
                    
                    {question.key_learning_points?.length > 0 && (
                      <div className="pt-3 border-t border-amber-200/50">
                        <h5 className="font-medium text-amber-900 mb-2">Key Learning Points</h5>
                        <ul className="space-y-1.5">
                          {question.key_learning_points.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-amber-900/80 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}