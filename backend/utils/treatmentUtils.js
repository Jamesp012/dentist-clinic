function sanitizeTreatmentInput(body) {
  const {
    cost, amountPaid, remainingBalance, paymentType, installmentPlan
  } = body || {};

  const safeCost = Number(cost);
  const safeAmountPaid = Number(amountPaid);
  const safeRemainingBalance = Number(remainingBalance);

  return {
    cost: Number.isFinite(safeCost) ? safeCost : 0,
    amountPaid: Number.isFinite(safeAmountPaid) ? safeAmountPaid : 0,
    remainingBalance: Number.isFinite(safeRemainingBalance) ? safeRemainingBalance : 0,
    paymentType: paymentType || 'full',
    installmentPlan: installmentPlan ? JSON.stringify(installmentPlan) : null,
  };
}

module.exports = { sanitizeTreatmentInput };
