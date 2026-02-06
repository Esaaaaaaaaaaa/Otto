import React, { useState } from 'react';
import { Year, Module, Submodule, Question } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function TaxonomyMigration() {
  const [status, setStatus] = useState('idle');
  const [results, setResults] = useState(null);

  const runMigration = async () => {
    setStatus('running');
    setResults(null);

    try {
      // Step 1: Create Year 1 and Year 2
      const years = await Year.list();
      let year1 = years.find(y => y.name === "Year 1");
      let year2 = years.find(y => y.name === "Year 2");

      if (!year1) {
        year1 = await Year.create({ name: "Year 1", order: 1 });
      }
      if (!year2) {
        year2 = await Year.create({ name: "Year 2", order: 2 });
      }

      // Step 2: Create Year 1 modules
      const modules = await Module.list();
      const year1Modules = {
        "Body in Motion": null,
        "Sustaining Life": null,
        "KCP": null,
        "REBM": null
      };

      for (const [moduleName, _] of Object.entries(year1Modules)) {
        let existing = modules.find(m => m.name === moduleName && m.year_id === year1.id);
        if (!existing) {
          existing = await Module.create({
            year_id: year1.id,
            name: moduleName,
            order: Object.keys(year1Modules).indexOf(moduleName) + 1
          });
        }
        year1Modules[moduleName] = existing;
      }

      // Step 3: Create submodules
      const submodules = await Submodule.list();
      const submoduleData = {
        "Body in Motion": ["Homeostasis", "Cardiorespiratory science", "Neuroscience", "Locomotor", "Pharmacology"],
        "Sustaining Life": ["Reproduction and Embryology", "Nutrition and Digestion", "Respiratory Medicine", "Cardiovascular Medicine", "Integrity"],
        "KCP": [],
        "REBM": []
      };

      const submoduleMap = {};
      for (const [moduleName, submoduleNames] of Object.entries(submoduleData)) {
        const module = year1Modules[moduleName];
        for (let i = 0; i < submoduleNames.length; i++) {
          const submoduleName = submoduleNames[i];
          let existing = submodules.find(s => s.name === submoduleName && s.module_id === module.id);
          if (!existing) {
            existing = await Submodule.create({
              module_id: module.id,
              name: submoduleName,
              order: i + 1
            });
          }
          submoduleMap[submoduleName] = existing;
        }
      }

      // Step 4: Migrate existing questions
      const questions = await Question.list();
      let migrated = 0;
      let failed = 0;
      let alreadyMigrated = 0;

      for (const question of questions) {
        // Skip if already has taxonomy IDs
        if (question.year_id && question.module_id) {
          alreadyMigrated++;
          continue;
        }

        // Try to match by old text fields
        const yearMatch = question.year === "Year 1" ? year1 : question.year === "Year 2" ? year2 : year1;
        const moduleMatch = year1Modules[question.module];
        const submoduleMatch = question.submodule ? submoduleMap[question.submodule] : null;

        if (moduleMatch) {
          await Question.update(question.id, {
            year_id: yearMatch.id,
            module_id: moduleMatch.id,
            submodule_id: submoduleMatch?.id || null
          });
          migrated++;
        } else {
          // Fallback to KCP
          await Question.update(question.id, {
            year_id: year1.id,
            module_id: year1Modules["KCP"].id,
            submodule_id: null
          });
          failed++;
        }
      }

      setResults({
        success: true,
        migrated,
        failed,
        alreadyMigrated,
        totalQuestions: questions.length
      });
      setStatus('success');
    } catch (error) {
      setResults({ success: false, error: error.message });
      setStatus('error');
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>Taxonomy Migration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This will create Year/Module/Submodule taxonomy and migrate existing questions. Run once only.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={runMigration}
          disabled={status === 'running'}
        >
          {status === 'running' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Run Migration
        </Button>

        {results && (
          <Alert className={results.success ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}>
            {results.success ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-rose-600" />}
            <AlertDescription>
              {results.success ? (
                <div className="space-y-1">
                  <div>✅ Migration complete!</div>
                  <div>• Migrated: {results.migrated}</div>
                  <div>• Already migrated: {results.alreadyMigrated}</div>
                  <div>• Failed (moved to KCP): {results.failed}</div>
                  <div>• Total: {results.totalQuestions}</div>
                </div>
              ) : (
                <div>❌ Error: {results.error}</div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}