# StratixV2 CI/CD Migration Automation

This directory contains automated database migration scripts for Vercel deployments, including health checks, rollback capabilities, and deployment validation.

## Overview

The CI/CD migration automation ensures that database schema migrations are applied automatically during deployment while providing safety mechanisms for rollback and error handling.

## Architecture

### Migration Flow
1. **Pre-Build Phase**: `pre-build-migration.sh` runs before Next.js build
2. **Environment Validation**: Verifies all required variables are present
3. **Database Health Check**: Tests connectivity and database state
4. **Migration Decision**: Determines if migration is needed based on current schema
5. **Migration Execution**: Applies migrations in correct order with locking
6. **Post-Migration Validation**: Verifies successful migration
7. **Build Continues**: Next.js build proceeds if migration successful

### Safety Mechanisms
- **Migration Locking**: Prevents concurrent migrations using filesystem locks
- **Automatic Rollback**: Rollback capability for failed migrations
- **Environment Validation**: Ensures all required variables are present
- **Health Checks**: Database connectivity and feature validation
- **Backup Creation**: Automatic backups before rollback operations

## Scripts

### Pre-Build Migration (`pre-build-migration.sh`)
Automatically runs during Vercel deployment via `npm run prebuild`.

**Features:**
- Environment validation
- Database health checks
- Migration necessity detection
- Automatic migration execution
- Post-migration validation
- Migration locking mechanism

**Environment Detection:**
- `VERCEL_ENV=production`: No seed data
- `VERCEL_ENV=preview/development`: Includes seed data

### Rollback Migration (`rollback-migration.sh`)
Provides rollback capabilities for failed or problematic migrations.

**Features:**
- Automatic state detection
- Component-specific rollbacks
- Emergency complete rollback
- Automatic backup creation
- Manual intervention support

## Package.json Scripts

### Migration Scripts
```bash
npm run migrate                 # Run migration manually
npm run migrate:with-seed      # Run migration with seed data
npm run migrate:validate       # Validate existing schema
npm run migrate:test-connection # Test database connection
```

### Deployment Scripts
```bash
npm run deploy:health-check    # Check deployment readiness
npm run deploy:check-migration # Check if migration needed
```

### Rollback Scripts
```bash
npm run rollback               # Auto rollback based on current state
npm run rollback:manual        # Manual component rollback
npm run rollback:emergency     # Emergency complete rollback
npm run rollback:backup        # Create backup without rollback
npm run rollback:state         # Show current schema state
```

## Environment Variables

### Required for Deployment
```bash
# Database Connection (NeonDB)
DATABASE_URL                           # Pooled connection
DATABASE_URL_UNPOOLED                  # Direct connection (preferred for migrations)
NEON_PROJECT_ID                        # Neon project identifier

# Authentication (NeonAuth)
NEXT_PUBLIC_STACK_PROJECT_ID           # Public project ID
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY # Public client key
STACK_SECRET_SERVER_KEY                # Private server key
```

### Optional Configuration
```bash
ENABLE_MIGRATION_LOGS=true             # Enhanced migration logging
MIGRATION_TIMEOUT=300                  # Migration timeout in seconds
CONFIRM_EMERGENCY=yes                  # Required for emergency rollback
```

## Vercel Configuration

### vercel.json
```json
{
  "buildCommand": "npm run build",
  "env": {
    "ENABLE_MIGRATION_LOGS": "true",
    "MIGRATION_TIMEOUT": "300"
  }
}
```

### package.json
```json
{
  "scripts": {
    "prebuild": "bash @scripts/deploy/pre-build-migration.sh"
  }
}
```

## Migration States

The system automatically detects current database state:

1. **CLEAN**: No tables exist, full migration needed
2. **BASIC_SCHEMA**: Core tables exist, feature migrations needed  
3. **MULTITENANT**: Multitenant support exists, AI features needed
4. **AI_SUGGESTIONS**: All features present, database up to date
5. **UNKNOWN**: Manual intervention may be required

