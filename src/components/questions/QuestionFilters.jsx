import React from 'react';
import { Year, Module, Submodule } from '@/api/entities';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X, Flag, CheckCircle2, XCircle, Shuffle } from 'lucide-react';

export default function QuestionFilters({ 
  filters, 
  setFilters, 
  onShuffle,
  showStatusFilters = true 
}) {
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

  const filteredModules = filters.year_id && filters.year_id !== "all"
    ? modules.filter(m => m.year_id === filters.year_id)
    : [];

  const filteredSubmodules = filters.module_id && filters.module_id !== "all"
    ? submodules.filter(s => s.module_id === filters.module_id)
    : [];

  const hasActiveFilters = filters.year_id !== "all" || 
    filters.module_id !== "all" ||
    filters.submodule_id !== "all" ||
    filters.difficulty !== "all" || 
    filters.status !== "all";

  const clearFilters = () => {
    setFilters({
      year_id: "all",
      module_id: "all",
      submodule_id: "all",
      difficulty: "all",
      status: "all"
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filters</span>
        </div>

        <Select 
          value={filters.year_id || "all"} 
          onValueChange={(v) => setFilters({ ...filters, year_id: v, module_id: "all", submodule_id: "all" })}
        >
          <SelectTrigger className="w-[140px] bg-white border-slate-200">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map(y => (
              <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={filters.module_id || "all"} 
          onValueChange={(v) => setFilters({ ...filters, module_id: v, submodule_id: "all" })}
        >
          <SelectTrigger className="w-[180px] bg-white border-slate-200">
            <SelectValue placeholder="All Modules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {filteredModules.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={filters.submodule_id || "all"} 
          onValueChange={(v) => setFilters({ ...filters, submodule_id: v })}
        >
          <SelectTrigger className="w-[180px] bg-white border-slate-200">
            <SelectValue placeholder="All Submodules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Submodules</SelectItem>
            {filteredSubmodules.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={filters.difficulty} 
          onValueChange={(v) => setFilters({ ...filters, difficulty: v })}
        >
          <SelectTrigger className="w-[140px] bg-white border-slate-200">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="Easy">Easy</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Hard">Hard</SelectItem>
          </SelectContent>
        </Select>

        {showStatusFilters && (
          <Select 
            value={filters.status} 
            onValueChange={(v) => setFilters({ ...filters, status: v })}
          >
            <SelectTrigger className="w-[160px] bg-white border-slate-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Questions</SelectItem>
              <SelectItem value="unanswered">
                <span className="flex items-center gap-2">Unanswered</span>
              </SelectItem>
              <SelectItem value="correct">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Correct
                </span>
              </SelectItem>
              <SelectItem value="incorrect">
                <span className="flex items-center gap-2">
                  <XCircle className="h-3 w-3 text-rose-500" />
                  Incorrect
                </span>
              </SelectItem>
              <SelectItem value="flagged">
                <span className="flex items-center gap-2">
                  <Flag className="h-3 w-3 text-amber-500" />
                  Flagged
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="text-slate-500 hover:text-slate-700"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}

        {onShuffle && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onShuffle}
            className="ml-auto"
          >
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle
          </Button>
        )}
      </div>
    </div>
  );
}