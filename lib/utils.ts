/**
 * lib/utils.ts
 * shadcn/ui utility — cn() class merge helper.
 * Required by all shadcn components.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names safely, resolving conflicts.
 * @example cn("px-4 py-2", condition && "text-red-500")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
