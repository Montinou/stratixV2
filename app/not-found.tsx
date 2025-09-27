export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <h2 className="text-2xl font-bold mb-4">404 - Página no encontrada</h2>
      <p className="text-muted-foreground mb-6">
        La página que buscas no existe o ha sido movida.
      </p>
      <a 
        href="/"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Volver al inicio
      </a>
    </div>
  )
}