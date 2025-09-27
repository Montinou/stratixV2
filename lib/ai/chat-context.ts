import type { ConversationContext, ChatMessage } from "./conversation-manager"
import type { Objective, Initiative, Activity, UserRole } from "@/lib/types/okr"

export interface ContextualPrompt {
  systemPrompt: string
  userContext: string
  conversationHistory: string
  okrData: string
}

export class ChatContextBuilder {
  constructor() {}

  async buildContextualPrompt(
    message: string,
    context: ConversationContext
  ): Promise<ContextualPrompt> {
    const systemPrompt = this.buildSystemPrompt(context.userRole, context.department)
    const userContext = this.buildUserContext(context)
    const conversationHistory = this.buildConversationHistory(context.conversationHistory)
    const okrData = this.buildOKRDataContext(context)

    return {
      systemPrompt,
      userContext,
      conversationHistory,
      okrData
    }
  }

  private buildSystemPrompt(userRole: UserRole, department?: string): string {
    const basePrompt = `Eres un asistente de IA especializado en gestión de OKRs (Objectives and Key Results) para organizaciones latinoamericanas.

Tu personalidad:
- Profesional pero cercano y motivador
- Experto en metodologías OKR y mejores prácticas
- Conocedor de dinámicas empresariales en América Latina
- Enfocado en resultados prácticos y accionables

Tus capacidades principales:
1. **Análisis Estratégico**: Ayudar con definición de objetivos SMART y key results medibles
2. **Seguimiento de Progreso**: Interpretar métricas y recomendar ajustes
3. **Resolución de Problemas**: Identificar obstáculos y sugerir soluciones
4. **Mejores Prácticas**: Compartir metodologías probadas y benchmarks
5. **Análisis de Datos**: Interpretar métricas de rendimiento y tendencias
6. **Facilitación de Alineación**: Ayudar con comunicación y coordinación de equipos

Siempre responde en español con un tono profesional pero amigable. Sé específico y proporciona ejemplos concretos cuando sea relevante.`

    const roleSpecificPrompt = this.getRoleSpecificPrompt(userRole)
    const departmentPrompt = department ? `\n\nContexto del departamento: Trabajas principalmente con el departamento de "${department}".` : ""

    return `${basePrompt}\n\n${roleSpecificPrompt}${departmentPrompt}`
  }

  private getRoleSpecificPrompt(role: UserRole): string {
    switch (role) {
      case "corporativo":
        return `Rol del usuario: CORPORATIVO
Enfoque: Visión estratégica de toda la organización
- Análisis de rendimiento organizacional
- Alineación estratégica entre departamentos
- Benchmarking y mejores prácticas industriales
- Decisiones de alto nivel y asignación de recursos
- Comunicación executiva y reporting a stakeholders`

      case "gerente":
        return `Rol del usuario: GERENTE
Enfoque: Liderazgo de equipo y ejecución departamental
- Gestión de rendimiento del equipo
- Traducción de estrategia corporativa a objetivos departamentales
- Identificación y resolución de bloqueos
- Desarrollo y motivación del equipo
- Comunicación bidireccional con corporativo y equipo`

      case "empleado":
        return `Rol del usuario: EMPLEADO
Enfoque: Ejecución individual y contribución al equipo
- Clarificación de objetivos personales
- Seguimiento de progreso individual
- Identificación de necesidades de apoyo
- Contribución efectiva a objetivos de equipo
- Desarrollo profesional y capacitación`

      default:
        return "Rol del usuario: No especificado"
    }
  }

  private buildUserContext(context: ConversationContext): string {
    const { userProfile, userRole, department, companyContext } = context

    let userContext = `Información del usuario:
- Nombre: ${userProfile.full_name}
- Rol: ${userRole}
- Email: ${userProfile.email}`

    if (department) {
      userContext += `\n- Departamento: ${department}`
    }

    if (companyContext) {
      userContext += `\n- Contexto de la empresa: ${companyContext}`
    }

    return userContext
  }

  private buildConversationHistory(messages: ChatMessage[]): string {
    if (messages.length === 0) {
      return "Esta es una nueva conversación."
    }

    // Get last 6 messages for context
    const recentMessages = messages.slice(-6)
    const history = recentMessages
      .map(msg => {
        const timestamp = msg.timestamp.toLocaleString('es-ES', {
          hour: '2-digit',
          minute: '2-digit'
        })
        return `[${timestamp}] ${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`
      })
      .join('\n')

    return `Historial de conversación reciente:\n${history}`
  }

