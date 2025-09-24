# Employee Dashboard UI Specification

## Visual Design System

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  Header                                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Mi Dashboard                       [Realtime ●] │   │
│  │ Hola, María! 👋                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Personal Metrics Bar (Horizontal Scroll on Mobile)     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📋 5 Tasks │ ✅ 85% Rate │ ⚡ 92 Score │ 🔥 7d │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Tab Navigation                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Today] [Tasks] [Progress] [Calendar]           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Content Area                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                   │   │
│  │  Dynamic content based on selected tab           │   │
│  │                                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Bottom Navigation (Mobile Only)                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  🏠    ✓     📊    👤                            │   │
│  │ Home Tasks Stats Profile                         │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Component Specifications

### 1. Personal Metrics Pills
```jsx
// Horizontal scrollable on mobile
// Fixed bar on desktop

┌──────────┬──────────┬──────────┬──────────┐
│ Today    │ Complete │ Product. │ Streak   │
│   5      │   85%    │   92     │   7      │
│ tasks    │  ↑ 5%    │  points  │  days    │
└──────────┴──────────┴──────────┴──────────┘

Each pill:
- Icon + primary metric
- Subtle description
- Trend indicator where relevant
- Tap to see details
```

### 2. Task Kanban Board
```jsx
// Swipeable columns on mobile
// Side-by-side on desktop

┌─────────────────────────────────────┐
│  TODO (3)                           │
│  ┌─────────────────────────────┐   │
│  │ Update API Documentation    │   │
│  │ [HIGH] • Due Jan 16         │   │
│  │ Platform Migration          │   │
│  │ [░░░░░░░░░░] 0%            │   │
│  └─────────────────────────────┘   │
│                                      │
│  ┌─────────────────────────────┐   │
│  │ Review Code Changes         │   │
│  │ [MED] • Due Jan 17          │   │
│  │ Sprint Tasks                │   │
│  │ [░░░░░░░░░░] 0%            │   │
│  └─────────────────────────────┘   │
│                                      │
│  [+ Add Task]                       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  IN PROGRESS (2)                    │
│  ┌─────────────────────────────┐   │
│  │ Implement User Auth         │   │
│  │ [HIGH] • Due Today          │   │
│  │ Security Enhancement        │   │
│  │ [████████░░] 80%           │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  DONE (8)                           │
│  ┌─────────────────────────────┐   │
│  │ ✓ Setup Development Env     │   │
│  │ Completed 2h ago            │   │
│  │ Onboarding                  │   │
│  │ [██████████] 100%          │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 3. Progress Tracker Ring
```jsx
// Circular progress visualization

       Daily Progress
    ┌──────────────────┐
    │                  │
    │   ╭────────╮     │
    │  ╱          ╲    │
    │ │    85%     │   │
    │ │  Complete  │   │
    │  ╲          ╱    │
    │   ╰────────╯     │
    │                  │
    │  17/20 tasks     │
    └──────────────────┘
    
    [Daily] [Weekly] [Monthly]

