import React, { useState, useMemo } from 'react';
import { Year, Module, Submodule } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from 'lucide-react';

const TIME_PERIODS = [
  { value: 'day', label: 'Day', days: 1 },
  { value: '3days', label: '3 Days', days: 3 },
  { value: 'week', label: 'Week', days: 7 },
  { value: '2weeks', label: '2 Weeks', days: 14 },
  { value: 'month', label: 'Month', days: 30 },
  { value: '3months', label: '3 Months', days: 90 },
  { value: '6months', label: '6 Months', days: 180 },
  { value: 'year', label: 'Year', days: 365 }
];

const COLORS = ['#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6', '#10b981', '#ec4899'];

export default function LearningProgressChart({ userProgress = [], questions = [] }) {
  const [timePeriod, setTimePeriod] = useState('week');
  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [selectedSubmodules, setSelectedSubmodules] = useState([]);

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

  const formatDate = (date, period) => {
    if (period === 'day') return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    if (period === '3days' || period === 'week') return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    if (period === '2weeks' || period === 'month') return date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  const chartData = useMemo(() => {
    if (userProgress.length === 0) return [];

    const periodDays = TIME_PERIODS.find(p => p.value === timePeriod)?.days || 7;
    const now = new Date();
    const startDate = new Date(now.getTime() - (periodDays * 30 * 24 * 60 * 60 * 1000)); // Look back 30 periods

    // Filter progress by selections
    const filteredProgress = userProgress.filter(p => {
      const q = questions.find(qu => qu.id === p.question_id);
      if (!q) return false;

      if (selectedYears.length > 0 && !selectedYears.includes(q.year_id)) return false;
      if (selectedModules.length > 0 && !selectedModules.includes(q.module_id)) return false;
      if (selectedSubmodules.length > 0 && !selectedSubmodules.includes(q.submodule_id)) return false;

      return p.last_answered_at && new Date(p.last_answered_at) >= startDate;
    });

    // Group by filter combinations
    const series = [];

    // Overall series
    if (selectedYears.length === 0 && selectedModules.length === 0 && selectedSubmodules.length === 0) {
      series.push({ key: 'overall', name: 'Overall', progress: filteredProgress });
    }

    // Year series
    selectedYears.forEach(yearId => {
      const year = years.find(y => y.id === yearId);
      const yearProgress = filteredProgress.filter(p => {
        const q = questions.find(qu => qu.id === p.question_id);
        return q && q.year_id === yearId;
      });
      if (yearProgress.length > 0) {
        series.push({ key: yearId, name: year?.name || 'Unknown Year', progress: yearProgress });
      }
    });

    // Module series
    selectedModules.forEach(moduleId => {
      const module = modules.find(m => m.id === moduleId);
      const moduleProgress = filteredProgress.filter(p => {
        const q = questions.find(qu => qu.id === p.question_id);
        return q && q.module_id === moduleId;
      });
      if (moduleProgress.length > 0) {
        series.push({ key: moduleId, name: module?.name || 'Unknown Module', progress: moduleProgress });
      }
    });

    // Submodule series
    selectedSubmodules.forEach(submoduleId => {
      const submodule = submodules.find(s => s.id === submoduleId);
      const submoduleProgress = filteredProgress.filter(p => {
        const q = questions.find(qu => qu.id === p.question_id);
        return q && q.submodule_id === submoduleId;
      });
      if (submoduleProgress.length > 0) {
        series.push({ key: submoduleId, name: submodule?.name || 'Unknown Submodule', progress: submoduleProgress });
      }
    });

    // Generate time buckets using local date boundaries
    const buckets = new Map();
    const numBuckets = 30;
    const today = new Date();
    
    for (let i = 0; i < numBuckets; i++) {
      const bucketStart = new Date(startDate.getTime() + (i * periodDays * 24 * 60 * 60 * 1000));
      const bucketEnd = new Date(bucketStart.getTime() + (periodDays * 24 * 60 * 60 * 1000));
      
      // Skip future buckets
      if (bucketStart > today) continue;
      
      const bucketData = { date: bucketStart };

      series.forEach(s => {
        const attemptsInBucket = s.progress.filter(p => {
          const date = new Date(p.last_answered_at);
          // Use local date comparison
          const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const localBucketStart = new Date(bucketStart.getFullYear(), bucketStart.getMonth(), bucketStart.getDate());
          const localBucketEnd = new Date(bucketEnd.getFullYear(), bucketEnd.getMonth(), bucketEnd.getDate());
          return localDate >= localBucketStart && localDate < localBucketEnd;
        });

        const correctCount = attemptsInBucket.filter(p => p.status === 'correct').length;
        const totalCount = attemptsInBucket.length;
        
        bucketData[s.key] = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : null;
      });

      buckets.set(i, bucketData);
    }

    return Array.from(buckets.values()).filter(d => {
      return series.some(s => d[s.key] !== null);
    }).map(d => ({
      ...d,
      label: formatDate(d.date, timePeriod)
    }));
  }, [userProgress, questions, timePeriod, selectedYears, selectedModules, selectedSubmodules, years, modules, submodules, formatDate]);

  const series = useMemo(() => {
    const s = [];
    if (selectedYears.length === 0 && selectedModules.length === 0 && selectedSubmodules.length === 0) {
      s.push({ key: 'overall', name: 'Overall' });
    }
    selectedYears.forEach(id => {
      const year = years.find(y => y.id === id);
      s.push({ key: id, name: year?.name || 'Unknown' });
    });
    selectedModules.forEach(id => {
      const module = modules.find(m => m.id === id);
      s.push({ key: id, name: module?.name || 'Unknown' });
    });
    selectedSubmodules.forEach(id => {
      const submodule = submodules.find(s => s.id === id);
      s.push({ key: id, name: submodule?.name || 'Unknown' });
    });
    return s;
  }, [selectedYears, selectedModules, selectedSubmodules, years, modules, submodules]);

  const toggleSelection = (arr, setArr, value) => {
    if (arr.includes(value)) {
      setArr(arr.filter(v => v !== value));
    } else {
      setArr([...arr, value]);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-teal-600" />
          Progress over time (% correct)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Time Period Filter */}
        <div>
          <Label className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Group by
          </Label>
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">View by (select multiple):</p>
          
          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <span className="text-sm font-medium text-slate-700">
                Years {selectedYears.length > 0 && `(${selectedYears.length} selected)`}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 p-3 border border-slate-200 rounded-lg space-y-2">
              {years.map(year => (
                <div key={year.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`year-${year.id}`}
                    checked={selectedYears.includes(year.id)}
                    onCheckedChange={() => toggleSelection(selectedYears, setSelectedYears, year.id)}
                  />
                  <label htmlFor={`year-${year.id}`} className="text-sm text-slate-700 cursor-pointer">
                    {year.name}
                  </label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <span className="text-sm font-medium text-slate-700">
                Modules {selectedModules.length > 0 && `(${selectedModules.length} selected)`}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 p-3 border border-slate-200 rounded-lg space-y-2 max-h-64 overflow-y-auto">
              {modules.map(module => (
                <div key={module.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`module-${module.id}`}
                    checked={selectedModules.includes(module.id)}
                    onCheckedChange={() => toggleSelection(selectedModules, setSelectedModules, module.id)}
                  />
                  <label htmlFor={`module-${module.id}`} className="text-sm text-slate-700 cursor-pointer">
                    {module.name}
                  </label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <span className="text-sm font-medium text-slate-700">
                Submodules {selectedSubmodules.length > 0 && `(${selectedSubmodules.length} selected)`}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 p-3 border border-slate-200 rounded-lg space-y-2 max-h-64 overflow-y-auto">
              {submodules.map(submodule => (
                <div key={submodule.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`submodule-${submodule.id}`}
                    checked={selectedSubmodules.includes(submodule.id)}
                    onCheckedChange={() => toggleSelection(selectedSubmodules, setSelectedSubmodules, submodule.id)}
                  />
                  <label htmlFor={`submodule-${submodule.id}`} className="text-sm text-slate-700 cursor-pointer">
                    {submodule.name}
                  </label>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} />
                <YAxis domain={[0, 100]} label={{ value: '% Correct', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
                {series.map((s, idx) => (
                  <Line 
                    key={s.key} 
                    type="monotone" 
                    dataKey={s.key} 
                    name={s.name}
                    stroke={COLORS[idx % COLORS.length]} 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            No data available for selected filters
          </div>
        )}
      </CardContent>
    </Card>
  );
}