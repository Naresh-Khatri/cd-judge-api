"use client";

import { Check } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const plans = [
  {
    name: "Self-Hosted",
    price: "Free",
    period: " / forever",
    description: "Deploy on your own infrastructure",
    features: [
      "Unlimited executions",
      "10 API keys",
      "10 languages",
      "No rate limits",
      "Full source code access",
      "Interactive playground",
      "Performance benchmarking",
      "OpenAPI docs",
    ],
    cta: "View on GitHub",
    ctaHref: "https://github.com/naresh-khatri/cd-judge-api",
    highlighted: false,
    disabled: false,
  },
  {
    name: "Managed",
    price: "$0",
    period: " / month",
    description: "Hosted by us — generous free tier",
    features: [
      "Unlimited executions",
      "10 API keys",
      "10 languages",
      "100 requests / minute",
      "1,000 requests / hour",
      "Interactive playground",
      "Performance benchmarking",
      "Zero maintenance",
    ],
    cta: "Current Plan",
    ctaHref: undefined,
    highlighted: true,
    disabled: true,
  },
  {
    name: "Managed Pro",
    price: "$29",
    period: " / month",
    description: "For teams and production workloads",
    features: [
      "Everything in Managed",
      "Unlimited API keys",
      "Priority support",
      "Higher rate limits",
      "Webhooks",
      "Custom domains",
      "SLA guarantee",
      "Advanced analytics",
    ],
    cta: "Coming Soon",
    ctaHref: undefined,
    highlighted: false,
    disabled: true,
  },
];

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] min-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Plans & Pricing</DialogTitle>
          <DialogDescription>
            Self-host for free or use our managed service
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`flex flex-col p-6 ${
                plan.highlighted
                  ? "border-primary shadow-primary/20 shadow-lg"
                  : ""
              }`}
            >
              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {plan.description}
                </p>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </div>
              <ul className="flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {plan.ctaHref ? (
                <Button
                  className="mt-6 w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  asChild
                >
                  <a
                    href={plan.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {plan.cta}
                  </a>
                </Button>
              ) : (
                <Button
                  className="mt-6 w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  disabled={plan.disabled}
                >
                  {plan.cta}
                </Button>
              )}
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
