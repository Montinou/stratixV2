"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface ProgressTrendChartProps {
  data: {
    month: string
    objectives: number
    initiatives: number
    activities: number
  }[]
}

export function ProgressTrendChart({ data }: ProgressTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia de Progreso</CardTitle>
        <CardDescription>Evolución del progreso promedio por mes</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value) => [`${value}%`, ""]} />
            <Legend />
            <Line
              type="monotone"
              dataKey="objectives"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              name="Objetivos"
              dot={{ fill: "hsl(var(--chart-1))" }}
            />
            <Line
              type="monotone"
              dataKey="initiatives"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              name="Iniciativas"
              dot={{ fill: "hsl(var(--chart-2))" }}
            />
            <Line
              type="monotone"
              dataKey="activities"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              name="Actividades"
              dot={{ fill: "hsl(var(--chart-3))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