  private buildOKRDataContext(context: ConversationContext): string {
    const { currentOKRs, recentInitiatives, recentActivities } = context

    let okrContext = "Datos actuales de OKRs del usuario:\n"

    // Objectives summary
    if (currentOKRs.length > 0) {
      okrContext += `\n📊 OBJETIVOS ACTUALES (${currentOKRs.length}):\n`
      currentOKRs.forEach((obj, index) => {
        const status = this.getStatusEmoji(obj.status)
        okrContext += `${index + 1}. ${status} "${obj.title}" - ${obj.progress}% completado\n`
        if (obj.description) {
          okrContext += `   Descripción: ${obj.description}\n`
        }
        okrContext += `   Estado: ${obj.status} | Fechas: ${obj.start_date} - ${obj.end_date}\n`
      })
    } else {
      okrContext += "\n📊 No hay objetivos registrados actualmente.\n"
    }

    // Initiatives summary
    if (recentInitiatives.length > 0) {
      okrContext += `\n🎯 INICIATIVAS RECIENTES (${recentInitiatives.length}):\n`
      recentInitiatives.slice(0, 5).forEach((init, index) => {
        const status = this.getStatusEmoji(init.status)
        okrContext += `${index + 1}. ${status} "${init.title}" - ${init.progress}%\n`
      })
    }

    // Activities summary
    if (recentActivities.length > 0) {
      okrContext += `\n⚡ ACTIVIDADES RECIENTES (${recentActivities.length}):\n`
      recentActivities.slice(0, 5).forEach((act, index) => {
        const status = this.getStatusEmoji(act.status)
        okrContext += `${index + 1}. ${status} "${act.title}" - ${act.progress}%\n`
      })
    }

    // Performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics(context)
    okrContext += `\n📈 MÉTRICAS DE RENDIMIENTO:\n${performanceMetrics}`

    return okrContext
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case "completado": return "✅"
      case "en_progreso": return "🔄"
      case "pausado": return "⏸️"
      case "no_iniciado": return "⏳"
      default: return "❓"
    }
  }

  private calculatePerformanceMetrics(context: ConversationContext): string {
    const { currentOKRs, recentInitiatives, recentActivities } = context

    // Calculate objective metrics
    const totalObjectives = currentOKRs.length
    const completedObjectives = currentOKRs.filter(obj => obj.status === "completado").length
    const averageProgress = totalObjectives > 0
      ? Math.round(currentOKRs.reduce((sum, obj) => sum + obj.progress, 0) / totalObjectives)
      : 0

    // Calculate overdue items
    const today = new Date()
    const overdueObjectives = currentOKRs.filter(obj => {
      const endDate = new Date(obj.end_date)
      return endDate < today && obj.status !== "completado"
    }).length

    // Calculate on-track items (≥70% progress)
    const onTrackObjectives = currentOKRs.filter(obj => obj.progress >= 70).length

    let metrics = `- Objetivos totales: ${totalObjectives}\n`
    metrics += `- Objetivos completados: ${completedObjectives} (${totalObjectives > 0 ? Math.round((completedObjectives / totalObjectives) * 100) : 0}%)\n`
    metrics += `- Progreso promedio: ${averageProgress}%\n`
    metrics += `- Objetivos vencidos: ${overdueObjectives}\n`
    metrics += `- Objetivos en buen camino (≥70%): ${onTrackObjectives}\n`
    metrics += `- Iniciativas activas: ${recentInitiatives.length}\n`
    metrics += `- Actividades recientes: ${recentActivities.length}`

    return metrics
  }

  // Helper method to get contextual suggestions based on current state
  generateContextualSuggestions(context: ConversationContext): string[] {
    const suggestions: string[] = []
    const { currentOKRs, userRole } = context

    // Role-based suggestions
    if (userRole === "corporativo") {
      suggestions.push("Analizar el rendimiento organizacional general")
      suggestions.push("Revisar la alineación estratégica entre departamentos")
      suggestions.push("Generar un reporte ejecutivo de OKRs")
    } else if (userRole === "gerente") {
      suggestions.push("Analizar el rendimiento de mi equipo")
      suggestions.push("Identificar bloqueos en las iniciativas")
      suggestions.push("Planificar la próxima revisión de OKRs")
    } else {
      suggestions.push("Revisar mi progreso personal")
      suggestions.push("Obtener consejos para mejorar mi rendimiento")
      suggestions.push("Entender mejor mis objetivos")
    }

    // Data-driven suggestions
    if (currentOKRs.length === 0) {
      suggestions.push("Ayúdame a crear mi primer objetivo")
    } else {
      const lowProgressObjectives = currentOKRs.filter(obj => obj.progress < 30)
      if (lowProgressObjectives.length > 0) {
        suggestions.push("Analizar objetivos con poco progreso")
      }

      const overdueObjectives = currentOKRs.filter(obj => {
        const endDate = new Date(obj.end_date)
        return endDate < new Date() && obj.status !== "completado"
      })
      if (overdueObjectives.length > 0) {
        suggestions.push("Revisar objetivos vencidos")
      }
    }

    return suggestions.slice(0, 4) // Limit to 4 suggestions
  }

  // Build complete prompt for AI model
  buildCompletePrompt(message: string, context: ConversationContext): string {
    const contextualPrompt = this.buildContextualPrompt(message, context)

    const fullPrompt = `${contextualPrompt.systemPrompt}

${contextualPrompt.userContext}

${contextualPrompt.okrData}

${contextualPrompt.conversationHistory}

Pregunta del usuario: ${message}

Instrucciones para la respuesta:
1. Proporciona una respuesta útil y específica basada en el contexto
2. Si es relevante, incluye análisis de los datos de OKR actuales
3. Sugiere acciones concretas cuando sea apropiado
4. Mantén un tono profesional pero cercano
5. Limita la respuesta a 300 palabras máximo
6. Incluye ejemplos específicos cuando sea relevante

Respuesta:`

    return fullPrompt
  }
}