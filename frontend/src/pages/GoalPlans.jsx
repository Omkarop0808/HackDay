import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Loader2,
  Plus,
  Target,
  TrendingUp,
  MapPin,
  DollarSign,
  Trophy,
  Star,
  Flame,
} from "lucide-react";
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Money } from "@/components/ui/money";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeDate(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d;
}

function getGoalProgress(goal) {
  const target = Math.max(0, toNumber(goal.targetAmount));
  const current = Math.max(0, toNumber(goal.currentAmount));
  if (target <= 0) return 0;
  return clampNumber(Math.round((current / target) * 100), 0, 100);
}

function getTimePlan(goal, now) {
  const target = Math.max(0, toNumber(goal.targetAmount));
  const current = Math.max(0, toNumber(goal.currentAmount));
  const remaining = Math.max(0, target - current);
  const deadline = safeDate(goal.deadline);

  if (!deadline || remaining <= 0) {
    return {
      remaining,
      deadline,
      daysLeft: null,
      perWeek: null,
      perMonth: null,
      status: remaining <= 0 && target > 0 ? "done" : "no-deadline",
    };
  }

  const daysLeft = differenceInCalendarDays(deadline, now);
  if (daysLeft <= 0) {
    return {
      remaining,
      deadline,
      daysLeft,
      perWeek: remaining,
      perMonth: remaining,
      status: "overdue",
    };
  }

  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
  const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30));
  const perWeek = Math.ceil(remaining / weeksLeft);
  const perMonth = Math.ceil(remaining / monthsLeft);

  const status = daysLeft <= 14 ? "tight" : "on-track";
  return { remaining, deadline, daysLeft, perWeek, perMonth, status };
}

function normalizeGoals(payload) {
  const short = payload?.data?.shortTermGoals || [];
  const long = payload?.data?.longTermGoals || [];

  const mapOne = (g, goalType) => ({
    ...g,
    goalType,
    deadline: g.deadline ? new Date(g.deadline) : null,
  });

  return {
    short: short.map((g) => mapOne(g, "shortTerm")),
    long: long.map((g) => mapOne(g, "longTerm")),
  };
}

