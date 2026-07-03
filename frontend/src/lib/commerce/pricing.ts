// Central, tunable money for the studio offer — now sourced from @pinprint/shared
// so the backend prices checkout authoritatively from the same numbers. This
// module stays as a thin re-export to keep existing frontend import paths stable.
// Edit the prices in packages/shared/src/commerce.ts.

/** Customer-facing label for the temporary introductory pricing campaign. */
export const OPENING_LAUNCH_SALE_LABEL = "Opening launch sale";

export {
  PRINT_PRICE_CENTS,
  LIST_PRICE_CENTS,
  FRAME_UPCHARGE_CENTS,
  DIGITAL_PRICE_CENTS,
  DIGITAL_LIST_PRICE_CENTS,
  DEFAULT_FRAME_UPCHARGE_CENTS,
  FREE_SHIPPING,
  discountPercent,
} from "@pinprint/shared";
