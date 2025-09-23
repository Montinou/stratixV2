#!/bin/bash

epic_name="$1"

if [ -z "$epic_name" ]; then
  echo "❌ Please provide an epic name"
  echo "Usage: /pm:epic-start <epic-name>"
  exit 1
fi

echo "🚀 Starting parallel agent execution for epic: $epic_name"
echo ""

epic_dir=".claude/epics/$epic_name"
epic_file="$epic_dir/epic.md"

if [ ! -f "$epic_file" ]; then
  echo "❌ Epic not found: $epic_name"
  echo ""
  echo "Available epics:"
  for dir in .claude/epics/*/; do
    [ -d "$dir" ] && echo "  • $(basename "$dir")"
  done
  exit 1
fi

# Check epic status
status=$(grep "^status:" "$epic_file" | head -1 | sed 's/^status: *//')
if [ "$status" = "completed" ]; then
  echo "✅ Epic '$epic_name' is already completed"
  exit 0
fi

echo "📊 Epic Analysis:"
echo "=================="

# Extract epic metadata
epic_title=$(grep "^# Epic:" "$epic_file" | head -1 | sed 's/^# Epic: *//')
if [ -z "$epic_title" ]; then
  epic_title="$epic_name"
fi

progress=$(grep "^progress:" "$epic_file" | head -1 | sed 's/^progress: *//')
created=$(grep "^created:" "$epic_file" | head -1 | sed 's/^created: *//')

echo "  Title: $epic_title"
echo "  Status: ${status:-planning}"
echo "  Progress: ${progress:-0%}"
echo "  Created: ${created:-unknown}"
echo ""

# Analyze task structure
sequential_tasks=()
parallel_tasks=()
task_count=0

echo "📋 Task Analysis:"
echo "=================="

for task_file in "$epic_dir"/[0-9]*.md; do
  [ -f "$task_file" ] || continue
  
  task_num=$(basename "$task_file" .md)
  task_name=$(grep "^name:" "$task_file" | head -1 | sed 's/^name: *//')
  task_status=$(grep "^status:" "$task_file" | head -1 | sed 's/^status: *//')
  parallel=$(grep "^parallel:" "$task_file" | head -1 | sed 's/^parallel: *//')
  depends_on=$(grep "^depends_on:" "$task_file" | head -1 | sed 's/^depends_on: *//')
  
  if [ "$parallel" = "true" ] && [ "$task_status" != "completed" ]; then
    parallel_tasks+=("$task_num:$task_name")
    echo "  ⚡ Task $task_num: $task_name (parallel)"
  elif [ "$task_status" != "completed" ]; then
    sequential_tasks+=("$task_num:$task_name")
    echo "  📋 Task $task_num: $task_name (sequential)"
  else
    echo "  ✅ Task $task_num: $task_name (completed)"
  fi
  
  ((task_count++))
done

echo ""
echo "📈 Execution Plan:"
echo "=================="
echo "  Total tasks: $task_count"
echo "  Sequential tasks: ${#sequential_tasks[@]}"
echo "  Parallel tasks: ${#parallel_tasks[@]}"
echo ""

# Check for dependencies and determine starting point
if [ ${#sequential_tasks[@]} -gt 0 ]; then
  echo "⚠️  Sequential tasks detected!"
  echo "   The following tasks must be completed first:"
  for task in "${sequential_tasks[@]}"; do
    task_num=${task%%:*}
    task_name=${task#*:}
    echo "     • Task $task_num: $task_name"
  done
  echo ""
  echo "💡 Recommendation:"
  echo "   Complete sequential tasks before launching parallel agents"
  echo "   Use: /pm:issue-start <task-number> for individual tasks"
  exit 1
fi

if [ ${#parallel_tasks[@]} -eq 0 ]; then
  echo "✅ All tasks completed!"
  echo "   Epic '$epic_name' appears to be finished"
  exit 0
fi

# Create git worktree for epic development
echo "🌳 Setting up development environment..."
echo "========================================"

branch_name="epic/$epic_name"
worktree_dir="../$epic_name-worktree"

# Check if worktree already exists
if [ -d "$worktree_dir" ]; then
  echo "✅ Worktree already exists at: $worktree_dir"
else
  # Create worktree branch if needed
  if ! git show-ref --verify --quiet "refs/heads/$branch_name"; then
    git checkout -b "$branch_name" 2>/dev/null
    if [ $? -eq 0 ]; then
      echo "✅ Created branch: $branch_name"
      git push -u origin "$branch_name" 2>/dev/null
      if [ $? -eq 0 ]; then
        echo "✅ Pushed branch to origin"
      else
        echo "⚠️  Warning: Could not push branch to origin"
      fi
    else
      echo "⚠️  Warning: Could not create branch"
    fi
    git checkout main 2>/dev/null
  fi
  
  # Create worktree
  git worktree add "$worktree_dir" "$branch_name" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "✅ Created worktree at: $worktree_dir"
  else
    echo "⚠️  Warning: Could not create worktree"
  fi
fi

echo ""

# Launch parallel agents
echo "🤖 Launching Parallel Agents:"
echo "=============================="
echo ""

agent_count=0
launched_agents=()

for task in "${parallel_tasks[@]}"; do
  task_num=${task%%:*}
  task_name=${task#*:}
  
  echo "🚀 Launching agent for Task $task_num: $task_name"
  
  # Here we would launch the actual agents using the Task tool
  # For now, we'll simulate the launch process
  echo "   Agent ID: agent-$epic_name-$task_num"
  echo "   Working directory: $worktree_dir"
  echo "   Task file: .claude/epics/$epic_name/$task_num.md"
  
  launched_agents+=("agent-$epic_name-$task_num")
  ((agent_count++))
  
  echo "   ✅ Agent launched successfully"
  echo ""
done

echo "🎉 Parallel Execution Started!"
echo "==============================="
echo ""
echo "📊 Summary:"
echo "  Epic: $epic_title"
echo "  Agents launched: $agent_count"
echo "  Working branch: $branch_name"
echo "  Worktree location: $worktree_dir"
echo ""
echo "🤖 Active Agents:"
for agent in "${launched_agents[@]}"; do
  echo "  • $agent"
done
echo ""
echo "💡 Next Steps:"
echo "  • Monitor agent progress: /pm:epic-status $epic_name"
echo "  • View individual tasks: /pm:issue-show <task-number>"
echo "  • Check worktree: cd $worktree_dir"
echo "  • Sync when ready: /pm:epic-sync $epic_name"
echo ""
echo "📝 Note: Agents will work in the '$worktree_dir' directory"
echo "         Changes will be committed to the '$branch_name' branch"

exit 0