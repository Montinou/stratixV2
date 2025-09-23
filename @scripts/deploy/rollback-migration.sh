#!/bin/bash

# StratixV2 Migration Rollback Script
# Description: Automated rollback capability for failed migrations
# Created: 2025-09-23

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ROLLBACK_DIR="$PROJECT_ROOT/@scripts/rollback"
BACKUP_DIR="/tmp/neondb_backup_$(date +%Y%m%d_%H%M%S)"

# Functions
log_info() {
    echo -e "${BLUE}[ROLLBACK]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[ROLLBACK]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[ROLLBACK]${NC} $1"
}

log_error() {
    echo -e "${RED}[ROLLBACK]${NC} $1"
}

# Environment validation
validate_environment() {
    log_info "Validating environment for rollback..."
    
    if [ -z "$DATABASE_URL" ] && [ -z "$DATABASE_URL_UNPOOLED" ]; then
        log_error "No database URL found. Set DATABASE_URL or DATABASE_URL_UNPOOLED"
        return 1
    fi
    
    if ! command -v psql &> /dev/null; then
        log_error "psql not found. Please install PostgreSQL client."
        return 1
    fi
    
    log_success "Environment validation passed"
    return 0
}

# Test database connection
test_connection() {
    log_info "Testing database connection..."
    
    local db_url="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"
    
    if psql "$db_url" -c "SELECT version();" > /dev/null 2>&1; then
        log_success "Database connection successful"
        return 0
    else
        log_error "Cannot connect to database"
        return 1
    fi
}

# Create backup before rollback
create_backup() {
    log_info "Creating backup before rollback..."
    
    local db_url="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"
    mkdir -p "$BACKUP_DIR"
    
    # Backup schema
    log_info "Backing up database schema..."
    pg_dump "$db_url" --schema-only --no-owner --no-privileges > "$BACKUP_DIR/schema_backup.sql"
    
    # Backup data for core tables
    log_info "Backing up critical data..."
    local tables=("profiles" "objectives" "initiatives" "activities" "companies" "import_logs" "ai_suggestions")
    
    for table in "${tables[@]}"; do
        if psql "$db_url" -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$table'" | grep -q "1 row"; then
            log_info "Backing up table: $table"
            pg_dump "$db_url" --data-only --table="$table" --no-owner --no-privileges > "$BACKUP_DIR/${table}_data.sql" 2>/dev/null || true
        fi
    done
    
    # Create restore script
    cat > "$BACKUP_DIR/restore.sh" << 'EOF'
#!/bin/bash
# Database restore script
# Usage: ./restore.sh [DATABASE_URL]

DB_URL="${1:-$DATABASE_URL_UNPOOLED}"
if [ -z "$DB_URL" ]; then
    echo "Error: No database URL provided"
    exit 1
fi

echo "Restoring schema..."
psql "$DB_URL" < schema_backup.sql

echo "Restoring data..."
for file in *_data.sql; do
    if [ -f "$file" ]; then
        echo "Restoring $(basename "$file" _data.sql)..."
        psql "$DB_URL" < "$file" || echo "Warning: Failed to restore $file"
    fi
done

echo "Restore completed"
EOF
    
    chmod +x "$BACKUP_DIR/restore.sh"
    log_success "Backup created at: $BACKUP_DIR"
}

# Run rollback script
run_rollback_script() {
    local script_path="$1"
    local description="$2"
    
    log_info "Running rollback: $description"
    log_info "Script: $(basename "$script_path")"
    
    if [ ! -f "$script_path" ]; then
        log_error "Rollback script not found: $script_path"
        return 1
    fi
    
    local db_url="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"
    
    if psql "$db_url" -f "$script_path" -v ON_ERROR_STOP=1; then
        log_success "✓ $description completed"
        return 0
    else
        log_error "✗ $description failed"
        return 1
    fi
}

# Get current schema state
get_schema_state() {
    log_info "Analyzing current schema state..."
    
    local db_url="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"
    
    # Check which tables exist
    local tables=$(psql "$db_url" -t -c "
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('profiles', 'objectives', 'initiatives', 'activities', 'companies', 'import_logs', 'ai_suggestions')
        ORDER BY table_name;
    " 2>/dev/null | tr -d ' ' | grep -v '^$')
    
    if [ -z "$tables" ]; then
        echo "CLEAN"  # No tables found
        return 0
    fi
    
    # Check for specific feature tables
    if echo "$tables" | grep -q "ai_suggestions"; then
        echo "AI_SUGGESTIONS"
        return 0
    elif echo "$tables" | grep -q "companies"; then
        echo "MULTITENANT"
        return 0
    elif echo "$tables" | grep -q "profiles"; then
        echo "BASIC_SCHEMA"
        return 0
    else
        echo "UNKNOWN"
        return 0
    fi
}

# Automatic rollback based on current state
auto_rollback() {
    local current_state=$(get_schema_state)
    log_info "Current schema state: $current_state"
    
    case "$current_state" in
        "AI_SUGGESTIONS")
            log_info "Rolling back AI suggestions feature..."
            if [ -f "$ROLLBACK_DIR/rollback_003_ai_suggestions_neondb.sql" ]; then
                run_rollback_script "$ROLLBACK_DIR/rollback_003_ai_suggestions_neondb.sql" "AI Suggestions Rollback"
            fi
            ;&  # Fall through to next case
        "MULTITENANT")
            log_info "Rolling back multitenant support..."
            if [ -f "$ROLLBACK_DIR/rollback_002_multitenant_support_neondb.sql" ]; then
                run_rollback_script "$ROLLBACK_DIR/rollback_002_multitenant_support_neondb.sql" "Multitenant Rollback"
            fi
            ;&  # Fall through to next case
        "BASIC_SCHEMA")
            log_info "Rolling back basic schema..."
            if [ -f "$ROLLBACK_DIR/rollback_001_initial_schema_neondb.sql" ]; then
                run_rollback_script "$ROLLBACK_DIR/rollback_001_initial_schema_neondb.sql" "Initial Schema Rollback"
            fi
            ;;
        "CLEAN")
            log_info "Database is already clean, no rollback needed"
            ;;
        "UNKNOWN")
            log_warning "Unknown schema state, manual intervention may be required"
            ;;
    esac
}

