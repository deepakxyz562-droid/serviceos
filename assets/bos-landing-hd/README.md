# BOS landing assets

Six original AI-generated photographs, each 1536 × 1024 pixels: grocery, salon, clinic, services, restaurant and owner. Generated for this project with imagegen. These are illustrative marketing images, not customer endorsements.

`dashboard.png` is a 2880 × 1920 capture of the actual local BOS demo workspace with sample data. The phone and AI conversation on the page are explicitly labelled illustrative previews.

Optimized deployment assets are in `public/bos/landing` and mirrored in `apps/bos/public/bos/landing`. Both copies must ship for core-hosted and standalone deployments. Full-page desktop and mobile previews are included for review.

Landing route: `/` on the standalone app; BOS hostname root rewrites to `/bos-home` on core. `?demo=true` opens demo; `?app=true` opens the workspace; `?landing=true` forces the public preview. `/bos-login?mode=register` opens registration. Existing `?auth=` core flows are preserved.

Validation: BOS typecheck and production build passed; 18 landing/routing/favicon tests passed. Browser checks at 1440px and 390px verified no overflow, loaded images, mobile navigation, FAQ expansion and registration entry. No production deployment or real account/payment action was performed.
