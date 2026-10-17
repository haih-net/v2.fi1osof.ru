# Page metadata

The original components used `next/head`. The root now renders `SeoHeaders`, which delegates active-route selection to React Router’s `Meta`. Each route passes its typed `handle.seo` to `createSeoMeta` in its `meta` export. This preserves native SPA, error and hydration-fallback behavior without inspecting private router contexts. Do not add another head owner.

Each indexable route supplies a title, description and explicit canonical path. The production origin is fixed in `site.ts`, independent of the development host. Query strings, hashes and trailing slashes are excluded from canonicals. Missing routes have no canonical and are `noindex, follow`. Route errors and the build-generated SPA fallback also receive noindex metadata.

Article data includes an actual publication date, optional actual modification date, cover image, author identity, and the project snapshot discussed. The snapshot version belongs to `about: SoftwareSourceCode`, not to the article's own version. Never compute it from the current build or invent modification timestamps. The author's `@id` and public profiles came from https://fi1osof.ru/about; ORCID was supplied by the author. The page shows the same author and ORCID visibly.

JSON-LD is a connected graph with WebSite, WebPage, breadcrumbs and, where applicable, BlogPosting and Person. The standalone JsonLd component escapes every `<` before embedding JSON in HTML. Route metadata uses React Router’s escaped `script:ld+json` descriptors. No unused Product or LocalBusiness factories are retained. This small type model permits Schema.org properties; it is not a complete Schema.org validator.

Page coverage:

- Home: WebSite with the site's name, production URL and description, plus WebPage and its preview image.
- Blog index: CollectionPage → Blog and ItemList → the visible BlogPosting summaries. Both cards and metadata use `posts.ts`; the index itself is not an article.
- Solutions: CollectionPage → ItemList of the visible solution layers, derived from the same data as the page. Section fragments are preserved in list URLs.
- Article: WebPage → BlogPosting → Blog, with Person, image, breadcrumbs and the frozen project revision.
- Unknown URLs and errors: noindex; no fabricated canonical, image or structured graph.

All indexable pages have distinct descriptions and share the same description across normal, Open Graph and Twitter metadata. Every route explicitly supplies its social image through the typed image parameter. The reusable SEO module imports no page assets and has no implicit image fallback; omitted images produce no image tags. Images use absolute production URLs, intrinsic dimensions and alternative text. Structured data describes the content; it does not promise a ranking boost or a special search result. Blog and collection semantics follow https://schema.org/Blog, https://schema.org/CollectionPage and https://schema.org/ItemList.

When adding a public page, update its route handle, prerender list and `server/sitemap/index.ts`. Keep `lastmod` absent unless a real content modification date is maintained. `robots.txt` announces the sitemap; it is not an access-control mechanism.

Verification: `npm run types`, `npm run lint`, `npm test`, then `npm run test:integration`. The SEO tests inspect the built HTML rather than the Vite endpoint and cover canonical uniqueness, JSON-LD escaping, author/ORCID, snapshot evidence and the unknown-route fallback. `npm run e2e` checks browser navigation, hydration errors and metadata updates; structured data does not guarantee a search rich result.

References: https://reactrouter.com/how-to/meta and https://developers.google.com/search/docs/appearance/structured-data/article
