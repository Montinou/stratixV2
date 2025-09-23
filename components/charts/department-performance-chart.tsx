"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface DepartmentPerformanceChartProps {
  data: {
    department: string
    completed: number
    inProgress: number
    notStarted: number
    paused: number
  }[]
}

export function DepartmentPerformanceChart({ data }: DepartmentPerformanceChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendimiento por Departamento</CardTitle>
        <CardDescription>Comparación de objetivos por departamento y estado</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="department" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="completed" stackId="a" fill="hsl(var(--chart-1))" name="Completados" />
            <Bar dataKey="inProgress" stackId="a" fill="hsl(var(--chart-2))" name="En Progreso" />
            <Bar dataKey="notStarted" stackId="a" fill="hsl(var(--chart-3))" name="No Iniciados" />
            <Bar dataKey="paused" stackId="a" fill="hsl(var(--chart-4))" name="Pausados" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
