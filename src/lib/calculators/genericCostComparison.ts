import { money, num } from "@/lib/calculators/shared";
import type { CalculatorDefinition } from "@/lib/calculators/types";

export const genericCostComparisonCalculator: CalculatorDefinition = {
  type: "generic-cost-comparison",
  resultOfferId: "primary-offer",
  resultPartnerId: "advisor-site",
  resultButtonLabel: "Compare Recommended Options",
  fields: [
    { id: "optionAName", label: "Option A Name", kind: "text", placeholder: "e.g. Current provider" },
    { id: "optionBName", label: "Option B Name", kind: "text", placeholder: "e.g. New provider" },
    { id: "monthlyA", label: "Option A Monthly Cost ($)", kind: "text", placeholder: "e.g. 250", inputMode: "decimal" },
    { id: "monthlyB", label: "Option B Monthly Cost ($)", kind: "text", placeholder: "e.g. 210", inputMode: "decimal" },
    { id: "setupA", label: "Option A Setup Cost ($)", kind: "text", placeholder: "e.g. 0", inputMode: "decimal" },
    { id: "setupB", label: "Option B Setup Cost ($)", kind: "text", placeholder: "e.g. 300", inputMode: "decimal" },
    { id: "termMonths", label: "Comparison Period (months)", kind: "text", placeholder: "e.g. 24", inputMode: "decimal" },
  ],
  defaults(profile) {
    return {
      optionAName: profile.optionAName || "Option A",
      optionBName: profile.optionBName || "Option B",
      termMonths: profile.termMonths || 24,
    };
  },
  calculate(values) {
    const monthlyA = num(values.monthlyA, 250);
    const monthlyB = num(values.monthlyB, 210);
    const setupA = num(values.setupA, 0);
    const setupB = num(values.setupB, 300);
    const term = num(values.termMonths, 24);
    const totalA = setupA + monthlyA * term;
    const totalB = setupB + monthlyB * term;
    const winner = totalA <= totalB ? String(values.optionAName || "Option A") : String(values.optionBName || "Option B");

    return [
      [`${values.optionAName || "Option A"} Total`, money(totalA)],
      [`${values.optionBName || "Option B"} Total`, money(totalB)],
      ["Estimated Difference", money(Math.abs(totalA - totalB))],
      ["Lower Estimated Cost", winner],
    ];
  },
};
