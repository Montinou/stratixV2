// Component Examples for Manager and Employee Dashboards
// These are visual specifications - not final implementations

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Users, Zap, TrendingUp, Activity, Clock, ChevronRight,
  CheckCircle, AlertCircle, Plus, Calendar, Target, Flame
} from 'lucide-react'

// ============================================
// MANAGER DASHBOARD COMPONENTS
// ============================================

// Manager Metric Card - Minimalistic with subtle animation
export const ManagerMetricCard = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend 
}) => (
  <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">
              {value}
            </span>
            {trend && (
              <span className={`text-xs font-medium ${
                trend > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="rounded-full p-2 bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </CardContent>
  </Card>
)

// Team Member Performance Card
export const TeamMemberCard = ({ member }) => {
  const getStatusColor = (workload) => {
    if (workload < 70) return 'bg-green-500'
    if (workload < 90) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusText = (workload) => {
    if (workload < 70) return 'Available'
    if (workload < 90) return 'Busy'
    return 'Overloaded'
  }

  return (
    <Card className="group transition-all duration-200 hover:shadow-lg">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={member.avatar} />
              <AvatarFallback>
                {member.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium text-sm">{member.name}</h4>
              <p className="text-xs text-muted-foreground">{member.role}</p>
            </div>
          </div>
          <div className={`h-2 w-2 rounded-full ${getStatusColor(member.workload)}`} />
        </div>

        {/* Metrics */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Workload</span>
              <span className="font-medium">{getStatusText(member.workload)}</span>
            </div>
            <Progress value={member.workload} className="h-1.5" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Tasks: </span>
              <span className="font-medium">{member.completedTasks}/{member.totalTasks}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Efficiency: </span>
              <span className="font-medium">{member.efficiency}%</span>
            </div>
          </div>

          {member.currentTask && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">Current task:</p>
              <p className="text-xs font-medium truncate">{member.currentTask}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
            View Profile
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
            Assign Task
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Initiative Tracker Card for Manager
export const InitiativeCard = ({ initiative }) => {
  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'destructive',
      high: 'warning',
      medium: 'secondary',
      low: 'outline'
    }
    return colors[priority] || 'outline'
  }

  return (
    <Card className="border-l-4" style={{
      borderLeftColor: initiative.priority === 'critical' ? 'hsl(0, 84%, 60%)' :
                       initiative.priority === 'high' ? 'hsl(24, 95%, 53%)' :
                       initiative.priority === 'medium' ? 'hsl(38, 92%, 50%)' :
                       'hsl(215, 20%, 65%)'
    }}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base line-clamp-1">
            {initiative.title}
          </CardTitle>
          <Badge variant={getPriorityColor(initiative.priority)} className="ml-2">
            {initiative.priority}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{initiative.progress}%</span>
          </div>
          <Progress value={initiative.progress} className="h-2" />
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{initiative.teamSize} members</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{initiative.daysLeft} days left</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span>{initiative.completedTasks}/{initiative.totalTasks} tasks</span>
        </div>

        {initiative.latestUpdate && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Latest: {initiative.latestUpdate}
            </p>
            <p className="text-xs text-muted-foreground">
              {initiative.timeAgo}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs">
            View
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs">
            Edit
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-7 text-xs">
            Team
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Resource Allocation Heatmap Cell
export const HeatmapCell = ({ value, day, member }) => {
  const getColor = (val) => {
    if (val === 0) return 'bg-gray-100'
    if (val <= 25) return 'bg-green-200'
    if (val <= 50) return 'bg-green-400'
    if (val <= 75) return 'bg-yellow-400'
    return 'bg-red-400'
  }

  return (
    <div 
      className={`aspect-square rounded-sm ${getColor(value)} transition-all duration-200 hover:scale-110 cursor-pointer`}
      title={`${member}: ${value}% allocated on ${day}`}
    />
  )
}

// ============================================
// EMPLOYEE DASHBOARD COMPONENTS
// ============================================

// Personal Metric Pill
export const MetricPill = ({ icon: Icon, value, label, trend, onClick }) => (
  <button
    onClick={onClick}
    className="flex-shrink-0 bg-card border rounded-lg p-3 transition-all duration-200 hover:shadow-md hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary"
  >
    <div className="flex items-center gap-3">
      <div className="rounded-full p-2 bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-left">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold tabular-nums">{value}</span>
          {trend && (
            <span className={`text-xs ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend > 0 ? '↑' : '↓'}{Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  </button>
)

// Task Kanban Card
export const TaskCard = ({ task, onDrag, onComplete }) => {
  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-gray-100 text-gray-700 border-gray-200'
    }
    return colors[priority] || colors.low
  }

  return (
    <div
      draggable
      onDragStart={onDrag}
      className="bg-card border rounded-lg p-3 cursor-move transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:opacity-50"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium line-clamp-2 flex-1">
          {task.title}
        </h4>
        <Badge 
          variant="outline" 
          className={`ml-2 text-xs px-1.5 py-0 ${getPriorityColor(task.priority)}`}
        >
          {task.priority}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{task.dueDate}</span>
          <span>•</span>
          <span className="truncate">{task.initiative}</span>
        </div>

        <div className="flex items-center gap-2">
          <Progress value={task.progress} className="flex-1 h-1.5" />
          <span className="text-xs font-medium tabular-nums">{task.progress}%</span>
        </div>

        {task.isOverdue && (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3 w-3" />
            <span>Overdue by {task.overdueDays} days</span>
          </div>
        )}
      </div>

      <button
        onClick={() => onComplete(task.id)}
        className="mt-3 w-full flex items-center justify-center gap-1 text-xs py-1.5 rounded-md border border-dashed border-gray-300 hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-colors"
      >
        <CheckCircle className="h-3 w-3" />
        Mark Complete
      </button>
    </div>
  )
}

// Progress Ring Component
export const ProgressRing = ({ progress, size = 120, strokeWidth = 8 }) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  const getColor = (value) => {
    if (value >= 75) return '#10B981'
    if (value >= 50) return '#3B82F6'
    if (value >= 25) return '#F59E0B'
    return '#EF4444'
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          className="text-muted"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(progress)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{progress}%</span>
        <span className="text-xs text-muted-foreground">Complete</span>
      </div>
    </div>
  )
}

