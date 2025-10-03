'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProgressData {
  area: string;
  progress: number;
  objectives: number;
  color: string;
}

interface ProgressChartProps {
  data: ProgressData[];
  title?: string;
}

export function ProgressChart({ data, title = "Progreso por Área" }: ProgressChartProps) {
  const maxProgress = Math.max(...data.map(d => d.progress));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Progreso actual de objetivos por área
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((item) => (
          <div key={item.area} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium">{item.area}</span>
                <span className="text-xs text-muted-foreground">
                  ({item.objectives} objetivos)
                </span>
              </div>
              <span className="text-sm font-bold">{item.progress.toFixed(1)}%</span>
            </div>
            <Progress
              value={item.progress}
              className="h-2"
              style={{
                '--progress-foreground': item.color
              } as React.CSSProperties}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}