import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BehavioralInsights({ data }) {
  // Use provided data or mock data for the behavioral meter
  const meterData = data || {
    discipline: 92,
    impulseRisk: 24,
    savingsStability: 74
  };

  const getStatus = (value, type) => {
    if (type === 'risk') {
      if (value < 30) return { label: 'Low', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', indicator: 'bg-emerald-500' };
      if (value < 70) return { label: 'Medium', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', indicator: 'bg-amber-500' };
      return { label: 'High', color: 'bg-destructive/10 text-destructive border-destructive/20', indicator: 'bg-destructive' };
    }
    
    // For positive traits (discipline, stability)
    if (value >= 80) return { label: 'Strong', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', indicator: 'bg-emerald-500' };
    if (value >= 50) return { label: 'Good', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', indicator: 'bg-blue-500' };
    return { label: 'Needs Work', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', indicator: 'bg-amber-500' };
  };

  const disciplineStatus = getStatus(meterData.discipline, 'positive');
  const impulseStatus = getStatus(meterData.impulseRisk, 'risk');
  const stabilityStatus = getStatus(meterData.savingsStability, 'positive');

  return (
    <Card className="border-primary/10 bg-card overflow-hidden shadow-sm">
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-1">Behavioral Meter</p>
            <CardTitle className="text-lg">How you're moving money</CardTitle>
          </div>
          <Activity className="size-5 text-primary/60" />
        </div>
      </CardHeader>
      
      <CardContent className="p-5 flex flex-col gap-5">
        
        {/* Discipline */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Discipline</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{meterData.discipline}%</span>
              <Badge variant="outline" className={cn("px-2 py-0 text-[10px] h-5 rounded-full font-semibold border", disciplineStatus.color)}>
                {disciplineStatus.label}
              </Badge>
            </div>
          </div>
          <Progress value={meterData.discipline} className="h-1.5 bg-muted" indicatorClassName={disciplineStatus.indicator} />
        </div>

        {/* Impulse Risk */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">Impulse risk</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{meterData.impulseRisk}%</span>
              <Badge variant="outline" className={cn("px-2 py-0 text-[10px] h-5 rounded-full font-semibold border", impulseStatus.color)}>
                {impulseStatus.label}
              </Badge>
            </div>
          </div>
          <Progress value={meterData.impulseRisk} className="h-1.5 bg-muted" indicatorClassName={impulseStatus.indicator} />
        </div>

        {/* Savings Stability */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-blue-500" />
              <span className="text-sm font-semibold text-foreground">Savings stability</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{meterData.savingsStability}%</span>
              <Badge variant="outline" className={cn("px-2 py-0 text-[10px] h-5 rounded-full font-semibold border", stabilityStatus.color)}>
                {stabilityStatus.label}
              </Badge>
            </div>
          </div>
          <Progress value={meterData.savingsStability} className="h-1.5 bg-muted" indicatorClassName={stabilityStatus.indicator} />
        </div>

      </CardContent>
    </Card>
  );
}
