#!/bin/bash

# Fix all broken auth imports in the codebase
echo "🔧 Fixing broken auth imports..."

# List of files to fix
files=(
  "app/api/admin/audit/route.ts"
  "app/api/admin/migrations/route.ts" 
  "app/api/admin/sessions/route.ts"
  "app/api/admin/users/route.ts"
  "app/api/admin/invitations/route.ts"
  "app/api/admin/sync/route.ts"
  "app/api/profiles/conflicts/route.ts"
  "app/api/profiles/roles/route.ts"
  "app/api/companies/assign/route.ts"
  "app/api/profiles/sync/route.ts"
  "app/api/companies/[id]/route.ts"
  "app/api/users/[id]/route.ts"
  "app/api/profiles/[userId]/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    
    # Replace import
    sed -i '' "s|import { verifyAuthentication } from '@/lib/database/auth';|import { stackServerApp } from '@/stack';|g" "$file"
    
    # Replace auth usage
    sed -i '' "s|const { user, error } = await verifyAuthentication(request);|const user = await stackServerApp.getUser();|g" "$file"
    sed -i '' "s|if (error || !user) {|if (!user) {|g" "$file"
    
    echo "✅ Fixed $file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo "🎉 All API routes fixed!"