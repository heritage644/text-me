import { cn } from "../../../lib/cn";
import { focusRing } from "../../../components/ui/styles";
import type { TagColor } from "../../../types/types";
import { tagColorClasses, tagColors } from "../tag-colors";

type ColorSwatchesProps = {
  value: TagColor;
  onChange: (color: TagColor) => void;
  className?: string;
};

/** The tag colour picker. Colours are palette keys, so the backend stores a plain string. */
export function ColorSwatches({ value, onChange, className }: ColorSwatchesProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tagColors.map((color) => {
        const selected = color === value;
        return (
          <button
            key={color}
            type="button"
            aria-pressed={selected}
            aria-label={`${color} tag colour`}
            onClick={() => onChange(color)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors duration-150",
              selected ? "border-fg" : "border-transparent hover:border-divider",
              focusRing,
            )}
          >
            <span aria-hidden="true" className={cn("h-4 w-4 rounded-full", tagColorClasses(color).fill)} />
          </button>
        );
      })}
    </div>
  );
}
