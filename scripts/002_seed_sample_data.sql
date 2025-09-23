-- Insert sample users (these will be created after actual user signup)
-- This is just for reference of the data structure

-- Sample departments
INSERT INTO public.profiles (id, email, full_name, role, department) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ceo@company.com', 'CEO Corporativo', 'corporativo', 'Dirección'),
  ('00000000-0000-0000-0000-000000000002', 'manager.sales@company.com', 'Gerente de Ventas', 'gerente', 'Ventas'),
  ('00000000-0000-0000-0000-000000000003', 'manager.tech@company.com', 'Gerente de Tecnología', 'gerente', 'Tecnología'),
  ('00000000-0000-0000-0000-000000000004', 'employee1@company.com', 'Empleado Ventas 1', 'empleado', 'Ventas'),
  ('00000000-0000-0000-0000-000000000005', 'employee2@company.com', 'Empleado Tech 1', 'empleado', 'Tecnología')
ON CONFLICT (id) DO NOTHING;

-- Update manager relationships
UPDATE public.profiles SET manager_id = '00000000-0000-0000-0000-000000000002' 
WHERE id = '00000000-0000-0000-0000-000000000004';

UPDATE public.profiles SET manager_id = '00000000-0000-0000-0000-000000000003' 
WHERE id = '00000000-0000-0000-0000-000000000005';

-- Sample objectives
INSERT INTO public.objectives (id, title, description, owner_id, department, status, progress, start_date, end_date) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Aumentar ventas en 25%', 'Incrementar las ventas totales de la empresa en un 25% durante el año fiscal', '00000000-0000-0000-0000-000000000002', 'Ventas', 'en_progreso', 60, '2024-01-01', '2024-12-31'),
  ('10000000-0000-0000-0000-000000000002', 'Mejorar plataforma tecnológica', 'Modernizar la infraestructura tecnológica y mejorar la experiencia del usuario', '00000000-0000-0000-0000-000000000003', 'Tecnología', 'en_progreso', 40, '2024-01-01', '2024-12-31')
ON CONFLICT (id) DO NOTHING;

-- Sample initiatives
INSERT INTO public.initiatives (id, title, description, objective_id, owner_id, status, progress, start_date, end_date) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Campaña de marketing digital', 'Implementar estrategia de marketing digital para atraer nuevos clientes', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'en_progreso', 70, '2024-01-15', '2024-06-30'),
  ('20000000-0000-0000-0000-000000000002', 'Optimización de procesos de venta', 'Mejorar el proceso de ventas para aumentar la conversión', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'en_progreso', 50, '2024-02-01', '2024-08-31'),
  ('20000000-0000-0000-0000-000000000003', 'Migración a la nube', 'Migrar servicios críticos a infraestructura en la nube', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'en_progreso', 30, '2024-01-01', '2024-09-30')
ON CONFLICT (id) DO NOTHING;

-- Sample activities
INSERT INTO public.activities (id, title, description, initiative_id, owner_id, status, progress, start_date, end_date) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Crear contenido para redes sociales', 'Desarrollar contenido atractivo para Facebook, Instagram y LinkedIn', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'completado', 100, '2024-01-15', '2024-03-15'),
  ('30000000-0000-0000-0000-000000000002', 'Configurar Google Ads', 'Configurar y optimizar campañas de Google Ads', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'en_progreso', 80, '2024-02-01', '2024-04-30'),
  ('30000000-0000-0000-0000-000000000003', 'Análisis de servidores actuales', 'Evaluar la infraestructura actual y planificar la migración', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', 'completado', 100, '2024-01-01', '2024-02-28'),
  ('30000000-0000-0000-0000-000000000004', 'Configurar AWS', 'Configurar servicios de AWS para la migración', '20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000005', 'en_progreso', 60, '2024-03-01', '2024-06-30')
ON CONFLICT (id) DO NOTHING;
