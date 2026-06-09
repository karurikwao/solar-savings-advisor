import { batteryBackupCalculator } from "@/lib/calculators/batteryBackup";
import { evChargerCostCalculator } from "@/lib/calculators/evChargerCost";
import { genericCostComparisonCalculator } from "@/lib/calculators/genericCostComparison";
import { genericSavingsCalculator } from "@/lib/calculators/genericSavings";
import { solarLoanCalculator, solarPaybackCalculator, solarSavingsCalculator } from "@/lib/calculators/solarSavings";
import type { CalculatorDefinition } from "@/lib/calculators/types";

// Calculator modules are registered here so content JSON can select behavior by calculatorType.
export const calculatorDefinitions: CalculatorDefinition[] = [
  solarSavingsCalculator,
  solarPaybackCalculator,
  solarLoanCalculator,
  batteryBackupCalculator,
  evChargerCostCalculator,
  genericSavingsCalculator,
  genericCostComparisonCalculator,
];

export function getCalculatorDefinition(type: string) {
  return calculatorDefinitions.find((definition) => definition.type === type);
}
