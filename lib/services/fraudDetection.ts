export interface FraudCheckContext {
  email: string;
  phone: string;
  ipAddress?: string;
  shippingAddress: {
    governorate: string;
    city: string;
    street: string;
  };
  totalAmountInCents: number;
  paymentMethod: string;
  recentAttemptsCount?: number;
}

export interface FraudCheckResult {
  riskScore: number; // 0 (Safe) to 100 (High Risk)
  status: 'Approved' | 'ReviewRequired' | 'Rejected';
  flags: string[];
}

export interface IFraudDetector {
  evaluate(context: FraudCheckContext): Promise<FraudCheckResult>;
}

class FraudDetectionService implements IFraudDetector {
  async evaluate(context: FraudCheckContext): Promise<FraudCheckResult> {
    let riskScore = 0;
    const flags: string[] = [];

    // 1. High Velocity Check
    if (context.recentAttemptsCount && context.recentAttemptsCount > 3) {
      riskScore += 40;
      flags.push('HIGH_PAYMENT_ATTEMPT_VELOCITY');
    }

    // 2. High Value Order Check (> 50,000 EGP)
    if (context.totalAmountInCents > 5000000) {
      riskScore += 25;
      flags.push('HIGH_VALUE_ORDER_THRESHOLD');
    }

    // 3. Disposable Email Domain Check
    const disposableDomains = ['tempmail.com', 'throwaway.org', 'guerrillamail.com', 'mailinator.com'];
    const domain = context.email.split('@')[1]?.toLowerCase();
    if (domain && disposableDomains.includes(domain)) {
      riskScore += 50;
      flags.push('DISPOSABLE_EMAIL_DOMAIN');
    }

    let status: FraudCheckResult['status'] = 'Approved';
    if (riskScore >= 70) {
      status = 'Rejected';
    } else if (riskScore >= 40) {
      status = 'ReviewRequired';
    }

    return {
      riskScore,
      status,
      flags,
    };
  }
}

export const fraudDetectionService: IFraudDetector = new FraudDetectionService();