// Deadline Widget Item
export const DeadlineItem = ({ deadline }) => {
  const getPriorityIcon = (daysLeft) => {
    if (daysLeft < 1) return '🔴'
    if (daysLeft <= 3) return '🟡'
    return '🟢'
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
      <div className="text-center flex-shrink-0">
        <div className="text-xs text-muted-foreground uppercase">
          {deadline.month}
        </div>
        <div className="text-xl font-bold">
          {deadline.day}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getPriorityIcon(deadline.daysLeft)}</span>
          <h5 className="text-sm font-medium truncate">
            {deadline.title}
          </h5>
        </div>
        <p className="text-xs text-muted-foreground">
          {deadline.initiative} • {deadline.timeLeft}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </div>
  )
}

// Streak Celebration Component
export const StreakBadge = ({ days, animated = false }) => (
  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-100 to-red-100 ${
    animated ? 'animate-pulse' : ''
  }`}>
    <Flame className="h-4 w-4 text-orange-500" />
    <span className="text-sm font-bold text-orange-700">
      {days} Day Streak!
    </span>
  </div>
)

// Empty State Component
export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="rounded-full bg-muted p-4 mb-4">
      <Icon className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-medium mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
      {description}
    </p>
    {actionLabel && (
      <Button variant="outline" onClick={onAction}>
        <Plus className="h-4 w-4 mr-2" />
        {actionLabel}
      </Button>
    )}
  </div>
)

// Loading Skeleton Components
export const CardSkeleton = () => (
  <Card className="animate-pulse">
    <CardContent className="p-4">
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-8 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-2/3" />
        <div className="h-2 bg-muted rounded w-full" />
      </div>
    </CardContent>
  </Card>
)

export const TaskSkeleton = () => (
  <div className="border rounded-lg p-3 animate-pulse">
    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
    <div className="h-3 bg-muted rounded w-1/2 mb-2" />
    <div className="h-2 bg-muted rounded w-full" />
  </div>
)