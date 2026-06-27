// Central, tunable money for the studio offer — now sourced from @pinprint/shared
// so the backend prices checkout authoritatively from the same numbers. This
// module stays as a thin re-export to keep existing frontend import paths stable.
// Edit the prices in packages/shared/src/commerce.ts.

export {
  PRINT_PRICE_CENTS,
  FRAME_UPCHARGE_CENTS,
  DIGITAL_PRICE_CENTS,
  DEFAULT_FRAME_UPCHARGE_CENTS,
} from "@pinprint/shared";
