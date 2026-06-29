/**
 * The staged studio flow. One decision per screen, with the live poster preview
 * visible at every step (see PosterStudio). The path is linear: Style → Places →
 * Customize → Size → Review. Order here is the order shown in the progress stepper.
 */
export type StepId = "style" | "places" | "customize" | "size" | "review";

export type StepMeta = {
  id: StepId;
  /** Short label for the progress stepper. */
  label: string;
  /** Instructional heading shown at the top of the step panel. */
  title: string;
  /** Optional steps are skippable in the default forward path. */
  optional?: boolean;
};

export const STEPS: StepMeta[] = [
  { id: "style", label: "Style", title: "Pick a style" },
  { id: "places", label: "Places", title: "Add your places" },
  { id: "customize", label: "Customize", title: "Make it yours" },
  { id: "size", label: "Size", title: "Choose a size" },
  { id: "review", label: "Review", title: "Review & order" },
];

export const STEP_INDEX = Object.fromEntries(
  STEPS.map((s, i) => [s.id, i]),
) as Record<StepId, number>;
