import type { AdColor } from "@/lib/validations";

// Tailwind's scanner needs full literal class strings somewhere in source —
// building "from-${color}-500" at runtime wouldn't get picked up at build
// time, hence this lookup instead of a template string.
export const AD_COLOR_GRADIENTS: Record<AdColor, string> = {
  green: "from-green-500 to-green-700 dark:from-green-600 dark:to-green-800",
  blue: "from-blue-500 to-blue-700 dark:from-blue-600 dark:to-blue-800",
  orange: "from-orange-500 to-orange-700 dark:from-orange-600 dark:to-orange-800",
  purple: "from-purple-500 to-purple-700 dark:from-purple-600 dark:to-purple-800",
  rose: "from-rose-500 to-rose-700 dark:from-rose-600 dark:to-rose-800",
  slate: "from-slate-500 to-slate-700 dark:from-slate-600 dark:to-slate-800",
};

// Solid swatch (no gradient) for color-picker buttons.
export const AD_COLOR_SWATCHES: Record<AdColor, string> = {
  green: "bg-green-600",
  blue: "bg-blue-600",
  orange: "bg-orange-600",
  purple: "bg-purple-600",
  rose: "bg-rose-600",
  slate: "bg-slate-600",
};
