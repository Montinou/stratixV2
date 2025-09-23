-- Sample Data Seeding for StratixV2
-- Migration: 004_seed_sample_data
-- Created: 2025-09-23
-- Description: Insert sample data for testing and demonstration
-- Dependencies: 003_add_ai_suggestions

-- Note: This script creates sample data for testing purposes
-- In production, users will be created through authentication flows

-- =============================================================================
-- SAMPLE COMPANIES
-- =============================================================================

-- Insert sample company
INSERT INTO public.companies (id, name, slug, settings) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Demo Company', 'demo-company', '{"theme": "default", "features": ["ai_suggestions", "analytics"]}')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SAMPLE PROFILES
-- =============================================================================

-- Insert sample users (these will be created after actual user signup)
-- This is just for reference of the data structure
INSERT INTO public.profiles (id, email, full_name, role, department, company_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ceo@company.com', 'CEO Corporativo', 'corporativo', 'Dirección', 'c0000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002', 'manager.sales@company.com', 'Gerente de Ventas', 'gerente', 'Ventas', 'c0000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', 'manager.tech@company.com', 'Gerente de Tecnología', 'gerente', 'Tecnología', 'c0000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000004', 'employee1@company.com', 'Empleado Ventas 1', 'empleado', 'Ventas', 'c0000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000005', 'employee2@company.com', 'Empleado Tech 1', 'empleado', 'Tecnología', 'c0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Update manager relationships
UPDATE public.profiles SET manager_id = '00000000-0000-0000-0000-000000000002' 
WHERE id = '00000000-0000-0000-0000-000000000004';

UPDATE public.profiles SET manager_id = '00000000-0000-0000-0000-000000000003' 
WHERE id = '00000000-0000-0000-0000-000000000005';

-- =============================================================================
-- SAMPLE OBJECTIVES
-- =============================================================================

-- Sample objectives
INSERT INTO public.objectives (id, title, description, owner_id, department, status, progress, start_date, end_date, company_id) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Aumentar ventas en 25%', 'Incrementar las ventas totales de la empresa en un 25% durante el año fiscal', '00000000-0000-0000-0000-000000000002', 'Ventas', 'en_progreso', 60, '2024-01-01', '2024-12-31', 'c0000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'Mejorar plataforma tecnológica', 'Modernizar la infraestructura tecnológica y mejorar la experiencia del usuario', '00000000-0000-0000-0000-000000000003', 'Tecnología', 'en_progreso', 40, '2024-01-01', '2024-12-31', 'c0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SAMPLE INITIATIVES
-- =============================================================================

-- Sample initiatives
INSERT INTO public.initiatives (id, title, description, objective_id, owner_id, status, progress, start_date, end_date, company_id) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Campaña de marketing digital', 'Implementar estrategia de marketing digital para atraer nuevos clientes', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'en_progreso', 70, '2024-01-15', '2024-06-30', 'c0000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'Optimización de procesos de venta', 'Mejorar el proceso de ventas para aumentar la conversión', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'en_progreso', 50, '2024-02-01', '2024-08-31', 'c0000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', 'Migración a la nube', 'Migrar servicios críticos a infraestructura en la nube', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'en_progreso', 30, '2024-01-01', '2024-09-30', 'c0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SAMPLE ACTIVITIES
-- =============================================================================

-- Sample activities
INSERT INTO public.activities (id, title, description, initiative_id, owner_id, status, progress, start_date, end_date, company_id) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Crear contenido para redes sociales', 'Desarrollar contenido atractivo para Facebook, Instagram y LinkedIn', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'completado', 100, '2024-01-15', '2024-03-15', 'c0000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', 'Configurar Google Ads', 'Configurar y optimizar campañas de Google Ads', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'en_progreso', 80, '2024-02-01', '2024-04-30', 'c0000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000003', 'Análisis de servidores actuales', 'Evaluar la infraestructura actual y planificar la migración', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', 'completado', 100, '2024-01-01', '2024-02-28', 'c0000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000004', 'Configurar AWS', 'Configurar servicios de AWS para la migración', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', 'en_progreso', 60, '2024-03-01', '2024-06-30', 'c0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SAMPLE AI SUGGESTIONS
-- =============================================================================

-- Sample AI suggestions for analytics
INSERT INTO public.ai_suggestions (user_id, objective_title, objective_description, department, suggestion_type, suggestion_text, was_used) VALUES
  ('00000000-0000-0000-0000-000000000004', 'Aumentar ventas en 25%', 'Incrementar las ventas totales', 'Ventas', 'initiative', 'Implementar programa de referidos para clientes existentes', true),
  ('00000000-0000-0000-0000-000000000004', 'Aumentar ventas en 25%', 'Incrementar las ventas totales', 'Ventas', 'activity', 'Crear landing pages específicas para diferentes segmentos', false),
  ('00000000-0000-0000-0000-000000000005', 'Mejorar plataforma tecnológica', 'Modernizar infraestructura', 'Tecnología', 'initiative', 'Implementar monitoreo automatizado de sistemas', true),
  ('00000000-0000-0000-0000-000000000005', 'Mejorar plataforma tecnológica', 'Modernizar infraestructura', 'Tecnología', 'metric', 'Medir tiempo de respuesta de APIs críticas', false);

-- =============================================================================
-- COMPLETION
-- =============================================================================

-- Sample data seeding completed successfully
SELECT 'Sample data seeding completed successfully' AS result;