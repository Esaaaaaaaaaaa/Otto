import React from 'react';
import { Year, Module, Submodule } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChevronDown } from 'lucide-react';



export default function SpecialtyProgress({ questions = [], progress = [] }) {
  const [selectedYear, setSelectedYear] = React.useState("all");

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

  // Group by year and submodule
  const yearData = {};
  
  years.forEach(year => {
    yearData[year.id] = {
      name: year.name,
      submodules: {}
    };
  });

  // Count questions per submodule
  questions.forEach(q => {
    if (!q.year_id) return;
    if (!yearData[q.year_id]) return;
    
    // Use submodule_id as key, or module_id if no submodule
    const key = q.submodule_id || q.module_id;
    if (!key) return;
    
    if (!yearData[q.year_id].submodules[key]) {
      let displayName = 'Unknown';
      
      if (q.submodule_id) {
        const submodule = submodules.find(s => s.id === q.submodule_id);
        const module = modules.find(m => m.id === q.module_id);
        displayName = module?.name && submodule?.name 
          ? `${module.name} - ${submodule.name}`
          : submodule?.name || 'Unknown';
      } else if (q.module_id) {
        const module = modules.find(m => m.id === q.module_id);
        displayName = module?.name || 'Unknown';
      }
      
      yearData[q.year_id].submodules[key] = {
        name: displayName,
        total: 0,
        attempted: 0,
        correct: 0,
        incorrect: 0
      };
    }
    yearData[q.year_id].submodules[key].total++;
  });

  // Add progress data
  progress.forEach(prog => {
    const question = questions.find(q => q.id === prog.question_id);
    if (!question || !question.year_id) return;
    
    const key = question.submodule_id || question.module_id;
    if (!key) return;
    if (!yearData[question.year_id]?.submodules[key]) return;

    if (prog.status !== "unseen") {
      yearData[question.year_id].submodules[key].attempted++;
      if (prog.status === "correct") {
        yearData[question.year_id].submodules[key].correct++;
      } else if (prog.status === "attempted") {
        yearData[question.year_id].submodules[key].incorrect++;
      }
    }
  });

  const filteredYears = selectedYear === "all" 
    ? Object.entries(yearData) 
    : Object.entries(yearData).filter(([id]) => id === selectedYear);

  // Custom ordering for display
  const getDisplayOrder = (displayName, yearId) => {
    const year = years.find(y => y.id === yearId);
    const yearName = year?.name;
    
    if (yearName === "Year 1") {
      const order = [
        "Body in Motion - Homeostasis",
        "Body in Motion - Cardiorespiratory science",
        "Body in Motion - Neuroscience",
        "Body in Motion - Locomotor",
        "Body in Motion - Pharmacology",
        "Sustaining Life - Reproduction and Embryology",
        "Sustaining Life - Nutrition and Digestion",
        "Sustaining Life - Respiratory Medicine",
        "Sustaining Life - Cardiovascular Medicine",
        "Sustaining Life - Integrity",
        "KCP",
        "REBM"
      ];
      const index = order.indexOf(displayName);
      return index >= 0 ? index : 999;
    }
    
    if (yearName === "Year 2") {
      const order = [
        "Command And Control - Neurology",
        "Command And Control - Endocrinology",
        "Transitions",
        "Nephrology",
        "Nutrition and Digestion - Gastroenterology",
        "Nutrition and Digestion - Hepatology",
        "Nutrition and Digestion - Metabolism",
        "Nutrition and Digestion - Diabetes",
        "REBM"
      ];
      const index = order.indexOf(displayName);
      return index >= 0 ? index : 999;
    }
    
    return 999;
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800">Progress by Topic</CardTitle>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years.map(y => (
                <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {filteredYears.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No questions yet</p>
        ) : (
          filteredYears.map(([yearId, yearInfo], yearIdx) => {
            const submoduleEntries = Object.entries(yearInfo.submodules)
              .sort((a, b) => {
                const orderA = getDisplayOrder(a[1].name, yearId);
                const orderB = getDisplayOrder(b[1].name, yearId);
                return orderA - orderB;
              });

            if (submoduleEntries.length === 0) return null;

            return (
              <div key={yearId} className="space-y-3">
                <h3 className="font-semibold text-slate-700 text-sm">{yearInfo.name}</h3>
                {submoduleEntries.map(([submoduleId, data], idx) => {
                  const correctPercent = data.total > 0 ? (data.correct / data.total) * 100 : 0;
                  const incorrectPercent = data.total > 0 ? (data.incorrect / data.total) * 100 : 0;
                  const incompletePercent = 100 - correctPercent - incorrectPercent;
                  const accuracyPercent = data.attempted > 0 ? Math.round((data.correct / data.attempted) * 100) : 0;
                  
                  return (
                    <div key={submoduleId} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-700">{data.name}</span>
                        <span className="text-slate-500">
                          {data.attempted}/{data.total} 
                          {data.attempted > 0 && (
                            <span className="ml-2 text-slate-600">
                              ({accuracyPercent}%)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden flex">
                        {correctPercent > 0 && (
                          <div 
                            className="h-full bg-teal-500 transition-all duration-500"
                            style={{ width: `${correctPercent}%` }}
                          />
                        )}
                        {incorrectPercent > 0 && (
                          <div 
                            className="h-full bg-amber-400 transition-all duration-500"
                            style={{ width: `${incorrectPercent}%` }}
                          />
                        )}
                        {incompletePercent > 0 && (
                          <div 
                            className="h-full bg-slate-200 transition-all duration-500"
                            style={{ width: `${incompletePercent}%` }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}