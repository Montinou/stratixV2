# Manager Dashboard UI Specification

## Visual Design System

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│  Header                                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Manager Dashboard                  [Realtime ●] │   │
│  │ Team & Initiative Management                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Controls Bar                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [▼ Team Filter] [📅 Date Range] [↻] [↓]        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Metrics Grid (Mobile: 2x2, Desktop: 1x4)               │
│  ┌───────────┬───────────┬───────────┬───────────┐     │
│  │ Team Size │ Active    │ Efficiency│ Workload  │     │
│  │    12     │    8      │   85%     │   ▁▃▅▇    │     │
│  │ +2 this mo│ 3 at risk │ ↑ 5%      │ Balanced  │     │
│  └───────────┴───────────┴───────────┴───────────┘     │
│                                                          │
│  Tab Navigation                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [Overview] [Team] [Initiatives] [Resources]     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  Content Area                                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                   │   │
│  │  Dynamic content based on selected tab           │   │
│  │                                                   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Component Specifications

### 1. Team Performance Cards
```jsx
// Mobile: Single column
// Desktop: 3-column grid

┌─────────────────────────────────────┐
│  👤 Ana García                  🟢  │
│  Senior Developer                   │
│  ────────────────────────────       │
│  Tasks: 8/10        Progress: 80%   │
│  [████████░░] 80%                   │
│                                      │
│  Current: API Integration            │
│  Due: Jan 18                        │
│  ┌────────┐ ┌────────┐              │
│  │ Profile│ │ Assign │              │
│  └────────┘ └────────┘              │
└─────────────────────────────────────┘

Status indicators:
🟢 Available (< 70% workload)
🟡 Busy (70-90% workload)
🔴 Overloaded (> 90% workload)
```

### 2. Initiative Tracker Cards
```jsx
// Kanban-style cards with priority badges

┌─────────────────────────────────────┐
│  Platform Migration         [HIGH]  │
│  ─────────────────────────────────  │
│  Progress: [███████░░░] 70%         │
│                                      │
│  👥 3 members • 📅 5 days left      │
│  ✓ 14/20 tasks                      │
│                                      │
│  Latest: Database schema updated    │
│  2 hours ago                        │
│                                      │
│  [View] [Edit] [Team]               │
└─────────────────────────────────────┘

Priority colors:
[CRITICAL] - Red background
[HIGH] - Orange background
[MEDIUM] - Yellow background
[LOW] - Gray background
```

### 3. Resource Allocation Heatmap
```
Team Member   Mon  Tue  Wed  Thu  Fri
─────────────────────────────────────
Ana G.        ▓▓▓  ▓▓▓  ▓▓░  ▓░░  ░░░
Carlos M.     ▓▓▓  ▓▓▓  ▓▓▓  ▓▓▓  ▓▓░
Elena R.      ▓░░  ▓▓░  ▓▓▓  ▓▓░  ▓░░
Juan P.       ░░░  ▓░░  ▓▓░  ▓▓▓  ▓▓▓

Legend:
░░░ Available (0-25%)
▓░░ Light (25-50%)
▓▓░ Moderate (50-75%)
▓▓▓ Heavy (75-100%)
```

### 4. Quick Actions Panel
```jsx
// Floating action button on mobile
// Fixed sidebar on desktop

┌─────────────────────────┐
│  Quick Actions          │
│  ──────────────────     │
│  ➕ New Initiative      │
│  👤 Add Team Member     │
│  📊 Generate Report     │
│  📅 Schedule Meeting    │
│  💬 Team Announcement   │
└─────────────────────────┘
```

## Mobile-Specific Interactions

### Swipe Gestures
- **Left/Right**: Navigate between team members
- **Up**: Expand card details
- **Down**: Collapse card
- **Long press**: Quick action menu

### Touch Targets
- Minimum size: 44x44px
- Spacing between targets: 8px minimum
- Primary actions: Bottom of cards for thumb reach

