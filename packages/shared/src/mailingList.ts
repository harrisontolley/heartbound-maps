// Mailing-list signup contracts — captures who wants an update when we add a
// size/material/map style we don't yet offer (see backend/src/routes/mailingList.ts).

export type MailingListReason = "size" | "material" | "map_style" | "other";

export const MAILING_LIST_REASONS: readonly MailingListReason[] = [
  "size",
  "material",
  "map_style",
  "other",
];

export type CreateMailingListSignupRequest = {
  email: string;
  reasons: MailingListReason[];
  otherText?: string;
  source?: string;
  consent?: boolean;
};

export type CreateMailingListSignupResponse = { status: "subscribed" };