Ring colors:
0-25%: Red (#EF4444)
26-50%: Yellow (#F59E0B)
51-75%: Blue (#3B82F6)
76-100%: Green (#10B981)
```

### 4. Deadline Calendar Widget
```jsx
// List view on mobile
// Mini calendar on desktop

┌─────────────────────────────────────┐
│  Upcoming Deadlines                 │
│  ──────────────────────             │
│                                      │
│  Today, Jan 15                      │
│  ┌─────────────────────────────┐   │
│  │ 🔴 User Auth Implementation │   │
│  │    Platform Migration        │   │
│  │    Due in 2 hours           │   │
│  └─────────────────────────────┘   │
│                                      │
│  Tomorrow, Jan 16                   │
│  ┌─────────────────────────────┐   │
│  │ 🟡 API Documentation        │   │
│  │    Development Tasks        │   │
│  │    Due in 1 day             │   │
│  └─────────────────────────────┘   │
│                                      │
│  Friday, Jan 18                     │
│  ┌─────────────────────────────┐   │
│  │ 🟢 Code Review              │   │
│  │    Sprint Tasks             │   │
│  │    Due in 3 days            │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘

Priority indicators:
🔴 High priority (< 24h)
🟡 Medium priority (1-3 days)
🟢 Low priority (> 3 days)
```

### 5. Contribution Impact Chart
```jsx
// Simplified visualization for mobile

┌─────────────────────────────────────┐
│  Your Impact This Month             │
│  ─────────────────────              │
│                                      │
│  Impact Score                       │
│     ╭─────────╮                     │
│    ╱           ╲                    │
│   │      78     │                   │
│   │    Points   │                   │
│    ╲           ╱                    │
│     ╰─────────╯                     │
│                                      │
│  Contributions                      │
│  ├─ 3 Initiatives                   │
│  ├─ 2 Objectives                    │
│  └─ 15 Activities                   │
│                                      │
│  Team Collaboration                 │
│  You → Ana: 5 tasks                 │
│  Carlos → You: 3 tasks              │
│                                      │
│  [View Details]                     │
└─────────────────────────────────────┘
```

## Mobile-Specific Features

### Touch Interactions
```
Swipe left/right: Navigate kanban columns
Swipe down: Refresh dashboard
Tap and hold: Task quick actions
Pinch: Zoom calendar view
Double tap: Mark task complete
```

### Gesture Zones
```
┌─────────────────────────┐
│  Safe zone (20px)       │
│ ┌─────────────────────┐ │
│ │                     │ │
│ │  Content Area       │ │
│ │                     │ │
│ │  Swipe zones:       │ │
│ │  ←  20px    20px → │ │
│ │                     │ │
│ └─────────────────────┘ │
│  Thumb zone (80px)      │
└─────────────────────────┘
```

## Color System

```css
/* Personal Performance */
--performance-excellent: hsl(142, 76%, 36%);
--performance-good: hsl(200, 98%, 39%);
--performance-average: hsl(38, 92%, 50%);
--performance-poor: hsl(0, 84%, 60%);

/* Task Priority */
--priority-critical: hsl(0, 84%, 60%);
--priority-high: hsl(24, 95%, 53%);
--priority-medium: hsl(38, 92%, 50%);
--priority-low: hsl(215, 20%, 65%);

/* Task Status */
--status-todo: hsl(0, 0%, 85%);
--status-progress: hsl(200, 98%, 39%);
--status-done: hsl(142, 76%, 36%);
--status-blocked: hsl(0, 84%, 60%);
```

## Typography for Readability

```css
/* Task titles */
.task-title {
  font-size: 0.875rem; /* 14px mobile */
  font-weight: 500;
  line-height: 1.4;
  color: var(--foreground);
}

/* Metrics display */
.metric-value {
  font-size: 1.5rem; /* 24px */
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.metric-label {
  font-size: 0.75rem; /* 12px */
  font-weight: 400;
  color: var(--muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Time indicators */
.time-relative {
  font-size: 0.75rem; /* 12px */
  color: var(--muted-foreground);
}
```

## Animation Patterns

```css
/* Task card drag */
.task-dragging {
  opacity: 0.5;
  transform: rotate(2deg);
  transition: none;
}

/* Task complete animation */
@keyframes task-complete {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { 
    transform: scale(1);
    opacity: 0.7;
  }
}

/* Streak celebration */
@keyframes streak-pulse {
  0%, 100% { 
    transform: scale(1);
    filter: brightness(1);
  }
  50% { 
    transform: scale(1.1);
    filter: brightness(1.2);
  }
}

/* Progress ring fill */
@keyframes ring-fill {
  from {
    stroke-dashoffset: var(--circumference);
  }
  to {
    stroke-dashoffset: var(--offset);
  }
}
```

## Component States

### Task Card States
```css
/* Default */
.task-card {
  background: var(--card);
  border: 1px solid var(--border);
  transition: all 0.2s ease-out;
}

/* Hover/Focus */
.task-card:hover,
.task-card:focus-visible {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* Selected */
.task-card.selected {
  border-color: var(--primary);
  background: var(--accent);
}

/* Overdue */
.task-card.overdue {
  border-left: 3px solid var(--status-blocked);
  background: hsl(0, 84%, 98%);
}

/* Completed */
.task-card.completed {
  opacity: 0.6;
  text-decoration: line-through;
}
```

## Responsive Breakpoints

```css
/* Mobile First */
.employee-dashboard {
  padding: 0.75rem;
  gap: 0.75rem;
}

/* Tablet (640px+) */
@media (min-width: 640px) {
  .employee-dashboard {
    padding: 1rem;
    gap: 1rem;
  }
  
  .kanban-board {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .employee-dashboard {
    padding: 1.5rem;
    gap: 1.5rem;
    max-width: 1280px;
    margin: 0 auto;
  }
  
  .kanban-board {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .metrics-bar {
    position: sticky;
    top: 0;
    z-index: 10;
  }
}
```

## Loading Patterns

```jsx
// Task skeleton
<div className="task-skeleton">
  <div className="skeleton-badge w-12 h-5" />
  <div className="skeleton-text w-full h-4 mt-2" />
  <div className="skeleton-text w-3/4 h-3 mt-2" />
  <div className="skeleton-progress w-full h-2 mt-3" />
</div>

// Metric skeleton
<div className="metric-skeleton">
  <div className="skeleton-icon w-8 h-8" />
  <div className="skeleton-value w-16 h-6 mt-2" />
  <div className="skeleton-label w-20 h-3 mt-1" />
</div>
```

## Empty States

```jsx
// No tasks
<div className="empty-tasks">
  <div className="empty-illustration">
    <CheckCircle className="h-16 w-16 text-green-500" />
  </div>
  <h3 className="text-lg font-medium mt-4">
    All caught up!
  </h3>
  <p className="text-sm text-muted-foreground mt-2">
    You've completed all your tasks for today
  </p>
  <Button variant="outline" className="mt-4">
    <Plus className="h-4 w-4 mr-2" />
    Add New Task
  </Button>
</div>

// No deadlines
<div className="empty-deadlines">
  <Calendar className="h-12 w-12 text-muted-foreground" />
  <p className="text-sm mt-3">No upcoming deadlines</p>
  <p className="text-xs text-muted-foreground">
    Enjoy your clear schedule!
  </p>
</div>
```

## Celebration States

```jsx
// Task completion celebration
<div className="celebration-overlay">
  <div className="celebration-content">
    <div className="confetti-animation" />
    <CheckCircle className="h-20 w-20 text-green-500" />
    <h2 className="text-2xl font-bold mt-4">Great job!</h2>
    <p className="text-muted-foreground mt-2">
      Task completed successfully
    </p>
    <Button className="mt-6" onClick={dismiss}>
      Continue
    </Button>
  </div>
</div>

// Streak milestone
<div className="streak-celebration">
  <div className="flame-icon animate-pulse">🔥</div>
  <p className="font-bold">7 Day Streak!</p>
  <p className="text-sm text-muted-foreground">
    Keep up the great work
  </p>
</div>
```

## Accessibility Features

```jsx
// Screen reader announcements
<div className="sr-only" role="status" aria-live="polite">
  Task "Update API Documentation" moved to In Progress
</div>

// Keyboard navigation
const keyboardShortcuts = {
  'n': 'New task',
  't': 'Today view',
  'k': 'Previous task',
  'j': 'Next task',
  'Enter': 'Open task details',
  'Space': 'Toggle task complete',
  'Delete': 'Delete task',
  'Escape': 'Close modal'
}

// Focus management
<div 
  role="region" 
  aria-label="Task board"
  tabIndex={0}
  onKeyDown={handleKeyboardNavigation}
>
  {/* Kanban content */}
</div>
```

## Performance Optimizations

```typescript
// Virtual scrolling for task lists
const VirtualTaskList = {
  itemHeight: 80, // Fixed height for each task
  overscan: 3,    // Render 3 extra items
  threshold: 50   // Items to trigger load
}

// Lazy loading images
const AvatarImage = lazy(() => import('./AvatarImage'))

// Debounced search
const debouncedSearch = useMemo(
  () => debounce(handleSearch, 300),
  []
)

// Optimistic updates
const handleTaskComplete = async (taskId) => {
  // Update UI immediately
  setTasks(prev => prev.map(t => 
    t.id === taskId ? {...t, completed: true} : t
  ))
  
  // Then sync with server
  try {
    await completeTask(taskId)
  } catch (error) {
    // Revert on error
    setTasks(prev => prev.map(t => 
      t.id === taskId ? {...t, completed: false} : t
    ))
  }
}
```