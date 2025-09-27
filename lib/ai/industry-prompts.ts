/**
 * Advanced Industry-Specific Prompt Templates for OKR Generation Engine
 * Provides comprehensive, context-aware prompts for 15+ industries with specialized knowledge
 */

import type { Industry, CompanySize, UserRole, OKRTemplateContext } from '@/lib/types/ai'

// Extended industry taxonomy with specialized categories
export type ExtendedIndustry = Industry
  | 'fintech'
  | 'healthtech'
  | 'edtech'
  | 'proptech'
  | 'logistics'
  | 'automotive'
  | 'aerospace'
  | 'energy'
  | 'telecommunications'
  | 'media'
  | 'hospitality'
  | 'agriculture'
  | 'nonprofit'
  | 'government'
  | 'legal'

// Role-specific responsibilities by industry
export interface RoleResponsibilities {
  corporativo: string[]
  gerente: string[]
  empleado: string[]
}

// Industry-specific metrics taxonomy
export interface IndustryMetrics {
  financial: string[]
  operational: string[]
  customer: string[]
  innovation: string[]
  compliance: string[]
}

// Advanced industry data structure
export interface AdvancedIndustryData {
  name: string
  description: string
  focusAreas: string[]
  keyMetrics: IndustryMetrics
  commonObjectives: string[]
  roleResponsibilities: RoleResponsibilities
  industrySpecificTerms: string[]
  regulations: string[]
  marketTrends: string[]
  competitiveFactors: string[]
  stakeholders: string[]
  riskFactors: string[]
  successFactors: string[]
  benchmarkKPIs: string[]
}

