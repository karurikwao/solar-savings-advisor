import { money, num, solarDerivedDefaults } from "@/lib/calculators/shared";
import type { CalculatorDefinition } from "@/lib/calculators/types";

export const batteryBackupCalculator: CalculatorDefinition = {
  type: "battery-backup",
  resultOfferId: "free-solar-report",
  resultPartnerId: "solar-savings-advisor",
  resultButtonLabel: "Get My Solar Report",
  fields: [
    { id: "dailyUsage", label: "Daily Electricity Usage (kWh)", kind: "text", placeholder: "e.g. 30", inputMode: "decimal" },
    { id: "outageFreq", label: "Power Outage Frequency", kind: "select", placeholder: "Select", options: [["rare", "Rare"], ["occasional", "Occasional"], ["frequent", "Frequent"]], profileKey: "outageFreq" },
    { id: "essential", label: "Essential Load Priority", kind: "select", placeholder: "Select", options: [["critical", "Critical only"], ["moderate", "Moderate"], ["whole", "Whole home"]], profileKey: "essentialLoad" },
    { id: "solarInstalled", label: "Do you have solar panels?", kind: "select", placeholder: "Select", options: [["yes", "Yes"], ["no", "No"], ["planning", "Planning to install"]], profileKey: "solarInstalled" },
  ],
  defaults(profile) {
    const derived = solarDerivedDefaults(profile);
    return {
      dailyUsage: Math.round((derived.bill / derived.rate / 30) * 10) / 10,
      outageFreq: profile.outageFreq,
      essential: profile.essentialLoad,
      solarInstalled: profile.solarInstalled || "planning",
    };
  },
  calculate(values) {
    const daily = num(values.dailyUsage, 30);
    const multiplier = values.essential === "critical" ? 0.25 : values.essential === "moderate" ? 0.5 : 1;
    const kwh = Math.round(daily * multiplier * 10) / 10;
    const count = Math.ceil(kwh / 13.5);

    return [
      ["Recommended Capacity", `${kwh} kWh`],
      ["Estimated Batteries Needed", `${count} unit${count > 1 ? "s" : ""}`],
      ["Estimated Installed Cost", money(count * 10000)],
      ["Outage Need Score", values.outageFreq === "frequent" ? "High" : values.outageFreq === "occasional" ? "Medium" : "Low"],
    ];
  },
};
