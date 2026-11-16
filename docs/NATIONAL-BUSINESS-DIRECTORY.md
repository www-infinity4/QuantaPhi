# National business directory

This is a public, read-only, source-backed Quick Card directory. Business listings are not paid advertisements, and the Worker never touches Quants, wallet balances, logins, or protected data.

Cloudflare D1: `quantaphi-business-directory`. Search endpoint: `/api/business/search?city=Denver&state=CO&q=restaurant`, paginated. Stats: `/api/business/stats`.

The first 8 Denver restaurant cards were copied into the general business directory. Live counts must be checked before claiming additional coverage. The city-import queue contains at least one metro in all 50 states, plus DC, PR, VI, GU, AS, and MP. Queued tasks are not imported businesses. Use independently licensed Overture Places or other legitimate source datasets with provenance and idempotent imports.

The public card excludes restricted-age business categories, requires source URL and readable attribution, and only displays images with explicit rights. Paid advertiser campaigns require a different legal and verification workflow.

Deployment requires separate Worker and exact Cloudflare route readback. Public listings must not claim current prices, open hours, booking availability, or merchant partnership without evidence.