// Comprehensive industry knowledge base
export const ADVANCED_INDUSTRY_DATA: Record<ExtendedIndustry, AdvancedIndustryData> = {
  technology: {
    name: 'Tecnología',
    description: 'Empresas de desarrollo de software, hardware, infraestructura digital y servicios tecnológicos',
    focusAreas: [
      'Innovación y desarrollo de productos',
      'Escalabilidad técnica y arquitectura',
      'Experiencia del usuario y diseño',
      'Seguridad y privacidad de datos',
      'Automatización y eficiencia de procesos',
      'Integración de AI/ML',
      'DevOps y CI/CD',
      'Performance y disponibilidad'
    ],
    keyMetrics: {
      financial: ['ARR', 'MRR', 'CAC', 'LTV', 'Churn Rate', 'ARPU', 'Gross Margin'],
      operational: ['Deployment Frequency', 'Lead Time', 'MTTR', 'Change Failure Rate', 'Code Coverage', 'Technical Debt'],
      customer: ['NPS', 'DAU/MAU', 'Feature Adoption', 'Support Tickets', 'User Retention', 'CSAT'],
      innovation: ['R&D Investment %', 'Patent Applications', 'Time to Market', 'Feature Velocity', 'Experimentation Rate'],
      compliance: ['Security Incidents', 'Data Breach Response Time', 'Compliance Audit Score', 'Privacy Policy Updates']
    },
    commonObjectives: [
      'Acelerar el time-to-market de nuevos productos',
      'Mejorar la arquitectura y escalabilidad del sistema',
      'Incrementar la adopción y engagement de usuarios',
      'Fortalecer la seguridad y compliance de datos',
      'Optimizar procesos de desarrollo y deployment',
      'Expandir capacidades de AI/ML',
      'Mejorar performance y disponibilidad de sistemas'
    ],
    roleResponsibilities: {
      corporativo: [
        'Definir estrategia tecnológica y roadmap de productos',
        'Supervisar inversiones en I+D e innovación',
        'Gestionar partnerships estratégicos y acquisiciones',
        'Establecer estándares de seguridad y compliance',
        'Liderar transformación digital organizacional'
      ],
      gerente: [
        'Coordinar equipos de desarrollo y operaciones',
        'Implementar metodologías ágiles y DevOps',
        'Gestionar roadmap de productos y features',
        'Optimizar procesos de quality assurance',
        'Supervisar arquitectura técnica y debt management'
      ],
      empleado: [
        'Desarrollar código de alta calidad y escalable',
        'Implementar tests automatizados y documentación',
        'Participar en code reviews y pair programming',
        'Resolver bugs y optimizar performance',
        'Contribuir a mejores prácticas de desarrollo'
      ]
    },
    industrySpecificTerms: [
      'CI/CD', 'DevOps', 'Microservicios', 'API REST', 'GraphQL', 'Kubernetes',
      'Machine Learning', 'Cloud Native', 'Serverless', 'Edge Computing',
      'Technical Debt', 'Code Coverage', 'A/B Testing', 'Feature Flags'
    ],
    regulations: ['GDPR', 'CCPA', 'SOC 2', 'ISO 27001', 'PCI DSS', 'HIPAA (para HealthTech)'],
    marketTrends: [
      'Adopción de AI/ML en productos',
      'Migración a cloud-first architecture',
      'Focus en Developer Experience (DX)',
      'Implementación de edge computing',
      'Énfasis en sustainability y green tech'
    ],
    competitiveFactors: [
      'Velocidad de innovación y time-to-market',
      'Escalabilidad y performance de la plataforma',
      'Calidad de la experiencia del usuario',
      'Seguridad y trustworthiness de los datos',
      'Ecosystem de integraciones y APIs'
    ],
    stakeholders: ['Usuarios finales', 'Desarrolladores', 'Partners tecnológicos', 'Reguladores', 'Inversionistas'],
    riskFactors: [
      'Vulnerabilidades de seguridad',
      'Obsolescencia tecnológica',
      'Dependencias de third-party vendors',
      'Talent acquisition y retention',
      'Cambios regulatorios en privacidad'
    ],
    successFactors: [
      'Cultura de innovación continua',
      'Procesos ágiles y eficientes',
      'Arquitectura escalable y maintainable',
      'Strong engineering culture',
      'Data-driven decision making'
    ],
    benchmarkKPIs: [
      'Deployment frequency: Daily+',
      'Lead time: < 1 day',
      'MTTR: < 1 hour',
      'Change failure rate: < 15%',
      'Code coverage: > 80%'
    ]
  },

  fintech: {
    name: 'Fintech',
    description: 'Tecnología financiera, startups de servicios financieros digitales y innovación en banca',
    focusAreas: [
      'Seguridad financiera y fraud prevention',
      'Cumplimiento regulatorio y compliance',
      'UX/UI para productos financieros',
      'Integración con APIs bancarias',
      'Risk management y scoring crediticio',
      'Blockchain y pagos digitales',
      'Open banking y PSD2',
      'Financial data analytics'
    ],
    keyMetrics: {
      financial: ['Transaction Volume', 'Revenue per User', 'Processing Fees', 'Default Rate', 'Cost per Transaction'],
      operational: ['Transaction Processing Time', 'API Response Time', 'KYC Processing Time', 'Reconciliation Accuracy'],
      customer: ['Customer Acquisition Cost', 'Customer Lifetime Value', 'Transaction Frequency', 'App Rating'],
      innovation: ['New Product Launches', 'API Integration Speed', 'Regulatory Approval Time'],
      compliance: ['Regulatory Compliance Score', 'AML Detection Rate', 'Fraud Prevention Rate', 'Audit Findings']
    },
    commonObjectives: [
      'Mejorar la detección y prevención de fraudes',
      'Acelerar procesos de KYC y onboarding',
      'Incrementar volumen de transacciones',
      'Fortalecer compliance regulatorio',
      'Optimizar costos de procesamiento',
      'Expandir integraciones bancarias',
      'Mejorar scoring crediticio con AI'
    ],
    roleResponsibilities: {
      corporativo: [
        'Definir estrategia de productos financieros',
        'Gestionar relaciones regulatorias',
        'Supervisar risk management framework',
        'Liderar partnerships con bancos',
        'Establecer políticas de compliance'
      ],
      gerente: [
        'Implementar controles de fraud detection',
        'Gestionar procesos de KYC/AML',
        'Coordinar auditorías regulatorias',
        'Optimizar flujos de procesamiento',
        'Supervisar risk assessment procedures'
      ],
      empleado: [
        'Desarrollar algoritmos de fraud detection',
        'Implementar integraciones bancarias',
        'Mantener compliance en código',
        'Optimizar transaction processing',
        'Documentar procedures regulatorios'
      ]
    },
    industrySpecificTerms: [
      'KYC', 'AML', 'PCI DSS', 'Open Banking', 'PSD2', 'Blockchain',
      'Smart Contracts', 'Digital Wallet', 'Payment Gateway', 'Regulatory Sandbox',
      'Credit Scoring', 'Risk Assessment', 'Financial APIs'
    ],
    regulations: ['PCI DSS', 'PSD2', 'GDPR', 'AML/CTF', 'MiFID II', 'Basel III', 'SOX'],
    marketTrends: [
      'Adopción de Open Banking',
      'Integración de AI en risk scoring',
      'Crecimiento de digital wallets',
      'Regulatory sandboxes para innovación',
      'Focus en financial inclusion'
    ],
    competitiveFactors: [
      'Velocidad de procesamiento de transacciones',
      'Robustez de fraud detection',
      'Compliance regulatorio impecable',
      'UX superior en productos financieros',
      'Ecosystem de partners bancarios'
    ],
    stakeholders: ['Reguladores financieros', 'Bancos partners', 'Usuarios finales', 'Merchants', 'Auditores'],
    riskFactors: [
      'Cambios en regulaciones financieras',
      'Ataques de fraud y cybersecurity',
      'Dependencia de banking APIs',
      'Reputational risk por incidents',
      'Market volatility affecting operations'
    ],
    successFactors: [
      'Robust compliance framework',
      'Advanced fraud detection capabilities',
      'Strong regulatory relationships',
      'Seamless user experience',
      'Reliable technical infrastructure'
    ],
    benchmarkKPIs: [
      'Fraud detection rate: > 99.5%',
      'Transaction processing time: < 3 seconds',
      'KYC completion time: < 10 minutes',
      'Regulatory compliance score: 100%',
      'System uptime: > 99.9%'
    ]
  },

  finance: {
    name: 'Finanzas Tradicionales',
    description: 'Bancos, instituciones financieras, seguros y servicios financieros tradicionales',
    focusAreas: [
      'Gestión de riesgos financieros',
      'Optimización de capital y liquidez',
      'Cumplimiento regulatorio estricto',
      'Transformación digital de servicios',
      'Customer relationship management',
      'Operational efficiency y automatización',
      'Cybersecurity y data protection',
      'Sustainable finance initiatives'
    ],
    keyMetrics: {
      financial: ['ROE', 'ROA', 'NIM', 'Cost-to-Income Ratio', 'Loan Loss Provisions', 'Capital Adequacy Ratio'],
      operational: ['Processing Time', 'STP Rate', 'Error Rate', 'Branch Productivity', 'Digital Adoption Rate'],
      customer: ['Customer Satisfaction', 'NPS', 'Cross-sell Ratio', 'Customer Retention', 'AUM Growth'],
      innovation: ['Digital Channel Usage', 'New Product Launches', 'Process Automation Rate'],
      compliance: ['Regulatory Compliance Score', 'Audit Findings', 'Risk Appetite Adherence', 'Stress Test Results']
    },
    commonObjectives: [
      'Mejorar ratios de capital y liquidez',
      'Digitalizar procesos operacionales',
      'Reducir costos operacionales',
      'Fortalecer gestión de riesgos',
      'Incrementar customer lifetime value',
      'Acelerar transformación digital',
      'Optimizar portfolio de inversiones'
    ],
    roleResponsibilities: {
      corporativo: [
        'Definir estrategia de risk appetite',
        'Gestionar relaciones regulatorias',
        'Supervisar capital allocation',
        'Liderar digital transformation',
        'Establecer governance frameworks'
      ],
      gerente: [
        'Implementar risk management procedures',
        'Gestionar compliance requirements',
        'Coordinar operational efficiency initiatives',
        'Supervisar customer relationship strategies',
        'Optimizar branch and digital operations'
      ],
      empleado: [
        'Ejecutar daily risk monitoring',
        'Procesar transactions y documentación',
        'Mantener customer relationships',
        'Implementar compliance procedures',
        'Participar en process improvement'
      ]
    },
    industrySpecificTerms: [
      'Basel III', 'CCAR', 'Stress Testing', 'Liquidity Coverage Ratio',
      'Tier 1 Capital', 'Value at Risk', 'Credit Risk', 'Market Risk',
      'Operational Risk', 'Anti-Money Laundering', 'Know Your Customer'
    ],
    regulations: ['Basel III', 'Dodd-Frank', 'MiFID II', 'IFRS 9', 'CCAR', 'AML/BSA', 'GDPR'],
    marketTrends: [
      'Open banking adoption',
      'ESG integration in finance',
      'Digital-first customer experience',
      'AI/ML for risk management',
      'Regulatory technology (RegTech)'
    ],
    competitiveFactors: [
      'Cost efficiency ratios',
      'Digital capabilities and UX',
      'Risk management sophistication',
      'Regulatory compliance track record',
      'Scale and market presence'
    ],
    stakeholders: ['Reguladores', 'Shareholders', 'Customers', 'Rating Agencies', 'Central Banks'],
    riskFactors: [
      'Regulatory changes and compliance costs',
      'Credit risk in economic downturns',
      'Cybersecurity threats',
      'Interest rate risk',
      'Reputation risk from operational failures'
    ],
    successFactors: [
      'Strong risk management culture',
      'Efficient operational processes',
      'Robust regulatory compliance',
      'Customer-centric service delivery',
      'Sustainable profitability'
    ],
    benchmarkKPIs: [
      'Cost-to-income ratio: < 60%',
      'ROE: > 10%',
      'Tier 1 capital ratio: > 12%',
      'Digital adoption rate: > 70%',
      'Customer satisfaction: > 4.0/5.0'
    ]
  },

  healthcare: {
    name: 'Salud',
    description: 'Hospitales, clínicas, farmacéuticas, dispositivos médicos y servicios de salud',
    focusAreas: [
      'Calidad y seguridad del paciente',
      'Eficiencia operacional clínica',
      'Cumplimiento regulatorio sanitario',
      'Integración de health tech',
      'Population health management',
      'Cost management y value-based care',
      'Interoperabilidad de datos médicos',
      'Telemedicine y digital health'
    ],
    keyMetrics: {
      financial: ['Revenue per Patient', 'Operating Margin', 'Days in A/R', 'Bad Debt %', 'Cost per Case'],
      operational: ['Patient Throughput', 'Bed Occupancy Rate', 'Average Length of Stay', 'Readmission Rate'],
      customer: ['Patient Satisfaction (HCAHPS)', 'Wait Times', 'Patient Safety Scores', 'Provider Rating'],
      innovation: ['EHR Adoption', 'Telemedicine Usage', 'Clinical Decision Support Usage'],
      compliance: ['Regulatory Compliance Score', 'Quality Measures', 'Safety Event Rate', 'Audit Results']
    },
    commonObjectives: [
      'Mejorar outcomes clínicos y safety scores',
      'Reducir readmission rates',
      'Optimizar patient flow y bed management',
      'Incrementar patient satisfaction',
      'Digitalizar procesos clínicos',
      'Fortalecer population health initiatives',
      'Implementar value-based care models'
    ],
    roleResponsibilities: {
      corporativo: [
        'Definir estrategia de quality improvement',
        'Gestionar regulatory compliance',
        'Liderar digital health transformation',
        'Establecer clinical governance',
        'Supervisar population health initiatives'
      ],
      gerente: [
        'Implementar quality improvement programs',
        'Gestionar clinical workflows',
        'Coordinar compliance initiatives',
        'Optimizar resource utilization',
        'Supervisar patient experience programs'
      ],
      empleado: [
        'Proveer patient care de alta calidad',
        'Documentar clinical information',
        'Seguir safety protocols',
        'Participar en quality improvement',
        'Utilizar health technology efectivamente'
      ]
    },
    industrySpecificTerms: [
      'HIPAA', 'HL7', 'FHIR', 'EHR', 'EMR', 'HCAHPS', 'CMS',
      'Value-Based Care', 'Population Health', 'Clinical Decision Support',
      'Interoperability', 'Patient Safety', 'Quality Measures'
    ],
    regulations: ['HIPAA', 'HITECH', 'FDA', 'CMS', 'Joint Commission', 'OSHA', 'DEA'],
    marketTrends: [
      'Shift to value-based care',
      'Telemedicine expansion',
      'AI in clinical decision support',
      'Interoperability focus',
      'Personalized medicine growth'
    ],
    competitiveFactors: [
      'Clinical quality outcomes',
      'Patient experience scores',
      'Operational efficiency',
      'Technology adoption',
      'Provider network strength'
    ],
    stakeholders: ['Patients', 'Providers', 'Payers', 'Regulators', 'Community'],
    riskFactors: [
      'Regulatory compliance failures',
      'Patient safety incidents',
      'Cybersecurity breaches',
      'Physician burnout',
      'Reimbursement changes'
    ],
    successFactors: [
      'Patient-centered care focus',
      'Clinical excellence culture',
      'Operational efficiency',
      'Technology enablement',
      'Regulatory compliance'
    ],
    benchmarkKPIs: [
      'Patient satisfaction: > 4.0/5.0',
      'Readmission rate: < 10%',
      'Hospital-acquired infection rate: < 2%',
      'Average length of stay: Industry benchmark',
      'Operating margin: > 3%'
    ]
  },

  retail: {
    name: 'Retail',
    description: 'Comercio minorista, e-commerce, distribución y experiencia del cliente',
    focusAreas: [
      'Omnichannel customer experience',
      'Inventory management y supply chain',
      'Merchandising y category management',
      'Digital transformation y e-commerce',
      'Customer analytics y personalization',
      'Store operations y performance',
      'Pricing optimization',
      'Sustainability initiatives'
    ],
    keyMetrics: {
      financial: ['Sales per Sq Ft', 'Gross Margin', 'Inventory Turnover', 'EBITDA', 'Same-Store Sales Growth'],
      operational: ['Inventory Accuracy', 'Stock-out Rate', 'Order Fulfillment Time', 'Return Rate'],
      customer: ['Customer Satisfaction', 'NPS', 'Customer Retention', 'Basket Size', 'Conversion Rate'],
      innovation: ['Digital Sales %', 'Mobile App Usage', 'Omnichannel Adoption', 'New Product Launch Speed'],
      compliance: ['Safety Incident Rate', 'Regulatory Compliance', 'Sustainability Metrics']
    },
    commonObjectives: [
      'Incrementar ventas same-store growth',
      'Optimizar inventory turnover',
      'Mejorar customer experience scores',
      'Expandir capacidades omnichannel',
      'Reducir operational costs',
      'Acelerar digital transformation',
      'Implementar pricing optimization'
    ],
    roleResponsibilities: {
      corporativo: [
        'Definir estrategia omnichannel',
        'Gestionar portfolio de marcas',
        'Liderar digital transformation',
        'Establecer sustainability initiatives',
        'Supervisar expansion geográfica'
      ],
      gerente: [
        'Optimizar store operations',
        'Gestionar inventory planning',
        'Implementar merchandising strategies',
        'Coordinar customer experience initiatives',
        'Supervisar team performance'
      ],
      empleado: [
        'Proveer excellent customer service',
        'Mantener store presentation standards',
        'Ejecutar merchandising guidelines',
        'Procesar transactions efficiently',
        'Participar en inventory management'
      ]
    },
    industrySpecificTerms: [
      'SKU', 'Planogram', 'Inventory Turnover', 'Shrinkage', 'Point of Sale',
      'Cross-merchandising', 'Category Management', 'Private Label',
      'Drop Shipping', 'Omnichannel', 'Click and Collect'
    ],
    regulations: ['Consumer Protection', 'Product Safety', 'Labor Laws', 'Environmental Regulations'],
    marketTrends: [
      'Omnichannel retail expansion',
      'Sustainability focus',
      'AI-powered personalization',
      'Social commerce growth',
      'Micro-fulfillment centers'
    ],
    competitiveFactors: [
      'Customer experience quality',
      'Product assortment and pricing',
      'Omnichannel capabilities',
      'Supply chain efficiency',
      'Brand strength'
    ],
    stakeholders: ['Customers', 'Suppliers', 'Employees', 'Communities', 'Shareholders'],
    riskFactors: [
      'Economic downturns affecting spending',
      'Supply chain disruptions',
      'Changing consumer preferences',
      'Competitive pressure',
      'Inventory management challenges'
    ],
    successFactors: [
      'Customer-centric culture',
      'Efficient supply chain',
      'Strong brand presence',
      'Effective pricing strategies',
      'Operational excellence'
    ],
    benchmarkKPIs: [
      'Sales per sq ft: Industry benchmark',
      'Inventory turnover: > 6x annually',
      'Customer satisfaction: > 4.0/5.0',
      'Gross margin: Industry benchmark + 2%',
      'Digital sales %: > 30%'
    ]
  },

  manufacturing: {
    name: 'Manufactura',
    description: 'Producción industrial, manufactura y operaciones de fabricación',
    focusAreas: [
      'Operational excellence y lean manufacturing',
      'Quality management y six sigma',
      'Supply chain optimization',
      'Safety y environmental compliance',
      'Industry 4.0 y automation',
      'Predictive maintenance',
      'Cost management y efficiency',
      'Sustainability y circular economy'
    ],
    keyMetrics: {
      financial: ['Manufacturing Cost per Unit', 'Gross Margin', 'Capital Efficiency', 'Working Capital Turnover'],
      operational: ['OEE', 'Cycle Time', 'First Pass Yield', 'Downtime', 'Inventory Turns', 'On-time Delivery'],
      customer: ['Customer Satisfaction', 'Order Fulfillment Rate', 'Quality Returns', 'Delivery Performance'],
      innovation: ['R&D Investment', 'New Product Development Time', 'Automation Rate', 'Process Improvements'],
      compliance: ['Safety Incident Rate', 'Environmental Compliance', 'Quality Certifications', 'Regulatory Audits']
    },
    commonObjectives: [
      'Mejorar Overall Equipment Effectiveness (OEE)',
      'Reducir manufacturing costs per unit',
      'Incrementar first pass yield quality',
      'Optimizar supply chain performance',
      'Implementar Industry 4.0 technologies',
      'Fortalecer safety culture',
      'Acelerar new product development'
    ],
    roleResponsibilities: {
      corporativo: [
        'Definir manufacturing strategy',
        'Gestionar capital investments',
        'Liderar operational excellence initiatives',
        'Establecer safety y environmental policies',
        'Supervisar supply chain partnerships'
      ],
      gerente: [
        'Optimizar production planning',
        'Implementar quality systems',
        'Gestionar equipment maintenance',
        'Coordinar safety programs',
        'Supervisar process improvement'
      ],
      empleado: [
        'Operar equipment safely y efficiently',
        'Mantener quality standards',
        'Seguir safety protocols',
        'Participar en continuous improvement',
        'Ejecutar preventive maintenance'
      ]
    },
    industrySpecificTerms: [
      'OEE', 'Lean Manufacturing', 'Six Sigma', 'Kaizen', 'Poka-Yoke',
      'TPM', 'SMED', 'Value Stream Mapping', 'Just-in-Time',
      'Industry 4.0', 'IoT', 'Predictive Maintenance'
    ],
    regulations: ['OSHA', 'EPA', 'ISO 9001', 'ISO 14001', 'ISO 45001', 'FDA (para alimentos/pharma)'],
    marketTrends: [
      'Industry 4.0 adoption',
      'Sustainable manufacturing practices',
      'Supply chain resilience focus',
      'Automation and robotics integration',
      'Circular economy initiatives'
    ],
    competitiveFactors: [
      'Manufacturing cost efficiency',
      'Quality and reliability',
      'Speed to market',
      'Innovation capabilities',
      'Supply chain agility'
    ],
    stakeholders: ['Customers', 'Suppliers', 'Employees', 'Regulators', 'Communities'],
    riskFactors: [
      'Supply chain disruptions',
      'Equipment failures and downtime',
      'Quality issues and recalls',
      'Safety incidents',
      'Regulatory compliance failures'
    ],
    successFactors: [
      'Operational excellence culture',
      'Robust quality systems',
      'Effective supply chain management',
      'Strong safety performance',
      'Continuous improvement mindset'
    ],
    benchmarkKPIs: [
      'OEE: > 85%',
      'First pass yield: > 95%',
      'Safety incident rate: < 1 per 100,000 hours',
      'On-time delivery: > 95%',
      'Inventory turnover: > 12x annually'
    ]
  },

  education: {
    name: 'Educación',
    description: 'Instituciones educativas, universidades, escuelas y servicios de formación',
    focusAreas: [
      'Student success y academic outcomes',
      'Teaching effectiveness y pedagogy',
      'Technology integration en education',
      'Student engagement y retention',
      'Operational efficiency administrativa',
      'Research excellence y innovation',
      'Community outreach y partnerships',
      'Financial sustainability'
    ],
    keyMetrics: {
      financial: ['Cost per Student', 'Revenue per Student', 'Operating Margin', 'Fundraising Performance'],
      operational: ['Graduation Rate', 'Retention Rate', 'Time to Graduation', 'Class Size', 'Faculty-to-Student Ratio'],
      customer: ['Student Satisfaction', 'Alumni Engagement', 'Employer Satisfaction', 'Parent Satisfaction'],
      innovation: ['Technology Adoption', 'Research Publications', 'Grant Funding', 'Innovation Programs'],
      compliance: ['Accreditation Status', 'Compliance Audits', 'Safety Incident Rate', 'Regulatory Requirements']
    },
    commonObjectives: [
      'Mejorar student graduation rates',
      'Incrementar student satisfaction scores',
      'Fortalecer academic program quality',
      'Optimizar operational efficiency',
      'Expandir technology integration',
      'Aumentar research funding',
      'Desarrollar industry partnerships'
    ],
    roleResponsibilities: {
      corporativo: [
        'Definir strategic vision académica',
        'Gestionar financial sustainability',
        'Liderar accreditation processes',
        'Establecer research priorities',
        'Supervisar community partnerships'
      ],
      gerente: [
        'Implementar academic programs',
        'Gestionar faculty development',
        'Coordinar student services',
        'Optimizar operational processes',
        'Supervisar technology integration'
      ],
      empleado: [
        'Deliver high-quality education',
        'Support student learning',
        'Participate in professional development',
        'Contribute to research activities',
        'Engage with student community'
      ]
    },
    industrySpecificTerms: [
      'Learning Management System', 'Student Information System',
      'Accreditation', 'Academic Assessment', 'Pedagogy',
      'Blended Learning', 'Distance Learning', 'Competency-Based Education'
    ],
    regulations: ['FERPA', 'Title IX', 'ADA', 'Accreditation Standards', 'State Education Regulations'],
    marketTrends: [
      'Digital transformation in education',
      'Personalized learning approaches',
      'Competency-based education',
      'Online and hybrid learning models',
      'Industry-academia partnerships'
    ],
    competitiveFactors: [
      'Academic reputation and rankings',
      'Student outcomes and employment rates',
      'Technology infrastructure',
      'Faculty expertise',
      'Cost and value proposition'
    ],
    stakeholders: ['Students', 'Faculty', 'Parents', 'Alumni', 'Employers', 'Accreditors'],
    riskFactors: [
      'Declining enrollment',
      'Funding cuts and budget constraints',
      'Technology infrastructure failures',
      'Accreditation issues',
      'Faculty retention challenges'
    ],
    successFactors: [
      'Academic excellence focus',
      'Student-centered approach',
      'Innovation in teaching methods',
      'Strong community partnerships',
      'Financial sustainability'
    ],
    benchmarkKPIs: [
      'Graduation rate: > 70%',
      'Student retention: > 80%',
      'Student satisfaction: > 4.0/5.0',
      'Employment rate of graduates: > 85%',
      'Cost per credit hour: Competitive'
    ]
  },

  consulting: {
    name: 'Consultoría',
    description: 'Servicios de consultoría empresarial, estratégica, tecnológica y especializada',
    focusAreas: [
      'Client satisfaction y value delivery',
      'Project management excellence',
      'Talent development y expertise',
      'Business development y growth',
      'Knowledge management',
      'Operational efficiency',
      'Innovation y thought leadership',
      'Partnership development'
    ],
    keyMetrics: {
      financial: ['Revenue per Consultant', 'Utilization Rate', 'Billing Rate', 'Project Margin', 'Client Retention'],
      operational: ['Project Delivery Time', 'Budget Variance', 'Resource Utilization', 'Knowledge Sharing'],
      customer: ['Client Satisfaction', 'NPS', 'Repeat Business Rate', 'Referral Rate'],
      innovation: ['Thought Leadership Publications', 'New Service Offerings', 'Methodology Development'],
      compliance: ['Quality Standards Compliance', 'Professional Certifications', 'Risk Management']
    },
    commonObjectives: [
      'Incrementar client satisfaction scores',
      'Mejorar utilization rates del equipo',
      'Acelerar business development',
      'Fortalecer thought leadership',
      'Optimizar project delivery processes',
      'Desarrollar new service offerings',
      'Expandir client base'
    ],
    roleResponsibilities: {
      corporativo: [
        'Definir strategic direction',
        'Gestionar key client relationships',
        'Liderar business development',
        'Establecer quality standards',
        'Supervisar talent strategy'
      ],
      gerente: [
        'Gestionar client projects',
        'Desarrollar junior consultants',
        'Implementar delivery methodologies',
        'Coordinar resource allocation',
        'Supervisar quality assurance'
      ],
      empleado: [
        'Deliver high-quality consulting services',
        'Contribute to project objectives',
        'Develop domain expertise',
        'Support business development',
        'Participate in knowledge sharing'
      ]
    },
    industrySpecificTerms: [
      'Statement of Work', 'Utilization Rate', 'Thought Leadership',
      'Client Engagement', 'Practice Area', 'Delivery Excellence',
      'Business Case', 'Change Management'
    ],
    regulations: ['Professional Standards', 'Client Confidentiality', 'Data Protection', 'Industry Regulations'],
    marketTrends: [
      'Digital transformation consulting growth',
      'Specialization in niche areas',
      'Outcome-based pricing models',
      'Remote delivery capabilities',
      'AI and automation consulting'
    ],
    competitiveFactors: [
      'Expertise and reputation',
      'Client relationships',
      'Delivery track record',
      'Innovation capabilities',
      'Talent quality'
    ],
    stakeholders: ['Clients', 'Consultants', 'Partners', 'Industry Associations', 'Alumni Network'],
    riskFactors: [
      'Client concentration risk',
      'Talent retention challenges',
      'Economic downturns affecting demand',
      'Competitive pressure on pricing',
      'Project delivery failures'
    ],
    successFactors: [
      'Client-centric approach',
      'Deep industry expertise',
      'Strong delivery capabilities',
      'Continuous learning culture',
      'Relationship building skills'
    ],
    benchmarkKPIs: [
      'Utilization rate: > 75%',
      'Client satisfaction: > 4.2/5.0',
      'Repeat business rate: > 70%',
      'Revenue per consultant: Industry benchmark',
      'Project delivery on time: > 90%'
    ]
  },

  marketing: {
    name: 'Marketing',
    description: 'Agencias de marketing, publicidad, marketing digital y growth marketing',
    focusAreas: [
      'Brand awareness y positioning',
      'Lead generation y conversion',
      'Customer acquisition cost optimization',
      'Content marketing y storytelling',
      'Digital marketing y automation',
      'Marketing analytics y attribution',
      'Customer experience journey',
      'Performance marketing'
    ],
    keyMetrics: {
      financial: ['CAC', 'LTV', 'ROAS', 'Marketing ROI', 'Cost per Lead', 'Revenue Attribution'],
      operational: ['Campaign Performance', 'Content Production Rate', 'Channel Performance', 'Conversion Rates'],
      customer: ['Brand Awareness', 'Engagement Rate', 'Customer Satisfaction', 'NPS'],
      innovation: ['New Channel Adoption', 'Creative Innovation', 'Marketing Technology Stack'],
      compliance: ['GDPR Compliance', 'Ad Standards Compliance', 'Brand Guidelines Adherence']
    },
    commonObjectives: [
      'Reducir customer acquisition cost (CAC)',
      'Incrementar return on ad spend (ROAS)',
      'Mejorar lead quality y conversion rates',
      'Fortalecer brand awareness',
      'Optimizar marketing attribution',
      'Acelerar content production',
      'Expandir digital marketing channels'
    ],
    roleResponsibilities: {
      corporativo: [
        'Definir brand strategy',
        'Gestionar marketing budget allocation',
        'Liderar marketing transformation',
        'Establecer performance standards',
        'Supervisar agency relationships'
      ],
      gerente: [
        'Ejecutar marketing campaigns',
        'Gestionar marketing technology stack',
        'Coordinar content production',
        'Optimizar channel performance',
        'Supervisar campaign analytics'
      ],
      empleado: [
        'Create compelling marketing content',
        'Execute digital marketing campaigns',
        'Analyze campaign performance',
        'Support lead generation efforts',
        'Maintain brand consistency'
      ]
    },
    industrySpecificTerms: [
      'CTR', 'CPC', 'CPM', 'ROAS', 'Attribution Modeling',
      'Marketing Qualified Lead', 'Sales Qualified Lead',
      'Conversion Funnel', 'A/B Testing', 'Marketing Automation'
    ],
    regulations: ['GDPR', 'CCPA', 'CAN-SPAM', 'Ad Standards', 'Platform Policies'],
    marketTrends: [
      'Privacy-first marketing strategies',
      'AI-powered personalization',
      'Influencer marketing growth',
      'Video and interactive content',
      'Account-based marketing expansion'
    ],
    competitiveFactors: [
      'Creative excellence',
      'Data and analytics capabilities',
      'Technology stack sophistication',
      'Channel expertise',
      'ROI demonstration'
    ],
    stakeholders: ['Clients', 'Agencies', 'Media Partners', 'Technology Vendors', 'Regulators'],
    riskFactors: [
      'Platform algorithm changes',
      'Privacy regulation changes',
      'Economic downturns affecting spend',
      'Creative fatigue',
      'Attribution challenges'
    ],
    successFactors: [
      'Data-driven decision making',
      'Creative excellence',
      'Agile campaign optimization',
      'Strong technology integration',
      'Customer-centric approach'
    ],
    benchmarkKPIs: [
      'CAC payback period: < 12 months',
      'ROAS: > 4:1',
      'Lead-to-customer conversion: > 15%',
      'Email open rate: > 25%',
      'Social engagement rate: > 3%'
    ]
  },

  sales: {
    name: 'Ventas',
    description: 'Equipos de ventas, business development y revenue operations',
    focusAreas: [
      'Revenue growth y pipeline management',
      'Sales process optimization',
      'Customer relationship management',
      'Sales enablement y training',
      'Territory management',
      'Sales analytics y forecasting',
      'Lead qualification y nurturing',
      'Account expansion'
    ],
    keyMetrics: {
      financial: ['Revenue Growth', 'Average Deal Size', 'Sales Cycle Length', 'Win Rate', 'Quota Attainment'],
      operational: ['Pipeline Velocity', 'Activity Metrics', 'Lead Response Time', 'Forecast Accuracy'],
      customer: ['Customer Satisfaction', 'Net Revenue Retention', 'Account Growth', 'Referral Rate'],
      innovation: ['Sales Technology Adoption', 'Process Improvements', 'New Market Penetration'],
      compliance: ['Sales Process Compliance', 'CRM Data Quality', 'Legal Review Compliance']
    },
    commonObjectives: [
      'Incrementar revenue growth rate',
      'Mejorar win rates y deal size',
      'Reducir sales cycle length',
      'Optimizar pipeline management',
      'Fortalecer customer relationships',
      'Acelerar lead qualification',
      'Expandir account penetration'
    ],
    roleResponsibilities: {
      corporativo: [
        'Definir sales strategy y go-to-market',
        'Gestionar key accounts',
        'Liderar sales transformation',
        'Establecer sales targets',
        'Supervisar sales operations'
      ],
      gerente: [
        'Gestionar sales team performance',
        'Implementar sales processes',
        'Coordinar sales enablement',
        'Optimizar territory management',
        'Supervisar pipeline reviews'
      ],
      empleado: [
        'Generate and qualify leads',
        'Manage customer relationships',
        'Execute sales processes',
        'Achieve individual quotas',
        'Provide customer feedback'
      ]
    },
    industrySpecificTerms: [
      'Pipeline', 'Quota', 'MQL', 'SQL', 'CRM', 'Sales Cycle',
      'Win Rate', 'Churn Rate', 'Upselling', 'Cross-selling',
      'Account-Based Selling', 'Sales Qualified Lead'
    ],
    regulations: ['Data Protection', 'Anti-Corruption Laws', 'Industry-Specific Regulations'],
    marketTrends: [
      'Sales automation and AI',
      'Account-based selling strategies',
      'Social selling adoption',
      'Revenue operations focus',
      'Customer success integration'
    ],
    competitiveFactors: [
      'Sales process efficiency',
      'Customer relationship strength',
      'Product knowledge depth',
      'Territory coverage',
      'Technology enablement'
    ],
    stakeholders: ['Customers', 'Prospects', 'Partners', 'Marketing Teams', 'Customer Success'],
    riskFactors: [
      'Economic downturns affecting demand',
      'Competitive pressure on pricing',
      'Sales talent retention',
      'Customer churn',
      'Market saturation'
    ],
    successFactors: [
      'Customer-centric sales approach',
      'Strong sales process discipline',
      'Effective sales enablement',
      'Data-driven decision making',
      'Continuous learning culture'
    ],
    benchmarkKPIs: [
      'Quota attainment: > 100%',
      'Win rate: > 25%',
      'Sales cycle length: Industry benchmark -20%',
      'Pipeline coverage: 3-4x quota',
      'Customer retention: > 90%'
    ]
  },

  hr: {
    name: 'Recursos Humanos',
    description: 'Gestión de talento, recursos humanos y desarrollo organizacional',
    focusAreas: [
      'Talent acquisition y recruitment',
      'Employee engagement y retention',
      'Performance management',
      'Learning y development',
      'Compensation y benefits',
      'Diversity, equity, inclusion',
      'HR analytics y metrics',
      'Organizational development'
    ],
    keyMetrics: {
      financial: ['Cost per Hire', 'HR Cost per Employee', 'Training ROI', 'Turnover Cost'],
      operational: ['Time to Fill', 'Employee Productivity', 'Training Hours', 'HR Service Level'],
      customer: ['Employee Satisfaction', 'Manager Effectiveness', 'Internal Customer Satisfaction'],
      innovation: ['HR Technology Adoption', 'Process Automation', 'New Program Launches'],
      compliance: ['Compliance Audit Results', 'EEO Metrics', 'Safety Incident Rate']
    },
    commonObjectives: [
      'Reducir time-to-fill para posiciones críticas',
      'Incrementar employee engagement scores',
      'Mejorar retention rates',
      'Optimizar performance management',
      'Fortalecer diversity & inclusion',
      'Acelerar learning & development',
      'Digitalizar HR processes'
    ],
    roleResponsibilities: {
      corporativo: [
        'Definir people strategy',
        'Gestionar organizational culture',
        'Liderar talent management',
        'Establecer compensation philosophy',
        'Supervisar compliance programs'
      ],
      gerente: [
        'Implementar HR programs',
        'Gestionar employee relations',
        'Coordinar talent development',
        'Optimizar HR processes',
        'Supervisar team performance'
      ],
      empleado: [
        'Support recruitment processes',
        'Execute HR programs',
        'Provide employee services',
        'Maintain HR records',
        'Assist with compliance'
      ]
    },
    industrySpecificTerms: [
      'HRIS', 'ATS', 'Performance Review', 'Succession Planning',
      '360 Feedback', 'Employee Net Promoter Score', 'Turnover Rate',
      'Diversity Metrics', 'Learning Management System'
    ],
    regulations: ['Equal Employment Opportunity', 'Labor Laws', 'OSHA', 'FMLA', 'FLSA'],
    marketTrends: [
      'Remote work policies',
      'Employee experience focus',
      'AI in recruitment',
      'Skills-based hiring',
      'Mental health and wellbeing'
    ],
    competitiveFactors: [
      'Talent attraction capabilities',
      'Employee experience quality',
      'Learning and development programs',
      'Compensation competitiveness',
      'Culture and values alignment'
    ],
    stakeholders: ['Employees', 'Managers', 'Leadership', 'Unions', 'Regulatory Bodies'],
    riskFactors: [
      'Talent shortage in key roles',
      'Compliance failures',
      'Employee relations issues',
      'High turnover costs',
      'Workplace safety incidents'
    ],
    successFactors: [
      'Employee-centric approach',
      'Data-driven HR decisions',
      'Strong compliance framework',
      'Effective communication',
      'Continuous improvement mindset'
    ],
    benchmarkKPIs: [
      'Employee engagement: > 80%',
      'Turnover rate: < 15%',
      'Time to fill: < 30 days',
      'Training ROI: > 3:1',
      'Diversity representation: Meet targets'
    ]
  },

  operations: {
    name: 'Operaciones',
    description: 'Gestión de operaciones, procesos y eficiencia operacional',
    focusAreas: [
      'Process optimization y efficiency',
      'Supply chain management',
      'Quality management systems',
      'Cost reduction initiatives',
      'Automation y digitalization',
      'Risk management operacional',
      'Vendor management',
      'Continuous improvement'
    ],
    keyMetrics: {
      financial: ['Operating Cost', 'Cost per Transaction', 'Vendor Spend', 'Process Cost'],
      operational: ['Process Efficiency', 'Cycle Time', 'Error Rate', 'SLA Performance', 'Automation Rate'],
      customer: ['Service Level Achievement', 'Customer Satisfaction', 'Response Time'],
      innovation: ['Process Improvements', 'Automation Implementation', 'Technology Adoption'],
      compliance: ['Audit Results', 'Policy Compliance', 'Risk Metrics']
    },
    commonObjectives: [
      'Mejorar operational efficiency',
      'Reducir operational costs',
      'Optimizar supply chain performance',
      'Fortalecer quality management',
      'Acelerar process automation',
      'Implementar continuous improvement',
      'Gestionar operational risks'
    ],
    roleResponsibilities: {
      corporativo: [
        'Definir operational strategy',
        'Gestionar vendor relationships',
        'Liderar efficiency initiatives',
        'Establecer quality standards',
        'Supervisar risk management'
      ],
      gerente: [
        'Optimizar daily operations',
        'Implementar process improvements',
        'Gestionar team performance',
        'Coordinar vendor management',
        'Supervisar quality control'
      ],
      empleado: [
        'Execute operational processes',
        'Monitor quality standards',
        'Support process improvement',
        'Maintain compliance',
        'Provide operational support'
      ]
    },
    industrySpecificTerms: [
      'SLA', 'KPI', 'Process Mapping', 'Lean Six Sigma',
      'Vendor Management', 'Quality Assurance', 'Risk Assessment',
      'Business Continuity', 'Standard Operating Procedure'
    ],
    regulations: ['Industry Standards', 'Quality Certifications', 'Safety Regulations', 'Environmental Compliance'],
    marketTrends: [
      'Process automation adoption',
      'Digital transformation',
      'Sustainability focus',
      'Agile operations',
      'Data-driven decision making'
    ],
    competitiveFactors: [
      'Operational efficiency',
      'Quality consistency',
      'Cost management',
      'Technology enablement',
      'Risk management'
    ],
    stakeholders: ['Internal Customers', 'Vendors', 'Regulators', 'Employees', 'Leadership'],
    riskFactors: [
      'Process failures and errors',
      'Vendor performance issues',
      'Compliance violations',
      'Technology disruptions',
      'Quality incidents'
    ],
    successFactors: [
      'Process excellence culture',
      'Strong vendor partnerships',
      'Effective quality systems',
      'Risk management capabilities',
      'Continuous improvement mindset'
    ],
    benchmarkKPIs: [
      'Process efficiency: > 95%',
      'Error rate: < 2%',
      'SLA achievement: > 98%',
      'Cost reduction: 5% annually',
      'Automation rate: > 50%'
    ]
  },

  general: {
    name: 'General',
    description: 'Sector general o múltiples industrias con enfoque transversal',
    focusAreas: [
      'Crecimiento sostenible del negocio',
      'Eficiencia operacional',
      'Satisfacción de stakeholders',
      'Innovation y desarrollo',
      'Risk management',
      'Sustainability initiatives',
      'Digital transformation',
      'Organizational excellence'
    ],
    keyMetrics: {
      financial: ['Revenue Growth', 'Profitability', 'ROI', 'Cash Flow', 'Cost Management'],
      operational: ['Operational Efficiency', 'Process Performance', 'Quality Metrics', 'Productivity'],
      customer: ['Customer Satisfaction', 'Stakeholder Engagement', 'Market Share'],
      innovation: ['Innovation Investment', 'New Initiative Success', 'Technology Adoption'],
      compliance: ['Regulatory Compliance', 'Risk Management', 'Audit Results']
    },
    commonObjectives: [
      'Crecer de manera sostenible',
      'Mejorar eficiencia operacional',
      'Incrementar satisfacción stakeholders',
      'Fortalecer innovation capabilities',
      'Optimizar cost management',
      'Implementar best practices',
      'Desarrollar organizational capabilities'
    ],
    roleResponsibilities: {
      corporativo: [
        'Definir strategic direction',
        'Gestionar stakeholder relationships',
        'Liderar organizational transformation',
        'Establecer governance frameworks',
        'Supervisar performance management'
      ],
      gerente: [
        'Implementar strategic initiatives',
        'Gestionar operational excellence',
        'Coordinar cross-functional projects',
        'Optimizar team performance',
        'Supervisar continuous improvement'
      ],
      empleado: [
        'Execute daily responsibilities',
        'Support organizational objectives',
        'Participate in improvement initiatives',
        'Maintain quality standards',
        'Contribute to team success'
      ]
    },
    industrySpecificTerms: [
      'Best Practice', 'Benchmark', 'Key Performance Indicator',
      'Strategic Initiative', 'Operational Excellence', 'Continuous Improvement',
      'Stakeholder Management', 'Change Management'
    ],
    regulations: ['General Business Regulations', 'Industry Standards', 'Compliance Requirements'],
    marketTrends: [
      'Digital transformation acceleration',
      'Sustainability focus',
      'Remote work adoption',
      'Data-driven decision making',
      'Agile methodologies'
    ],
    competitiveFactors: [
      'Operational efficiency',
      'Innovation capabilities',
      'Customer focus',
      'Quality excellence',
      'Adaptability'
    ],
    stakeholders: ['Customers', 'Employees', 'Shareholders', 'Partners', 'Communities'],
    riskFactors: [
      'Market volatility',
      'Competitive pressure',
      'Operational risks',
      'Regulatory changes',
      'Technology disruption'
    ],
    successFactors: [
      'Strategic clarity',
      'Execution excellence',
      'Innovation culture',
      'Strong leadership',
      'Stakeholder focus'
    ],
    benchmarkKPIs: [
      'Revenue growth: > 10%',
      'Operational efficiency: Industry benchmark',
      'Customer satisfaction: > 4.0/5.0',
      'Employee engagement: > 75%',
      'ROI: > 15%'
    ]
  }
}

