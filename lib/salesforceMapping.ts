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
  program: "TODO_REPLACE__Program__c",
  shortDescription: "TODO_REPLACE__Short_Description__c",
  dateReceived: "TODO_REPLACE__Date_Received__c",
  donorKind: "TODO_REPLACE__Company_Org_or_Individual__c", // e.g. "Organization" | "Individual" | "Anonymous Individual"
  donorOrgName: "TODO_REPLACE__Donor_Organization__c",
  donorName: "TODO_REPLACE__Donor_Name__c",
  donorEmail: "TODO_REPLACE__Donor_Email__c",
  donorPhone: "TODO_REPLACE__Donor_Phone__c",
  donorAddress: "TODO_REPLACE__Donor_Address__c",
  taxReceiptOptIn: "TODO_REPLACE__Tax_Receipt_Opt_In__c",
};

// One child line item per category with qty > 0, linked to the header record
export const SF_LINE_ITEM_OBJECT = "TODO_REPLACE__InKind_Gift_Line_Item__c";

export const SF_LINE_ITEM_FIELD_MAP = {
  parentLookup: "TODO_REPLACE__Gift_Inventory__c", // lookup/master-detail field name on the line item pointing back to the header
  category: "TODO_REPLACE__Category__c",
  quantity: "TODO_REPLACE__Quantity__c",
};

// Maps our internal category codes (lib/categories.ts) to whatever picklist
// values Salesforce expects for SF_LINE_ITEM_FIELD_MAP.category.
export const CATEGORY_TO_SALESFORCE_PICKLIST: Record<string, string> = {
  "CAT-CLOTHING": "Clothing",
  "CAT-SHOES": "Shoes",
  "CAT-HOUSEWARES": "Housewares",
  "CAT-ELECTRONICS": "Electronics",
  "CAT-BULBS": "Light Bulbs",
  "CAT-FURNITURE": "Furniture",
  "CAT-BOOKS": "Books & Media",
  "CAT-TOYS": "Toys",
  "CAT-MISC": "Miscellaneous",
};

export const DONOR_KIND_TO_SALESFORCE_PICKLIST: Record<string, string> = {
  organization: "Organization",
  individual: "Individual",
  anonymous: "Anonymous Individual",
};
