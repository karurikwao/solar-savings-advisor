import { getCalculatorDefinition } from "@/lib/calculators";
import type { CalculatorDefinition, CalculatorField, CalculatorValues } from "@/lib/calculators/types";
import { normalizePageSlug, withTrackingParams } from "@/lib/tracking";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readProfile(profileKey: string) {
  try {
    return JSON.parse(localStorage.getItem(profileKey) || "{}") as CalculatorValues;
  } catch {
    return {};
  }
}

function writeProfile(profileKey: string, updates: CalculatorValues) {
  const next = { ...readProfile(profileKey), ...updates };
  localStorage.setItem(profileKey, JSON.stringify(next));
  return next;
}

function renderField(field: CalculatorField, value: unknown) {
  const inputMode = field.inputMode ? ` inputmode="${field.inputMode}"` : "";
  const label = escapeHtml(field.label);
  const placeholder = escapeHtml(field.placeholder);
  const stringValue = String(value ?? "");

  if (field.kind === "select") {
    const options = [["", field.placeholder], ...(field.options ?? [])]
      .map(([optionValue, optionLabel]) => {
        const selected = stringValue === optionValue ? " selected" : "";
        return `<option value="${escapeHtml(optionValue)}"${selected}>${escapeHtml(optionLabel)}</option>`;
      })
      .join("");
    return `<label class="block text-sm font-bold text-deep-navy">${label}<select data-field="${escapeHtml(field.id)}" class="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3">${options}</select></label>`;
  }

  return `<label class="block text-sm font-bold text-deep-navy">${label}<input data-field="${escapeHtml(field.id)}" value="${escapeHtml(stringValue)}" placeholder="${placeholder}"${inputMode} class="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3" /></label>`;
}

function reportHref(panel: HTMLElement, definition: CalculatorDefinition) {
  const reportPath = panel.dataset.reportPath || "/solar-report/";
  return withTrackingParams(reportPath, {
    placementId: panel.dataset.resultPlacementId || "calculator-results",
    pageSlug: normalizePageSlug(window.location.pathname),
    offerId: definition.resultOfferId || panel.dataset.offerId || "free-solar-report",
    partnerId: definition.resultPartnerId || panel.dataset.partnerId || "solar-savings-advisor",
  });
}

function renderResult(panel: HTMLElement, definition: CalculatorDefinition, rows: Array<[string, string]>) {
  const container = panel.querySelector<HTMLElement>("[data-results]");
  if (!container) return;

  const disclaimer = panel.dataset.disclaimer || "Calculator results are educational estimates only.";
  const buttonLabel = definition.resultButtonLabel || panel.dataset.resultButtonLabel || "Get Report";

  container.innerHTML =
    rows
      .map(
        ([label, value]) =>
          `<div class="mb-3 rounded-xl bg-green-50 p-4"><p class="text-sm text-gray-600">${escapeHtml(label)}</p><p class="text-2xl font-black text-deep-navy">${escapeHtml(value)}</p></div>`
      )
      .join("") +
    `<div class="mt-4 rounded-xl border border-solar-yellow/30 bg-solar-yellow/10 p-4 text-xs leading-relaxed text-gray-600"><strong class="text-deep-navy">Educational estimate:</strong> ${escapeHtml(disclaimer)}</div><a class="mt-4 block rounded-xl bg-deep-navy px-6 py-3 text-center font-bold text-white" href="${escapeHtml(reportHref(panel, definition))}">${escapeHtml(buttonLabel)}</a>`;
}

function hydratePanel(panel: HTMLElement) {
  if (panel.dataset.hydrated === "true") return;
  panel.dataset.hydrated = "true";

  const type = panel.dataset.calculator || "";
  const definition = getCalculatorDefinition(type);
  const fieldContainer = panel.querySelector<HTMLElement>("[data-fields]");
  const calculateButton = panel.querySelector<HTMLButtonElement>("[data-calculate]");

  if (!definition || !fieldContainer || !calculateButton) {
    if (fieldContainer) fieldContainer.innerHTML = `<p class="text-sm text-bright-orange">Calculator type is not registered.</p>`;
    return;
  }

  const profileKey = panel.dataset.profileKey || "advisorSite.profile.v1";
  const profile = readProfile(profileKey);
  const values: CalculatorValues = { ...definition.defaults(profile) };

  fieldContainer.innerHTML = definition.fields.map((field) => renderField(field, values[field.id])).join("");

  panel.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-field]").forEach((input) => {
    const save = () => {
      const fieldId = input.dataset.field || "";
      values[fieldId] = input.value;
      const field = definition.fields.find((item) => item.id === fieldId);
      if (field?.profileKey) writeProfile(profileKey, { [field.profileKey]: input.value });
    };

    input.addEventListener("input", save);
    input.addEventListener("change", save);
  });

  calculateButton.addEventListener("click", () => {
    renderResult(panel, definition, definition.calculate(values));
  });
}

export function hydrateCalculatorPanels() {
  document.querySelectorAll<HTMLElement>("[data-calculator]").forEach(hydratePanel);
}
