-- Data Validation for StratixV2 Migration
-- Validates data integrity, constraints, and relationships after migration
-- Created: 2025-09-23

-- =============================================================================
-- DATA VALIDATION RESULTS
-- =============================================================================

-- Create temporary table to store validation results
CREATE TEMP TABLE data_validation_results (
    check_name TEXT,
    status TEXT,
    message TEXT,
    count_found INTEGER,
    details TEXT
);

-- =============================================================================
-- ORPHANED RECORDS VALIDATION
-- =============================================================================

-- Check for profiles without companies (after multitenant migration)
INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'orphaned_profiles',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0 
         THEN 'No orphaned profiles found'
         ELSE 'Found profiles without company_id' END,
    COUNT(*)::INTEGER,
    'Profiles should have company_id after multitenant migration'
FROM public.profiles 
WHERE company_id IS NULL;

-- Check for objectives without valid owners
INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'orphaned_objectives',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0 
         THEN 'No orphaned objectives found'
         ELSE 'Found objectives with invalid owner_id' END,
    COUNT(*)::INTEGER,
    'All objectives should have valid owner references'
FROM public.objectives o
LEFT JOIN public.profiles p ON o.owner_id = p.id
WHERE p.id IS NULL;

-- Check for initiatives without valid objectives
INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'orphaned_initiatives',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0 
         THEN 'No orphaned initiatives found'
         ELSE 'Found initiatives with invalid objective_id' END,
    COUNT(*)::INTEGER,
    'All initiatives should have valid objective references'
FROM public.initiatives i
LEFT JOIN public.objectives o ON i.objective_id = o.id
WHERE o.id IS NULL;

-- Check for activities without valid initiatives
INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'orphaned_activities',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0 
         THEN 'No orphaned activities found'
         ELSE 'Found activities with invalid initiative_id' END,
    COUNT(*)::INTEGER,
    'All activities should have valid initiative references'
FROM public.activities a
LEFT JOIN public.initiatives i ON a.initiative_id = i.id
WHERE i.id IS NULL;

-- =============================================================================
-- COMPANY ISOLATION VALIDATION
-- =============================================================================

-- Check that all related records have matching company_id
INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'company_isolation_objectives',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0 
         THEN 'Company isolation maintained for objectives'
         ELSE 'Found objectives with mismatched company_id' END,
    COUNT(*)::INTEGER,
    'Objectives should have same company_id as their owners'
FROM public.objectives o
JOIN public.profiles p ON o.owner_id = p.id
WHERE o.company_id != p.company_id;

INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'company_isolation_initiatives',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0 
         THEN 'Company isolation maintained for initiatives'
         ELSE 'Found initiatives with mismatched company_id' END,
    COUNT(*)::INTEGER,
    'Initiatives should have same company_id as their objectives'
FROM public.initiatives i
JOIN public.objectives o ON i.objective_id = o.id
WHERE i.company_id != o.company_id;

INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'company_isolation_activities',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0 
         THEN 'Company isolation maintained for activities'
         ELSE 'Found activities with mismatched company_id' END,
    COUNT(*)::INTEGER,
    'Activities should have same company_id as their initiatives'
FROM public.activities a
JOIN public.initiatives i ON a.initiative_id = i.id
WHERE a.company_id != i.company_id;

-- =============================================================================
-- DATA CONSISTENCY VALIDATION
-- =============================================================================

-- Check for invalid progress values
INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'invalid_progress_objectives',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0 
         THEN 'All objective progress values valid'
         ELSE 'Found objectives with invalid progress values' END,
    COUNT(*)::INTEGER,
    'Progress should be between 0 and 100'
FROM public.objectives 
WHERE progress < 0 OR progress > 100;

INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'invalid_progress_initiatives',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0 
         THEN 'All initiative progress values valid'
         ELSE 'Found initiatives with invalid progress values' END,
    COUNT(*)::INTEGER,
    'Progress should be between 0 and 100'
FROM public.initiatives 
WHERE progress < 0 OR progress > 100;

INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'invalid_progress_activities',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0 
         THEN 'All activity progress values valid'
         ELSE 'Found activities with invalid progress values' END,
    COUNT(*)::INTEGER,
    'Progress should be between 0 and 100'
FROM public.activities 
WHERE progress < 0 OR progress > 100;

-- Check for invalid date ranges
INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'invalid_dates_objectives',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0 
         THEN 'All objective date ranges valid'
         ELSE 'Found objectives with end_date before start_date' END,
    COUNT(*)::INTEGER,
    'End date should be after start date'
FROM public.objectives 
WHERE end_date < start_date;

INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'invalid_dates_initiatives',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0 
         THEN 'All initiative date ranges valid'
         ELSE 'Found initiatives with end_date before start_date' END,
    COUNT(*)::INTEGER,
    'End date should be after start date'
FROM public.initiatives 
WHERE end_date < start_date;

INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'invalid_dates_activities',
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
    CASE WHEN COUNT(*) = 0 
         THEN 'All activity date ranges valid'
         ELSE 'Found activities with end_date before start_date' END,
    COUNT(*)::INTEGER,
    'End date should be after start date'
FROM public.activities 
WHERE end_date < start_date;

-- =============================================================================
-- RECORD COUNT VALIDATION
-- =============================================================================

-- Basic record counts for sanity check
INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'record_count_companies',
    'INFO',
    'Companies in database',
    COUNT(*)::INTEGER,
    'Total companies after migration'
FROM public.companies;

INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'record_count_profiles',
    'INFO',
    'Profiles in database',
    COUNT(*)::INTEGER,
    'Total user profiles after migration'
FROM public.profiles;

INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'record_count_objectives',
    'INFO',
    'Objectives in database',
    COUNT(*)::INTEGER,
    'Total objectives after migration'
FROM public.objectives;

INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'record_count_initiatives',
    'INFO',
    'Initiatives in database',
    COUNT(*)::INTEGER,
    'Total initiatives after migration'
FROM public.initiatives;

INSERT INTO data_validation_results (check_name, status, message, count_found, details)
SELECT 
    'record_count_activities',
    'INFO',
    'Activities in database',
    COUNT(*)::INTEGER,
    'Total activities after migration'
FROM public.activities;

-- =============================================================================
-- RESULTS SUMMARY
-- =============================================================================

-- Display validation results
SELECT 
    '=== DATA VALIDATION RESULTS ===' AS summary;

SELECT 
    check_name,
    status,
    message,
    count_found,
    details
FROM data_validation_results
ORDER BY 
    CASE status WHEN 'FAIL' THEN 1 WHEN 'PASS' THEN 2 ELSE 3 END,
    check_name;

-- Summary counts
SELECT 
    '=== DATA VALIDATION SUMMARY ===' AS summary;

SELECT 
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM data_validation_results
WHERE status IN ('PASS', 'FAIL')
GROUP BY status
ORDER BY status;

-- Overall result
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM data_validation_results WHERE status = 'FAIL') 
        THEN 'DATA VALIDATION FAILED - Review failed checks above'
        ELSE 'DATA VALIDATION PASSED - Data integrity confirmed'
    END AS overall_result;