## Deployment Scenarios

### Production Deployment
- Runs on `main` branch pushes
- No seed data included
- Full validation and safety checks
- Automatic rollback on failure

### Preview Deployment  
- Runs on feature branch pushes
- Includes seed data for testing
- Same safety mechanisms as production
- Isolated from production database

### Development
- Local development with `.env.local`
- Manual migration control
- Full feature set available

## Safety Features

### Migration Locking
Prevents concurrent migrations using filesystem locks:
- Lock timeout: 300 seconds (5 minutes)
- PID tracking for debugging
- Automatic cleanup on script exit

### Rollback Capability
Multiple rollback options:
- **Auto**: Detects current state and rolls back appropriately
- **Manual**: Target specific components (AI, multitenant, schema)
- **Emergency**: Complete database cleanup (requires confirmation)

### Error Handling
Comprehensive error handling:
- Environment validation failures halt deployment
- Database connection failures halt deployment
- Migration failures trigger automatic rollback
- Detailed logging for debugging

## Monitoring and Debugging

### Log Output
All scripts provide detailed logging:
- Color-coded output (INFO, SUCCESS, WARNING, ERROR)
- Migration progress tracking
- Database state information
- Error details and suggestions

### Health Checks
Regular health checks verify:
- Database connectivity
- Environment variable presence
- Schema integrity
- Feature availability

### Backup Management
Automatic backups include:
- Complete schema dump
- Critical data backup
- Restore script generation
- Timestamped storage

## Troubleshooting

### Common Issues

**Environment Variables Missing**
```bash
npm run deploy:health-check
# Review .env.example for required variables
```

**Migration Lock Timeout**
```bash
# Check for stuck processes
ps aux | grep migration
# Remove stale lock
rm -rf /tmp/neondb_migration.lock
```

**Failed Migration**
```bash
# Check current state
npm run rollback:state
# Automatic rollback
npm run rollback
```

**Emergency Situations**
```bash
# Complete database reset (DANGEROUS)
CONFIRM_EMERGENCY=yes npm run rollback:emergency
```

### Manual Intervention

If automatic systems fail:

1. **Create backup**:
   ```bash
   npm run rollback:backup
   ```

2. **Check database state**:
   ```bash
   npm run rollback:state
   ```

3. **Manual rollback**:
   ```bash
   npm run rollback:manual ai-suggestions
   npm run rollback:manual multitenant  
   npm run rollback:manual schema
   ```

4. **Restore from backup**:
   ```bash
   # Find backup in /tmp/neondb_backup_*
   # Use restore.sh script in backup directory
   ```

## Integration with Vercel

### Automatic Deployment
1. Code pushed to repository
2. Vercel triggers build
3. `prebuild` script runs migration
4. Next.js build proceeds
5. Application deployed

### Environment Separation
- **Production**: `main` branch → Production database
- **Preview**: Feature branches → Preview database  
- **Development**: Local → Development database

### Build Integration
Migration runs before Next.js build ensuring:
- Database schema ready before application code
- Environment validation before resource allocation
- Fast failure on configuration issues
- No partial deployments with missing migrations

## Best Practices

### Development Workflow
1. Test migrations locally: `npm run migrate:validate`
2. Create feature branch
3. Push to trigger preview deployment
4. Verify preview environment
5. Merge to main for production deployment

### Migration Development
1. Create migration SQL files in `@scripts/migrations/`
2. Create corresponding rollback files in `@scripts/rollback/`
3. Test locally with `npm run migrate`
4. Test rollback with `npm run rollback:manual`
5. Commit both migration and rollback scripts

### Production Safety
1. Always test in preview environment first
2. Monitor deployment logs for migration status
3. Have rollback plan ready
4. Verify application functionality post-deployment
5. Monitor database performance after schema changes

## Future Enhancements

Potential improvements:
- Blue-green deployment support
- Migration versioning system
- Automatic performance monitoring
- Integration with monitoring services
- Enhanced backup retention policies
- Multi-region deployment support