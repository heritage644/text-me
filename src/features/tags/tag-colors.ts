/**
 * Tag colours are a client-side palette: the API stores a key (`"teal"`), and
 * this file decides what that key looks like.
 *
 * Class strings are written out in full so Tailwind can see them, and every
 * colour is a theme token from `src/index.css` — no hex values here.
 */
import { TAG_COLORS, type TagColor } from "../../types/types";

type TagColorClasses = {
  /** Solid colour: the dot in a chip, the swatch in the picker. */
  fill: string;
  /** Chip background + label. */
  chip: string;
};

const CLASSES: Record<TagColor, TagColorClasses> = {
  blue: { fill: "bg-blue", chip: "bg-blue/15 text-blue" },
  teal: { fill: "bg-teal", chip: "bg-teal/15 text-teal" },
  green: { fill: "bg-green", chip: "bg-green/15 text-green" },
  yellow: { fill: "bg-yellow", chip: "bg-yellow/15 text-yellow" },
  orange: { fill: "bg-orange", chip: "bg-orange/15 text-orange" },
  red: { fill: "bg-red", chip: "bg-red/15 text-red" },
  pink: { fill: "bg-pink", chip: "bg-pink/15 text-pink" },
  purple: { fill: "bg-purple", chip: "bg-purple/15 text-purple" },
};

export const tagColors = TAG_COLORS;

export function tagColorClasses(color: TagColor): TagColorClasses {
  return CLASSES[color] ?? CLASSES[TAG_COLORS[0]];
}
