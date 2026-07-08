/**
 * Seeds Wageningen University & Research / Enveritas study (May 2026) into ZOE's knowledge base.
 * Source: "Investing time and money: can advanced farm management enable living incomes for coffee farmers?"
 * Pamuk, Janssen, Kisters, de Vries, Andrade & Edman — Research Paper 2026-042
 * Based on Enveritas Global Coffee Farming Data, 2023-2024 harvest year.
 * Uganda is part of the "Africa-Asia" country group (also includes Indonesia, Papua New Guinea, Tanzania).
 *
 * Usage:
 *   npm run seed:wageningen
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

const CHUNKS: Array<{ id: string; title: string; content: string }> = [
  {
    id: 'overview',
    title: 'Wageningen/Enveritas 2026: Coffee Farm Management & Living Incomes — Research Overview',
    content: `Wageningen University & Research and Enveritas published a major research paper in May 2026 (Research Paper 2026-042): "Investing time and money: can advanced farm management enable living incomes for coffee farmers?" It analyses whether adopting advanced coffee farm management practices can help small-scale farmers close the living income gap.

Data: Enveritas Global Coffee Farming Data for the 2023-2024 harvest year, covering 10 countries: Vietnam, Brazil, Colombia, Honduras, Peru, India, Indonesia, Papua New Guinea, Tanzania, and Uganda. These countries account for ~75% of global coffee production.

Uganda is grouped in the "Africa-Asia" country group alongside Indonesia, Papua New Guinea, and Tanzania.

Key finding: Most coffee farmers worldwide do not earn a living income. Higher yields from advanced practices do NOT always translate into higher net incomes — it depends on whether the additional costs of those practices are offset by revenue gains. In Africa-Asia (including Uganda), the high costs of inorganic fertiliser and irrigation outweigh their revenue benefits. Regenerative practices are the better pathway for income improvement in Uganda and East Africa.`,
  },
  {
    id: 'uganda-baseline',
    title: 'Wageningen 2026: Uganda Coffee Farming — Baseline Statistics',
    content: `Key statistics for Uganda coffee farmers from Enveritas 2023-2024 data (Wageningen Research Paper 2026-042):

Farm characteristics:
- Average farm size: 0.9 hectares total (0.8 ha productive) — the SMALLEST of all regions studied
- Average household size: 5 members
- ~32% of farmers are female
- Most farmers have over 15 years of experience; average age 50
- Both Arabica (47.9%) and Robusta (52.1%) are produced

Income and living income:
- Average yield: 398 kg/ha — significantly lower than Vietnam (2,444 kg/ha) or Brazil (1,949 kg/ha)
- Average net coffee income: USD 795 per year
- Average total household income (coffee + other): USD 1,571 per year
- Only 8.1% of Uganda/Africa-Asia households earn a living income
- Average living income gap: USD 4,514 per household per year

Living income benchmarks for Uganda regions (Fairtrade/Anker, 2024):
- Mt. Elgon: 17,428,456 UGX/year (USD 4,641) for average family of 7.4
- Rwenzori / Western / Southwestern: 24,382,578 UGX/year (USD 6,493) for family of 7.7
- West Nile: 18,863,794 UGX/year (USD 5,023) for family of 7 members
- Busoga / Central / Greater Masaka (Lake Victoria Basin): 14,423,256 UGX/year (USD 3,841) for family of 5
- Living wage benchmark: 557,758 UGX per month (USD 149/month)

Conclusion: Coffee farming alone cannot provide a living income for most Uganda farmers at current farm sizes and yields. Diversification of income sources is essential.`,
  },
  {
    id: 'practices-recommendation-uganda',
    title: 'Wageningen 2026: Best Farm Management Strategy for Uganda (Regenerative vs. Input-Intensive)',
    content: `Critical finding from Wageningen/Enveritas 2026 study on which farming practices actually improve net income for Uganda/Africa-Asia coffee farmers:

AVOID advanced inorganic fertiliser and irrigation as a primary strategy in Uganda:
- High-level inorganic fertiliser adoption is associated with a 330% increase in farming expenses in Africa-Asia — the highest cost increase of any region
- Medium-level irrigation is associated with ~100% increase in expenses in Africa-Asia
- Although these practices increase yields, their costs outweigh the revenue gains
- Advanced full-practice profiles (including inorganic fertiliser + irrigation) are associated with LOWER predicted net coffee income in Africa-Asia compared to medium profiles
- A farmer with an advanced full-practice profile earns only USD 0.95 for every dollar invested in Africa-Asia

FOCUS on regenerative practices — this is the stronger income pathway for Uganda:
Regenerative practices that improve income without the cost trap:
1. Pruning — positively associated with yields in Africa-Asia; high adoption recommended
2. Organic fertiliser — positive yield association in Africa-Asia
3. Integrated Pest Management (IPM) — positive yield association
4. Rejuvenation (stumping) — positive yield association in Africa-Asia
5. Mulching and cover crops — soil protection without high cost
6. Erosion control — important especially on slopes

Advanced regenerative profile (excluding inorganic fertiliser + irrigation) generates a predicted net income of USD 829/year in Africa-Asia — USD 223 more than the minimum profile — compared to NEGATIVE net income under the full advanced practice profile.

Practical recommendation: Maintain your current level of inorganic fertiliser use (don't reduce it) but don't push to advanced inorganic inputs. Instead invest your energy and money in pruning, organic fertiliser, IPM, rejuvenation, and soil management. Consistent with recommendations from TechnoServe (2025) for Uganda, Kenya, and Indonesia.`,
  },
  {
    id: 'yield-income-relationship',
    title: 'Wageningen 2026: Why Higher Yields Don\'t Always Mean More Money in Uganda',
    content: `Key insight from Wageningen/Enveritas research (2026) on the yield-income relationship for Uganda coffee farmers:

Advanced farm management practices DO increase yields in Africa-Asia/Uganda — advanced profiles are associated with more than double the yields of minimum profiles. However, this does NOT translate into higher net incomes because:

1. Input costs outpace revenue gains: In Africa-Asia, adopting high-level inorganic fertiliser increases expenses by 330% while revenues increase by much less. The cost of inputs (fertiliser, irrigation equipment, water) is proportionally higher in Africa-Asia than in Brazil or Vietnam.

2. Labour costs add up: Advanced practices require approximately 100 additional labour days per hectare compared to minimum practices. This extra labour investment may not generate enough additional revenue to justify the time — especially when better-paying off-farm opportunities exist.

3. Farm size is a binding constraint: With average productive farm size of only 0.8 hectares, even doubling yields on such a small farm still cannot generate a living income. In Africa-Asia, small-productive farm households have high yields but are still poor because they simply don't have enough land.

Returns to labour in Africa-Asia:
- Sample average: USD 6.8 per farm working day
- Only 25.9% of farms have returns to labour above the living wage (USD 149/month)
- Compare: Vietnam has 59.8% of farms above living wage at USD 15.9/day

Price sensitivity: Higher coffee prices help significantly. At 140% of 2024 farm-gate prices, advanced practices in Africa-Asia become net positive. This means price improvements (through cooperatives, certifications, specialty premiums) are highly complementary to good agronomic practices.`,
  },
  {
    id: 'farmer-typologies-uganda',
    title: 'Wageningen 2026: Uganda/Africa-Asia Farmer Typologies',
    content: `Five distinct farmer typologies identified in Africa-Asia (Uganda, Tanzania, Indonesia, Papua New Guinea) from Enveritas 2023-2024 data (Wageningen Research Paper 2026-042):

1. Large but unproductive (n=5,596): Average 1.42 ha, only 385 kg/ha yield, 85% coffee dependent, USD 1,042 total income. These farms have land potential but low yields — likely constrained by lack of good practices, labour, or finance. Highest scope for improvement through targeted agronomic practices.

2. Unsuccessfully diversified (n=4,735): Average 0.47 ha, 238 kg/ha, 14% coffee dependent, USD 1,079 total income. Very small farms, low coffee yields, low income from other sources too. Both their coffee and diversification strategies are underperforming.

3. Robusta-focused smallholder (n=4,821): Average 0.59 ha, 320 kg/ha, 25% coffee dependent, USD 1,715 total income. Robusta variety, moderate income, not heavily reliant on coffee.

4. Productive but small (n=2,260): Average 0.59 ha, 422 kg/ha, 47% coffee dependent, USD 1,236 total income. These farmers have good yields but their small farm size limits total income. Improving practices won't generate a living income without also expanding farm size or adding other income.

5. Larger Robusta farms with medium coffee dependency (n=9,320): Average 1.05 ha, 518 kg/ha, 68% coffee dependent, USD 2,111 total income. Best-performing group in Africa-Asia. Still only 19% earn a living income. Robusta variety, larger farms, higher yields.

Key insight: Farm size is a binding constraint. The "productive but small" typology shows that even high yields cannot generate a living income on 0.59 ha. Income diversification and/or farm expansion are necessary alongside improved agronomic practices.`,
  },
  {
    id: 'labour-requirements',
    title: 'Wageningen 2026: Labour Requirements for Coffee Farming Practices in Uganda/Africa-Asia',
    content: `Labour day estimates for coffee farming practices in East Africa (Uganda, Tanzania, Ethiopia proxy) from Enveritas/Wageningen 2026 research:

Basic activities per hectare per year:
- Harvesting, processing, transportation, weeding, administration: approximately 134 labour days per hectare in Africa-Asia/Ethiopia proxy (compared to 72 days in Vietnam)
- The higher labour requirement in Africa-Asia is partly explained by more trees per hectare and selective picking methods

Labour days required per hectare for specific practices (Ethiopia proxy used for Uganda/Tanzania):
- Pruning: approximately 26 days (at high adoption)
- Organic fertiliser: high adoption can require up to 48 days (most labour-intensive practice in Honduras equivalent; Africa-Asia varies)
- Inorganic fertiliser: fewer than 10 days generally
- IPM: fewer than 10 days generally
- Shading: fewer than 10 days generally

Advanced farm management profile requires approximately 100 additional labour days per hectare compared to the minimum profile in Africa-Asia.

Returns to labour in Africa-Asia sample average: USD 6.80 per farm working day
- For farmers adopting advanced regenerative practices (no inorganic fertiliser/irrigation): returns increase by about USD 2.60 per day compared to when input/capital-intensive practices are included
- Implication: In Uganda, focusing on regenerative practices not only increases net income but also improves the return per hour of labour invested

When farmers consider adopting new practices, they should evaluate whether the return per day of extra labour is worth it compared to other income-generating activities available to them.`,
  },
  {
    id: 'diversification-living-income',
    title: 'Wageningen 2026: Why Coffee Alone Cannot Provide a Living Income in Uganda — and What To Do',
    content: `Critical conclusion from Wageningen/Enveritas 2026 research specifically relevant to Uganda and East Africa coffee farmers:

The living income problem cannot be solved by farm management alone:
- Even under the most optimal farm management strategy (advanced regenerative practices in Africa-Asia), the proportion of households earning a living income only increases by about 2 percentage points
- The fundamental reason: coffee farms in Uganda average only 0.8 productive hectares — far too small to generate a living income even at high yield levels
- Coffee farming also doesn't provide enough working days to fill a full year's income potential — farmers in Africa-Asia need ~134 labour days/ha for coffee, but a year has ~246 potential working days

The living income gap for Uganda by region:
- Mt. Elgon: living income benchmark USD 4,641/year; average coffee income USD 795
- Rwenzori: benchmark USD 6,493/year — the largest gap of any Uganda region
- Busoga/Central: benchmark USD 3,841/year — the smallest gap

What the research recommends for Uganda farmers and the coffee sector:

1. Income diversification is essential — alternative income sources (other crops, livestock, off-farm work) are necessary for sustainable livelihoods. Farmer typologies show "successfully diversified" farmers earn significantly more than "unsuccessfully diversified" ones.

2. Focus on regenerative practices, not expensive inputs — pruning, organic fertiliser, IPM, rejuvenation, mulching and erosion control improve net income without the input cost trap.

3. Better coffee prices help significantly — price improvements through cooperatives, certification (Fairtrade, organic), and specialty/quality premiums directly increase returns and make advanced practices financially viable.

4. Labour efficiency matters — practices that improve yield per labour day invested are better than those requiring heavy extra labour with marginal income gains.

5. Farm size expansion or cooperative land management can address the fundamental constraint that even efficient small farms cannot generate sufficient total income.

Source: Wageningen Social & Economic Research, Research Paper 2026-042. Funded by JDE Peet's N.V.`,
  },
  {
    id: 'practices-yield-evidence',
    title: 'Wageningen 2026: Evidence on Which Practices Increase Coffee Yields in Africa-Asia/Uganda',
    content: `Econometric evidence from Enveritas/Wageningen 2026 research on practice-yield relationships in Africa-Asia (Uganda, Tanzania, Indonesia, Papua New Guinea), from 2023-2024 harvest year data:

Practices with POSITIVE yield associations in Africa-Asia:
- Inorganic fertiliser (high adoption): 30%+ yield increase vs. no adoption — but costs are prohibitive (330% expense increase)
- Irrigation: 30%+ yield increase — but ~100% expense increase makes it financially unviable for most
- Pruning: Positive and significant — medium and high levels both associated with higher yields. In Africa-Asia, high pruning adoption is common and recommended. Scientific evidence from Ethiopia confirms this.
- Organic fertiliser: Positive yield association in Africa-Asia (unlike in Brazil). Use compost, bokashi, manure.
- Rejuvenation (stumping): Positive relationship with yields in Africa-Asia. Timing matters — effects may take several years to appear.
- IPM (Integrated Pest Management): Positive yield association. Community-wide approach needed for maximum effect (especially for Coffee Berry Borer).

Practices with MIXED or NO significant yield effect in Africa-Asia:
- Shade trees: Generally linked to LOWER yields in Africa-Asia in this study. However, moderate shade may improve quality, and fruit/timber shade trees generate additional income, so yield loss may be offset by other value. Long-term yield stability benefits exist.
- Erosion control: Positive in some regions, not consistently significant across all of Africa-Asia
- Weeding: No statistically significant yield relationship observed (but it is a baseline practice all farmers do)
- Mulching/cover crops: No significant yield relationship — but important for long-term soil health

Labour days to close the yield gap in Africa-Asia: Current average yields (398 kg/ha) are only 58% of what advanced management profile yields would predict. Closing this gap requires primarily: better pruning, organic fertiliser use, IPM, and rejuvenation practices.`,
  },
]

async function main() {
  const { embed } = await import('../lib/embeddings')
  const { getSupabase } = await import('../lib/supabase')
  const supabase = getSupabase()

  console.log(`Seeding ${CHUNKS.length} Wageningen 2026 research chunks...`)
  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const chunk of CHUNKS) {
    const { data: existing } = await supabase
      .from('knowledge_chunks')
      .select('id')
      .eq('source', 'wageningen-2026')
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
        source: 'wageningen-2026',
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
