/* First-party AI venture opportunities. These cards reuse the existing Oracle
 * Quick Card and shared Bubbles brain; no new independent model, payment grant,
 * subscriber account or unauthorized media license is created. */
export const AI_VENTURES=Object.freeze([
  {
    "id": "quant-ai-business",
    "name": "Quant AI · Business & Seller",
    "kind": "Developers",
    "feature": "Plan a merchant workflow and inspect the Quant AI business presentation",
    "official": "https://quantaphi.org/quant-ai-presentation.html",
    "featureUrl": "https://quantaphi.org/quant-ai-presentation.html",
    "businessModel": "Merchant tools for product assistance, verified listings and explainable workflow automation",
    "focus": "Explain Quant AI business capabilities with verifiable merchant sources. Keep payment, banking and seller authority separately authenticated.",
    "details": "Business and seller architecture has source files; checkout, banking access and merchant earnings are not verified by this card.",
    "readiness": "source-built"
  },
  {
    "id": "cosmo-starquest",
    "name": "Cosmo AI · StarQuest",
    "kind": "Television",
    "feature": "Open the existing StarQuest video and TV Quick Card",
    "official": "https://quantaphi.org/?card=infinityStarQuestCard",
    "featureUrl": "https://quantaphi.org/?card=infinityStarQuestCard",
    "businessModel": "Media discovery, personalized TV guides and creator watch-along experiences with licensed playback",
    "focus": "Use real StarQuest programs, publisher video sources and caption context. Do not fabricate catalog rights or a separate model.",
    "details": "Cosmo companion capabilities and media licensing require actual runtime and provider receipts; catalog rights are not implied.",
    "readiness": "source-built"
  },
  {
    "id": "creator-quick-cards",
    "name": "Creator Quick Cards · Business Pages",
    "kind": "Developers",
    "feature": "Create or propose an author page, creator storefront or podcast card",
    "official": "https://quantaphi.org/design-lab/",
    "featureUrl": "https://quantaphi.org/design-lab/",
    "businessModel": "Self-service creator pages with optional separately approved subscriber and commerce integrations",
    "focus": "Help creators choose existing Quick Card tools and make editable proposals, without inventing billing, account access or publisher approval.",
    "details": "The design lab exists; subscription billing and cross-platform publishing require additional permission and integrations.",
    "readiness": "existing-workflow"
  },
  {
    "id": "complete-me-ai",
    "name": "Complete Me AI · Project Manager",
    "kind": "Developers",
    "feature": "Take one unfinished project into the existing tracked build guide",
    "official": "https://quantaphi.org/continuitybuilder/",
    "featureUrl": "https://quantaphi.org/continuitybuilder/",
    "businessModel": "Assisted project completion with verifiable GitHub checkpoints, engineering reviews and delivery handoffs",
    "focus": "Reuse existing Continuity Builder job IDs and the signed owner-work bridge. Distinguish commits, tests, approvals and real deployments.",
    "details": "Guide and code workflow exist; independent continuous deployment and paid customer delivery are not established by this card.",
    "readiness": "prototype"
  },
  {
    "id": "media-star-network",
    "name": "Media Star · Creator Network",
    "kind": "Media",
    "feature": "Open the existing Media Star interactive creator Quick Card",
    "official": "https://quantaphi.org/?card=mediaStarCreator",
    "featureUrl": "https://quantaphi.org/?card=mediaStarCreator",
    "businessModel": "Creator-owned audio and video shows, discoverable channels and authorized sponsor placements",
    "focus": "Use creator-provided episodes and rights-approved streams; keep recording, third-party media and publishing permissions explicit.",
    "details": "Creator card software exists; sponsor revenue, music rights and publishing into other accounts require documented approval.",
    "readiness": "source-built"
  },
  {
    "id": "code-phi-studio",
    "name": "Code Phi · Site Builder",
    "kind": "Developers",
    "feature": "Open the existing on-page QuantaPhi project-building controls",
    "official": "https://quantaphi.org/?card=phiProjectActions",
    "featureUrl": "https://quantaphi.org/?card=phiProjectActions",
    "businessModel": "Buildable websites, reusable templates and reviewed software-delivery services",
    "focus": "Route authorized coding work through the existing Bubbles repository-engine workflow, with test-first patches and preserved tickets.",
    "details": "Existing builder UI does not grant permission to deploy to a customer account or charge for a service; release requires review.",
    "readiness": "existing-workflow"
  }
].map(item=>Object.freeze({...item,venture:true})));
