#!/bin/bash

epic_name="$1"

if [ -z "$epic_name" ]; then
  echo "❌ Please provide an epic name"
  echo "Usage: /pm:epic-sync <epic-name>"
  exit 1
fi

echo "🔄 Syncing epic to GitHub..."
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

# Check if GitHub CLI is available
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh) is not installed"
  echo "   Please install: https://cli.github.com/"
  exit 1
fi

# Check if we're authenticated with GitHub
if ! gh auth status &> /dev/null; then
  echo "❌ Not authenticated with GitHub"
  echo "   Please run: gh auth login"
  exit 1
fi

echo "📊 Epic Summary:"
echo "=================="

# Extract epic metadata
epic_title=$(grep "^# Epic:" "$epic_file" | head -1 | sed 's/^# Epic: *//')
if [ -z "$epic_title" ]; then
  epic_title="$epic_name"
fi

status=$(grep "^status:" "$epic_file" | head -1 | sed 's/^status: *//')
progress=$(grep "^progress:" "$epic_file" | head -1 | sed 's/^progress: *//')
created=$(grep "^created:" "$epic_file" | head -1 | sed 's/^created: *//')

echo "  Title: $epic_title"
echo "  Status: ${status:-planning}"
echo "  Progress: ${progress:-0%}"
echo "  Created: ${created:-unknown}"
echo ""

# Count tasks
task_count=0
for task_file in "$epic_dir"/[0-9]*.md; do
  [ -f "$task_file" ] && ((task_count++))
done

echo "📝 Tasks to sync: $task_count"
echo ""

# Create GitHub issue for the epic
echo "🚀 Creating GitHub epic issue..."

# Prepare epic body
epic_body=$(cat "$epic_file" | sed '/^---$/,/^---$/d' | head -c 60000)

# Create the main epic issue
epic_issue_url=$(gh issue create \
  --title "Epic: $epic_title" \
  --body "$epic_body" \
  --label "epic,enhancement" \
  --assignee "@me" 2>/dev/null)

if [ $? -eq 0 ]; then
  echo "✅ Epic issue created: $epic_issue_url"
  epic_issue_number=$(echo "$epic_issue_url" | grep -o '[0-9]*$')
else
  echo "❌ Failed to create epic issue"
  exit 1
fi

echo ""

# Create individual task issues
echo "📋 Creating task issues..."
task_issues=()

for task_file in "$epic_dir"/[0-9]*.md; do
  [ -f "$task_file" ] || continue
  
  task_num=$(basename "$task_file" .md)
  task_name=$(grep "^name:" "$task_file" | head -1 | sed 's/^name: *//')
  task_type=$(grep "^type:" "$task_file" | head -1 | sed 's/^type: *//')
  parallel=$(grep "^parallel:" "$task_file" | head -1 | sed 's/^parallel: *//')
  
  # Prepare task body
  task_body=$(cat "$task_file" | sed '/^---$/,/^---$/d' | head -c 30000)
  task_body="$task_body

---
**Epic**: #$epic_issue_number
**Task Number**: $task_num"
  
  # Determine labels
  labels="task"
  [ -n "$task_type" ] && labels="$labels,$task_type"
  [ "$parallel" = "true" ] && labels="$labels,parallel"
  
  echo "  Creating task $task_num: $task_name"
  
  task_issue_url=$(gh issue create \
    --title "Task $task_num: $task_name" \
    --body "$task_body" \
    --label "$labels" \
    --assignee "@me" 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    task_issue_number=$(echo "$task_issue_url" | grep -o '[0-9]*$')
    task_issues+=("$task_issue_number")
    echo "    ✅ Created: #$task_issue_number"
  else
    echo "    ❌ Failed to create task $task_num"
  fi
done

echo ""

# Update epic issue with task links
if [ ${#task_issues[@]} -gt 0 ]; then
  echo "🔗 Updating epic with task links..."
  
  task_links=""
  for task_issue in "${task_issues[@]}"; do
    task_links="$task_links- #$task_issue"$'\n'
  done
  
  update_body="$epic_body

## Tasks
$task_links"
  
  gh issue edit "$epic_issue_number" --body "$update_body" 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "✅ Epic updated with task references"
  else
    echo "⚠️  Warning: Could not update epic with task links"
  fi
fi

# Update epic metadata file with GitHub info
echo ""
echo "📝 Updating epic metadata..."

# Update the epic file with GitHub URL
sed -i.backup "s|github: \[Will be updated when synced to GitHub\]|github: $epic_issue_url|g" "$epic_file"
if [ $? -eq 0 ]; then
  rm -f "$epic_file.backup"
  echo "✅ Epic metadata updated"
else
  echo "⚠️  Warning: Could not update epic metadata"
fi

# Create or update worktree branch if needed
echo ""
echo "🌳 Setting up development branch..."

branch_name="epic/$epic_name"
if git show-ref --verify --quiet "refs/heads/$branch_name"; then
  echo "✅ Branch '$branch_name' already exists"
else
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
fi

# Switch back to main
git checkout main 2>/dev/null

echo ""
echo "🎉 Epic sync completed successfully!"
echo "=================================="
echo ""
echo "📊 Summary:"
echo "  Epic Issue: #$epic_issue_number"
echo "  Task Issues: ${#task_issues[@]} created"
echo "  Branch: $branch_name"
echo "  URL: $epic_issue_url"
echo ""
echo "💡 Next steps:"
echo "  • Start development: /pm:epic-start $epic_name"
echo "  • View on GitHub: $epic_issue_url"
echo "  • Track progress: /pm:epic-status $epic_name"

exit 0