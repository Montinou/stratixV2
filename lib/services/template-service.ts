import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export type TemplateType = 'objectives' | 'initiatives' | 'activities' | 'users';
export type TemplateFormat = 'csv' | 'xlsx';

interface TemplateField {
  key: string;
  header: string;
  required: boolean;
  example: string;
  description?: string;
  validation?: string;
}

interface TemplateConfig {
  type: TemplateType;
  fields: TemplateField[];
  exampleRows: Record<string, any>[];
}

export class TemplateService {
  /**
   * Template configurations for each import type
   */
  private static templates: Record<TemplateType, TemplateConfig> = {
    objectives: {
      type: 'objectives',
      fields: [
        { key: 'titulo', header: 'Título', required: true, example: 'Aumentar Ventas Q1', description: 'Nombre del objetivo' },
        { key: 'descripcion', header: 'Descripción', required: false, example: 'Incrementar las ventas en un 20% durante el primer trimestre', description: 'Descripción detallada' },
        { key: 'área', header: 'Área', required: false, example: 'Ventas', description: 'Área responsable' },
        { key: 'fecha_inicio', header: 'Fecha Inicio', required: true, example: '01/01/2024', description: 'DD/MM/AAAA', validation: 'fecha' },
        { key: 'fecha_fin', header: 'Fecha Fin', required: true, example: '31/03/2024', description: 'DD/MM/AAAA', validation: 'fecha' },
        { key: 'responsable_email', header: 'Email Responsable', required: false, example: 'gerente.ventas@empresa.com', description: 'Email del responsable', validation: 'email' },
        { key: 'estado', header: 'Estado', required: false, example: 'no_iniciado', description: 'no_iniciado, en_progreso, completo', validation: 'estado' },
        { key: 'progreso', header: 'Progreso (%)', required: false, example: '0', description: '0-100', validation: 'porcentaje' },
      ],
      exampleRows: [
        {
          titulo: 'Expandir mercado internacional',
          descripcion: 'Establecer presencia en 3 nuevos países durante 2024',
          área: 'Expansión',
          fecha_inicio: '01/01/2024',
          fecha_fin: '31/12/2024',
          responsable_email: 'director.expansion@empresa.com',
          estado: 'en_progreso',
          progreso: '25',
        },
        {
          titulo: 'Mejorar satisfacción del cliente',
          descripcion: 'Alcanzar un NPS de 70 puntos',
          área: 'Servicio al Cliente',
          fecha_inicio: '01/02/2024',
          fecha_fin: '30/06/2024',
          responsable_email: 'gerente.servicio@empresa.com',
          estado: 'no_iniciado',
          progreso: '0',
        },
        {
          titulo: 'Optimizar procesos operativos',
          descripcion: 'Reducir tiempos de producción en un 15%',
          área: 'Operaciones',
          fecha_inicio: '15/01/2024',
          fecha_fin: '15/07/2024',
          responsable_email: 'jefe.operaciones@empresa.com',
          estado: 'en_progreso',
          progreso: '40',
        },
      ],
    },
    initiatives: {
      type: 'initiatives',
      fields: [
        { key: 'titulo', header: 'Título', required: true, example: 'Campaña de Marketing Digital', description: 'Nombre de la iniciativa' },
        { key: 'descripcion', header: 'Descripción', required: false, example: 'Implementar estrategia digital multicanal', description: 'Descripción detallada' },
        { key: 'objetivo_titulo', header: 'Título del Objetivo', required: false, example: 'Aumentar Ventas Q1', description: 'Título del objetivo padre' },
        { key: 'objetivo_id', header: 'ID del Objetivo', required: false, example: '', description: 'ID del objetivo (opcional si se usa título)' },
        { key: 'presupuesto', header: 'Presupuesto', required: false, example: '50000', description: 'Monto sin símbolos', validation: 'numero' },
        { key: 'fecha_inicio', header: 'Fecha Inicio', required: true, example: '15/01/2024', description: 'DD/MM/AAAA', validation: 'fecha' },
        { key: 'fecha_fin', header: 'Fecha Fin', required: true, example: '15/03/2024', description: 'DD/MM/AAAA', validation: 'fecha' },
        { key: 'responsable_email', header: 'Email Responsable', required: false, example: 'jefe.marketing@empresa.com', description: 'Email del responsable', validation: 'email' },
        { key: 'estado', header: 'Estado', required: false, example: 'en_progreso', description: 'no_iniciado, en_progreso, completo', validation: 'estado' },
        { key: 'progreso', header: 'Progreso (%)', required: false, example: '30', description: '0-100', validation: 'porcentaje' },
      ],
      exampleRows: [
        {
          titulo: 'Rediseño de sitio web corporativo',
          descripcion: 'Modernizar la presencia digital de la empresa',
          objetivo_titulo: 'Mejorar satisfacción del cliente',
          objetivo_id: '',
          presupuesto: '75000',
          fecha_inicio: '01/02/2024',
          fecha_fin: '30/04/2024',
          responsable_email: 'lider.digital@empresa.com',
          estado: 'en_progreso',
          progreso: '45',
        },
        {
          titulo: 'Programa de capacitación en ventas',
          descripcion: 'Entrenar al equipo en técnicas consultivas',
          objetivo_titulo: 'Expandir mercado internacional',
          objetivo_id: '',
          presupuesto: '30000',
          fecha_inicio: '15/01/2024',
          fecha_fin: '15/02/2024',
          responsable_email: 'coordinador.capacitacion@empresa.com',
          estado: 'completo',
          progreso: '100',
        },
        {
          titulo: 'Implementación de CRM',
          descripcion: 'Desplegar nuevo sistema de gestión de clientes',
          objetivo_titulo: 'Mejorar satisfacción del cliente',
          objetivo_id: '',
          presupuesto: '120000',
          fecha_inicio: '01/03/2024',
          fecha_fin: '30/06/2024',
          responsable_email: 'gerente.ti@empresa.com',
          estado: 'no_iniciado',
          progreso: '0',
        },
      ],
    },
    activities: {
      type: 'activities',
      fields: [
        { key: 'titulo', header: 'Título', required: true, example: 'Configurar Google Ads', description: 'Nombre de la actividad' },
        { key: 'descripcion', header: 'Descripción', required: false, example: 'Crear y optimizar campañas de búsqueda', description: 'Descripción detallada' },
        { key: 'iniciativa_titulo', header: 'Título de la Iniciativa', required: false, example: 'Campaña de Marketing Digital', description: 'Título de la iniciativa padre' },
        { key: 'iniciativa_id', header: 'ID de la Iniciativa', required: false, example: '', description: 'ID de la iniciativa (opcional si se usa título)' },
        { key: 'fecha_inicio', header: 'Fecha Inicio', required: true, example: '20/01/2024', description: 'DD/MM/AAAA', validation: 'fecha' },
        { key: 'fecha_fin', header: 'Fecha Fin', required: true, example: '25/01/2024', description: 'DD/MM/AAAA', validation: 'fecha' },
        { key: 'responsable_email', header: 'Email Responsable', required: false, example: 'especialista.sem@empresa.com', description: 'Email del responsable', validation: 'email' },
        { key: 'estado', header: 'Estado', required: false, example: 'en_progreso', description: 'no_iniciado, en_progreso, completo', validation: 'estado' },
        { key: 'progreso', header: 'Progreso (%)', required: false, example: '50', description: '0-100', validation: 'porcentaje' },
      ],
      exampleRows: [
        {
          titulo: 'Análisis de competencia',
          descripcion: 'Investigar estrategias de los 5 principales competidores',
          iniciativa_titulo: 'Rediseño de sitio web corporativo',
          iniciativa_id: '',
          fecha_inicio: '05/02/2024',
          fecha_fin: '10/02/2024',
          responsable_email: 'analista.marketing@empresa.com',
          estado: 'completo',
          progreso: '100',
        },
        {
          titulo: 'Crear wireframes del sitio',
          descripcion: 'Diseñar estructura y flujo de navegación',
          iniciativa_titulo: 'Rediseño de sitio web corporativo',
          iniciativa_id: '',
          fecha_inicio: '11/02/2024',
          fecha_fin: '20/02/2024',
          responsable_email: 'disenador.ux@empresa.com',
          estado: 'en_progreso',
          progreso: '70',
        },
        {
          titulo: 'Configurar analytics',
          descripcion: 'Implementar Google Analytics 4 y Tag Manager',
          iniciativa_titulo: 'Rediseño de sitio web corporativo',
          iniciativa_id: '',
          fecha_inicio: '21/02/2024',
          fecha_fin: '23/02/2024',
          responsable_email: 'especialista.analytics@empresa.com',
          estado: 'no_iniciado',
          progreso: '0',
        },
        {
          titulo: 'Preparar materiales de capacitación',
          descripcion: 'Desarrollar presentaciones y ejercicios prácticos',
          iniciativa_titulo: 'Programa de capacitación en ventas',
          iniciativa_id: '',
          fecha_inicio: '15/01/2024',
          fecha_fin: '25/01/2024',
          responsable_email: 'instructor.ventas@empresa.com',
          estado: 'completo',
          progreso: '100',
        },
        {
          titulo: 'Evaluar proveedores de CRM',
          descripcion: 'Comparar opciones de Salesforce, HubSpot y Pipedrive',
          iniciativa_titulo: 'Implementación de CRM',
          iniciativa_id: '',
          fecha_inicio: '01/03/2024',
          fecha_fin: '15/03/2024',
          responsable_email: 'analista.sistemas@empresa.com',
          estado: 'no_iniciado',
          progreso: '0',
        },
      ],
    },
    users: {
      type: 'users',
      fields: [
        { key: 'nombre_completo', header: 'Nombre Completo', required: true, example: 'María García López', description: 'Nombre y apellidos' },
        { key: 'email', header: 'Email', required: true, example: 'maria.garcia@empresa.com', description: 'Email corporativo', validation: 'email' },
        { key: 'área', header: 'Área', required: false, example: 'Ventas', description: 'Área organizacional' },
        { key: 'rol', header: 'Rol', required: true, example: 'gerente', description: 'corporativo, gerente, empleado', validation: 'rol' },
        { key: 'manager_email', header: 'Email del Manager', required: false, example: 'director.ventas@empresa.com', description: 'Email del supervisor directo', validation: 'email' },
      ],
      exampleRows: [
        {
          nombre_completo: 'Carlos Rodríguez Martín',
          email: 'carlos.rodriguez@empresa.com',
          área: 'Dirección General',
          rol: 'corporativo',
          manager_email: '',
        },
        {
          nombre_completo: 'Ana Fernández Ruiz',
          email: 'ana.fernandez@empresa.com',
          área: 'Ventas',
          rol: 'gerente',
          manager_email: 'carlos.rodriguez@empresa.com',
        },
        {
          nombre_completo: 'Luis Sánchez Pérez',
          email: 'luis.sanchez@empresa.com',
          área: 'Marketing',
          rol: 'gerente',
          manager_email: 'carlos.rodriguez@empresa.com',
        },
        {
          nombre_completo: 'Patricia Jiménez Torres',
          email: 'patricia.jimenez@empresa.com',
          área: 'Ventas',
          rol: 'empleado',
          manager_email: 'ana.fernandez@empresa.com',
        },
        {
          nombre_completo: 'Roberto Díaz García',
          email: 'roberto.diaz@empresa.com',
          área: 'Marketing',
          rol: 'empleado',
          manager_email: 'luis.sanchez@empresa.com',
        },
      ],
    },
  };

