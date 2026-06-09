import { financingOptions, money, num, solarDerivedDefaults, stateOptions, sunMultiplier, sunOptions } from "@/lib/calculators/shared";
import type { CalculatorDefinition } from "@/lib/calculators/types";

export const solarSavingsCalculator: CalculatorDefinition = {
  type: "solar-savings",
  resultOfferId: "free-solar-report",
  resultPartnerId: "solar-savings-advisor",
  resultButtonLabel: "Get My Solar Report",
  fields: [
    { id: "zip", label: "ZIP Code", kind: "text", placeholder: "e.g. 90210", profileKey: "zip", inputMode: "numeric" },
    { id: "state", label: "State", kind: "select", placeholder: "Select your state", options: stateOptions, profileKey: "state" },
    { id: "bill", label: "Average Monthly Electric Bill ($)", kind: "text", placeholder: "e.g. 150", profileKey: "monthlyBill", inputMode: "decimal" },
    { id: "rate", label: "Estimated Electricity Rate ($/kWh)", kind: "text", placeholder: "e.g. 0.15", profileKey: "electricityRate", inputMode: "decimal" },
    { id: "sun", label: "Roof Sun Exposure", kind: "select", placeholder: "Select sun exposure", options: sunOptions, profileKey: "sunExposure" },
    { id: "homeSize", label: "Home Size (sq ft)", kind: "text", placeholder: "e.g. 2000", profileKey: "homeSize", inputMode: "numeric" },
    { id: "financing", label: "Financing Option", kind: "select", placeholder: "Select financing", options: financingOptions, profileKey: "financingPreference" },
  ],
  defaults(profile) {
    return {
      zip: profile.zip,
      state: profile.state,
      bill: profile.monthlyBill,
      rate: profile.electricityRate,
      sun: profile.sunExposure,
      homeSize: profile.homeSize,
      financing: profile.financingPreference,
    };
  },
  calculate(values) {
    const bill = num(values.bill, 150);
    const rate = num(values.rate, 0.15);
    const mult = sunMultiplier(values.sun);
    const size = Math.round(((bill / rate) * 0.8 / 150) * mult * 10) / 10;
    const monthly = Math.round(bill * 0.7 * mult);
    const yearly = monthly * 12;

    return [
      ["Estimated System Size", `${size} kW`],
      ["Estimated Monthly Savings", money(monthly)],
      ["Estimated Yearly Savings", money(yearly)],
      ["Estimated 25-Year Savings", money(yearly * 25 * 0.85)],
      ["Estimated Payback Period", values.financing === "lease" ? "N/A (lease)" : `~${Math.round(20000 / yearly)} years`],
    ];
  },
};

export const solarPaybackCalculator: CalculatorDefinition = {
  type: "solar-payback",
  resultOfferId: "free-solar-report",
  resultPartnerId: "solar-savings-advisor",
  resultButtonLabel: "Get My Solar Report",
  fields: [
    { id: "systemCost", label: "Estimated System Cost ($)", kind: "text", placeholder: "e.g. 20000", inputMode: "decimal" },
    { id: "incentive", label: "Estimated Incentives ($)", kind: "text", placeholder: "e.g. 6000", inputMode: "decimal" },
    { id: "monthlySavings", label: "Estimated Monthly Savings ($)", kind: "text", placeholder: "e.g. 150", profileKey: "monthlySavings", inputMode: "decimal" },
    { id: "financing", label: "Financing Type", kind: "select", placeholder: "Select financing", options: [["cash", "Cash"], ["loan", "Loan 5% APR"], ["loan7", "Loan 7% APR"]], profileKey: "financingPreference" },
  ],
  defaults(profile) {
    const derived = solarDerivedDefaults(profile);
    return {
      systemCost: derived.systemCost,
      incentive: Math.round(derived.systemCost * 0.3),
      monthlySavings: derived.monthlySavings,
      financing: profile.financingPreference || "cash",
    };
  },
  calculate(values) {
    const net = Math.max(0, num(values.systemCost, 20000) - num(values.incentive, 6000));
    const savings = num(values.monthlySavings, 150);

    return [
      ["Net Cost After Incentives", money(net)],
      ["Estimated Payback", `${Math.ceil(net / savings)} months`],
      ["Estimated Annual ROI", `${Math.round(((savings * 12) / Math.max(net, 1)) * 100)}%`],
    ];
  },
};

export const solarLoanCalculator: CalculatorDefinition = {
  type: "solar-loan",
  resultOfferId: "free-solar-report",
  resultPartnerId: "solar-savings-advisor",
  resultButtonLabel: "Get My Solar Report",
  fields: [
    { id: "loanAmount", label: "Loan Amount ($)", kind: "text", placeholder: "e.g. 18000", inputMode: "decimal" },
    { id: "loanRate", label: "Interest Rate (%)", kind: "text", placeholder: "e.g. 5.5", profileKey: "loanRate", inputMode: "decimal" },
    { id: "loanTerm", label: "Loan Term", kind: "select", placeholder: "Select term", options: [["10", "10 Years"], ["15", "15 Years"], ["20", "20 Years"], ["25", "25 Years"]], profileKey: "loanTerm" },
    { id: "monthlySavings", label: "Estimated Monthly Solar Savings ($)", kind: "text", placeholder: "e.g. 150", profileKey: "monthlySavings", inputMode: "decimal" },
  ],
  defaults(profile) {
    const derived = solarDerivedDefaults(profile);
    return {
      loanAmount: Math.round(derived.systemCost * 0.7),
      loanRate: profile.loanRate,
      loanTerm: profile.loanTerm || "20",
      monthlySavings: derived.monthlySavings,
    };
  },
  calculate(values) {
    const principal = num(values.loanAmount, 18000);
    const monthlyRate = num(values.loanRate, 5.5) / 100 / 12;
    const months = (Number.parseInt(String(values.loanTerm || "20"), 10) || 20) * 12;
    const payment =
      monthlyRate > 0
        ? (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) / (Math.pow(1 + monthlyRate, months) - 1)
        : principal / months;
    const total = payment * months;
    const savings = num(values.monthlySavings, 150);
    const net = savings - payment;

    return [
      ["Monthly Payment", money(payment)],
      ["Total Interest Paid", money(total - principal)],
      ["Total Cost of Loan", money(total)],
      ["Net Monthly", `${net >= 0 ? "+" : ""}${money(net)}`],
    ];
  },
};
