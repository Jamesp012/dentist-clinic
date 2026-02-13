function sanitizeTreatmentInput(body, defaults = {}) {
  const deriveNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
    const parsedFallback = Number(fallback);
    return Number.isFinite(parsedFallback) ? parsedFallback : 0;
  };

  const normalizedCost = body?.cost ?? defaults.cost;
  const normalizedAmountPaid = body?.amountPaid ?? defaults.amountPaid;
  const normalizedRemainingBalance = body?.remainingBalance ?? defaults.remainingBalance;
  const normalizedPaymentType = body?.paymentType ?? defaults.paymentType;
  const normalizedInstallmentPlan = body?.installmentPlan ?? defaults.installmentPlan;

  const serializeInstallmentPlan = (plan) => {
    if (!plan) {
      return null;
    }
    if (typeof plan === 'string') {
      return plan;
    }
    try {
      return JSON.stringify(plan);
    } catch (error) {
      console.error('Failed to serialize installment plan:', error);
      return null;
    }
  };

  return {
    cost: deriveNumber(normalizedCost, defaults.cost),
    amountPaid: deriveNumber(normalizedAmountPaid, defaults.amountPaid),
    remainingBalance: deriveNumber(normalizedRemainingBalance, defaults.remainingBalance),
    paymentType: normalizedPaymentType || 'full',
    installmentPlan: serializeInstallmentPlan(normalizedInstallmentPlan),
  };
}

module.exports = { sanitizeTreatmentInput };