  /**
   * Generate a template in the specified format
   */
  static generateTemplate(type: TemplateType, format: TemplateFormat): Buffer | string {
    const template = this.templates[type];

    if (!template) {
      throw new Error(`Template type '${type}' not found`);
    }

    if (format === 'csv') {
      return this.generateCSV(template);
    } else if (format === 'xlsx') {
      return this.generateXLSX(template);
    } else {
      throw new Error(`Format '${format}' not supported`);
    }
  }

  /**
   * Generate CSV template
   */
  private static generateCSV(template: TemplateConfig): string {
    const headers = template.fields.map(field => field.header);
    const rows = template.exampleRows.map(row =>
      template.fields.map(field => row[field.key] || '')
    );

    const csvData = [headers, ...rows];

    return Papa.unparse(csvData, {
      delimiter: ',',
      header: false,
      newline: '\r\n',
    });
  }

  /**
   * Generate XLSX template
   */
  private static generateXLSX(template: TemplateConfig): Buffer {
    const workbook = XLSX.utils.book_new();

    // Create data sheet
    const headers = template.fields.map(field => field.header);
    const rows = template.exampleRows.map(row =>
      template.fields.map(field => row[field.key] || '')
    );

    const sheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Add column widths
    const colWidths = template.fields.map(field => ({
      wch: Math.max(field.header.length, field.example.length, 15)
    }));
    worksheet['!cols'] = colWidths;

    // Apply header styling (if supported by the XLSX library version)
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;

      // Add cell formatting hints (note: styling may be limited in xlsx library)
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "CCCCCC" } },
        alignment: { horizontal: "center" }
      };
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');

    // Create instructions sheet
    const instructionsData = [
      ['Instrucciones de Uso'],
      [''],
      ['1. Complete los datos en la hoja "Datos"'],
      ['2. No modifique los nombres de las columnas'],
      ['3. Respete el formato de fechas: DD/MM/AAAA'],
      ['4. Los estados válidos son: no_iniciado, en_progreso, completo'],
      ['5. El progreso debe ser un número entre 0 y 100'],
      [''],
      ['Campos Requeridos:'],
      ...template.fields
        .filter(field => field.required)
        .map(field => [`- ${field.header}: ${field.description || ''}`]),
      [''],
      ['Campos Opcionales:'],
      ...template.fields
        .filter(field => !field.required)
        .map(field => [`- ${field.header}: ${field.description || ''}`]),
      [''],
      ['Validaciones:'],
      ...template.fields
        .filter(field => field.validation)
        .map(field => [`- ${field.header}: ${this.getValidationDescription(field.validation!)}`]),
    ];

    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [{ wch: 80 }];

    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

    // Generate buffer
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      bookSST: false,
    });

    return Buffer.from(buffer);
  }

  /**
   * Get validation description
   */
  private static getValidationDescription(validation: string): string {
    const descriptions: Record<string, string> = {
      fecha: 'Formato DD/MM/AAAA (ejemplo: 31/12/2024)',
      email: 'Email válido (ejemplo: usuario@empresa.com)',
      estado: 'Valores: no_iniciado, en_progreso, completo',
      porcentaje: 'Número entre 0 y 100',
      numero: 'Solo números, sin símbolos de moneda',
      rol: 'Valores: corporativo, gerente, empleado',
    };

    return descriptions[validation] || validation;
  }

  /**
   * Get template metadata
   */
  static getTemplateMetadata(type: TemplateType) {
    const template = this.templates[type];

    if (!template) {
      throw new Error(`Template type '${type}' not found`);
    }

    return {
      type: template.type,
      requiredFields: template.fields.filter(f => f.required).map(f => f.header),
      optionalFields: template.fields.filter(f => !f.required).map(f => f.header),
      totalFields: template.fields.length,
      exampleRowsCount: template.exampleRows.length,
    };
  }

  /**
   * Validate if data matches template structure
   */
  static validateDataStructure(type: TemplateType, data: any[]): {
    valid: boolean;
    errors: string[];
  } {
    const template = this.templates[type];

    if (!template) {
      return { valid: false, errors: [`Template type '${type}' not found`] };
    }

    const errors: string[] = [];
    const requiredFields = template.fields.filter(f => f.required);

    // Check if data is empty
    if (!data || data.length === 0) {
      errors.push('No data provided');
      return { valid: false, errors };
    }

    // Check first row for required headers
    const firstRow = data[0];
    const headers = Object.keys(firstRow);

    for (const field of requiredFields) {
      if (!headers.includes(field.key)) {
        errors.push(`Missing required field: ${field.header} (${field.key})`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}