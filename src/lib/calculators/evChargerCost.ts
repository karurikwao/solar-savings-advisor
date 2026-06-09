import { money, num } from "@/lib/calculators/shared";
import type { CalculatorDefinition } from "@/lib/calculators/types";

export const evChargerCostCalculator: CalculatorDefinition = {
  type: "ev-charger",
  resultOfferId: "free-solar-report",
  resultPartnerId: "solar-savings-advisor",
  resultButtonLabel: "Get My Solar Report",
  fields: [
    { id: "chargerLevel", label: "Charger Level", kind: "select", placeholder: "Select charger", options: [["level1", "Level 1"], ["level2", "Level 2"], ["level2solar", "Level 2 + Solar"]], profileKey: "chargerLevel" },
    { id: "panelUpgrade", label: "Panel Upgrade Needed?", kind: "select", placeholder: "Select", options: [["yes", "Yes"], ["no", "No"], ["unsure", "Not sure"]], profileKey: "panelUpgrade" },
    { id: "dailyMiles", label: "Daily Driving Distance (miles)", kind: "text", placeholder: "e.g. 40", profileKey: "dailyMiles", inputMode: "decimal" },
    { id: "electricRate", label: "Electricity Rate ($/kWh)", kind: "text", placeholder: "e.g. 0.15", profileKey: "electricityRate", inputMode: "decimal" },
  ],
  defaults(profile) {
    return {
      electricRate: profile.electricityRate,
      chargerLevel: profile.chargerLevel || "level2",
      panelUpgrade: profile.panelUpgrade,
      dailyMiles: profile.dailyMiles,
    };
  },
  calculate(values) {
    const costs: Record<string, number> = { level1: 300, level2: 2000, level2solar: 3000 };
    const panel = values.panelUpgrade === "yes" ? 2000 : values.panelUpgrade === "unsure" ? 1000 : 0;
    const miles = num(values.dailyMiles, 40);
    const rate = num(values.electricRate, 0.15);
    const monthly = miles * 0.3 * rate * 30;
    const gas = miles * 30 * 0.12;

    return [
      ["Estimated Installation Cost", money((costs[String(values.chargerLevel)] || 2000) + panel)],
      ["Monthly EV Charging Cost", money(monthly)],
      ["Monthly Gas Equivalent", money(gas)],
      ["Estimated Monthly Savings vs Gas", money(gas - monthly)],
    ];
  },
};
