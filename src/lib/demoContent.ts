// ─── DEMO JOB POSTING ─────────────────────────────────────────────────────

export const DEMO_JOB_POSTING = `Director of Go-To-Market Strategy
Meridian Energy AI — Austin, TX (Hybrid)

About Meridian Energy AI
Meridian is a Series B AI company building autonomous energy management software for commercial and industrial facilities. We've closed $42M in ARR and are expanding our enterprise sales motion across the Southwest US.

Role Overview
We're looking for a Director of GTM Strategy to own our enterprise sales process, build channel partnerships, and develop the systems that will take us from $42M to $150M ARR. This is a player-coach role — you'll close deals yourself while building and managing a team of four AEs.

What You'll Do
- Own enterprise pipeline from first contact through close
- Build and manage relationships with energy utility procurement teams
- Develop partner and reseller channels with systems integrators
- Implement and optimize CRM and revenue operations infrastructure
- Hire, coach, and retain a four-person enterprise AE team
- Represent Meridian at industry events and customer advisory boards

What We're Looking For
- 10+ years of enterprise sales or GTM experience
- Proven track record closing $500K+ contracts with 12-18 month cycles
- Experience selling into energy, utilities, or commercial real estate
- Strong understanding of AI/software products and technical buyers
- Experience building GTM systems (CRM implementation, playbooks, processes)
- Existing relationships in the energy and utilities sector a major plus

What We Offer
- Base: $160,000 - $185,000
- OTE: $240,000 - $280,000
- Equity: 0.3% - 0.6% (Series B, post-money valuation $280M)
- Full benefits, unlimited PTO, annual team offsite`

// ─── PRE-BAKED OUTPUT ──────────────────────────────────────────────────────

