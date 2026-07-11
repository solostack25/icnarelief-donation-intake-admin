import {
  SF_HEADER_OBJECT,
  SF_HEADER_FIELD_MAP,
  SF_LINE_ITEM_OBJECT,
  SF_LINE_ITEM_FIELD_MAP,
  CATEGORY_TO_SALESFORCE_PICKLIST,
  DONOR_KIND_TO_SALESFORCE_PICKLIST,
} from "./salesforceMapping";

export type SessionForSync = {
  id: string;
  office: string | null;
  program: string | null;
  short_description: string | null;
  date_received: string | null;
  donor_kind: string | null;
  donor_org_name: string | null;
};

export type DonorForSync = {
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_receipt_opt_in: boolean | null;
} | null;

export type DonationLineForSync = { category: string; qty: number };

export function isSalesforceConfigured() {
  return Boolean(
    process.env.SALESFORCE_INSTANCE_URL && process.env.SALESFORCE_ACCESS_TOKEN
  );
}

/**
 * Pushes one donation session (+ its line items) to Salesforce as a header
 * record and child line-item records, using the composite REST API so it's
 * one round trip.
 *
 * NOTE: this uses a static access token (SALESFORCE_ACCESS_TOKEN) for
 * simplicity. Salesforce access tokens expire — once you're ready to run
 * this for real, swap in a proper OAuth flow (JWT bearer or refresh token)
 * so it doesn't silently start failing after the token expires.
 */
export async function pushSessionToSalesforce(
  session: SessionForSync,
  donor: DonorForSync,
  lines: DonationLineForSync[]
): Promise<{ success: boolean; salesforceId?: string; error?: string }> {
  if (!isSalesforceConfigured()) {
    return {
      success: false,
      error:
        "Salesforce isn't configured yet. Add SALESFORCE_INSTANCE_URL and SALESFORCE_ACCESS_TOKEN (and fill in lib/salesforceMapping.ts) once you have them.",
    };
  }

  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL!;
  const accessToken = process.env.SALESFORCE_ACCESS_TOKEN!;

  const headerFields: Record<string, unknown> = {
    [SF_HEADER_FIELD_MAP.office]: session.office,
    [SF_HEADER_FIELD_MAP.program]: session.program,
    [SF_HEADER_FIELD_MAP.shortDescription]: session.short_description,
    [SF_HEADER_FIELD_MAP.dateReceived]: session.date_received,
    [SF_HEADER_FIELD_MAP.donorKind]: session.donor_kind
      ? DONOR_KIND_TO_SALESFORCE_PICKLIST[session.donor_kind] ?? session.donor_kind
      : null,
    [SF_HEADER_FIELD_MAP.donorOrgName]: session.donor_org_name,
    [SF_HEADER_FIELD_MAP.donorName]: donor?.name ?? null,
    [SF_HEADER_FIELD_MAP.donorEmail]: donor?.email ?? null,
    [SF_HEADER_FIELD_MAP.donorPhone]: donor?.phone ?? null,
    [SF_HEADER_FIELD_MAP.donorAddress]: donor?.address ?? null,
    [SF_HEADER_FIELD_MAP.taxReceiptOptIn]: donor?.tax_receipt_opt_in ?? false,
  };

  try {
    // 1. Create the header record
    const headerRes = await fetch(
      `${instanceUrl}/services/data/v60.0/sobjects/${SF_HEADER_OBJECT}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(headerFields),
      }
    );
    const headerJson = await headerRes.json();
    if (!headerRes.ok) {
      return { success: false, error: JSON.stringify(headerJson) };
    }
    const headerId: string = headerJson.id;

    // 2. Create one line item per non-zero category
    const lineRecords = lines
      .filter((l) => l.qty > 0)
      .map((l) => ({
        attributes: { type: SF_LINE_ITEM_OBJECT },
        [SF_LINE_ITEM_FIELD_MAP.parentLookup]: headerId,
        [SF_LINE_ITEM_FIELD_MAP.category]:
          CATEGORY_TO_SALESFORCE_PICKLIST[l.category] ?? l.category,
        [SF_LINE_ITEM_FIELD_MAP.quantity]: l.qty,
      }));

    if (lineRecords.length > 0) {
      const compositeRes = await fetch(
        `${instanceUrl}/services/data/v60.0/composite/sobjects`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ allOrNone: false, records: lineRecords }),
        }
      );
      const compositeJson = await compositeRes.json();
      if (!compositeRes.ok) {
        return {
          success: true, // header succeeded even if some lines failed
          salesforceId: headerId,
          error: `Header created, but line items had issues: ${JSON.stringify(compositeJson)}`,
        };
      }
    }

    return { success: true, salesforceId: headerId };
  } catch (err: any) {
    return { success: false, error: err.message ?? String(err) };
  }
}
