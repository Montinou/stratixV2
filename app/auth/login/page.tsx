import { createNeonServerClient } from "@/lib/neon-auth/server"
import { redirect } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage() {
  const neonServer = createNeonServerClient()
  
  try {
    const user = await neonServer.getUser()
    if (user) {
      redirect("/dashboard")
    }
  } catch (error) {
    // User not authenticated, continue to show login form
    console.log("User not authenticated")
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary">OKR Manager</h1>
            <p className="text-muted-foreground mt-2">Sistema de gestión de objetivos</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
