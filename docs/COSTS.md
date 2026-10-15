# Hosting cost examples and former subscriptions

RIDA's library does not charge a subscription. You pay your own hosting provider. The examples here explain the website calculator's reference assumptions dated **11 October 2026**; they are not current provider quotes or complete operating budgets.

## Four delivery arrangements

| Setup | Storage | Delivery | Important accounting detail |
| --- | --- | --- | --- |
| Bunny Storage + Bunny Standard CDN | Storage charge | Region-dependent GB delivery | Include account minimums and the selected region |
| Bunny Storage + Bunny Volume CDN | Storage charge | Volume-network GB delivery | Coverage and tier rules differ from Standard |
| Bunny Storage + Cloudflare CDN | Bunny storage | Cloudflare plan/cache behavior plus origin traffic | Cloudflare's lack of a per-GB CDN charge does not prove Bunny origin transfer is free |
| Backblaze B2 + Cloudflare CDN | B2 storage | Eligible partner transfer and Cloudflare plan/cache behavior | Verify transfer eligibility; any free storage allowance is shared across the account |

A single account-wide allowance must not be granted separately to every customer in a cost model. A storage-only figure must not be presented as a complete hosting total.

## Reproduce the calculator's example

The website calculator uses the following component assumptions: Bunny storage $0.01/GB/month, Volume delivery $0.005/GB, and Standard Asia delivery $0.03/GB. It divides payload bytes by `1024³` for its displayed GB figure; provider billing units may differ. Check current rates and billing units before using it for a real budget.

For **50 GB stored**, **10 million field reads per month**, and **250 bytes per stored field**:

```text
Selected payload = 10,000,000 × 250 = 2,500,000,000 bytes
Calculator transfer units = 2,500,000,000 / 1024³ ≈ 2.33
Storage component = 50 × $0.01 = $0.50
Volume payload component = 2.33 × $0.005 ≈ $0.012
Standard Asia payload component = 2.33 × $0.03 ≈ $0.070
```

Those produce approximately **$0.512** for the storage-plus-Volume components or **$0.570** for storage-plus-Standard components before minimums/other charges. Bunny's $1 account minimum in the reference assumptions can raise a small bill. HTTP overhead, origin behavior, taxes and other services are not included. Bunny + Cloudflare's $0.50 is the storage component only; origin transfer must be priced separately. The B2 arrangement needs its own account-specific storage and partner-transfer calculation.

## What changed for users

The former plans were Free ($0), Starter ($15/month), Pro ($49/month) and Enterprise (custom). They are historical, not subscriptions for sale. Using the library avoids that RIDA subscription while leaving your hosting costs with your own provider.

The website compares hosting components with the former Pro subscription. The difference is not automatically provider profit or guaranteed net savings: the former service also included operational responsibilities, and a self-managed deployment can still require an application server, authentication, support, payment processing and maintenance.

For transfer-vs-JSON calculations, see [benchmarks](BENCHMARKS.md). For the interactive reference calculator, visit [Purpose](https://rida.qasra.org/purpose#savings-calculator).
