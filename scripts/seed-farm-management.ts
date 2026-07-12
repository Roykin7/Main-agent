/**
 * Seeds farm management and agribusiness knowledge into ZOE's knowledge base.
 * Covers financial planning, budgeting, value chains, risk, marketing,
 * labour, and technology — applicable to Uganda coffee and general agribusiness.
 *
 * Usage:
 *   npm run seed:farm-management
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

const CHUNKS: Array<{ id: string; title: string; content: string }> = [
  {
    id: 'cash-flow-cycles',
    title: 'Agribusiness Cash Flow Cycles — Why Agriculture Pays in Seasons, Not Seconds',
    content: `Understanding agricultural cash flow cycles is one of the most important concepts for any farmer or agribusiness investor.

Core principle: "Farming will reward you in seasons, not in seconds." Unlike businesses where revenue flows weekly or monthly, agriculture moves in cycles: planting → nurturing → waiting → harvesting → processing → selling. If you don't understand this rhythm, you will constantly think the business is failing — even when it is on track.

5 critical things to understand about agricultural cash flow:

1. Money goes OUT before money comes IN: Your first movement is always expenditure — seeds, inputs, labour, equipment, irrigation, land preparation. Income comes months later. This is why liquidity planning is everything. For coffee: trees take 2-3 years to first produce; even established farms have a 6-12 month cycle from planting to payment.

2. The quiet middle stage: After planting, there is a long phase where you see no money — only waiting, monitoring, and protecting. This phase lasts 60–120+ days for most crops. If you don't plan your cash flow, you will start unnecessary borrowing during this phase.

3. Harvest season is NOT always cash season: You may harvest today and receive your money 30–90 days later — especially in bulk sales, processing, contract farming, and export. For Uganda coffee farmers selling through cooperatives or processors, this delay is very common.

4. Profit is meaningless without timing: A business that generates profit once a year needs a completely different financial strategy from one that generates weekly income. Agriculture rewards patience, planning, discipline, and seasonal cash flow strategy.

5. Know your CASH GAP: Your cash gap is the time between when money leaves your account (for inputs, labour) and when it returns (from sales). Miscalculate this and you will think your business is failing — it is just a natural cycle.

Action: Calculate your three timelines every season:
- Planting to harvesting: how many months?
- Harvesting to sale: how long until you sell?
- Sale to payment: when does cash actually hit your account?

When you understand all three, you stop panicking and start managing like a strategist.`,
  },
  {
    id: 'farm-budgeting',
    title: 'Farm Budgeting & Financial Planning — The Backbone of Profitable Farming',
    content: `Many farms fail not because yields are low, but because money is poorly planned and poorly tracked. A farm budget is not paperwork — it is a profit control tool.
What is a farm budget? A financial plan estimating: all costs of production, expected income, and whether the enterprise will be profitable — BEFORE you start.

The key question a budget answers: "Will this farm enterprise make money?"

Why farm budgeting matters:
- Know the exact cost of production
- Avoid overspending
- Plan capital requirements
- Compare different enterprises (which crop/livestock is most profitable?)
- Prevent mid-season financial collapse
- Make informed decisions
Rule: A farmer who budgets controls money. One who doesn't is controlled by money.

THREE types of farm budgets:

1. Enterprise Budget: For a single crop or livestock enterprise. Includes inputs (seed, fertilizer, chemicals), labour, transport, expected yield, and selling price. Helps determine profitability per enterprise. For coffee farmers: prepare a separate budget for your coffee, banana, or other crops.

2. Whole Farm Budget: Covers all enterprises on the farm — total income, total expenses, shared costs (equipment, water), net farm income. Shows the overall financial health of the farm.

3. Cash Flow Budget: Shows WHEN money comes in and WHEN it goes out. Critical because farming income is seasonal while expenses occur continuously. Helps prevent cash shortages during the season.

Key components of a good farm budget:
- Fixed costs: rent, machinery depreciation, buildings, insurance (don't change with production)
- Variable costs: seeds, fertilizers, chemicals, casual labour, fuel (change with production)
- Expected output: realistic yield per acre/hectare (be conservative, not optimistic)
- Expected revenue: output × market price (use conservative prices, not peak prices)
- Profit/loss analysis: Total Revenue − Total Costs

Common budgeting mistakes:
❌ Ignoring labour costs ❌ Forgetting transport and marketing costs ❌ Overestimating yields ❌ Using unrealistic market prices ❌ Failing to include emergency funds

Smart budgeting tips: Budget before every season. Separate personal and farm money (critical for small farms). Compare planned vs actual costs after harvest. Keep records to support future budgets.`,
  },
  {
    id: 'financial-metrics-track',
    title: '5 Key Financial Numbers Every Farmer Must Track',
    content: `Profit in agriculture does not always come from producing more. Sometimes it comes from understanding your numbers better than others. Farms that increase production can still struggle financially — while smaller farms remain profitable because they understand their numbers.
The 5 numbers every farmer (including coffee farmers) must always track:

1. COST OF PRODUCTION PER UNIT: Do you know exactly how much it costs to produce 1 kg of coffee cherries? 1 bag of processed coffee? Without this, pricing becomes guesswork. Calculate: total costs (inputs + labour + depreciation) ÷ total output. For Uganda coffee: if your 0.5 ha costs 500,000 UGX and produces 200 kg of dry coffee, your cost is 2,500 UGX/kg.

2. BREAK-EVEN POINT: At what price or volume do you start making profit? Knowing this helps you decide: Should I sell now at this price or wait? Should I scale up? What is my minimum acceptable farm-gate price? Formula: Break-even = Fixed Costs ÷ (Price per unit − Variable Cost per unit).

3. LOSS PERCENTAGE: Every farm has losses — spoilage, post-harvest loss, pest damage, mortality. Do you actually measure yours? What is your % of coffee cherries lost to CBD? What % of beans are rejected at the mill? What gets measured can be improved. Even reducing post-harvest losses from 15% to 5% increases your effective yield significantly.

4. MARKET PRICE TRENDS: Prices change. Smart farmers study patterns — peak periods, low-demand periods, price fluctuations. For Uganda coffee: Arabica prices in 2024 were ~25% above long-term average. Knowing price history helps you decide whether to sell immediately at harvest or store and sell later.

5. CASH FLOW TIMING: Profit on paper is not enough. You must understand: when money comes in, when expenses go out. A profitable farm can die from poor cash flow. For coffee: you spend from September–December on harvesting/processing, but payment may come January–March. Plan accordingly.

Summary: Agriculture is not just physical work — it is financial discipline. The difference between struggling farms and sustainable agribusinesses is often the clarity of numbers.`,
  },
  {
    id: 'expansion-strategy',
    title: 'When and How to Scale Your Farm Business — Expansion & Investment Readiness',
    content: `Many farmers expand acreage, hire more workers, and increase production — but their profit doesn't grow. Sometimes expansion multiplies expenses in disguise.
The key lesson: Expansion doesn't fix inefficiency — it magnifies it.

When is a farm READY to expand?
✔ Consistent profitability (not just one good season)
✔ Positive cash flow
✔ Debt is under control
✔ Records show stable performance
✔ Reliable market demand exists
❌ NOT because of excitement, peer pressure, or temporary high prices

4 types of farm growth strategies:
1. Horizontal expansion: More land, more trees, larger herd. Increases scale of same enterprise. Requires market to absorb increased production.
2. Vertical integration: Add value (processing, packaging, branding your coffee). Often higher returns per unit without needing more land.
3. Market expansion: Access new buyers — export, specialty buyers, direct trade. Improves price received.
4. Enterprise diversification: Add complementary activities (e.g., add bananas or passion fruit to coffee farm). Stabilizes income.

Common expansion mistakes to avoid:
❌ Expanding before stabilizing systems and records
❌ Taking large loans without realistic projections
❌ Ignoring management capacity (hiring more people ≠ growth — it means more salaries and supervision)
❌ Expanding production without securing markets first
❌ Growing faster than cash flow allows

Investment readiness — what investors/lenders look for:
- Clear business model
- Documented financial records (at least 2 seasons)
- Defined growth strategy
- Risk management systems
- Measurable KPIs (performance indicators)
Rule: Investors do not fund farms — they fund structured businesses.

Remember: Growth is not always physical. Sometimes improved margins, reduced losses, better cost control, or higher quality output is more powerful than adding land. A farm must mature before it expands.`,
  },
  {
    id: 'value-chains-marketing',
    title: 'Agribusiness Value Chains, Marketing & Value Addition — From Farm Gate to Profit',
    content: `Agriculture does not end at production. Profitability is largely determined by how well a farm integrates into the value chain. Many farmers focus on production efficiency but neglect market positioning — yet markets determine price, demand, and financial success.
What is an agribusiness value chain? The full range of activities from farm to final consumer: input supply → production → processing → distribution → marketing/retail. Each stage adds value AND introduces costs and risks.

Why value chains matter for Uganda coffee farmers:
- Identify the most profitable market access point
- Reduce dependency on middlemen (who capture most margin)
- Improve price negotiation power
- Plan production based on market demand
- Farmers who sell to cooperatives vs. directly to exporters vs. specialty buyers receive VERY different prices

Agricultural market systems:
- Informal markets: local traders, brokers — lowest prices, easiest access
- Cooperative/formal markets: pooled selling, better prices, delayed payment
- Export markets: highest prices but require quality standards, volumes, certification

Value addition strategies for Uganda coffee farmers:
- Wet processing (washed coffee) vs. dry processing (natural) — washed commands premium prices
- Hulling at farm/cooperative level vs. selling cherries
- Quality grading and sorting — specialty grade opens access to premium buyers
- Organic or Fairtrade certification — access to premium markets
- Branding farm-level or cooperative products
Value-added products attract higher prices and more stable markets.

Farm marketing tips:
- Plan what to produce FOR the market, not just what you can grow
- Know your target buyer before the season starts
- Understand quality standards required by your target buyer
- Track actual vs. expected prices to learn seasonal patterns
- Build relationships with buyers for contract farming where possible

Key insight: Production creates output. Value chains create profit. Farms that understand markets outperform those that focus only on yields.`,
  },
  {
    id: 'risk-management-insurance',
    title: 'Farm Risk Management & Insurance — Protecting Your Agricultural Investment',
    content: `Farming is exposed to many uncertainties — weather, pests, diseases, market fluctuations. Successful farmers do not avoid risks, they manage them.
Types of farm risks every Uganda coffee farmer faces:

Production risks:
- Drought and erratic rainfall (critical in Uganda's changing climate)
- Coffee Berry Disease (CBD), Coffee Wilt Disease, Leaf Rust
- Coffee Berry Borer and other pests
- Soil erosion and degradation on hillsides

Market risks:
- Coffee price fluctuations (Arabica prices can vary 50%+ year-to-year)
- Sudden demand changes from buyers
- Exchange rate risk for export sales

Financial risks:
- High input costs (especially if using credit)
- Loan repayment difficulties during bad seasons
- Cash flow shortages between harvest and payment

Human and operational risks:
- Labour shortages during peak harvest
- Management errors
- Post-harvest handling losses

Risk management strategies:
1. Enterprise diversification: Don't rely 100% on coffee — grow food crops, bananas, vegetables alongside. Research shows Uganda Arabica farmers earning living income have diverse income sources.
2. Use improved and resistant varieties: Plant CBD-resistant Arabica varieties where available.
3. Proper farm planning and budgeting: Know your break-even — how much must prices fall before you lose money?
4. Maintain emergency cash reserves: Keep 20-30% of production costs as a buffer for bad seasons.
5. Keep accurate farm records: Records enable better insurance claims and loan applications.
6. Farm insurance: Crop insurance, livestock insurance, equipment insurance — available through Uganda's agriculture insurance schemes. Check with your cooperative or local bank.

Farm insurance in Uganda:
- Uganda Agricultural Insurance Scheme (UAIS) — government-backed, subsidised premiums
- Commercial banks and microfinance institutions offer bundled loan-insurance products
- Cooperatives sometimes offer group crop insurance
Insurance helps you recover faster after disasters and maintain business continuity.

Key rule: Risk is part of farming — but losses don't have to be catastrophic. Plan for risks before they happen.`,
  },
  {
    id: 'farm-records-financial-statements',
    title: 'Farm Records, Budgets & Financial Statements — The Three Pillars of Farm Financial Control',
    content: `Farm records, budgets, and financial statements are interconnected tools that work together to support planning, control, and decision-making.
The management flow: Farm Records → Farm Budgets → Financial Statements → Farm Decisions

Farm Records (the foundation):
- What to record daily: inputs used, labour hours, production harvested, sales made, expenses paid
- Why it matters: Without records, budgets are assumptions; with records, they are facts
- Minimum records for a coffee farmer: Input purchase book, harvest tally, sales ledger, labour register

Farm Budgets (the plan):
- Prepared BEFORE the season using data from past records
- Enterprise budget (for coffee alone), whole farm budget (all enterprises), cash flow budget (when money moves)
- Budget before every season — it takes 2 hours and saves months of confusion

Three essential financial statements:

1. Cash Flow Statement: Shows money coming in and going out over a period. Key question: "Do I have enough cash to run the farm?" Use it to plan timing of input purchases, schedule loan repayments, and avoid cash shortages.

2. Profit & Loss Account (Income Statement): Shows whether the farm made a profit or loss. Formula: Income − Expenses = Profit/Loss. Use it to identify profitable enterprises, control high-cost areas, set realistic prices.

3. Balance Sheet: Shows what the farm OWNS (assets: land, trees, equipment) and OWES (liabilities: loans, debts) at a specific point in time. The difference is your equity/net worth. Use it to assess borrowing capacity, track farm growth over years.

Key Performance Indicators (KPIs) every farmer should track:
- Yield per hectare (coffee kg/ha)
- Cost per hectare of production
- Gross margin = Revenue − Variable Costs per hectare
- Net profit margin
- Return on Investment (ROI)
- Break-even price (minimum farm gate price to cover all costs)
- Labour productivity (output per person-day)
- Post-harvest loss percentage

Rule: A farm without records is a gamble. A farm with records is a business. Budgeting turns farming from survival into profitability.`,
  },
  {
    id: 'labour-management',
    title: 'Farm Labour & Human Resource Management — Planning and Motivating Your Farm Workforce',
    content: `Even with good land, capital, and inputs, a farm cannot succeed without well-managed labour. Labour is often the largest variable cost on a Uganda coffee farm.
Types of farm labour:
- Family labour: Provided by household members, common on smallholder farms. Track this — it has real economic value even if unpaid.
- Permanent labour: Long-term employees (supervisors, permanent farm hands). Paid monthly. For larger farms managing multiple processes.
- Casual/temporary labour: Hired for short periods, paid daily or per task. Most common for coffee harvesting, weeding, pruning on Uganda farms.

Labour requirements for Uganda coffee (typical):
- Pruning season (after main harvest): high labour demand for 2-4 weeks
- Main harvest: highest labour demand (family + hired casual labour) — October–December for Arabica, September–January for Robusta
- Weeding: 3-4 times per year (mainly at start of rains)
- Fertiliser application: 2 times per year
- Pest and disease scouting: low but regular

Labour planning — 5 steps:
1. Identify tasks and timing for the season
2. Estimate labour needed for each task
3. Schedule when you need casual workers vs. can use family labour
4. Match skills to tasks (pruning requires experience; weeding can be casual)
5. Budget for labour costs before the season

Avoiding common labour problems:
- Labour shortage at peak harvest: Book casual workers in advance; late harvesting causes cherry overripening and quality loss
- High labour costs: Track labour productivity (kg harvested per person-day) to identify inefficiencies
- Idle workers: Schedule carefully to avoid paying for idle time between tasks

Labour cost control:
- Keep a labour register (name, days worked, task, daily rate, total paid)
- Calculate labour cost per kg of coffee produced
- Monitor working hours and output quality
- Consider task-based pay (per kg picked, per plot weeded) instead of day rate for harvest — incentivises productivity

Supervision and motivation:
- Fair wages paid on time — the #1 factor in worker retention
- Clear daily instructions before work starts
- Good working conditions (water, tools, shade)
- Recognition of good performance

Uganda context: Coffee harvest in most regions competes with other labour needs. Planning early and paying competitive rates ensures you don't lose workers to other farms during the critical harvest window.`,
  },
  {
    id: 'technology-climate-smart',
    title: 'Climate-Smart Agriculture & Technology in Modern Farm Management',
    content: `Climate change has increased uncertainty in rainfall patterns, temperature, and extreme weather events. Modern farm management requires systems that adapt, mitigate risk, and sustain productivity under changing conditions.
Climate-Smart Agriculture (CSA) — what it means:
CSA is not a single technique but an integrated approach aiming to:
1. Increase agricultural productivity
2. Enhance resilience to climate variability
3. Reduce environmental impact where possible

Climate risks for Uganda coffee farmers:
- Unpredictable rainfall: both drought and flooding damage coffee
- Temperature increases: affects Arabica quality (needs cool highlands above 1,200m)
- Increased pest and disease pressure: CBD and Antestia Bug spread faster under warmer conditions
- Soil erosion: heavy rains on slopes without cover crops or erosion barriers

Practical climate-smart practices for Uganda coffee:
- Shade trees (moderate shade 20-35%): buffer against temperature extremes and drought; choose shade species that also produce food or income (avocado, macadamia, banana)
- Mulching: reduces soil moisture loss during dry spells, critical for highland Arabica
- Erosion control (grass strips, stone lines, terracing): prevents topsoil loss on Mt. Elgon and Rwenzori slopes
- Crop diversification: multiple crops provide income buffer when coffee fails
- Water harvesting: bottle irrigation (low-cost micro-drip) for seedlings and young coffee during dry seasons
- Drought-tolerant cover crops: fill ground between coffee rows, reduce evaporation

Technology tools available to Uganda farmers:
- Weather apps: Uganda Meteorological Authority app; international tools like Windy.com and AccuWeather for farm-level forecasting
- Pest early warning: Coffee Berry Borer and CBD risk models based on rainfall and temperature
- Mobile market prices: UCDA, Reuters Market Light, WFP market price apps for real-time coffee prices
- Digital farm records: Simple spreadsheet on phone; or kobo/ODK for structured data collection
- WhatsApp groups: Many farmer cooperatives use WhatsApp for extension advice, weather alerts, and market prices

Economic perspective: Climate-smart practices are not only environmental — they are economic. They reduce production losses, stabilize income, improve long-term profitability, and make farms more attractive to lenders and certification programs. Resilient farms are more bankable.`,
  },
  {
    id: 'agribusiness-finance-investment',
    title: 'Agribusiness Finance & Investment Strategy — Accessing Capital and Growing Sustainably',
    content: `Successful farming is not driven by production alone — it is driven by financial discipline. Many farms generate output but fail to build wealth due to weak financial planning and poor capital allocation.
Sources of farm finance in Uganda:
1. Personal savings and reinvestment — safest, no interest, but slow
2. SACCOs and cooperatives — lower interest rates, group guarantee; Uganda has many coffee cooperatives with financial services
3. Bank loans and credit facilities — available from dfcu, Centenary Bank, DFCU, UGACOF-affiliated lenders; requires records and collateral
4. Government programs: Uganda Development Bank (UDB) agricultural window, Emyooga programme, Operation Wealth Creation (OWC) input support
5. Private investors and partnerships: contract farming arrangements with processors or exporters who provide inputs against future crop
6. Development programs: USAID, EU, GIZ programmes often provide grants or subsidised inputs through cooperatives

Investment decisions that drive farm growth:
Strategic investments worth making:
- Land improvement: terracing, drainage, shade tree planting — long-term asset
- Irrigation: for nurseries and young coffee (bottle drip irrigation is low-cost)
- Storage: proper drying beds and coffee store reduces post-harvest losses
- Processing equipment: small pulping machine (if producing washed Arabica) can dramatically improve quality and price
- Certification: Organic, Fairtrade, Rainforest Alliance — requires upfront investment but opens premium markets

Every investment should be evaluated on:
- Return on Investment (ROI): will this generate more than it costs?
- Payback period: how many seasons to recoup the investment?
- Impact on productivity and efficiency

Key rule: Cash flow determines whether a farm survives or collapses. A profitable farm CAN still fail due to poor cash flow management. Always maintain a liquidity reserve — at least 3 months of operating costs — before taking on expansion.

Avoiding debt traps:
- Never borrow for consumption or living expenses against farm income
- Match loan repayment schedule to your income cycle (harvest payments)
- Don't over-leverage — high debt-to-asset ratios make the farm fragile to one bad season`,
  },
]

async function main() {
  const { embed } = await import('../lib/embeddings')
  const { getSupabase } = await import('../lib/supabase')
  const supabase = getSupabase()

  console.log(`Seeding ${CHUNKS.length} farm management knowledge chunks...`)
  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const chunk of CHUNKS) {
    const { data: existing } = await supabase
      .from('knowledge_chunks')
      .select('id')
      .eq('source', 'sarlis-consults')
      .eq('source_id', chunk.id)
      .maybeSingle()

    if (existing) {
      console.log(`  SKIP (exists): ${chunk.title}`)
      skipped++
      continue
    }

    try {
      const embedding = await embed(`${chunk.title}\n${chunk.content}`)
      const { error } = await supabase.from('knowledge_chunks').insert({
        topic: 'coffee',
        title: chunk.title,
        content: chunk.content,
        embedding,
        source: 'sarlis-consults',
        source_id: chunk.id,
      })

      if (error) {
        console.error(`  ERROR inserting ${chunk.id}:`, error.message)
        errors++
      } else {
        console.log(`  [${++inserted}] ${chunk.title}`)
      }

      await sleep(300)
    } catch (err) {
      console.error(`  ERROR embedding ${chunk.id}:`, err)
      errors++
    }
  }

  console.log(`\nDone. Inserted: ${inserted}  Skipped: ${skipped}  Errors: ${errors}`)
}

main()
