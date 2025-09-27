import { redirect } from "next/navigation";

export default function OnboardingPage() {
  // Redirect to welcome step
  redirect("/onboarding/welcome");
}