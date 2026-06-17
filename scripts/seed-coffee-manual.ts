/**
 * Seeds knowledge_chunks from the MAAIF Climate Smart Coffee Production Manual
 * for Extension Workers in Uganda (May 2025).
 *
 * Run with: npm run seed:manual
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

type SeedEntry = {
  topic: 'coffee' | 'phaneroo'
  title: string
  content: string
  source: string
}

const SOURCE = 'MAAIF Climate Smart Coffee Production Manual, Uganda (May 2025)'

const entries: SeedEntry[] = [
  {
    topic: 'coffee',
    title: 'Uganda coffee overview',
    content:
      'Coffee is Uganda\'s leading export crop, supporting over 1.7 million households and making up 14% of national exports. In 2023/24, Uganda produced 8.2 million bags and exported 6.12 million bags worth $1.145 billion. Two main types are grown: Robusta (about 80% of production, low-altitude areas) and Arabica (about 20%, high-altitude areas). Climate change — erratic rainfall, rising temperatures, increased pests and diseases — is the biggest threat to the sector.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Robusta coffee: growing requirements',
    content:
      'Robusta (Coffea canephora) thrives in Central, Eastern, Western, and Southern Uganda at altitudes of 900–1,200 metres above sea level (masl). Optimal temperature: 22–28°C; above 30°C causes physiological disorders; frost damage below 0°C. Requires 2,000–2,500 mm of rainfall per year, well distributed over at least 8 months. Prefers 75% relative humidity. Soil pH 5.5–6.5, fertile, free-draining volcanic red earth or sandy loams. Tolerates full sun but benefits from shade in hot or windy sites.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Arabica coffee: growing requirements',
    content:
      'Arabica (Coffea arabica) grows on the slopes of Mount Elgon (Eastern Uganda), Mount Rwenzori, and Mount Muhabura (South-western Uganda) at altitudes of 1,500–2,300 masl, with premium quality above 1,500 m. Optimal temperature: 15–24°C; sensitive to frost and temperatures above 24°C. Requires 1,200–1,800 mm of well-distributed rainfall over 9 months. Relative humidity 60%. Soil pH 5.5–6.5, well-aerated, free-draining, rich in organic matter. Moderate shade recommended to buffer temperature extremes.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Climate-sensitive stages of coffee production',
    content:
      'Coffee has four climate-sensitive stages. (1) Seedling: needs adequate moisture to establish. (2) Transplanting: shade the seedlings from heat stress and supply adequate water. (3) Flowering: flower buds become dormant during dry season and only open when rain arrives — Robusta also requires cross-pollination so pollinator loss is a risk. (4) Fruiting and ripening: cherries need sufficient water for bean quality and flavour development; temperatures above 30°C cause flower abortion, poor fruit setting, and premature ripening.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Climate-smart agroforestry for coffee',
    content:
      'Planting shade trees among coffee is a key climate-smart practice. Recommended species include Albizia, Ficus natalensis (Mutuba), Ficus mucuso (Mukunyu), and Grevillea. Spacing: 20–40 metres between shade trees, depending on species and canopy size. Benefits: regulates microclimate, reduces temperature stress, conserves soil moisture, improves soil fertility through nitrogen fixation (leguminous species), and sequesters carbon. In Uganda regional tree species vary: Central uses Mugavu (Albizia coriaria) and Ficus natalensis; Mt Elgon area uses Cordia africana (Akoiyi); West Nile uses Ubi (Ficus natalensis).',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Soil and water conservation on coffee farms',
    content:
      'Key techniques: (1) Minimum tillage / strip and spot tillage — only till narrow strips where planting occurs, leaving the rest of the soil undisturbed to preserve structure and moisture. (2) Contour bunds and terracing on slopes — "Fanya Juu" (soil heaped uphill) and "Fanya Chini" (soil placed downhill) slow runoff and improve water infiltration. (3) Mulching — cover soil with dried grass, maize stalks, bean haulms, coffee husks, or compost (5–15 cm depth), keeping the mulch 15 cm away from young stems and 30 cm from mature stems to prevent collar rot. (4) Cover cropping — Mucuna, Lablab, and Indigofera spicata suppress weeds, reduce soil temperature, and improve soil structure.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Organic manure and composting for coffee',
    content:
      'Organic manure improves soil structure and fertility. Heap composting: layer rough vegetation (30 cm), manure/compost (10 cm), green vegetation (15–20 cm), repeat to 1–1.5 m height; keep moist; ready in 6 weeks. Pit composting: three adjacent pits 1.5–2 m wide, 1 m deep, layered similarly. Application: place in planting holes before planting, or as top dressing using the ring method — apply in a ring from the stem to the outer edge of the leaves (the drip line). Apply 10 kg cattle manure per tree per year for mature Robusta. Coffee pulp from processing can also be composted back into the farm.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Fertilizer program for Robusta coffee (Uganda)',
    content:
      'MAAIF recommended fertilizer program for Robusta: Before planting: lime at 100 g/hole if pH < 5.5; 20 L decomposed cattle manure per hole. At planting: single super phosphate (60 g/tree) to enhance root formation. Young coffee (newly planted): NPK 25:5:5 at 75 g/tree/rainy season if pH > 5.4, or urea at 76 g/tree/rainy season if nitrogen-deficient. Young coffee (over 2 years): NPK 25:5:5 at 150 g/tree/rainy season, or calcium ammonium nitrate at 250 g/tree/season if pH < 5.5. Mature coffee (5 options including): NPK 15:2:31 at 250 g/tree/season; muriate of potash (62% K₂O) at 200 g/tree/season for fruit maturation. All applied using the ring method.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Climate-resilient coffee varieties (Uganda)',
    content:
      'NaCORI (National Coffee Research Institute) breeds disease- and drought-tolerant coffee varieties for Uganda. Key examples: Kintuza Robusta (KR) clones, which are resistant to Coffee Wilt Disease (CWD). Farmers should choose a mix of high-yielding varieties that are drought-tolerant and disease-resistant. All planting material must come from a MAAIF-certified coffee nursery to guarantee quality and disease-free stock.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Stem training / bending for Robusta coffee',
    content:
      'The multiple-stem training system improves productivity and climate resilience in Robusta coffee. Procedure: Bend the main stem at 5–6 months after planting (when it is about 60 cm tall) in an East–West direction and peg it at a 45° angle. This promotes multiple vigorous suckers and faster canopy coverage. Select three strong suckers about 15 cm from the ground, evenly spaced. Once suckers reach 30 cm, the bent stem can return upright. For drier regions like Teso and Luweero, "capping" (cutting the main stem back to 15–30 cm) encourages sucker growth and conserves moisture. Combine with mulching for best results.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Common coffee pests in Uganda',
    content:
      'Major coffee pests in Uganda: (1) Black Coffee Twig Borer — drills galleries into heartwood, killing branches that bear beans. Control: prune affected stems, use Brocca (baited) traps, burn infested material. (2) Coffee Berry Borer — 1 mm holes near berry tip, beans turn blue-green. Control: orchard hygiene (remove dropped cherries), alcohol-baited traps, careful drying, Imidacloprid (Imax 4 ml/L) + Tebucozanole (ORIUS 6 ml/L). (3) Scales / Mealybugs — yellowing, wilting, honeydew secretion. Control: neem oil or soapy solution (1–2%), mealy bug ladybird as predator. (4) White Stem Borer — zigzag tunnels in woody tissue, ridges on stem. Control: pheromone traps every 20 m, neem-garlic-marigold paste twice yearly (September and March), burn infested plants. (5) Termites — thrive in dead wood. Control: remove dead wood, apply permethrin (60–80 g/L) at tree base.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Integrated Pest Management (IPM) for coffee',
    content:
      'IPM combines multiple pest control strategies to minimise chemical use. Components: (a) Regular scouting — monitor for coffee berry borer (Hypothenemus hampei), leaf rust, and mealybugs using field traps and sampling. (b) Cultural controls — optimise shade trees, proper spacing to reduce humidity and disease pressure. (c) Pruning and sanitation — remove infested/diseased branches and berries. (d) Biological controls — encourage or release beneficial insects like Phymastichus coffea (a parasitoid wasp that attacks coffee berry borer). (e) Mechanical controls — alcohol-baited traps for borers, hand-picking infested berries. (f) Chemical control — last resort only; use selective, low-toxicity pesticides when economic thresholds are exceeded. (g) Resistant varieties — plant NaCORI-bred varieties resistant to coffee leaf rust and Coffee Wilt Disease.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Common coffee diseases in Uganda',
    content:
      'Major coffee diseases: (1) Coffee Leaf Rust (fungal) — yellow-orange powdery spots on underside of leaves; managed by proper pruning, resistant varieties, and copper fungicides in Arabica. (2) Coffee Berry Disease (fungal) — dark brown-black sunken lesions on green berries, pink spores visible, berries rot; manage with manure/fertilizer and copper-based fungicides. (3) Coffee Wilt Disease (fungal/CWD) — leaves fall, branches die, cherries ripen prematurely, blue-black wood discoloration, tree eventually dies; destroy all infected trees, leave land fallow 1.5+ years, sterilise tools with Jik, do not replant coffee for at least 1.5 years. (4) Coffee Red Blister — symptoms similar to CWD; use tolerant varieties, good drainage and pruning. (5) Brown Eye Spot (Cercospora) — pale circular spots on leaves becoming reddish-brown; maintain 50% shade cover, copper sprays if severe (copper hydroxide 40 g/20 L water).',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Coffee harvesting best practices',
    content:
      'Harvest only fully red ripe cherries by selective picking every 10–15 days. Do: use clean containers and clean tarpaulins; remove leaves and twigs immediately after harvest; start drying promptly. Do not: harvest overripe or immature (green) cherries — they result in poor cup quality and risk mould; strip-pick (pulling all fruit at once) — this damages coffee bearing loci and parts of primary branches, reducing yields the following season.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Coffee drying methods and standards',
    content:
      'Drying reduces coffee moisture from 55–60% down to 12–14% before storage or milling. Sun drying takes 14–30 days depending on weather. Do not dry on bare ground — use cemented floors, tarpaulins, raised tables, or raised wire mesh. Turn cherries with a rake for uniform drying; cover at night and during rain to prevent re-wetting. In the first 2–3 days keep the layer no more than 4 cm thick to speed drying and prevent mould. Solar dryers (large or small scale) can shorten drying time. Dried Kiboko (dry coffee) should be black, odourless, free of foreign material, with a minimum out-turn of 50%.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Coffee processing: wet and dry methods',
    content:
      'Wet processing (washed method): harvest → sort → pulp (eco-pulper removes cherry skin using less water than traditional pulpers) → fermentation/mechanical demucilaging → washing → drying → milling. The parchment coffee after pulping still needs fermentation and washing to remove mucilage before drying. Coffee pulp is a byproduct that can be composted or used for biogas. Dry processing (natural): Robusta can be dry-processed but drying must start immediately after harvest to prevent mould. Each batch dried to 12% moisture content before delivery to milling centre. Avoid mixing coffee harvested on different days.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Coffee storage and packaging standards',
    content:
      'Proper storage preserves freshness, flavour, and aroma. Rules: store in a cemented-floor, plastered-wall, well-ventilated, leak-proof warehouse; keep bags on pallets at least 15 cm above the ground and 30 cm from walls and ceiling. Dry cherry (Kiboko) should be in silos or clean sisal bags — never polyethylene bags (they cause moisture condensation and mould). Isolate the store from strong-smelling substances like petrol, diesel, paraffin, fertilizers, and agrochemicals. For export, use food-grade poly-lined jute sacks labelled with lot codes, weight, harvest date, and origin.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Coffee value addition opportunities',
    content:
      'Value addition increases income for everyone in the chain. Key practices: (1) Local roasting — creates ground coffee and instant coffee, reduces raw export dependence. (2) Quality control — uniform bean size, 10–12% moisture, free of foreign matter, graded by size, removal of mouldy/discoloured/insect-damaged beans. (3) Branding and marketing — develop a unique Ugandan brand emphasising cup quality, origin, and story. (4) Certification — Fairtrade, Organic, Utz, Rainforest Alliance certifications attract premium prices. (5) Byproduct use — coffee pulp for compost, biogas, animal feed; coffee husks for briquettes; biochar from coffee waste for soil improvement. (6) Value chain linkages — strengthen connections between farmers, cooperatives, processors, exporters, and consumers.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Uganda coffee market channels and requirements',
    content:
      'Uganda coffee is sold through domestic, regional, and international channels. Domestic: local roasters, cafés, hotels, supermarkets. Regional: Kenya, Rwanda, South Sudan, DRC. International: Europe (Germany, Italy, Netherlands) buys quality coffee; US and Canada buy specialty single-origin and fair-trade; Asia (Japan, South Korea, China) buys premium and instant coffee. Market requirements: uniform bean size/shape/colour; 10–12% moisture (use calibrated meters and raised drying beds); free from stones, twigs, and dust; graded by size; stored in cool, dry, ventilated warehouses. Certification (Fairtrade, Organic, Utz, Rainforest Alliance) opens specialty premium markets.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Safe use of agro-chemicals on coffee farms',
    content:
      'Agrochemicals (herbicides, insecticides, fungicides, nematicides) must be handled carefully. Buy from licensed dealers in original containers; verify against counterfeits using the Kakasa (e-tag) app. Colour coding on labels: Red (Class 1a/1b) = Extremely/Highly Toxic; Yellow (Class II) = Moderately Toxic; Blue (Class III) = Slightly Toxic; Green (Class V) = Handle with Care. Wear full PPE: long rubber gloves, waterproof hat, goggles, respirator, overalls, rubber boots. Mix outdoors. Spray before 11 AM or after 4 PM when pests are most active. Do not spray near water sources or when rain is imminent. After spraying: triple-rinse containers, puncture them, dispose properly; wash hands and shower.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Seasonal pest and disease forecasting',
    content:
      'Seasonal forecasting helps farmers anticipate and prepare for pest and disease outbreaks based on weather patterns, climatic conditions, and biological cycles. Farmers should monitor weather forecasts from Uganda\'s Department of Meteorology (DOM) — available via district production offices, radio, SMS, and apps. Dry spells followed by rains can trigger Coffee Berry Borer outbreaks and Coffee Berry Disease. Prolonged wet periods increase Coffee Leaf Rust risk. Timing spraying, pruning, and harvesting based on seasonal forecasts reduces losses and chemical use.',
    source: SOURCE,
  },
  {
    topic: 'coffee',
    title: 'Enterprise planning and business case for coffee farming',
    content:
      'Coffee farming is a business that requires clear goal-setting and planning. A business plan for a coffee farm covers: financial plan, operations plan, marketing plan, management/leadership, environment analysis, and competitor analysis. Key cost-benefit analysis (CBA) figures from MAAIF for one acre of Robusta in Year 1 include: bush clearing and land ploughing (UGX 300,000), organic manure (UGX 300,000), 463 seedlings at UGX 1,500 each (UGX 693,750), planting holes (UGX 231,250), 40 shade tree seedlings (UGX 80,000), training/weeding/mulching/pruning (about UGX 400,000). The business plan is a living document updated every season. Access to Uganda Development Bank financing can support investment in value-addition equipment.',
    source: SOURCE,
  },
]

async function main() {
  const { embed } = await import('../lib/gemini')
  const { getSupabase } = await import('../lib/supabase')
  const supabase = getSupabase()

  let inserted = 0
  let failed = 0

  for (const entry of entries) {
    try {
      const embedding = await embed(`${entry.title}\n${entry.content}`)
      const { error } = await supabase.from('knowledge_chunks').insert({
        topic: entry.topic,
        title: entry.title,
        content: entry.content,
        embedding,
        source: entry.source,
      })
      if (error) {
        console.error(`FAILED: "${entry.title}":`, error.message)
        failed++
      } else {
        console.log(`OK: [${entry.topic}] ${entry.title}`)
        inserted++
      }
    } catch (err) {
      console.error(`ERROR: "${entry.title}":`, err)
      failed++
    }
  }

  console.log(`\nDone. Inserted: ${inserted}, Failed: ${failed}`)
}

main()
