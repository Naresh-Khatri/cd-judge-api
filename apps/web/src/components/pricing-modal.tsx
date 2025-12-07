'use client';

import { Check } from 'lucide-react';

import { Button } from '@acme/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@acme/ui/dialog';
import { Card } from '@acme/ui/card';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for trying out cd judge',
    features: [
      '500k executions/month',
      'Basic support',
      '5 API keys',
      '100ms avg latency',
    ],
    cta: 'Current Plan',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For professional developers and teams',
    features: [
      '5M executions/month',
      'Priority support',
      'Unlimited API keys',
      '50ms avg latency',
      'Advanced analytics',
      'Custom limits',
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large scale applications',
    features: [
      'Unlimited executions',
      'Dedicated support',
      'SLA guarantee',
      '25ms avg latency',
      'Custom integrations',
      'Volume discounts',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            Choose the perfect plan for your execution needs
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`p-6 flex flex-col ${plan.highlighted
                  ? 'border-primary shadow-lg shadow-primary/20'
                  : ''
                }`}
            >
              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.description}
                </p>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check
                      size={16}
                      className="text-primary flex-shrink-0"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-6"
                variant={plan.highlighted ? 'default' : 'outline'}
                disabled={plan.name === 'Free'}
              >
                {plan.cta}
              </Button>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
