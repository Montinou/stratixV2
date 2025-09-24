#!/bin/bash

# StratixV2 Pre-Build Migration Script
# Description: Automated database migration for Vercel deployments
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
MIGRATION_SCRIPT="$PROJECT_ROOT/@scripts/run_migration_neondb.sh"
LOCK_FILE="/tmp/neondb_migration.lock"
MAX_WAIT_TIME=300  # 5 minutes max wait for lock
WAIT_INTERVAL=5    # Check lock every 5 seconds

# Functions
log_info() {
    echo -e "${BLUE}[BUILD-MIGRATION]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[BUILD-MIGRATION]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[BUILD-MIGRATION]${NC} $1"
}

log_error() {
    echo -e "${RED}[BUILD-MIGRATION]${NC} $1"
}

# Migration lock management
acquire_lock() {
    local waited=0
    
    while [ $waited -lt $MAX_WAIT_TIME ]; do
        if mkdir "$LOCK_FILE" 2>/dev/null; then
            echo "$$" > "$LOCK_FILE/pid"
            echo "$(date)" > "$LOCK_FILE/timestamp"
            log_success "Migration lock acquired (PID: $$)"
            return 0
        fi
        
        if [ -f "$LOCK_FILE/pid" ]; then
            local lock_pid=$(cat "$LOCK_FILE/pid" 2>/dev/null || echo "unknown")
            log_warning "Migration in progress (PID: $lock_pid). Waiting... ($waited/${MAX_WAIT_TIME}s)"
        fi
        
        sleep $WAIT_INTERVAL
        waited=$((waited + WAIT_INTERVAL))
    done
    
    log_error "Failed to acquire migration lock after ${MAX_WAIT_TIME}s"
    return 1
}

release_lock() {
    if [ -d "$LOCK_FILE" ]; then
        rm -rf "$LOCK_FILE"
        log_success "Migration lock released"
    fi
}

# Cleanup function
cleanup() {
    release_lock
}
trap cleanup EXIT

# Environment validation for deployments
validate_deployment_environment() {
    log_info "Validating deployment environment..."
    
    local required_vars=(
        "DATABASE_URL"
        "DATABASE_URL_UNPOOLED"
        "NEON_PROJECT_ID"
        "NEXT_PUBLIC_STACK_PROJECT_ID"
        "NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY"
        "STACK_SECRET_SERVER_KEY"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables:"
        printf '%s\n' "${missing_vars[@]}" | sed 's/^/  - /'
        return 1
    fi
    
    log_success "Environment validation passed"
    return 0
}

# Check if migration is needed
is_migration_needed() {
    log_info "Checking if migration is needed..."
    
    # Use the unpooled connection for schema checks
    local db_url="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"
    
    # Check if core tables exist
    local tables_exist=$(psql "$db_url" -t -c "
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('profiles', 'objectives', 'initiatives', 'activities');
    " 2>/dev/null | tr -d ' ')
    
    if [ "$tables_exist" = "4" ]; then
        log_info "Core tables already exist, checking schema version..."
        
        # Check for newer features (companies table for multitenancy)
        local multitenant_exists=$(psql "$db_url" -t -c "
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'companies';
        " 2>/dev/null | tr -d ' ')
        
        if [ "$multitenant_exists" = "1" ]; then
            log_success "Database schema is up to date"
            return 1  # No migration needed
        else
            log_info "Database needs multitenant upgrade"
            return 0  # Migration needed
        fi
    else
        log_info "Core tables missing, full migration needed"
        return 0  # Migration needed
    fi
}

# Database health check
health_check() {
    log_info "Performing database health check..."
    
    local db_url="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"
    
    # Test basic connectivity
    if ! psql "$db_url" -c "SELECT 1;" >/dev/null 2>&1; then
        log_error "Database connection failed"
        return 1
    fi
    
    # Check database version and features
    local pg_version=$(psql "$db_url" -t -c "SELECT version();" 2>/dev/null | head -1)
    log_info "Database: $pg_version"
    
    # Verify required extensions
    local uuid_support=$(psql "$db_url" -t -c "SELECT COUNT(*) FROM pg_available_extensions WHERE name = 'uuid-ossp';" 2>/dev/null | tr -d ' ')
    if [ "$uuid_support" -ge "1" ]; then
        log_success "UUID extension available"
    else
        log_warning "UUID extension not available, using gen_random_uuid()"
    fi
    
    log_success "Database health check passed"
    return 0
}

# Run migration with enhanced logging
run_deployment_migration() {
    log_info "Starting deployment migration process..."
    
    # Change to project root to ensure correct paths
    cd "$PROJECT_ROOT"
    
    # Make migration script executable
    chmod +x "$MIGRATION_SCRIPT"
    
    # Run migration with enhanced output
    if [ "$VERCEL_ENV" = "production" ]; then
        log_info "Running PRODUCTION migration (no seed data)"
        bash "$MIGRATION_SCRIPT" migrate
    else
        log_info "Running PREVIEW/DEVELOPMENT migration (with seed data)"
        bash "$MIGRATION_SCRIPT" migrate --with-seed
    fi
    
    log_success "Migration completed successfully"
}

# Post-migration validation
post_migration_validation() {
    log_info "Running post-migration validation..."
    
    cd "$PROJECT_ROOT"
    
    # Run validation script
    bash "$MIGRATION_SCRIPT" validate
    
    log_success "Post-migration validation completed"
}

# Main execution
main() {
    echo "=========================================="
    log_info "StratixV2 Deployment Migration Starting"
    log_info "Environment: ${VERCEL_ENV:-development}"
    log_info "Project: ${VERCEL_GIT_REPO_SLUG:-local}"
    log_info "Branch: ${VERCEL_GIT_COMMIT_REF:-local}"
    echo "=========================================="
    
    # Step 1: Environment validation (skip for local builds)
    if [[ "${VERCEL_ENV:-}" == "" && "${CI:-}" == "" ]]; then
        log_warning "Local build detected - skipping environment validation"
    else
        if ! validate_deployment_environment; then
            log_error "Environment validation failed"
            exit 1
        fi
    fi
    
    # Step 2: Database health check (skip for local builds)
    if [[ "${VERCEL_ENV:-}" == "" && "${CI:-}" == "" ]]; then
        log_warning "Local build detected - skipping database health check"
    else
        if ! health_check; then
            log_error "Database health check failed"
            exit 1
        fi
    fi
    
    # Step 3: Check if migration is needed (skip for local builds)
    if [[ "${VERCEL_ENV:-}" == "" && "${CI:-}" == "" ]]; then
        log_warning "Local build detected - skipping migration check"
        log_success "Local build completed successfully (no migration required)"
        exit 0
    else
        if ! is_migration_needed; then
            log_success "No migration needed, database is up to date"
            exit 0
        fi
    fi
    
    # Step 4: Acquire migration lock
    if ! acquire_lock; then
        log_error "Failed to acquire migration lock"
        exit 1
    fi
    
    # Step 5: Run migration
    if ! run_deployment_migration; then
        log_error "Migration failed"
        exit 1
    fi
    
    # Step 6: Post-migration validation
    if ! post_migration_validation; then
        log_error "Post-migration validation failed"
        exit 1
    fi
    
    echo "=========================================="
    log_success "Deployment migration completed successfully!"
    echo "=========================================="
}

# Handle different run modes
case "${1:-}" in
    "health-check")
        validate_deployment_environment && health_check
        ;;
    "check-needed")
        is_migration_needed && echo "MIGRATION_NEEDED" || echo "UP_TO_DATE"
        ;;
    "migrate")
        main
        ;;
    *)
        main
        ;;
esac