export const DEMO_OUTPUT = {

  roleFit: {
    score: 91,
    scoreLabel: 'Exceptional match',
    summary: 'This role maps directly onto 15 years of enterprise deal experience in the energy sector. The candidate brings proven CRM implementation, existing utility relationships, and hands-on AI tool deployment — three things Meridian explicitly calls out as differentiators. The primary gap is direct software sales experience, which is offset by deep buyer-side fluency.',
    strengths: [
      {
        title: 'Energy sector relationships',
        detail: 'Fifteen years of enterprise client relationships in energy and commercial development is exactly the network Meridian needs to accelerate Southwest expansion. This is rare and hard to replicate.',
      },
      {
        title: 'Enterprise deal experience',
        detail: 'Managed complex multi-stakeholder deals with 12-24 month cycles, consistent with Meridian\'s enterprise motion. Closed projects in the $500K-$2M+ range across energy, hospitality, and commercial development.',
      },
      {
        title: 'GTM systems and CRM',
        detail: 'Led Zoho CRM implementation and built revenue operations infrastructure from scratch. Directly matches the "build GTM systems" requirement most candidates won\'t have.',
      },
      {
        title: 'AI implementation depth',
        detail: 'Deployed Azure RAG, financial dashboards, and AI tools at the firm level — plus built autonomous systems independently. Gives credibility with technical buyers that pure sales backgrounds lack.',
      },
    ],
    gaps: [
      {
        title: 'Direct software sales',
        detail: 'Background is buyer-side enterprise rather than vendor-side software sales. Frame this as an asset: you know exactly how procurement teams think, which accelerates deal cycles.',
        severity: 'minor' as const,
      },
      {
        title: 'Team management at scale',
        detail: 'Managed project teams and client relationships but not a formal AE team. Highlight operational leadership and mentorship experience to address this.',
        severity: 'minor' as const,
      },
    ],
  },

  talkingPoints: [
    {
      question: 'Walk me through how you\'ve closed complex enterprise deals.',
      approach: 'Lead with the multi-year energy client example — initial relationship built at industry level, 18-month procurement cycle, multiple stakeholders including legal, facilities, and C-suite. Quantify: contract value, timeline, number of decision-makers managed.',
      keyMessage: 'I\'ve navigated the same buyer psychology Meridian\'s team faces daily — slow, relational, risk-averse procurement. I know where deals stall and how to unstick them.',
    },
    {
      question: 'You don\'t have direct software sales experience. How do you address that?',
      approach: 'Flip the frame immediately. Buyer-side experience is worth more than vendor-side at the enterprise level because you understand procurement constraints, budget cycles, and internal champion dynamics from the inside. Vendor salespeople learn this the hard way; you already know it.',
      keyMessage: 'Every enterprise buyer I\'ll sell to thinks the way I used to think. That\'s not a gap — it\'s the sharpest edge I bring.',
    },
    {
      question: 'How would you build out GTM systems here?',
      approach: 'Walk through the Zoho implementation: why it was needed, how you designed it for the firm\'s workflow, adoption challenges, what changed post-implementation. Then map that to Meridian\'s scale — what you\'d audit first, what you\'d build vs buy, how you\'d instrument pipeline visibility.',
      keyMessage: 'I\'ve built this from zero before. I know the order of operations and where firms waste six months on the wrong thing first.',
    },
    {
      question: 'What\'s your read on our market and how utilities buy?',
      approach: 'Demonstrate fluency — procurement timelines in utilities run 12-24 months minimum, decisions involve facilities, sustainability, legal, and finance, and vendor stability is scrutinized heavily. Mention specific dynamics: RFP requirements, pilot phases, multi-year contract structures.',
      keyMessage: 'This buyer is not a mystery to me. I can shorten your sales cycles because I\'ve been on the other side of the table.',
    },
    {
      question: 'How do you think about hiring and developing AEs?',
      approach: 'Speak to what you\'ve observed in top performers in your own network — coachability, systematic pipeline discipline, curiosity about the technical product. Mention that you\'d hire for energy sector fluency first, software sales second, because the domain knowledge takes years to build.',
      keyMessage: 'I\'d build a team that can have a credible technical conversation with a VP of Facilities on day one. That\'s what closes at the enterprise level.',
    },
    {
      question: 'Where do you see AI going in the energy sector?',
      approach: 'Ground it in what you know from building AI systems — the gap between what\'s technically possible and what procurement teams believe is real. That gap is Meridian\'s opportunity and also its biggest sales challenge. Buyers need education, proof, and trust before they\'ll move.',
      keyMessage: 'The technology is ready. The adoption curve is a trust problem. GTM\'s job is to close that gap faster than competitors.',
    },
  ],

  salaryBrief: {
    postedRange: '$160,000 – $185,000 base / $240,000 – $280,000 OTE',
    marketContext: 'Director-level GTM roles at Series B AI companies in the Austin market are currently ranging $155K–$200K base with OTE multipliers of 1.4–1.6x. Meridian\'s posted range is at the mid-to-lower end for the profile they\'re describing. The equity package at 0.3–0.6% is standard for this stage and valuation.',
    recommendation: 'Target the top of the base range ($185K) plus push for $195K if the negotiation opens. The buyer-side enterprise background with energy sector relationships is differentiated and commands a premium. OTE should be negotiated to $275K–$290K with accelerators above 120% quota.',
    negotiationNotes: [
      'Lead with market data, not personal need. Reference $185K–$200K as the range for this profile in Austin.',
      'Equity is negotiable at Series B — 0.5% is reasonable given the GTM build-out scope. Push for 0.5% minimum.',
      'Ask for a 90-day performance review with a defined path to Senior Director or VP within 18 months.',
      'If they hold firm on base, negotiate a $25K signing bonus to close the gap.',
      'Get the quota number and ramp schedule in writing before signing. OTE is meaningless without knowing what 100% looks like.',
    ],
    redFlags: [
      'Vague OTE structure without defined quota — ask for the quota number explicitly.',
      'Equity below 0.3% for a Director building GTM from this stage.',
      'No defined ramp period — 90 days minimum is standard for enterprise cycles.',
    ],
  },
}

// ─── DEMO CANDIDATE NAME (shown in UI only) ────────────────────────────────
export const DEMO_CANDIDATE = {
  name: 'Alex Rivera',
  title: 'Enterprise Sales Director & GTM Builder',
  location: 'Austin, TX',
}
