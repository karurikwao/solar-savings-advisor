export type CalculatorFieldKind = "text" | "select";

export interface CalculatorField {
  id: string;
  label: string;
  kind: CalculatorFieldKind;
  placeholder: string;
  options?: Array<[string, string]>;
  profileKey?: string;
  inputMode?: "text" | "numeric" | "decimal";
}

export type CalculatorValues = Record<string, string | number | undefined>;
export type CalculatorProfile = Record<string, string | number | undefined>;
export type CalculatorResultRow = [label: string, value: string];

export interface CalculatorDefinition {
  type: string;
  fields: CalculatorField[];
  defaults: (profile: CalculatorProfile) => CalculatorValues;
  calculate: (values: CalculatorValues) => CalculatorResultRow[];
  resultOfferId?: string;
  resultPartnerId?: string;
  resultButtonLabel?: string;
}
