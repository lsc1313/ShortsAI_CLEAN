# Real Hotdeal Discovery v1

This experimental module is isolated from the production scheduler. It does not publish videos or change the existing hotdeal logic.

## Evidence contract
Each candidate needs: source URL, product URL, timestamp, seller, exact model/option, payable price, shipping, coupon conditions, and availability. A claimed prior price is not accepted as evidence of a real discount.

## Evaluation
- Reject missing or ambiguous product identity, unavailable items, uncertain final checkout price, and unverified discounts.
- Compare the same model and option, including shipping and coupon eligibility.
- Distinguish a price drop for the same SKU from a competitive price versus other sellers.
- Mark history-dependent claims as 'insufficient history' until supported by observations.
- Preserve timestamped observations rather than overwriting a whole day's values.
- Store evidence URLs and reasons for every approval or rejection.
- Require a successful evidence check immediately before production.
- If no candidate passes, skip the hotdeal video.

## Initial test
Run collection and verification in report-only mode. Review actual candidate quality and source access constraints before wiring the scheduler, affiliate link, or video pipeline.

## Security
Do not copy API credentials into this module. Move existing committed credentials to environment secrets and rotate them.
