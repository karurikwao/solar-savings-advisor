import type { ToolContent } from "@/lib/types";

function fromGlob<T>(modules: Record<string, unknown>) {
  return Object.values(modules).map((module) => {
    const value = module as { default?: T };
    return (value.default ?? module) as T;
  });
}

export const tools = fromGlob<ToolContent>(
  import.meta.glob("../content/tools/*.json", { eager: true })
).sort((a, b) => a.title.localeCompare(b.title));

export function getToolPath(tool: ToolContent) {
  return tool.path ?? tool.id;
}
