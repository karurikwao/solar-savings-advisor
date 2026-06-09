import type { CalculatorValues } from "@/lib/calculators/types";

export const stateOptions: Array<[string, string]> = [
  ["CA", "California"],
  ["TX", "Texas"],
  ["FL", "Florida"],
  ["AZ", "Arizona"],
  ["MA", "Massachusetts"],
  ["NY", "New York"],
  ["CO", "Colorado"],
  ["NC", "North Carolina"],
  ["NJ", "New Jersey"],
  ["IL", "Illinois"],
  ["other", "Other"],
];

export const sunOptions: Array<[string, string]> = [
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
];

export const financingOptions: Array<[string, string]> = [
  ["cash", "Cash"],
  ["loan", "Loan"],
  ["lease", "Lease/PPA"],
  ["unsure", "Not sure"],
];

export function num(value: unknown, fallback: number) {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function money(value: number) {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}$${Math.abs(rounded).toLocaleString()}`;
}

export function sunMultiplier(value: unknown) {
  return value === "high" ? 1.2 : value === "low" ? 0.7 : 1;
}

export function solarDerivedDefaults(profile: CalculatorValues) {
  const bill = num(profile.monthlyBill, 150);
  const rate = num(profile.electricityRate, 0.15);
  const monthlySavings = Math.round(bill * 0.7 * sunMultiplier(profile.sunExposure));
  const systemSize = Math.round(((bill / rate) * 0.8 / 150) * sunMultiplier(profile.sunExposure) * 10) / 10;
  const systemCost = Math.round(systemSize * 1000 * 3.2);

  return { bill, rate, monthlySavings, systemSize, systemCost };
}
