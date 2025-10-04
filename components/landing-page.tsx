"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowRight, Zap, Target, TrendingUp, Users, Shield, Sparkles } from "lucide-react";
import Link from "next/link";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background/90">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              StratixV2
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/handler/sign-in">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/handler/sign-up">
              <Button size="sm" className="gap-2">
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            <Badge variant="secondary" className="gap-2">
              <Zap className="w-3 h-3" />
              AI-Powered Strategy Management
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Transform Your{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Strategic Vision
              </span>
              {" "}Into Reality
            </h1>

            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Empower your organization with intelligent OKR management, real-time analytics,
              and AI-driven insights. Make data-driven decisions faster than ever.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link href="/handler/sign-up">
                <Button size="lg" className="gap-2 text-lg px-8 py-6">
                  Start Free Trial <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/handler/sign-in">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-4xl font-bold mb-4">Everything You Need to Succeed</h2>
            <p className="text-muted-foreground text-lg">
              Powerful tools designed for modern strategic management
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Target,
                title: "Goal Alignment",
                description: "Cascade objectives across your organization with precision and clarity.",
                color: "text-blue-500"
              },
              {
                icon: TrendingUp,
                title: "Real-Time Analytics",
                description: "Track progress with live dashboards and actionable insights.",
                color: "text-green-500"
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description: "Seamless collaboration tools to keep everyone aligned and productive.",
                color: "text-purple-500"
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                description: "Bank-grade encryption and compliance with industry standards.",
                color: "text-orange-500"
              },
              {
                icon: Zap,
                title: "AI-Powered Insights",
                description: "Leverage machine learning to optimize your strategic planning.",
                color: "text-yellow-500"
              },
              {
                icon: Sparkles,
                title: "Smart Automation",
                description: "Automate routine tasks and focus on what matters most.",
                color: "text-pink-500"
              }
            ].map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2">
                <feature.icon className={`w-12 h-12 mb-4 ${feature.color}`} />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            {[
              { value: "10K+", label: "Active Users" },
              { value: "500K+", label: "Objectives Tracked" },
              { value: "99.9%", label: "Uptime SLA" }
            ].map((stat, index) => (
              <div key={index}>
                <div className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground text-lg">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Strategy?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of teams already using StratixV2 to achieve their most ambitious goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/handler/sign-up">
              <Button size="lg" className="gap-2 text-lg px-8 py-6">
                Get Started Now <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">StratixV2</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 StratixV2. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
