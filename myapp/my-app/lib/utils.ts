import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const splitPairsAndItems = (totalItems: number) => {
  return {
    pairs: Math.floor(totalItems / 2),
    singles: totalItems % 2,
  };
};

export const formatPairsAndSingles = (totalItems: number, unitOfMeasure?: string) => {
  if (unitOfMeasure === "PAIRS") {
    const { pairs, singles } = splitPairsAndItems(totalItems);
    let display = "";
    if (pairs > 0) display += `${pairs}P`;
    if (singles > 0) display += `${display ? ' / ' : ''}${singles}S`;
    if (!display) display = "0";
    return `${display} (${totalItems} pcs)`;
  }
  return `${totalItems} pcs`;
};
