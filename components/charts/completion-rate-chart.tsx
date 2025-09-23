"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface CompletionRateChartProps {
  data: {
    week: string
    completionRate: number
    target: number
  }[]
}

export function CompletionRateChart({ data }: CompletionRateChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasa de Finalización</CardTitle>
        <CardDescription>Porcentaje de objetivos completados vs meta semanal</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value) => [`${value}%`, ""]} />
            <Area
              type="monotone"
              dataKey="target"
              stackId="1"
              stroke="hsl(var(--chart-4))"
              fill="hsl(var(--chart-4))"
              fillOpacity={0.3}
              name="Meta"
            />
            <Area
              type="monotone"
              dataKey="completionRate"
              stackId="2"
              stroke="hsl(var(--chart-1))"
              fill="hsl(var(--chart-1))"
              fillOpacity={0.6}
              name="Tasa Real"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
