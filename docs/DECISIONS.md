# Decisions

This log records decisions explicitly captured during Aurelis planning. Code that happens to implement a behavior is not, by itself, treated as a product decision.

## Confirmed

| Decision | Choice |
| --- | --- |
| Repository scope | This repository is backend-only; the customer-facing frontend is outside this repo. |
| Launch data | Treat Aurelis as a fresh launch; do not migrate the existing real-estate data. |
| Initial services | Launch yacht sales and charter together. |
| Customer conversion | Capture qualified inquiries; do not include online booking, offers, deposits, or payment in the first release. |
| Inventory ownership | Aurelis staff manage yacht inventory in the first release. |
| Market scope | Target a global market. |
| Inquiry handling | Persist inquiries for Aurelis staff review. |
| Currency behavior | Store listing amounts with their currency code; do not silently convert prices. This is also stated in [`AGENTS.md`](../AGENTS.md) and implemented in the backend. |

The frontend browsing direction is inspired by Fraser Yachts, as stated in the planning conversation. Detailed interaction requirements remain **PENDING**; see [Frontend Migration](FRONTEND_MIGRATION.md).

## Pending decisions

- Frontend repository, framework, owners, and integration contract: **PENDING**.
- Supported frontend languages and locale behavior: **PENDING**.
- Currency display and whether a future conversion service is wanted: **PENDING**.
- Inventory source, import process, and staff publication workflow: **PENDING**.
- Inquiry notification, CRM, retention, and privacy requirements: **PENDING**.
- Production hosting, domains, environments, operational owner, and release acceptance criteria: **PENDING**.
- Status of any historical migration or production rollout: **PENDING**.

## Source note

The six earlier linked source documents were not present in the workspace or visible conversation. This record uses only choices explicitly captured in the conversation and facts in the current repository; original document contents remain **PENDING**.
