"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Wrench,
  UserCheck,
  Printer,
  Sparkles,
  ArrowRight,
  Sun,
  CloudSun,
  Leaf,
  Snowflake,
  Clock,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import {
  SEASONAL_MAINTENANCE_TASKS,
  formatCurrency,
  type Season,
  type MaintenanceTask,
} from "@/lib/tools/job-cost-data";

export function HomeMaintenanceClient() {
  const [activeSeason, setActiveSeason] = useState<Season>("spring");
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<"all" | "diy" | "pro">("all");

  const seasons: { id: Season; label: string; icon: any; color: string }[] = [
    { id: "spring", label: "Spring", icon: CloudSun, color: "text-emerald-500" },
    { id: "summer", label: "Summer", icon: Sun, color: "text-amber-500" },
    { id: "fall", label: "Fall", icon: Leaf, color: "text-orange-500" },
    { id: "winter", label: "Winter", icon: Snowflake, color: "text-blue-500" },
  ];

  const toggleTask = (id: string) => {
    if (completedTaskIds.includes(id)) {
      setCompletedTaskIds(completedTaskIds.filter((item) => item !== id));
    } else {
      setCompletedTaskIds([...completedTaskIds, id]);
    }
  };

  const currentSeasonTasks = SEASONAL_MAINTENANCE_TASKS[activeSeason] || [];

  const filteredTasks = currentSeasonTasks.filter((t) => {
    if (filterType === "diy") return t.diyFriendly;
    if (filterType === "pro") return !t.diyFriendly;
    return true;
  });

  const seasonCompletedCount = currentSeasonTasks.filter((t) =>
    completedTaskIds.includes(t.id)
  ).length;
  const progressPercent =
    currentSeasonTasks.length > 0
      ? Math.round((seasonCompletedCount / currentSeasonTasks.length) * 100)
      : 0;

  const totalEstSavings = currentSeasonTasks
    .filter((t) => completedTaskIds.includes(t.id))
    .reduce((sum, t) => sum + t.estCost, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 md:p-10">
        {/* Season Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 sm:flex gap-2">
            {seasons.map((s) => {
              const Icon = s.icon;
              const isActive = activeSeason === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSeason(s.id)}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    isActive
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "" : s.color}`} />
                  {s.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-semibold shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Checklist
            </button>
          </div>
        </div>

        {/* Progress & Stat Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 mb-8 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                {activeSeason.toUpperCase()} CHECKLIST PROGRESS
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-white">
                {seasonCompletedCount} of {currentSeasonTasks.length} Tasks Completed ({progressPercent}%)
              </h3>
              <div className="w-full md:w-80 bg-white/20 rounded-full h-2.5 mt-3 overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
              <div>
                <div className="text-xs text-slate-400">Maintained Value</div>
                <div className="text-xl font-bold text-emerald-400">
                  {formatCurrency(totalEstSavings)}
                </div>
                <div className="text-[10px] text-slate-400">Preemptive repairs</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Seasonal Schedule</div>
                <div className="text-xl font-bold text-white capitalize">
                  {activeSeason} Checklist
                </div>
                <div className="text-[10px] text-slate-400">Quarterly rotation</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs font-bold text-slate-400 uppercase mr-2">
            Filter:
          </span>
          {[
            { id: "all", label: "All Tasks" },
            { id: "diy", label: "DIY Friendly" },
            { id: "pro", label: "Licensed Pro Needed" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id as any)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                filterType === f.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Task Cards List */}
        <div className="space-y-3 mb-8">
          {filteredTasks.map((task) => {
            const isCompleted = completedTaskIds.includes(task.id);
            return (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                  isCompleted
                    ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                    : "bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <button
                    type="button"
                    aria-label="Toggle task"
                    className="mt-0.5 text-slate-400 focus:outline-none"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                    )}
                  </button>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-sm font-bold ${
                          isCompleted
                            ? "line-through text-slate-400 dark:text-slate-500"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {task.title}
                      </h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {task.category}
                      </span>
                      {task.diyFriendly ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                          <Wrench className="w-3 h-3" /> DIY Friendly
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 inline-flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> Pro Recommended
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {task.description}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Frequency: {task.frequency}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        Est. Cost: {formatCurrency(task.estCost)}
                      </span>
                    </div>
                  </div>
                </div>

                {!task.diyFriendly && (
                  <div className="shrink-0 hidden sm:block">
                    <Link
                      href={`/job-cost-calculator`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-all"
                    >
                      Cost Estimate
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info & CTA */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Prevent Expensive Emergency Repairs
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Regular seasonal preventative maintenance saves homeowners up to $3,500/year in emergency fixes.
              </p>
            </div>
          </div>
          <Link
            href="/contractors"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs hover:bg-primary/90 transition-all shadow-sm shrink-0"
          >
            Find Local Specialists
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