function buildMonthDays(cursorDate) {
  const monthStart = startOfMonth(cursorDate);
  const monthEnd = endOfMonth(cursorDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let d = gridStart;
  while (d <= gridEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  return { monthStart, monthEnd, gridStart, gridEnd, days };
}

function buildEventsForMonth(goals, cursorDate) {
  const now = new Date();
  const { monthStart, monthEnd } = buildMonthDays(cursorDate);

  const events = [];

  for (const goal of goals) {
    if (goal.isCompleted) continue;

    const plan = getTimePlan(goal, now);
    const deadline = plan.deadline;

    if (!deadline) {
      // Keep the calendar meaningful even when users haven't set deadlines.
      // Show a gentle reminder on the first day of the visible month.
      events.push({
        id: `${goal.goalType}:${goal.id}:set-deadline:${format(monthStart, "yyyy-MM-dd")}`,
        date: monthStart,
        kind: "set-deadline",
        title: `Set deadline: ${goal.title}`,
        subtitle: "Add a deadline to generate weekly savings tasks",
        goal,
      });
    }

    if (deadline && deadline >= monthStart && deadline <= monthEnd) {
      events.push({
        id: `${goal.goalType}:${goal.id}:deadline`,
        date: deadline,
        kind: "deadline",
        title: `Deadline: ${goal.title}`,
        subtitle:
          plan.remaining > 0
            ? `Remaining ₹${plan.remaining.toLocaleString()}`
            : "Done",
        goal,
      });
    }

    if (!deadline || !plan.perWeek || plan.remaining <= 0) continue;

    // Weekly savings tasks for the visible month.
    // Short-term goals: show weekly tasks on Monday (weekStartsOn:1).
    // Long-term goals: show weekly tasks on Sunday (weekStartsOn:0).
    const weekStart = goal.goalType === "longTerm" ? 0 : 1;
    let d = startOfWeek(monthStart, { weekStartsOn: weekStart });
    while (d <= monthEnd) {
      if (d >= monthStart && d <= monthEnd) {
        events.push({
          id: `${goal.goalType}:${goal.id}:weekly:${format(d, "yyyy-MM-dd")}`,
          date: d,
          kind: "save",
          title: `Save for ${goal.title}`,
          subtitle: `This week: ₹${plan.perWeek.toLocaleString()}`,
          amount: plan.perWeek,
          goal,
        });
      }
      d = addDays(d, 7);
    }
  }

  return events;
}

function groupEventsByDay(events) {
  const map = new Map();
  for (const ev of events) {
    const key = format(ev.date, "yyyy-MM-dd");
    const list = map.get(key) || [];
    list.push(ev);
    map.set(key, list);
  }
  return map;
}

// New Component: Visual Goals Analysis (Zero Text Style)
function GoalAnalysisSection({ goal }) {
  const { user } = useUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchAnalysis = async () => {
      // Generate cache key based on goal ID and current amount
      const cacheKey = `goal_analysis_${goal.goalType}_${goal.id}_${goal.currentAmount}_${goal.targetAmount}`;

      // Check sessionStorage first
      const cachedData = sessionStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          const cacheTime = parsed.timestamp || 0;
          const now = Date.now();
          // Cache valid for 5 minutes
          if (now - cacheTime < 5 * 60 * 1000) {
            setData(parsed.data);
            return;
          }
        } catch (e) {
          console.error("Failed to parse cached data", e);
        }
      }

      // If no cache or expired, fetch from API
      setLoading(true);
      setError(null);
      try {
        const res = await axios.post(
          `${API_URL}/api/goal-analysis/analyze-goal`,
          {
            goal,
            firebaseUid: user.uid,
          },
        );
        setData(res.data);

        // Cache the response
        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: res.data,
              timestamp: Date.now(),
            }),
          );
        } catch (e) {
          console.error("Failed to cache data", e);
        }
      } catch (e) {
        console.error("Failed to analyze goal", e);
        setError("Unable to load insights");
      } finally {
        setLoading(false);
      }
    };

    if (goal.targetAmount > 0 && user?.uid) {
      fetchAnalysis();
    }
  }, [goal, user?.uid]);

  if (loading) {
    return (
      <div className="w-full p-4 bg-muted/10 rounded-xl border border-primary/10 flex items-center justify-center gap-3 animate-pulse min-h-[140px]">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">
          Analyzing financial data...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-4 bg-red-500/5 rounded-xl border border-red-500/10 flex items-center justify-center min-h-[140px]">
        <span className="text-sm font-medium text-red-600">
          Insights unavailable
        </span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full p-4 bg-muted/10 rounded-xl border border-dashed border-muted-foreground/20 flex items-center justify-center min-h-[140px]">
        <span className="text-sm text-muted-foreground">
          No insights available
        </span>
      </div>
    );
  }

  // Robust calculations
  const target = Math.max(1, toNumber(goal.targetAmount));
  const current = Math.max(0, toNumber(goal.currentAmount));
  const progressPercent = Math.min(100, (current / target) * 100);

  const statusConfig = {
    "On Track": {
      color: "hsl(var(--chart-1))",
      textClass: "text-[hsl(var(--chart-1))]",
      bgClass: "bg-[hsl(var(--chart-1))]/10",
      fill: "hsl(var(--chart-1))",
      gradientFrom: "from-[hsl(var(--chart-1))]/20",
      badge: "default",
    },
    "At Risk": {
      color: "hsl(var(--destructive))",
      textClass: "text-destructive",
      bgClass: "bg-destructive/10",
      fill: "hsl(var(--destructive))",
      gradientFrom: "from-destructive/20",
      badge: "destructive",
    },
    Ahead: {
      color: "hsl(var(--chart-4))",
      textClass: "text-[hsl(var(--chart-4))]",
      bgClass: "bg-[hsl(var(--chart-4))]/10",
      fill: "hsl(var(--chart-4))",
      gradientFrom: "from-[hsl(var(--chart-4))]/20",
      badge: "secondary",
    },
  };

  const status = statusConfig[data.forecastStatus] || statusConfig["On Track"];

  const hasAnyPayment = current > 0;
  const streakCount = hasAnyPayment ? 1 : 0;
  const isHalfway = progressPercent >= 50;

  // Safe default for weekly data to prevent crash
  // IF data.weeklyData is missing or empty, generate a synthetic projection
  let chartData = data.weeklyData;
  if (!chartData || chartData.length < 2) {
    // Generate a simple projection: Start (Now) -> End (Deadline or Future)
    chartData = [
      { name: "Start", saved: current, target: current },
      { name: "Target", saved: target, target: target },
    ];
  }

  return (
    <div className="w-full flex flex-col p-5 bg-linear-to-br from-card via-card to-primary/5 rounded-xl border border-primary/20 shadow-sm mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-primary/10 pb-2">
        <h3 className="text-sm font-bold flex items-center gap-2 text-foreground tracking-tight">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <TrendingUp className="size-4" />
          </div>
          Goal Insights
        </h3>
        <Badge
          variant={status.badge}
          className={cn(
            "px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
            status.bgClass,
            status.textClass,
            "border-0",
          )}
        >
          {data.forecastStatus}
        </Badge>
      </div>

      {/* 4-Column Grid Layout for Full Width - Optimized 3-Box Layout */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Box 1: Circular Progress (Enhanced & Larger) */}
        <div className="col-span-2 rounded-xl border border-primary/10 bg-linear-to-br from-background to-secondary/5 p-4 flex items-center justify-around relative overflow-hidden group min-h-[140px]">
          <div className="absolute top-2 left-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest z-10">
            Target Progress
          </div>

          <div className="relative size-24 flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <path
                className="text-muted/20"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className={cn(
                  "transition-all duration-1000 ease-out",
                  status.textClass,
                )}
                strokeDasharray={`${progressPercent}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-xl font-bold", status.textClass)}>
                {Math.round(progressPercent)}%
              </span>
            </div>
          </div>

          <div className="hidden sm:flex flex-col gap-1">
            <div className="text-xs font-semibold text-muted-foreground">
              Remaining
            </div>
            <div className="text-lg font-bold text-foreground">
              <Money>₹{(target - current).toLocaleString()}</Money>
            </div>
            <Badge variant="outline" className="w-fit text-[10px] h-5">
              {progressPercent > 50 ? "Winning" : "Keep Rolling"}
            </Badge>
          </div>
        </div>

        {/* Box 3: Streak */}
        <div className="rounded-xl border border-primary/10 bg-linear-to-br from-background to-orange-500/5 p-3 flex flex-col items-center justify-center min-h-[140px]">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 w-full text-center">
            Consistency
          </p>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">
                {streakCount}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                wks
              </span>
            </div>
            <p className="text-[10px] text-orange-600 font-medium mt-1 flex items-center gap-1">
              <Flame className="size-3 fill-orange-600" />
              Streak
            </p>
          </div>
        </div>

        {/* Box 4: Milestones */}
        <div className="rounded-xl border border-primary/10 bg-linear-to-br from-background to-primary/5 p-3 flex flex-col min-h-[140px]">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 w-full text-center">
            Milestones
          </div>
          <div className="flex-1 flex items-center justify-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "size-9 rounded-full flex items-center justify-center border transition-all duration-300",
                  hasAnyPayment
                    ? "bg-amber-100 border-amber-200 text-amber-600 shadow-sm"
                    : "bg-muted/50 border-muted text-muted-foreground/50 grayscale",
                )}
              >
                <Trophy className="size-4" />
              </div>
              <span className="text-[8px] font-medium text-muted-foreground">
                Started
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "size-9 rounded-full flex items-center justify-center border transition-all duration-300",
                  isHalfway
                    ? "bg-emerald-100 border-emerald-200 text-emerald-600 shadow-sm"
                    : "bg-muted/50 border-muted text-muted-foreground/50 grayscale",
                )}
              >
                <Star className="size-4" />
              </div>
              <span className="text-[8px] font-medium text-muted-foreground">
                Halfway
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoalCard({ goal, onUpdateAmount, onToggleDone }) {
  const now = new Date();
  const plan = getTimePlan(goal, now);
  const progress = getGoalProgress(goal);

  // Format numbers nicely
  const targetFormatted = Math.max(
    0,
    toNumber(goal.targetAmount),
  ).toLocaleString();
  const currentFormatted = Math.max(
    0,
    toNumber(goal.currentAmount),
  ).toLocaleString();

  const isCompleted = goal.isCompleted || plan.status === "done";

  // Liquid color logic
  const liquidColor =
    progress >= 100
      ? "bg-emerald-500"
      : plan.status === "overdue"
        ? "bg-destructive"
        : plan.status === "tight"
          ? "bg-amber-500"
          : "bg-emerald-400";

  return (
    <Card
      className={cn(
        "overflow-hidden border-primary/15 shadow-sm hover:shadow-md transition-shadow relative bg-card",
        isCompleted ? "opacity-75" : "",
      )}
    >
      {isCompleted && (
        <div className="absolute inset-0 bg-background/50 z-20 flex items-center justify-center backdrop-blur-[1px]">
          <Badge className="text-sm px-4 py-1.5 shadow-lg bg-emerald-500 hover:bg-emerald-600 text-white border-0">
            <Trophy className="w-4 h-4 mr-2" /> Goal Achieved!
          </Badge>
        </div>
      )}

      <CardContent className="p-5 sm:p-6 pb-4">
        {/* Jar layout container */}
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          {/* Jar Visual */}
          <div className="w-24 h-24 rounded-full border-[3px] border-slate-700 dark:border-slate-400 relative overflow-hidden shrink-0 mx-auto sm:mx-0 shadow-lg bg-background mt-2">
            {/* Liquid Fill */}
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 w-full transition-all duration-1000 ease-in-out",
                liquidColor,
              )}
              style={{ height: `${progress}%` }}
            >
              {/* Liquid surface highlight */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/30"></div>
            </div>

            {/* Jar lid / rim (Not needed for a sphere, but keep reflection) */}

            {/* Sphere reflections */}
            <div className="absolute top-2 left-2 w-4 h-8 rounded-full bg-white/20 rotate-[-30deg] blur-[1px] z-10"></div>
            <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-white/20 blur-[1px] z-10"></div>

            {/* Percentage text inside jar */}
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <span
                className={cn(
                  "text-sm font-black shadow-sm tracking-tighter drop-shadow-md",
                  progress > 45 ? "text-white" : "text-foreground",
                )}
              >
                {progress}%
              </span>
            </div>
          </div>

          {/* Goal Details */}
          <div className="flex-1 w-full space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  {goal.title}
                  {goal.category === "travel" && "✈️"}
                  {goal.category === "purchase" && "🛍️"}
                  {goal.category === "investment" && "📈"}
                  {goal.category === "emergency" && "🛡️"}
                  {goal.category === "education" && "🎓"}
                </h3>
                <p className="text-sm font-medium text-muted-foreground mt-0.5">
                  <span className="text-foreground font-bold">
                    ₹{currentFormatted}
                  </span>{" "}
                  <span className="opacity-70">/ ₹{targetFormatted}</span>
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-[11px] font-semibold shadow-sm"
              >
                {progress}%
              </Badge>
            </div>

            <Progress value={progress} className="h-1.5 bg-muted" />

            <div className="flex justify-between items-end pt-1">
              <div className="text-[11px] text-muted-foreground font-medium">
                {plan.deadline ? (
                  <p>
                    {plan.daysLeft > 0
                      ? `${Math.max(1, Math.ceil(plan.daysLeft / 30))} mo left`
                      : "Overdue"}
                  </p>
                ) : (
                  <p>No deadline set</p>
                )}
                {plan.perMonth ? (
                  <p className="mt-0.5 font-semibold text-foreground/80 flex items-center gap-1">
                    <TrendingUp className="size-3" />₹
                    {plan.perMonth.toLocaleString()}/mo
                  </p>
                ) : null}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => onUpdateAmount(goal)}
                className="h-8 px-3 text-[11px] font-bold transition-colors"
              >
                Edit Goal
              </Button>
            </div>
          </div>
        </div>

        {/* Actions Row */}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant={goal.isCompleted ? "outline" : "secondary"}
            size="sm"
            onClick={() => onToggleDone(goal)}
            className="gap-1.5 text-xs h-8 w-full sm:w-auto"
          >
            <CircleCheck className="size-3.5" />
            {goal.isCompleted ? "Mark active" : "Mark done"}
          </Button>
        </div>

        {/* BOTTOM: Goal Insights - Full Width */}
        <div className="flex-1 mt-3">
          <GoalAnalysisSection goal={goal} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function GoalPlans() {
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState({ short: [], long: [] });
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [editGoalForm, setEditGoalForm] = useState({
    currentAmount: "",
    targetAmount: "",
    title: "",
    deadline: "",
  });
  const [savingUpdate, setSavingUpdate] = useState(false);

  // New state for toggling completed goals
  const [showCompleted, setShowCompleted] = useState(false);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newGoal, setNewGoal] = useState({
    goalType: "shortTerm",
    title: "",
    description: "",
    targetAmount: "",
    deadline: "",
    category: "savings",
    priority: "medium",
  });

  const allGoals = useMemo(() => [...goals.short, ...goals.long], [goals]);
  const activeGoals = useMemo(
    () => allGoals.filter((g) => !g.isCompleted),
    [allGoals],
  );
  const completedGoals = useMemo(
    () => allGoals.filter((g) => g.isCompleted),
    [allGoals],
  );

  const month = useMemo(() => buildMonthDays(cursorDate), [cursorDate]);
  // Use activeGoals for the calendar so completed ones don't clutter it
  const monthEvents = useMemo(
    () => buildEventsForMonth(activeGoals, cursorDate),
    [activeGoals, cursorDate],
  );
  const eventsByDay = useMemo(
    () => groupEventsByDay(monthEvents),
    [monthEvents],
  );

  const selectedDayKey = useMemo(
    () => format(selectedDay, "yyyy-MM-dd"),
    [selectedDay],
  );
  const selectedEvents = useMemo(
    () => eventsByDay.get(selectedDayKey) || [],
    [eventsByDay, selectedDayKey],
  );

  const fetchGoals = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/api/student/goals/${user.uid}?includeCompleted=true`,
      );
      const normalized = normalizeGoals(res.data);
      setGoals(normalized);
    } catch (err) {
      console.error("GoalPlans: fetch goals failed", err);
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleUpdateAmount = (goal) => {
    setEditingGoal(goal);
    setEditGoalForm({
      currentAmount: String(Math.max(0, toNumber(goal.currentAmount))),
      targetAmount: String(Math.max(0, toNumber(goal.targetAmount))),
      title: goal.title || "",
      deadline: goal.deadline ? format(goal.deadline, "yyyy-MM-dd") : "",
    });
    setUpdateDialogOpen(true);
  };

  const submitUpdateAmount = async () => {
    if (!editingGoal) return;
    setSavingUpdate(true);
    try {
      const updates = {
        currentAmount: Math.max(0, toNumber(editGoalForm.currentAmount)),
        targetAmount: Math.max(0, toNumber(editGoalForm.targetAmount)),
        title: editGoalForm.title.trim() || editingGoal.title,
      };

      if (editGoalForm.deadline) {
        updates.deadline = new Date(editGoalForm.deadline);
      }

      const res = await axios.put(`${API_URL}/api/student/goals`, {
        firebaseUid: user.uid,
        goalType: editingGoal.goalType,
        goalId: editingGoal.id,
        updates,
      });

      if (res.data.success) {
        toast.success("Goal updated");
        setUpdateDialogOpen(false);
        setEditingGoal(null);
        fetchGoals();
      } else {
        toast.error(res.data.message || "Failed to update goal");
      }
    } catch (err) {
      console.error("GoalPlans: update goal failed", err);
      toast.error("Failed to update goal");
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleToggleDone = async (goal) => {
    try {
      const res = await axios.post(`${API_URL}/api/student/goals/toggle`, {
        firebaseUid: user.uid,
        goalType: goal.goalType,
        goalId: goal.id,
      });

      if (res.data.success) {
        toast.success(
          goal.isCompleted ? "Goal marked active" : "Goal completed",
        );
        fetchGoals();
      } else {
        toast.error(res.data.message || "Failed to toggle goal");
      }
    } catch (err) {
      console.error("GoalPlans: toggle failed", err);
      toast.error("Failed to toggle goal");
    }
  };

  const submitNewGoal = async () => {
    if (!newGoal.title.trim()) {
      toast.error("Please enter a goal title");
      return;
    }
    setAdding(true);
    try {
      const res = await axios.post(`${API_URL}/api/student/goals`, {
        firebaseUid: user.uid,
        goalType: newGoal.goalType,
        goal: {
          title: newGoal.title.trim(),
          description: newGoal.description.trim(),
          targetAmount: toNumber(newGoal.targetAmount),
          currentAmount: 0,
          deadline: newGoal.deadline ? new Date(newGoal.deadline) : null,
          category: newGoal.category,
          priority: newGoal.priority,
        },
      });

      if (res.data.success) {
        toast.success("Goal added");
        setAddDialogOpen(false);
        setNewGoal({
          goalType: "shortTerm",
          title: "",
          description: "",
          targetAmount: "",
          deadline: "",
          category: "savings",
          priority: "medium",
        });
        fetchGoals();
      } else {
        toast.error(res.data.message || "Failed to add goal");
      }
    } catch (err) {
      console.error("GoalPlans: add goal failed", err);
      toast.error("Failed to add goal");
    } finally {
      setAdding(false);
    }
  };

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const atRisk = useMemo(() => {
    const now = new Date();
    return allGoals
      .filter((g) => !g.isCompleted)
      .map((g) => ({
        goal: g,
        plan: getTimePlan(g, now),
        progress: getGoalProgress(g),
      }))
      .filter((x) => x.plan.status === "overdue" || x.plan.status === "tight")
      .sort((a, b) => {
        if (a.plan.status !== b.plan.status) {
          return a.plan.status === "overdue" ? -1 : 1;
        }
        return (a.plan.daysLeft ?? 9999) - (b.plan.daysLeft ?? 9999);
      })
      .slice(0, 5);
  }, [allGoals]);

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 pt-6 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Goal Plans</h2>
          <p className="text-muted-foreground">
            A calendar-driven plan that turns goals into weekly savings actions.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showCompleted"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="showCompleted" className="cursor-pointer">
              Show Completed
            </Label>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create a goal</DialogTitle>
                <DialogDescription>
                  Short-term for the next few months, long-term for big life
                  wins.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <select
                    value={newGoal.goalType}
                    onChange={(e) =>
                      setNewGoal((p) => ({ ...p, goalType: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="shortTerm">Short-term</option>
                    <option value="longTerm">Long-term</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label>Title</Label>
                  <Input
                    value={newGoal.title}
                    onChange={(e) =>
                      setNewGoal((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Description (optional)</Label>
                  <Input
                    value={newGoal.description}
                    onChange={(e) =>
                      setNewGoal((p) => ({ ...p, description: e.target.value }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Target (₹)</Label>
                    <Input
                      type="number"
                      value={newGoal.targetAmount}
                      onChange={(e) =>
                        setNewGoal((p) => ({
                          ...p,
                          targetAmount: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Deadline</Label>
                    <Input
                      type="date"
                      value={newGoal.deadline}
                      onChange={(e) =>
                        setNewGoal((p) => ({ ...p, deadline: e.target.value }))
                      }
                      onClick={(e) => {
                        try {
                          e.target.showPicker();
                        } catch (err) {
                          console.warn("showPicker is not supported:", err);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Priority</Label>
                    <select
                      value={newGoal.priority}
                      onChange={(e) =>
                        setNewGoal((p) => ({ ...p, priority: e.target.value }))
                      }
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <select
                      value={newGoal.category}
                      onChange={(e) =>
                        setNewGoal((p) => ({ ...p, category: e.target.value }))
                      }
                      className="w-full px-3 py-2 border rounded-md bg-background"
                    >
                      <option value="savings">Savings</option>
                      <option value="purchase">Purchase</option>
                      <option value="investment">Investment</option>
                      <option value="education">Education</option>
                      <option value="travel">Travel</option>
                      <option value="emergency">Emergency Fund</option>
                      <option value="debt_repayment">Debt Repayment</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                  disabled={adding}
                >
                  Cancel
                </Button>
                <Button onClick={submitNewGoal} disabled={adding}>
                  {adding && <Loader2 className="size-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Calendar */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="size-5 text-primary" />
                  {format(cursorDate, "MMMM yyyy")}
                </CardTitle>
                <CardDescription>
                  Deadlines + weekly savings tasks mapped to real dates.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCursorDate((d) => subMonths(d, 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    setCursorDate(now);
                    setSelectedDay(now);
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCursorDate((d) => addMonths(d, 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t">
              <div className="grid grid-cols-7 text-xs text-muted-foreground">
                {weekDays.map((w) => (
                  <div
                    key={w}
                    className="px-3 py-2 border-b bg-muted/20 font-medium"
                  >
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {month.days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayEvents = eventsByDay.get(key) || [];
                  const inMonth = isSameMonth(day, cursorDate);
                  const isSelected = isSameDay(day, selectedDay);

                  const topEvents = dayEvents.slice(0, 2);
                  const remainingCount = Math.max(
                    0,
                    dayEvents.length - topEvents.length,
                  );

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "min-h-[88px] md:min-h-[110px] p-2 md:p-3 border-b border-r text-left hover:bg-muted/30 transition-colors",
                        !inMonth && "bg-muted/10 text-muted-foreground",
                        isSelected &&
                          "bg-primary/5 ring-1 ring-inset ring-primary/20",
                        isToday(day) && "relative",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            !inMonth && "text-muted-foreground",
                            isToday(day) && "text-primary",
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        {isToday(day) && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            today
                          </span>
                        )}
                      </div>

                      <div className="mt-2 space-y-1">
                        {topEvents.map((ev) => (
                          <div
                            key={ev.id}
                            className={cn(
                              "text-[10px] md:text-[11px] px-2 py-1 rounded-md truncate",
                              ev.kind === "deadline"
                                ? "bg-red-500/10 text-red-600"
                                : ev.kind === "set-deadline"
                                  ? "bg-amber-500/10 text-amber-700"
                                  : "bg-green-500/10 text-green-700",
                            )}
                            title={`${ev.title} — ${ev.subtitle}`}
                          >
                            <span className="inline-flex items-center gap-1">
                              {ev.kind === "deadline" ? (
                                <CalendarDays className="w-4 h-4 text-red-600" />
                              ) : ev.kind === "set-deadline" ? (
                                <MapPin className="w-4 h-4 text-amber-700" />
                              ) : (
                                <DollarSign className="w-4 h-4 text-green-700" />
                              )}
                              <span className="align-middle">
                                {ev.subtitle}
                              </span>
                            </span>
                          </div>
                        ))}
                        {remainingCount > 0 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{remainingCount} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Day plan</CardTitle>
              <CardDescription>
                {format(selectedDay, "EEE, MMM d")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No goal actions scheduled for this day.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-lg border p-3 bg-muted/10"
                    >
                      <p className="text-sm font-semibold truncate">
                        {ev.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ev.subtitle}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-2 truncate">
                        {ev.goal?.goalType === "shortTerm"
                          ? "Short-term"
                          : "Long-term"}{" "}
                        • {ev.goal?.category || "goal"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">At risk</CardTitle>
              <CardDescription>Goals that need attention soon.</CardDescription>
            </CardHeader>
            <CardContent>
              {atRisk.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All good — no urgent goals right now.
                </p>
              ) : (
                <div className="space-y-3">
                  {atRisk.map(({ goal, plan, progress }) => (
                    <div
                      key={`${goal.goalType}:${goal.id}`}
                      className="rounded-lg border p-3"
                    >
                      <p className="text-sm font-semibold truncate">
                        {goal.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {plan.status === "overdue"
                          ? "Overdue"
                          : `${plan.daysLeft} days left`}{" "}
                        • Need{" "}
                        <Money>
                          ₹{(plan.perWeek || 0).toLocaleString()}/week
                        </Money>
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-sm font-bold text-purple-600 w-10 text-right">
                          {progress}%
                        </span>
                        <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-600 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="short" className="space-y-4">
        <TabsList>
          <TabsTrigger value="short">Short-term goals</TabsTrigger>
          <TabsTrigger value="long">Long-term goals</TabsTrigger>
          <TabsTrigger value="all">All goals</TabsTrigger>
        </TabsList>

        <TabsContent value="short" className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading goals...
            </div>
          ) : goals.short.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No short-term goals yet. Add one above.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {goals.short
                .filter((g) => showCompleted || !g.isCompleted)
                .map((g) => (
                  <GoalCard
                    key={`short:${g.id}`}
                    goal={g}
                    onUpdateAmount={handleUpdateAmount}
                    onToggleDone={handleToggleDone}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="long" className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading goals...
            </div>
          ) : goals.long.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No long-term goals yet. Add one above.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {goals.long
                .filter((g) => showCompleted || !g.isCompleted)
                .map((g) => (
                  <GoalCard
                    key={`long:${g.id}`}
                    goal={g}
                    onUpdateAmount={handleUpdateAmount}
                    onToggleDone={handleToggleDone}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading goals...
            </div>
          ) : allGoals.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No goals yet. Add one above.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {allGoals
                .filter((g) => showCompleted || !g.isCompleted)
                .map((g) => (
                  <GoalCard
                    key={`${g.goalType}:${g.id}`}
                    goal={g}
                    onUpdateAmount={handleUpdateAmount}
                    onToggleDone={handleToggleDone}
                  />
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Goal dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogDescription>
              Update your goal details, target amount, or adjust your deadline.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Goal Title</Label>
              <Input
                type="text"
                value={editGoalForm.title}
                onChange={(e) =>
                  setEditGoalForm((p) => ({ ...p, title: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Saved so far (₹)</Label>
                <Input
                  type="number"
                  value={editGoalForm.currentAmount}
                  onChange={(e) =>
                    setEditGoalForm((p) => ({
                      ...p,
                      currentAmount: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Target Amount (₹)</Label>
                <Input
                  type="number"
                  value={editGoalForm.targetAmount}
                  onChange={(e) =>
                    setEditGoalForm((p) => ({
                      ...p,
                      targetAmount: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Deadline</Label>
              <Input
                type="date"
                value={editGoalForm.deadline}
                onChange={(e) =>
                  setEditGoalForm((p) => ({ ...p, deadline: e.target.value }))
                }
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpdateDialogOpen(false)}
              disabled={savingUpdate}
            >
              Cancel
            </Button>
            <Button onClick={submitUpdateAmount} disabled={savingUpdate}>
              {savingUpdate && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
