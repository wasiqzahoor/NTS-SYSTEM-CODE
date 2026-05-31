"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Project {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  progress?: number;
}

export default function GanttChart({ projects }: { projects: Project[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setTimelineWidth(containerRef.current.offsetWidth - 200);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  if (!projects || projects.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No projects to display
        </CardContent>
      </Card>
    );
  }

  // Calculate date range
  const allDates = projects.flatMap((p) => [new Date(p.startDate), new Date(p.endDate)]);
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

  // Add padding
  minDate.setDate(minDate.getDate() - 7);
  maxDate.setDate(maxDate.getDate() + 7);

  const totalDays = Math.max((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24), 1);

  const getPosition = (date: string) => {
    const d = new Date(date);
    const daysFromStart = (d.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
    return (daysFromStart / totalDays) * 100;
  };

  const getWidth = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return (duration / totalDays) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-nts-cyan";
      case "completed": return "bg-green-500";
      case "on_hold": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  // Generate month labels
  const months: { label: string; position: number }[] = [];
  let currentDate = new Date(minDate);
  while (currentDate <= maxDate) {
    const position = getPosition(currentDate.toISOString());
    months.push({
      label: currentDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      position,
    });
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Project Timeline</span>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-nts-cyan" /> Active</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> Completed</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500" /> On Hold</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={containerRef} className="overflow-x-auto">
          <div className="min-w-[800px] p-6">
            {/* Timeline Header */}
            <div className="relative h-8 mb-4 ml-[200px]">
              {months.map((month, i) => (
                <div
                  key={i}
                  className="absolute text-xs text-muted-foreground font-medium"
                  style={{ left: `${month.position}%` }}
                >
                  {month.label}
                </div>
              ))}
              {/* Grid lines */}
              {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-6 w-px h-full bg-gray-200 dark:bg-accent"
                  style={{ left: `${(i / Math.ceil(totalDays / 7)) * 100}%` }}
                />
              ))}
            </div>

            {/* Projects */}
            <div className="space-y-3">
              {projects.map((project) => {
                const left = getPosition(project.startDate);
                const width = getWidth(project.startDate, project.endDate);
                const progress = project.progress || 0;

                return (
                  <div key={project._id} className="flex items-center gap-4">
                    {/* Project Name */}
                    <div className="w-[100px] sm:w-[180px] flex-shrink-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {project.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Timeline Bar */}
                    <div className="flex-1 relative h-10 bg-accent rounded-lg overflow-hidden">
                      <div
                        className={cn("absolute top-2 h-6 rounded-md transition-all", getStatusColor(project.status))}
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                        }}
                      >
                        {/* Progress bar */}
                        <div
                          className="h-full bg-white/30 rounded-md"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      {/* Today marker */}
                      <div
                        className="absolute top-0 h-full w-px bg-red-500/50"
                        style={{
                          left: `${getPosition(new Date().toISOString())}%`,
                        }}
                      >
                        <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