// Template style configurations
export interface TemplateStyle {
  name: string
  description: string
  characteristics: string[]
  promptModifiers: string[]
  timeline: 'quarterly' | 'annual' | 'flexible'
  ambitionLevel: 'conservative' | 'moderate' | 'aggressive'
}

export const TEMPLATE_STYLES: Record<string, TemplateStyle> = {
  traditional: {
    name: 'Tradicional',
    description: 'Enfoque clásico de OKRs con objetivos cuantificables y estructura formal',
    characteristics: [
      'Objetivos específicos y medibles',
      'Key Results numéricos claros',
      'Timeline trimestral estándar',
      'Enfoque en métricas establecidas'
    ],
    promptModifiers: [
      'Utiliza métricas tradicionales y KPIs establecidos',
      'Enfócate en objetivos cuantificables y específicos',
      'Mantén estructura formal de OKRs',
      'Prioriza consistencia y benchmarking'
    ],
    timeline: 'quarterly',
    ambitionLevel: 'moderate'
  },
  agile: {
    name: 'Ágil',
    description: 'Enfoque iterativo con objetivos adaptativos y feedback continuo',
    characteristics: [
      'Objetivos adaptativos',
      'Sprints y revisiones frecuentes',
      'Feedback loops cortos',
      'Flexibilidad en key results'
    ],
    promptModifiers: [
      'Diseña objetivos que permitan adaptación',
      'Incluye checkpoints y reviews frecuentes',
      'Enfócate en learning y iteración',
      'Permite ajustes basados en feedback'
    ],
    timeline: 'quarterly',
    ambitionLevel: 'moderate'
  },
  startup: {
    name: 'Startup',
    description: 'Enfoque de alto crecimiento con objetivos ambiciosos y experimentación',
    characteristics: [
      'Objetivos de alto impacto',
      'Experimentación y pivoting',
      'Growth hacking mindset',
      'Métricas de tracción'
    ],
    promptModifiers: [
      'Establece objetivos ambiciosos de crecimiento',
      'Incluye experimentación y testing',
      'Enfócate en métricas de tracción clave',
      'Permite pivoting y adjustments rápidos'
    ],
    timeline: 'quarterly',
    ambitionLevel: 'aggressive'
  }
}