## Color Palette

```css
/* Team Performance */
--team-excellent: hsl(142, 76%, 36%);
--team-good: hsl(200, 98%, 39%);
--team-attention: hsl(38, 92%, 50%);
--team-critical: hsl(0, 84%, 60%);

/* Workload */
--workload-available: hsl(142, 30%, 85%);
--workload-light: hsl(142, 40%, 65%);
--workload-moderate: hsl(38, 60%, 55%);
--workload-heavy: hsl(0, 60%, 55%);

/* Backgrounds */
--card-hover: hsla(0, 0%, 0%, 0.02);
--card-active: hsla(0, 0%, 0%, 0.05);
```

## Typography Scale

```css
/* Mobile */
.heading-1 { font-size: 1.5rem; }    /* 24px */
.heading-2 { font-size: 1.25rem; }   /* 20px */
.heading-3 { font-size: 1rem; }      /* 16px */
.body { font-size: 0.875rem; }       /* 14px */
.caption { font-size: 0.75rem; }     /* 12px */

/* Desktop */
@media (min-width: 1024px) {
  .heading-1 { font-size: 2rem; }    /* 32px */
  .heading-2 { font-size: 1.5rem; }  /* 24px */
  .heading-3 { font-size: 1.25rem; } /* 20px */
  .body { font-size: 1rem; }         /* 16px */
  .caption { font-size: 0.875rem; }  /* 14px */
}
```

## Animation Specifications

```css
/* Card interactions */
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Progress bars */
@keyframes progress-fill {
  from { width: 0; }
  to { width: var(--progress); }
}

/* Skeleton loading */
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* Timing functions */
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

## Component States

### Interactive States
```css
/* Default */
.component {
  transition: all 0.2s var(--ease-out);
}

/* Hover (desktop) */
.component:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Active/Pressed */
.component:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
}

/* Focus */
.component:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Disabled */
.component:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

## Responsive Grid System

```css
/* Mobile First Grid */
.dashboard-grid {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  
  /* Mobile: Single column */
  grid-template-columns: 1fr;
}

/* Tablet: 2 columns */
@media (min-width: 640px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
    padding: 1.5rem;
  }
}

/* Desktop: Flexible columns */
@media (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    padding: 2rem;
  }
}

/* Large screens: Max width container */
@media (min-width: 1440px) {
  .dashboard-grid {
    max-width: 1280px;
    margin: 0 auto;
  }
}
```

## Loading States

```jsx
// Skeleton structure for team member card
<div className="skeleton-card">
  <div className="skeleton-header">
    <div className="skeleton-avatar" />
    <div className="skeleton-text-group">
      <div className="skeleton-text w-32" />
      <div className="skeleton-text w-24" />
    </div>
  </div>
  <div className="skeleton-body">
    <div className="skeleton-text w-full" />
    <div className="skeleton-progress" />
    <div className="skeleton-text w-48" />
  </div>
  <div className="skeleton-footer">
    <div className="skeleton-button" />
    <div className="skeleton-button" />
  </div>
</div>
```

## Empty States

```jsx
// No team members
<div className="empty-state">
  <div className="empty-icon">
    <Users className="h-12 w-12" />
  </div>
  <h3>No team members yet</h3>
  <p>Add team members to start tracking performance</p>
  <Button variant="outline">
    <Plus className="h-4 w-4 mr-2" />
    Add Team Member
  </Button>
</div>
```

## Error States

```jsx
// Error card
<Card className="error-card border-red-200">
  <CardContent className="text-center py-8">
    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
    <h3 className="text-lg font-medium mb-2">Unable to load data</h3>
    <p className="text-sm text-muted-foreground mb-4">
      Please check your connection and try again
    </p>
    <Button variant="outline" onClick={retry}>
      <RefreshCw className="h-4 w-4 mr-2" />
      Retry
    </Button>
  </CardContent>
</Card>
```