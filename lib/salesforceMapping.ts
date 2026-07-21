// ---------------------------------------------------------------------
// Fill this in once you have the real Salesforce object/field API names
// from the existing "In-Kind Gift Inventory" flow. Everything here is a
// placeholder guess based on the flow's UI labels — swap in the real
// API names (Setup → Object Manager → [Object] → Fields & Relationships)
// and nothing else in the app needs to change.
// ---------------------------------------------------------------------

// The parent record created per donation session (one per donor visit)
export const SF_HEADER_OBJECT = "TODO_REPLACE__InKind_Gift_Inventory__c";

export const SF_HEADER_FIELD_MAP = {
  office: "TODO_REPLACE__ICNA_Relief_Office__c",
  shortDescription: "TODO_REPLACE__Short_Description__c",
  dateReceived: "TODO_REPLACE__Date_Received__c",
  donorKind: "TODO_REPLACE__Company_Org_or_Individual__c", // e.g. "Organization" | "Individual" | "Anonymous Individual"
  donorOrgName: "TODO_REPLACE__Donor_Organization__c",
  donorName: "TODO_REPLACE__Donor_Name__c",
  donorEmail: "TODO_REPLACE__Donor_Email__c",
  donorPhone: "TODO_REPLACE__Donor_Phone__c",
  donorAddress: "TODO_REPLACE__Donor_Address__c",
  taxReceiptOptIn: "TODO_REPLACE__Tax_Receipt_Opt_In__c",
  // NOTE: there's no single "program" field anymore — program is now
  // per line item (a session can touch more than one program), see
  // SF_LINE_ITEM_FIELD_MAP.program below.
};

// One child line item per (item, condition) with qty > 0, linked to the
// header record. This now carries price + program per line since those
// live at the item level, not the session level.
export const SF_LINE_ITEM_OBJECT = "TODO_REPLACE__InKind_Gift_Line_Item__c";

export const SF_LINE_ITEM_FIELD_MAP = {
  parentLookup: "TODO_REPLACE__Gift_Inventory__c", // lookup/master-detail field name on the line item pointing back to the header
  itemName: "TODO_REPLACE__Item_Name__c",
  condition: "TODO_REPLACE__Condition__c", // "New" | "Used" | blank for manual-price/bulk items
  quantity: "TODO_REPLACE__Quantity__c",
  unitPrice: "TODO_REPLACE__Unit_Price__c",
  lineTotal: "TODO_REPLACE__Line_Total__c",
  program: "TODO_REPLACE__Program__c",
};

// Maps our internal program names (data/programs.json) to whatever
// picklist values Salesforce expects for SF_LINE_ITEM_FIELD_MAP.program.
// Defaults to passing the program name through unchanged if not listed —
// only fill this in if Salesforce's picklist labels differ from ours.
export const PROGRAM_TO_SALESFORCE_PICKLIST: Record<string, string> = {
  // "Refugee Services & Community Empowerment": "TODO_REPLACE__ if different",
};

export const CONDITION_TO_SALESFORCE_PICKLIST: Record<string, string> = {
  new: "New",
  used: "Used",
  na: "",
};

export const DONOR_KIND_TO_SALESFORCE_PICKLIST: Record<string, string> = {
  organization: "Organization",
  individual: "Individual",
  anonymous: "Anonymous Individual",
};