// Prompt generation function
export function generateAdvancedPrompt(
  context: OKRTemplateContext,
  templateStyle: keyof typeof TEMPLATE_STYLES = 'traditional',
  numberOfTemplates: number = 3
): string {
  const industryData = ADVANCED_INDUSTRY_DATA[context.industry as ExtendedIndustry] || ADVANCED_INDUSTRY_DATA.general
  const style = TEMPLATE_STYLES[templateStyle]
  const roleData = industryData.roleResponsibilities[context.role || 'empleado']

  return `
GENERADOR AVANZADO DE PLANTILLAS OKR - EXPERTO EN ${industryData.name.toUpperCase()}

CONTEXTO EMPRESARIAL ESPECÍFICO:
- Industria: ${industryData.name} (${industryData.description})
- Tamaño empresa: ${context.companySize}
- Rol del usuario: ${context.role || 'empleado'}
- Departamento: ${context.department || 'General'}
- Marco temporal: ${context.timeframe || 'quarterly'}
- Estilo de plantilla: ${style.name} (${style.description})
- Etapa empresa: ${context.companyStage || 'No especificado'}
- Tamaño equipo: ${context.teamSize || 'No especificado'}

CONOCIMIENTO ESPECIALIZADO DE LA INDUSTRIA:
Áreas de Enfoque Críticas:
${industryData.focusAreas.map(area => `- ${area}`).join('\n')}

Responsabilidades del Rol (${context.role || 'empleado'}):
${roleData.map(resp => `- ${resp}`).join('\n')}

Métricas Clave por Categoría:
• Financieras: ${industryData.keyMetrics.financial.join(', ')}
• Operacionales: ${industryData.keyMetrics.operational.join(', ')}
• Cliente/Mercado: ${industryData.keyMetrics.customer.join(', ')}
• Innovación: ${industryData.keyMetrics.innovation.join(', ')}
• Compliance: ${industryData.keyMetrics.compliance.join(', ')}

Objetivos Comunes en la Industria:
${industryData.commonObjectives.map(obj => `- ${obj}`).join('\n')}

KPIs Benchmark de la Industria:
${industryData.benchmarkKPIs.map(kpi => `- ${kpi}`).join('\n')}

Factores de Riesgo Específicos:
${industryData.riskFactors.map(risk => `- ${risk}`).join('\n')}

CONFIGURACIÓN DEL ESTILO "${style.name.toUpperCase()}":
Características:
${style.characteristics.map(char => `- ${char}`).join('\n')}

Modificadores de Prompt:
${style.promptModifiers.map(mod => `- ${mod}`).join('\n')}

INSTRUCCIONES DE GENERACIÓN AVANZADA:

1. OBJETIVO SMART+ (Específico, Medible, Alcanzable, Relevante, Temporal + Inspirador):
   - Debe alinearse con ${industryData.focusAreas[0]}
   - Incorporar terminología específica: ${industryData.industrySpecificTerms.slice(0, 3).join(', ')}
   - Considerar tendencias del mercado: ${industryData.marketTrends[0]}
   - Nivel de ambición: ${style.ambitionLevel}

2. KEY RESULTS CUANTIFICABLES (3-4 por objetivo):
   - Utilizar métricas de ${industryData.keyMetrics.financial[0]}, ${industryData.keyMetrics.operational[0]}
   - Establecer baselines realistas para ${context.companySize}
   - Targets ambiciosos pero alcanzables
   - Frecuencia de medición: ${context.timeframe === 'quarterly' ? 'semanal/mensual' : 'mensual/trimestral'}

3. INICIATIVAS ESTRATÉGICAS (4-6 por objetivo):
   - Considerar factores de éxito: ${industryData.successFactors.slice(0, 2).join(', ')}
   - Abordar factores competitivos: ${industryData.competitiveFactors[0]}
   - Incluir consideraciones de compliance: ${industryData.regulations.slice(0, 2).join(', ')}

4. GESTIÓN DE RIESGOS:
   - Identificar 2-3 riesgos específicos de ${industryData.riskFactors.slice(0, 3).join(', ')}
   - Proponer estrategias de mitigación
   - Considerar regulaciones: ${industryData.regulations.join(', ')}

5. CRITERIOS DE ÉXITO:
   - Alineados con benchmarks de la industria
   - Medibles y específicos para ${context.role || 'empleado'}
   - Considerando stakeholders: ${industryData.stakeholders.slice(0, 3).join(', ')}

FORMATO DE RESPUESTA JSON:
{
  "templates": [
    {
      "objective": {
        "title": "Título específico y accionable para ${industryData.name}",
        "description": "Descripción detallada considerando ${context.companySize} empresa",
        "category": "Categoría relevante para ${context.department || context.role}",
        "timeframe": "${context.timeframe || 'quarterly'}",
        "industryAlignment": "Explicación de alineación con ${industryData.name}",
        "roleSpecific": "Consideraciones específicas para ${context.role || 'empleado'}"
      },
      "keyResults": [
        {
          "title": "KR específico con métrica de ${industryData.keyMetrics.financial[0] || 'performance'}",
          "description": "Descripción detallada del key result",
          "target": "Meta cuantificable específica",
          "measurementType": "percentage|number|boolean|currency",
          "baseline": "Línea base actual estimada para ${context.companySize}",
          "frequency": "weekly|monthly|quarterly",
          "industryBenchmark": "Benchmark específico de la industria",
          "riskFactors": ["Riesgos específicos para este KR"]
        }
      ],
      "initiatives": [
        "Iniciativas específicas considerando ${context.companyStage || 'etapa actual'} de la empresa",
        "Acciones que aborden ${industryData.competitiveFactors[0]}",
        "Iniciativas de compliance para ${industryData.regulations[0] || 'regulaciones aplicables'}"
      ],
      "metrics": [
        "Métricas clave de ${industryData.keyMetrics.operational[0]}",
        "KPIs específicos de ${industryData.name}"
      ],
      "risks": [
        "Riesgos específicos: ${industryData.riskFactors[0]}",
        "Mitigación de ${industryData.riskFactors[1] || 'riesgos operacionales'}"
      ],
      "successCriteria": [
        "Criterios alineados con ${industryData.successFactors[0]}",
        "Benchmarks de ${industryData.benchmarkKPIs[0] || 'industria'}"
      ],
      "confidenceScore": 0.85,
      "industryRelevance": 0.95,
      "styleAlignment": 0.90,
      "complexityLevel": "beginner|intermediate|advanced",
      "stakeholderImpact": {
        "primary": ["Stakeholders primarios afectados"],
        "secondary": ["Stakeholders secundarios"]
      },
      "complianceConsiderations": [
        "Consideraciones de ${industryData.regulations[0] || 'regulaciones'}",
        "Requirements específicos de la industria"
      ]
    }
  ],
  "metadata": {
    "industrySpecialization": "${industryData.name}",
    "templateStyle": "${style.name}",
    "targetRole": "${context.role || 'empleado'}",
    "companyContext": "${context.companySize}",
    "generationTimestamp": "${new Date().toISOString()}",
    "promptVersion": "2.0-advanced"
  }
}

CONSIDERACIONES CRÍTICAS:
- Todos los objetivos deben ser específicos para ${industryData.name}
- Las métricas deben reflejar ${context.companySize} empresa
- Considerar el nivel de madurez: ${context.companyStage || 'no especificado'}
- Los KRs deben ser desafiantes pero alcanzables para ${context.role || 'empleado'}
- Incluir terminología estándar: ${industryData.industrySpecificTerms.slice(0, 5).join(', ')}
- Alineación con tendencias: ${industryData.marketTrends.slice(0, 2).join(', ')}

Genera ${numberOfTemplates} plantillas variadas que demuestren diferentes enfoques dentro de ${industryData.name}, considerando el estilo ${style.name} y el contexto específico proporcionado.

Responde ÚNICAMENTE con el JSON válido, sin texto adicional.
`
}

