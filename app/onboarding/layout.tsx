import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configuración de Onboarding - StratixV2",
  description: "Configura tu organización y comienza a usar StratixV2 en minutos",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}