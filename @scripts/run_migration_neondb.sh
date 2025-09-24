#!/bin/bash

# StratixV2 NeonDB Migration Script Runner
# Created: 2025-09-23
# Description: Execute database migrations for NeonDB in correct order

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_URL="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v psql &> /dev/null; then
        log_error "psql not found. Please install PostgreSQL client."
        exit 1
    fi
    
    if [ -z "$DB_URL" ]; then
        log_error "Database URL not found. Please set DATABASE_URL or DATABASE_URL_UNPOOLED environment variable."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Test database connection
test_connection() {
    log_info "Testing database connection..."
    
    if psql "$DB_URL" -c "SELECT version();" > /dev/null 2>&1; then
        log_success "Database connection successful"
    else
        log_error "Cannot connect to database. Please check your connection string."
        exit 1
    fi
}

# Run a SQL script
run_script() {
    local script_path="$1"
    local description="$2"
    
    log_info "Running: $description"
    log_info "Script: $(basename "$script_path")"
    
    if [ ! -f "$script_path" ]; then
        log_error "Script not found: $script_path"
        return 1
    fi
    
    if psql "$DB_URL" -f "$script_path" -v ON_ERROR_STOP=1; then
        log_success "✓ $description completed"
        return 0
    else
        log_error "✗ $description failed"
        return 1
    fi
}

# Run validation script
run_validation() {
    local script_path="$1"
    local description="$2"
    
    log_info "Running validation: $description"
    
    if [ ! -f "$script_path" ]; then
        log_warning "Validation script not found: $script_path"
        return 0
    fi
    
    # Run validation and capture output
    local output=$(psql "$DB_URL" -f "$script_path" -t -A 2>&1)
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_success "✓ $description passed"
        echo "$output" | grep -E "(PASS|FAIL|overall_result)" | head -10
        return 0
    else
        log_error "✗ $description failed"
        echo "$output"
        return 1
    fi
}

# Main migration execution for NeonDB
run_migration() {
    log_info "Starting StratixV2 NeonDB database migration..."
    echo "=========================================="
    
    # Initial schema (NeonDB version)
    run_script "$SCRIPT_DIR/init/001_initial_schema_neondb.sql" "Initial Schema Setup (NeonDB)" || exit 1
    
    # Multitenant support (NeonDB version)
    run_script "$SCRIPT_DIR/migrations/002_add_multitenant_support_neondb.sql" "Multitenant Support (NeonDB)" || exit 1
    
    # AI suggestions (NeonDB version)
    run_script "$SCRIPT_DIR/migrations/003_add_ai_suggestions_neondb.sql" "AI Suggestions (NeonDB)" || exit 1
    
    # Memory system (NeonDB version)
    run_script "$SCRIPT_DIR/migrations/004_add_memory_system_neondb.sql" "Memory System (NeonDB)" || exit 1
    
    # Seed data (NeonDB version)
    if [ "$1" = "--with-seed-data" ]; then
        log_info "Including seed data..."
        run_script "$SCRIPT_DIR/init/004_seed_sample_data_neondb.sql" "Sample Data Seeding (NeonDB)" || log_warning "Seed data failed, continuing..."
    fi
    
    echo "=========================================="
    log_success "NeonDB Migration completed successfully!"
}

# Run validation
run_all_validation() {
    log_info "Running post-migration validation..."
    echo "=========================================="
    
    run_validation "$SCRIPT_DIR/validation/validate_schema.sql" "Schema Validation"
    run_validation "$SCRIPT_DIR/validation/validate_data.sql" "Data Validation"
    
    echo "=========================================="
    log_success "Validation completed!"
}

# Help function
show_help() {
    echo "StratixV2 NeonDB Migration Script Runner"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  migrate              Run the complete NeonDB migration"
    echo "  migrate --with-seed  Run migration with sample data"
    echo "  validate             Run validation only"
    echo "  test-connection      Test database connection"
    echo "  help                 Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DATABASE_URL         PostgreSQL connection string"
    echo "  DATABASE_URL_UNPOOLED Alternative connection string (preferred for migrations)"
    echo ""
    echo "Examples:"
    echo "  $0 migrate"
    echo "  $0 migrate --with-seed"
    echo "  $0 validate"
    echo "  DATABASE_URL='postgresql://...' $0 migrate"
}

# Main script logic
main() {
    case "${1:-}" in
        "migrate")
            check_prerequisites
            test_connection
            run_migration "$2"
            run_all_validation
            ;;
        "validate")
            check_prerequisites
            test_connection
            run_all_validation
            ;;
        "test-connection")
            check_prerequisites
            test_connection
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "Unknown command: ${1:-}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"