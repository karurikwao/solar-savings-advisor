import { money, num } from "@/lib/calculators/shared";
import type { CalculatorDefinition } from "@/lib/calculators/types";

export const genericSavingsCalculator: CalculatorDefinition = {
  type: "generic-savings",
  resultOfferId: "primary-offer",
  resultPartnerId: "advisor-site",
  resultButtonLabel: "See Recommended Next Step",
  fields: [
    { id: "currentCost", label: "Current Monthly Cost ($)", kind: "text", placeholder: "e.g. 250", profileKey: "currentMonthlyCost", inputMode: "decimal" },
    { id: "newCost", label: "Estimated New Monthly Cost ($)", kind: "text", placeholder: "e.g. 175", profileKey: "newMonthlyCost", inputMode: "decimal" },
    { id: "switchCost", label: "One-Time Switching Cost ($)", kind: "text", placeholder: "e.g. 500", inputMode: "decimal" },
    { id: "termYears", label: "Analysis Period (years)", kind: "text", placeholder: "e.g. 3", inputMode: "decimal" },
  ],
  defaults(profile) {
    return {
      currentCost: profile.currentMonthlyCost,
      newCost: profile.newMonthlyCost,
      termYears: profile.termYears || 3,
    };
  },
  calculate(values) {
    const current = num(values.currentCost, 250);
    const next = num(values.newCost, 175);
    const switchCost = num(values.switchCost, 500);
    const years = num(values.termYears, 3);
    const monthlySavings = current - next;
    const totalSavings = monthlySavings * 12 * years - switchCost;
    const paybackMonths = monthlySavings > 0 ? Math.ceil(switchCost / monthlySavings) : 0;

    return [
      ["Estimated Monthly Savings", money(monthlySavings)],
      ["Estimated Annual Savings", money(monthlySavings * 12)],
      ["Estimated Net Savings", money(totalSavings)],
      ["Estimated Payback", paybackMonths ? `${paybackMonths} months` : "N/A"],
    ];
  },
};