// Export utility functions
export function getExtendedIndustryOptions(): { value: ExtendedIndustry; label: string; description: string }[] {
  return Object.entries(ADVANCED_INDUSTRY_DATA).map(([key, data]) => ({
    value: key as ExtendedIndustry,
    label: data.name,
    description: data.description
  }))
}

export function getTemplateStyleOptions(): { value: string; label: string; description: string }[] {
  return Object.entries(TEMPLATE_STYLES).map(([key, style]) => ({
    value: key,
    label: style.name,
    description: style.description
  }))
}

export function getIndustryMetrics(industry: ExtendedIndustry): IndustryMetrics {
  return ADVANCED_INDUSTRY_DATA[industry]?.keyMetrics || ADVANCED_INDUSTRY_DATA.general.keyMetrics
}

export function getRoleResponsibilities(industry: ExtendedIndustry, role: UserRole): string[] {
  return ADVANCED_INDUSTRY_DATA[industry]?.roleResponsibilities[role] || ADVANCED_INDUSTRY_DATA.general.roleResponsibilities[role]
}

export function getIndustryBenchmarks(industry: ExtendedIndustry): string[] {
  return ADVANCED_INDUSTRY_DATA[industry]?.benchmarkKPIs || ADVANCED_INDUSTRY_DATA.general.benchmarkKPIs
}

export function getIndustryRisks(industry: ExtendedIndustry): string[] {
  return ADVANCED_INDUSTRY_DATA[industry]?.riskFactors || ADVANCED_INDUSTRY_DATA.general.riskFactors
}

export function getIndustryTerms(industry: ExtendedIndustry): string[] {
  return ADVANCED_INDUSTRY_DATA[industry]?.industrySpecificTerms || []
}

export function getMarketTrends(industry: ExtendedIndustry): string[] {
  return ADVANCED_INDUSTRY_DATA[industry]?.marketTrends || ADVANCED_INDUSTRY_DATA.general.marketTrends
}