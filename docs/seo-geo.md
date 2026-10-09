# Public site SEO and AI-search content

- Canonical origin: `https://omnisline.com`; site metadata lives in `src/lib/site.ts`.
- `/` serves the prerendered landing page. `/landing` permanently redirects to `/`, preserving the query string.
- Caddy redirects only public `www` GET/HEAD pages to the canonical origin. API, Cap, account routes and `token.omnisline.com` keep their existing handlers.
- `/robots.txt` allows public content and assets, excludes authenticated/business routes, and declares `/sitemap.xml`.
- The sitemap contains the homepage and four public legal documents. Archived legal versions remain readable; their canonical URLs point to the current document route.
- Account and protected page responses carry `X-Robots-Tag: noindex`. Authentication remains the access-control boundary; robots rules are not authorization.
- Homepage and legal-page canonical links use the canonical origin. Homepage Open Graph and Twitter metadata reuse the existing hero poster.
- Homepage JSON-LD describes the brand, website and page. Visible service questions and FAQPage data share the same source in `faq-section.tsx`; keep answers aligned with actual product behavior.
- Device-model resource previews use `data-nosnippet`; Hero copy and FAQ do not list specific models. Partner tiles only display the six confirmed logos documented in `partners.md`.

## Verification after a release

Check the homepage HTML for canonical, Open Graph/Twitter tags, four visible questions and valid JSON-LD. Verify robots/sitemap return 200 with the correct content types, both aliases return 308, and login-protected routes still redirect with `noindex`.

Keep checking backend health, anonymous API authorization, Cap and the shared Token site separately. Match the deployed image revision to the merged commit.

Google indexing, displayed snippets and AI citations are external outcomes, not implied by a successful deployment. Search Console ownership and analytics are not configured by this change. Google AI search does not require a special AI text file or schema: see [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features).
