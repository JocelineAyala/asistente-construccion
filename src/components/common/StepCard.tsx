import { Card } from '../ui/Card';

type StepCardProps = {
  step: string;
  stepNumber: number;
};

export function StepCard({ step, stepNumber }: StepCardProps) {
  return (
    <Card className="step-card">
      <span className="step-number">{stepNumber}</span>
      <p>{step}</p>
    </Card>
  );
}
