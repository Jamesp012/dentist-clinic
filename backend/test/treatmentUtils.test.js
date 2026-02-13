const { expect } = require('chai');
const { sanitizeTreatmentInput } = require('../utils/treatmentUtils');

describe('sanitizeTreatmentInput', () => {
  it('returns zeros for missing numeric fields', () => {
    const result = sanitizeTreatmentInput({});
    expect(result.cost).to.equal(0);
    expect(result.amountPaid).to.equal(0);
    expect(result.remainingBalance).to.equal(0);
  });

  it('coerces string numbers to numbers', () => {
    const result = sanitizeTreatmentInput({ cost: '123.45', amountPaid: '10', remainingBalance: '113.45' });
    expect(result.cost).to.equal(123.45);
    expect(result.amountPaid).to.equal(10);
    expect(result.remainingBalance).to.equal(113.45);
  });

  it('defaults paymentType and serializes installmentPlan', () => {
    const result = sanitizeTreatmentInput({ paymentType: null, installmentPlan: { a: 1 } });
    expect(result.paymentType).to.equal('full');
    expect(result.installmentPlan).to.equal(JSON.stringify({ a: 1 }));
  });

  it('handles NaN and invalid values safely', () => {
    const result = sanitizeTreatmentInput({ cost: 'abc', amountPaid: null, remainingBalance: undefined });
    expect(result.cost).to.equal(0);
    expect(result.amountPaid).to.equal(0);
    expect(result.remainingBalance).to.equal(0);
  });

  it('reuses existing defaults when fields are omitted', () => {
    const defaults = {
      cost: 20000,
      amountPaid: 8000,
      remainingBalance: 12000,
      paymentType: 'installment',
      installmentPlan: '{"terms":6}'
    };
    const result = sanitizeTreatmentInput({}, defaults);
    expect(result.cost).to.equal(20000);
    expect(result.amountPaid).to.equal(8000);
    expect(result.remainingBalance).to.equal(12000);
    expect(result.paymentType).to.equal('installment');
    expect(result.installmentPlan).to.equal('{"terms":6}');
  });
});