# Manual rollback by component
manual_rollback() {
    local component="$1"
    
    case "$component" in
        "ai-suggestions"|"ai")
            run_rollback_script "$ROLLBACK_DIR/rollback_003_ai_suggestions_neondb.sql" "AI Suggestions Rollback"
            ;;
        "multitenant"|"companies")
            run_rollback_script "$ROLLBACK_DIR/rollback_002_multitenant_support_neondb.sql" "Multitenant Rollback"
            ;;
        "schema"|"initial")
            run_rollback_script "$ROLLBACK_DIR/rollback_001_initial_schema_neondb.sql" "Initial Schema Rollback"
            ;;
        "all"|"complete")
            auto_rollback
            ;;
        *)
            log_error "Unknown component: $component"
            log_info "Available components: ai-suggestions, multitenant, schema, all"
            return 1
            ;;
    esac
}

# Emergency rollback (fast, complete cleanup)
emergency_rollback() {
    log_warning "EMERGENCY ROLLBACK: This will drop all StratixV2 tables!"
    
    if [ "$CONFIRM_EMERGENCY" != "yes" ]; then
        log_error "Emergency rollback requires CONFIRM_EMERGENCY=yes environment variable"
        return 1
    fi
    
    local db_url="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"
    
    # Drop all StratixV2 tables
    local tables=("ai_suggestions" "import_logs" "activities" "initiatives" "objectives" "companies" "profiles" "users")
    
    for table in "${tables[@]}"; do
        log_info "Dropping table: $table"
        psql "$db_url" -c "DROP TABLE IF EXISTS $table CASCADE;" 2>/dev/null || true
    done
    
    # Drop auth schema if it exists
    log_info "Dropping auth schema..."
    psql "$db_url" -c "DROP SCHEMA IF EXISTS auth CASCADE;" 2>/dev/null || true
    
    log_success "Emergency rollback completed"
}

# Show help
show_help() {
    echo "StratixV2 Migration Rollback Script"
    echo ""
    echo "Usage: $0 [COMMAND] [COMPONENT]"
    echo ""
    echo "Commands:"
    echo "  auto                 Automatic rollback based on current schema state"
    echo "  manual [component]   Rollback specific component"
    echo "  emergency            Complete emergency rollback (requires CONFIRM_EMERGENCY=yes)"
    echo "  backup               Create backup only (no rollback)"
    echo "  state                Show current schema state"
    echo "  help                 Show this help message"
    echo ""
    echo "Components (for manual rollback):"
    echo "  ai-suggestions       Rollback AI suggestions feature"
    echo "  multitenant          Rollback multitenant support"
    echo "  schema               Rollback initial schema"
    echo "  all                  Rollback everything (same as auto)"
    echo ""
    echo "Environment Variables:"
    echo "  DATABASE_URL         PostgreSQL connection string"
    echo "  DATABASE_URL_UNPOOLED Alternative connection string"
    echo "  CONFIRM_EMERGENCY    Set to 'yes' to enable emergency rollback"
    echo ""
    echo "Examples:"
    echo "  $0 auto                      # Auto-detect and rollback"
    echo "  $0 manual ai-suggestions     # Rollback only AI suggestions"
    echo "  $0 backup                    # Create backup without rollback"
    echo "  CONFIRM_EMERGENCY=yes $0 emergency  # Emergency complete rollback"
}

# Main function
main() {
    echo "=========================================="
    log_info "StratixV2 Migration Rollback"
    echo "=========================================="
    
    case "${1:-auto}" in
        "auto")
            validate_environment || exit 1
            test_connection || exit 1
            create_backup || exit 1
            auto_rollback
            ;;
        "manual")
            validate_environment || exit 1
            test_connection || exit 1
            create_backup || exit 1
            manual_rollback "$2"
            ;;
        "emergency")
            validate_environment || exit 1
            test_connection || exit 1
            emergency_rollback
            ;;
        "backup")
            validate_environment || exit 1
            test_connection || exit 1
            create_backup
            ;;
        "state")
            validate_environment || exit 1
            test_connection || exit 1
            echo "Current schema state: $(get_schema_state)"
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"