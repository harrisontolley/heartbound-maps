// Lead-magnet contracts — a free screen-res poster design, emailed in exchange
// for an email address (see backend/src/routes/leads.ts).

export type CreateLeadRequest = {
  email: string;
  posterConfig: Record<string, unknown>;
  assetUrl: string;
  source?: string;
  utm?: Record<string, string>;
  consent?: boolean;
};

export type CreateLeadResponse = { status: "sent" };
