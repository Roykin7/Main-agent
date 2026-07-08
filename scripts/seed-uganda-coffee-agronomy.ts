/**
 * Seeds Uganda-specific coffee agronomy content into ZOE's knowledge base.
 * Fills the gaps identified in ZOE's ability to give targeted advice:
 *   1. Uganda coffee seasonal calendar (Arabica & Robusta)
 *   2. Uganda coffee variety guide
 *   3. Coffee disease identification & management
 *   4. Coffee pest identification & management
 *   5. Uganda soil types by coffee-growing region
 *   6. Input sourcing in Uganda
 *
 * Sources:
 *   - UCDA (Uganda Coffee Development Authority)
 *   - NaCORRI / CORI (National Coffee Research Institute, Kituza)
 *   - MAAIF (Ministry of Agriculture, Animal Industry and Fisheries)
 *   - CABI / ICO disease and pest notes
 *   - FAO/CFC Uganda coffee studies
 *   - TechnoServe Uganda coffee programme documentation
 *   - Coffee&Climate toolbox (Uganda edition) — already in KB
 *
 * Usage:
 *   npm run seed:agronomy
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

const CHUNKS: Array<{ id: string; title: string; content: string }> = [
  {
    id: 'seasonal-calendar-arabica',
    title: 'Uganda Arabica Coffee Seasonal Calendar — Monthly Farm Activities',
    content: `Uganda Arabica coffee seasonal calendar for the main Arabica growing regions: Mt. Elgon (Kapchorwa, Bukwo, Sironko), Rwenzori (Kasese, Kabarole), and Kisoro/Kabale. Based on Uganda's bimodal rainfall pattern: long rains March–May, short rains August–November. (Source: UCDA/NaCORRI agronomic guidelines)

ARABICA COFFEE CROP CYCLE:
- Main harvest: October – February (peak: November–December)
- Fly crop (second minor harvest): May – July (smaller yield, same care applies)
- Flowering: March–April (stimulated by first rains) and August–September (for fly crop)
- Berry development: ~7–9 months after flowering to ripe cherry

MONTHLY ACTIVITY CALENDAR (Arabica):

JANUARY–FEBRUARY (End of main harvest):
→ Complete harvesting all remaining ripe cherries; strip any overripe/dry cherries to break CBB cycle
→ Post-harvest processing: pulping, fermentation, washing, drying to correct moisture (11-12%)
→ Prune and desuck after harvest while soil is still moist — side branches, dead wood, overcrowded stems
→ Weed around tree bases

MARCH–APRIL (Start of long rains):
→ Major weeding: first rains bring flush of weeds
→ Apply organic fertiliser / compost (work into soil before rains wash in nutrients)
→ Apply inorganic fertiliser (CAN or NPK) — first application at start of rains if using
→ Nursery activities: sow seeds in nursery beds if establishing new plot or gap filling
→ Planting of new trees (long rains are ideal planting time)
→ Scout for Coffee Berry Disease (CBD) — warm wet conditions favour infection
→ First CBD spray if disease history warrants it

MAY–JUNE (Long rains tapering off — fly crop forming):
→ Continue weeding
→ Scout and manage Coffee Berry Borer (CBB) — traps should already be deployed
→ Fly crop beginning to form — cherries from August–September flowering now sizing up
→ Apply second dose of organic mulch around tree base (30cm radius, don't touch stem)
→ Maintain shade — check shade trees are not overshading (>40%) or undershading

JULY (Dry season):
→ Light pruning if needed
→ Desuckering — remove unwanted suckers/shoots
→ Farm infrastructure maintenance: repair terraces, drying beds, water channels
→ Soil conservation: check erosion barriers on slopes
→ Prepare for fly crop harvest starting late July

AUGUST–SEPTEMBER (Short rains begin — fly crop harvest + main crop flowering):
→ Harvest fly crop (cherries from May-June flowering)
→ Second weeding: short rains bring weeds again
→ Apply second round of fertiliser (coincides with short rains onset)
→ Flowering for main crop begins — critical not to disturb trees, avoid heavy pruning now
→ CBD and CLR spray as rains begin if disease pressure is high
→ Scout for Antestia Bug (causes potato taste defect in cup)

OCTOBER–DECEMBER (Main harvest season — peak):
→ Harvest ripe red cherries selectively, every 1-2 weeks (selective picking essential for quality)
→ Avoid picking green or overripe cherries
→ Process same day as harvesting — wet processing within 12-24 hours of picking
→ Dry on raised beds for 2-4 weeks until moisture content reaches 11-12%
→ Maintain CBB traps and spot-spray heavily infested branches
→ Keep records: harvest quantities per plot, worker productivity, weights after processing`,
  },
  {
    id: 'seasonal-calendar-robusta',
    title: 'Uganda Robusta Coffee Seasonal Calendar — Monthly Farm Activities',
    content: `Uganda Robusta coffee seasonal calendar for the main Robusta growing regions: Central (Masaka, Luwero, Mukono, Wakiso), Busoga (Jinja, Iganga, Mayuge), Western, and Northern Uganda lowlands. (Source: UCDA/NaCORRI agronomic guidelines)

ROBUSTA COFFEE CROP CYCLE:
- Main harvest: September – January (peak: October–November)
- Fly crop (lighter crop): March – May
- Flowering: February–March (for main crop, triggered by dry-wet transition) and August–September (for fly crop)
- Berry development: ~8–10 months from flowering to ripe cherry

MONTHLY ACTIVITY CALENDAR (Robusta):

JANUARY–FEBRUARY (End of main harvest — start of dry season):
→ Complete main harvest; strip all remaining cherries (including poor quality) to break CBB cycle
→ Dry processing (most Robusta is natural/sun-dried): spread on drying tables or sheets
→ Prune heavily after harvest — Robusta benefits from severe pruning including stumping old stems
→ Desuckering — select 1-3 strong replacement suckers per plant; remove all others
→ Apply compost/organic matter to soil

MARCH–APRIL (Long rains — fly crop forming + new plantings):
→ Fly crop forming from Feb-March flowering
→ Major weeding with start of rains
→ Apply fertiliser (first application with rains)
→ New planting: optimal time for establishing new Robusta plots — plant NaCORRI-certified seedlings
→ Soil conservation: repair erosion barriers; apply fresh mulch around trees
→ Scout for Robusta-specific pests: Root Mealybug, Stem Borers

MAY–JUNE (Fly crop harvest):
→ Harvest fly crop cherries
→ Process and dry fly crop
→ Continue weeding
→ Monitor for Coffee Wilt Disease (Fusarium wilt) — check for sudden wilting of branches; remove and burn affected trees immediately
→ Stake or support young trees if needed

JULY–AUGUST (Dry season — farm preparation):
→ Light pruning and desuckering
→ Terrace and erosion barrier maintenance
→ Prepare drying infrastructure for main harvest
→ Nursery activities: pot seedlings for planting in September–October rains
→ Second fertiliser application at onset of short rains (August)

SEPTEMBER–NOVEMBER (Short rains — main harvest begins):
→ MAIN HARVEST SEASON — peak activity
→ Selective picking of ripe red/yellow cherries every 2-3 weeks
→ Natural (dry) processing: spread thin layer on drying beds or raised tables
→ Turn cherries daily; dry 3-5 weeks to 12% moisture
→ Hire and manage casual labour for harvest — plan in advance
→ Scout for Coffee Berry Borer: deploy traps, spot-spray heavily affected clusters

DECEMBER–JANUARY (Main harvest continues + close out):
→ Finish harvesting; strip any remaining cherries
→ Store dried coffee in clean, well-ventilated bags or store
→ Sell: through cooperative, local trader, or direct to buyer
→ Calculate season profitability against your budget
→ Plan pruning for January–February to start cycle again

KEY DIFFERENCE vs ARABICA: Robusta is more forgiving in lower altitudes (below 1,200m), handles higher temperatures better, but is very susceptible to Coffee Wilt Disease. The main quality challenge is drying properly — underdried Robusta gets mouldy and loses value.`,
  },
  {
    id: 'coffee-varieties-uganda',
    title: 'Uganda Coffee Varieties Guide — Arabica and Robusta Variety Selection',
    content: `Guide to coffee varieties grown in Uganda: recommended varieties from NaCORRI (National Coffee Research Institute, formerly CORI), their characteristics, strengths, and weaknesses. (Sources: NaCORRI variety catalogue, UCDA agronomic guidelines, ICO/CABI variety notes)

ARABICA VARIETIES IN UGANDA:

1. SL14 (Scott Laboratories Selection 14):
- Most widely grown Arabica in Uganda
- Developed in Kenya at Scott Agricultural Laboratories
- Tall, vigorous variety with large leaves and cherries
- Cup quality: Good to excellent — popular with specialty buyers
- Disease resistance: Susceptible to Coffee Berry Disease (CBD) and Coffee Leaf Rust (CLR)
- Altitude requirement: Performs best 1,400–2,200m (Mt. Elgon, Rwenzori, Kisoro)
- Yield potential: 600–1,000+ kg cherry/ha under good management
- Recommendation: Still the dominant variety; manage CBD with copper fungicides

2. SL28:
- Also from Scott Laboratories Kenya
- Similar to SL14 but often considered superior cup quality (fruity, complex flavour)
- Equally susceptible to CBD and CLR
- Found in some Mt. Elgon and Rwenzori farms
- Higher valued by specialty coffee buyers

3. Ruiru 11 (Kenya-developed hybrid):
- Compact, short variety — can be planted at higher density (2,500+ plants/ha)
- Good resistance to CBD and CLR
- Cup quality lower than SL varieties — more suitable for commercial grade
- Some presence in Uganda where CBD pressure is very high
- Benefit: Less pesticide needed due to built-in resistance

4. Batian (Kenya variety):
- Good resistance to CLR and moderate resistance to CBD
- Full-sized tree, good cup quality
- Being introduced in some Uganda programmes as disease-resistant alternative to SL

5. French Mission / Bourbon types:
- Found in older plantings in Kisoro, southwestern Uganda
- Good cup quality, lower yielding, susceptible to diseases
- Being progressively replaced with higher-yielding improved varieties

ROBUSTA VARIETIES IN UGANDA:
All recommended Robusta planting material comes from NaCORRI (Kituza Research Station, Mukono District):

1. NaCORRI Clonal Selections (named clones):
- Vegetatively propagated (cuttings), genetically uniform
- Selected for high yield, cup quality, and vigour
- Available from NaCORRI and certified district nurseries
- Both NGANDA types (spreading, for lower altitudes, more shade-tolerant) and ERECTA types (upright, more light-demanding)
- Ask your district agricultural officer or NaCORRI for the current recommended clones for your area

2. Seedling Robusta (from seed):
- Less uniform — mixed genetics from farmer-saved or locally traded seeds
- Still widely grown but generally lower yielding and less predictable
- Not recommended for new plantings — use certified clonal material

KEY RECOMMENDATIONS:
- Always plant certified planting material from registered nurseries or NaCORRI
- For Arabica in CBD-endemic areas: consider Ruiru 11 or Batian where available to reduce spray costs
- For new Arabica farmers: SL14 and SL28 remain the gold standard for cup quality and market acceptance
- For Robusta: clonal NaCORRI material is strongly preferred over farmer-saved seed
- Contact UCDA regional offices or district agriculture offices for certified nursery sources`,
  },
  {
    id: 'coffee-diseases-uganda',
    title: 'Uganda Coffee Disease Identification and Management Guide',
    content: `Practical guide to identifying and managing the main coffee diseases in Uganda. Early identification and fast response prevents major losses. (Sources: NaCORRI/CABI disease notes, UCDA plant protection guidelines, Coffee&Climate toolbox)

1. COFFEE BERRY DISEASE (CBD) — Colletotrichum kahawae
Mainly affects: Arabica (very serious); Robusta has some natural tolerance
Identification:
- Dark brown to black circular sunken lesions on GREEN unripe cherries
- Affected cherries dry up, turn black, and remain hanging ("mummies") or fall
- Also attacks young flowers and flower buds
- Occurs mainly during cool, wet conditions (Mt. Elgon, Rwenzori highlands)
Management:
- Chemical: Copper-based fungicides — Kocide 61.4% WG (copper hydroxide), Cuzinc/Champion (copper oxychloride). Apply at flower opening, fruit set, and 6-8 weeks before harvest. 3-4 sprays/season.
- Cultural: Collect and bury/burn mummified cherries; avoid leaving overripe cherries; harvest on time
- Resistant varieties: Ruiru 11, Batian (some tolerance)
- Do NOT wait until CBD is widespread before spraying — preventive spraying is essential

2. COFFEE LEAF RUST (CLR) — Hemileia vastatrix
Mainly affects: Arabica
Identification:
- Orange/yellow powdery pustules on the UNDERSIDE of leaves
- Corresponding pale yellow spots on upper leaf surface
- Severe infection causes heavy defoliation, tree weakening, low yields
Management:
- Chemical: Same copper fungicides as CBD (spray programs often combined)
- Cultural: Avoid overshading (weakens natural air circulation); don't over-fertilise with nitrogen (promotes lush susceptible growth)
- Resistant varieties: Ruiru 11, Batian

3. COFFEE WILT DISEASE (CWD) — Fusarium xylarioides (Gibberella xylarioides)
Mainly affects: Robusta (very serious in Uganda); also attacks Arabica
Identification:
- Sudden wilting of individual branches or the entire plant
- Leaves yellow, then brown, then fall; plant dies over weeks
- Sticky gummy brown exudate from stem and branches
- Cut the stem: brown/black discolouration of the wood (vascular browning) — diagnostic
- Trees may partially recover then relapse
CRITICAL: There is NO chemical cure for CWD.
Management:
- Immediately uproot and BURN (do not compost) any affected plant
- Disinfect tools with bleach or fire after contact with infected plant
- Do NOT replant coffee in the same hole — replant 1m away
- Plant resistant Robusta varieties (check NaCORRI for current resistant clones)
- Report CWD outbreaks to your district agricultural extension officer

4. BROWN EYE SPOT — Cercospora coffeicola
Mainly affects: Nursery seedlings and young plantings
Identification:
- Circular brown/reddish spots on leaves with a pale grey centre and yellow halo
- Common in nurseries with poor drainage or dense planting
Management:
- Improve nursery drainage; reduce watering frequency
- Apply copper fungicide spray
- Ensure correct polybag spacing in nursery (10cm between pots)

5. BLACK LEAF STREAK / BROWN LEAF SPOT — Pseudocercospora species
Mainly affects: Robusta under heavy shade
Identification:
- Dark streaks or brown patches on leaves
Management:
- Thin shade to improve light and air circulation
- Copper fungicide spray if severe

GENERAL DISEASE PREVENTION RULES:
- Maintain strong healthy trees through good nutrition — strong trees resist disease better
- Never share pruning tools between farms without disinfecting
- Remove and destroy (burn) all fallen/infected plant material
- Scout weekly during rainy seasons when disease spreads fastest`,
  },
  {
    id: 'coffee-pests-uganda',
    title: 'Uganda Coffee Pest Identification and Management Guide',
    content: `Practical guide to identifying and managing the main coffee pests in Uganda. (Sources: NaCORRI/CABI pest notes, UCDA extension guidelines, Coffee&Climate toolbox)

1. COFFEE BERRY BORER (CBB) — Hypothenemus hampei
Affects: Both Arabica and Robusta (the #1 coffee pest worldwide)
Identification:
- Tiny black beetle (1.5mm) — barely visible to naked eye
- Round entry hole bored into the tip (apex) of the coffee cherry
- Cut open infested cherry: small white larvae inside the seeds
- Heavy infestation: 20-40%+ of cherries can be infested, reducing weight and quality
Management:
- BEAUVERIA BASSIANA biopesticide (Beauveria fungus): spray directly onto cherries; very effective and safe. Approved for organic farms.
- Alcohol traps: small bottles with 3:1 ethanol-methanol mixture attract and drown adult beetles
- Cultural control: Harvest ALL ripe cherries promptly; strip remaining cherries at season end; dispose of infested fallen cherries (bury or dry in black bags in sun to kill larvae)
- Botanical: Neem oil spray provides some repellent effect
- Chemical (last resort): Endosulfan alternatives — check UCDA current registered pesticides list

2. ANTESTIA BUG — Antestiopsis intricata and related species
Affects: Mainly Arabica (causes devastating "potato taste/defect" in the cup)
Identification:
- Shield-shaped bug, brown/orange with yellow/cream markings, 6-8mm
- Found on cherries, shoots, and berries
- Infested cherries show shrivelling and premature ripening
- Cup quality: fermented "potato" off-flavour even from ONE infested cherry per kilogram
Management:
- Pyrethroids: Karate (lambda-cyhalothrin), Cypermethrin — spray when bugs are seen
- Botanical: Neem-based insecticides provide moderate control
- Cultural: Prune to improve air movement; reduce very dense shade (bugs prefer humid, heavily shaded conditions)
- Scout weekly during cherry development phase; check for bugs on cherries and shoots
- IMPORTANT FOR ARABICA QUALITY: even 0.1% Antestia infestation causes commercial rejection. Vigilance is essential.

3. WHITE STEM BORER (WSB) — Monochamus leuconotus
Affects: Arabica (serious in Mt. Elgon highlands)
Identification:
- Large white grub tunnels inside main stem (1-2cm diameter tunnel)
- Fine sawdust-like frass (excrement) around entry holes at base of stem
- Infested stems crack, break, or die suddenly
Management:
- Paint stems with white oil or lime-sulfur mixture to deter egg-laying by adult beetles
- Prune and burn infested stems below the entry hole
- Avoid wounding stems during pruning (entry point for adult beetles)
- Plant resistant/tolerant planting material where available

4. ROOT MEALYBUG — Planococcus kenyae and related species
Affects: Both Arabica and Robusta, especially young plants
Identification:
- White cottony waxy mass around roots and at soil surface
- Plant yellows, wilts, and declines slowly (looks like drought stress)
- Ants tending the mealybugs — presence of ants at stem base is a warning sign
Management:
- Control ants (they protect mealybugs from predators): drenching soil around stem with insecticide
- Uproot and burn heavily infected plants
- Soak planting hole with chlorpyrifos drench before replanting
- Dip seedling roots in insecticide solution before transplanting

5. LEAF MINER — Leucoptera coffeella
Affects: Both species, more noticeable in dry conditions
Identification:
- Small circular white/silver mines (blisters) on leaf surfaces
- Caterpillar mines between leaf layers eating green tissue
- Heavy attack causes leaves to turn brown and fall
Management:
- Usually a minor pest — monitor but rarely requires treatment
- Natural enemies (parasitic wasps) usually keep it in check
- Avoid excessive pesticide use that kills natural enemies

INTEGRATED PEST MANAGEMENT (IPM) APPROACH:
1. Scout regularly (weekly during growing season)
2. Use biological controls first (Beauveria for CBB)
3. Botanical/organic options second (neem, pyrethrin)
4. Chemical pesticides only when pest levels exceed economic threshold
5. Record all spray applications (date, product, rate, target pest)
6. Always wear PPE (gloves, mask, goggles) when handling pesticides`,
  },
  {
    id: 'uganda-soils-regions',
    title: 'Uganda Coffee-Growing Regions — Soil Types, Characteristics, and Management',
    content: `Uganda has distinct soil types across its coffee-growing regions. Understanding your soil type helps you manage fertility, drainage, and erosion correctly. (Sources: MAAIF soil surveys, NaCORRI/IITA Uganda coffee production guidelines, FAO soil maps)

Coffee prefers: deep (>1m), well-drained soils with good organic matter; pH 5.5–6.5; no waterlogging.

ARABICA GROWING REGIONS:

Mt. Elgon Region (Kapchorwa, Bukwo, Bulambuli, Sironko, Manafwa):
- Soil type: Deep volcanic loams and clay loams derived from volcanic parent material
- Colour: Dark brown to reddish-brown
- Characteristics: Generally fertile, good water retention, naturally slightly acidic (pH 5.5–6.5)
- Strengths: High natural fertility, good organic matter, suitable for Arabica without heavy fertiliser inputs
- Challenges: Steep slopes cause severe erosion during heavy rains (March–May). Leaching of nutrients on upper slopes. Some areas have hardpan (murram) layer 50–80cm depth limiting root growth.
- Management priority: Erosion control is CRITICAL — terracing, grass strips, contour planting, mulching. Maintain shade trees on slopes.

Rwenzori Region (Kasese, Kabarole, Kyenjojo, Bundibugyo):
- Soil type: Volcanic and metamorphic-derived loams; red-brown ferralitic soils in lower zones
- Characteristics: Generally deep and fertile, especially in Kasese volcanic zone; good drainage
- pH: 5.5–6.5 generally
- Strengths: Fertile volcanic soils around Mt. Rwenzori; good rainfall (1,200–2,000mm/year)
- Challenges: High rainfall can cause CBD pressure; waterlogging in valley bottoms; some soils are shallow on rocky ridges
- Management: CBD management essential; avoid planting in poorly drained valley bottoms

Kigezi Highlands (Kisoro, Kabale — limited Arabica area):
- Soil type: Volcanic loam (Kisoro, around Muhavura); ferralitic in Kabale
- Very fertile soils, high altitude (1,800–2,400m)
- Challenges: Altitude limits Arabica to lower slopes; frost risk in some areas; very steep terrain

ROBUSTA GROWING REGIONS:

Central Uganda — Masaka, Luwero, Mukono, Wakiso:
- Soil type: Red-yellow ferralitic soils (laterites) — highly weathered
- Colour: Brick red to yellowish red
- Characteristics: Moderate fertility; good drainage (sandy-clay); naturally acidic (pH 5.0–5.8)
- Strengths: Well-drained, suitable for Robusta; large flat areas allow mechanisation
- Challenges: LOW natural fertility — requires regular organic inputs; aluminium toxicity can occur when pH <5.0; prone to crusting and compaction without mulch
- Management: Regular compost application essential; mulching to prevent crusting; lime application where pH <5.0

Busoga (Jinja, Iganga, Bugiri, Mayuge):
- Soil type: Mixed ferralitic and alluvial soils
- Generally moderate fertility, some areas have clay-heavy soils
- Challenges: Clay patches have poor drainage — Coffee Wilt Disease (Fusarium) thrives in waterlogged soils; choose well-drained sites for planting

Northern Uganda (Nebbi, Arua, Moyo — smaller Robusta area):
- Soil type: Sandy loam ferralitic soils, often with lower organic matter
- Higher drought risk; less reliable rainfall
- Management: Water harvesting important; mulching essential to conserve moisture

SOIL pH AND NUTRIENT MANAGEMENT FOR ALL REGIONS:
- Test pH if possible (MAAIF district labs, NaCORRI, some cooperatives offer testing)
- If pH <5.5: Apply agricultural lime (calcitic or dolomitic) — 1-2 tonnes/ha, incorporated before planting or into planting holes
- If pH >6.8: Rarely a problem in Uganda, but acidifying mulches (coffee husks) help
- Organic matter: Apply 10-20kg compost per tree per year (see c&c toolbox for compost making)
- Nitrogen source: Coffee husks (after pulping), farmyard manure, green manures (Calliandra, Tephrosia), Tithonia (Mexican sunflower) — all excellent low-cost sources
- Phosphorus: Critical in volcanic soils with high phosphorus fixation — rock phosphate or single superphosphate at planting`,
  },
  {
    id: 'uganda-coffee-inputs-sourcing',
    title: 'Uganda Coffee Input Sourcing Guide — Where to Get Quality Planting Material and Inputs',
    content: `Practical guide to sourcing quality inputs for Uganda coffee farmers: where to buy certified planting material, fertilisers, fungicides, and pest management products. (Sources: UCDA, NaCORRI, MAAIF district offices, Uganda Agro Input Dealers Association)

CERTIFIED PLANTING MATERIAL:

Arabica seedlings (SL14, SL28, Ruiru 11):
- NaCORRI-affiliated nurseries: Contact NaCORRI Kituza (Mukono, central Uganda) or the nearest district agricultural office for referral to registered nurseries
- UCDA District Offices: Maintain lists of certified nursery operators — call your nearest UCDA regional office
- Key certified nursery areas: Kapchorwa, Mbale, Kasese, Kabale districts
- What to ask for: "NaCORRI-certified seedlings" or "disease-indexed planting material"
- RED FLAG: Avoid buying coffee seedlings from roadside sellers without certification — disease risk

Robusta clonal cuttings and seedlings:
- NaCORRI Kituza Research Station: Source of all genuine clonal Robusta material. Tel: check current MAAIF/NaCORRI website
- Certified multiplier nurseries: Accredited by UCDA; found in Masaka, Luwero, Mukono, Wakiso
- OWC (Operation Wealth Creation): Government programme occasionally distributes certified planting material through LCIII offices — check with local government

FUNGICIDES (for CBD and CLR):
- Kocide 61.4% WG (copper hydroxide): Available in 1kg packs from agro-dealers; use 2-3g/litre water; widely available in Kapchorwa, Mbale, Kasese towns
- Cuzinc / Champion (copper oxychloride): Similar efficacy to Kocide; cheaper; also widely available
- Application equipment: Knapsack sprayer (16-20 litre); calibrate nozzle for fine mist; cover underside of leaves and cherries
- Cost guidance: ~35,000–50,000 UGX per kg of copper fungicide; budget 3-4 applications/season

BIOPESTICIDES (for Coffee Berry Borer):
- Beauveria bassiana products: Marketed as Bb-PROTECT, OSCAR Beauveria, or Pests Out; available through some UCDA cooperatives and specialist agro-dealers; NaCORRI Kituza sometimes has stocks
- Where to find: National Organic Agribusiness Association of Uganda; Coffee Farmers Alliance; UCDA extension officers can direct to suppliers

INSECTICIDES (for Antestia Bug, Root Mealybug):
- Karate 5 EC (lambda-cyhalothrin): Widely available from agro-dealers in all major towns; use at label rate; 50ml treats approx. 100 litres water
- Thionex/Endosulfan alternatives: Check current UCDA-registered products list (regulations change)
- Chlorpyrifos 48EC: For root mealybug soil drench

FERTILISERS:
- CAN (Calcium Ammonium Nitrate): Main nitrogen fertiliser used in Uganda coffee; available from Uganda Grain Traders, agro-dealers; apply at start of rains
- DAP (Di-Ammonium Phosphate): For phosphorus at planting; blend with soil in planting hole
- NPK blends: Less common in Uganda coffee but available; good for young trees
- Agricultural lime: For soil pH correction; available from limestone quarries (Hima Cement, Tororo); transported through agro-dealers; apply 1-2 tonnes/ha
- Where to buy fertiliser cheaply: NAADS input fairs; farmer cooperatives often bulk-buy to reduce price; Uganda Grain Traders Ltd

ORGANIC INPUTS (low cost, often local):
- Coffee husks: Free byproduct from your own or cooperative hulling; excellent mulch and soil conditioner
- Farmyard manure: From own livestock or buy from nearby cattle farmers; compost before applying
- Tithonia (Mexican sunflower / "Omwetango" in Luganda): Grows wild; chop and apply as green manure; very high in N, P, K
- Calliandra calothyrsus: Nitrogen-fixing shrub; plant as shade/boundary and chop for mulch
- Rock phosphate: Available from some MAAIF sources; slower release but persistent

EXTENSION AND ADVISORY SERVICES (free):
- UCDA (Uganda Coffee Development Authority): Regional offices in Kapchorwa, Kasese, Masaka; provide technical extension
- District Production and Marketing Officers (DPMO): Available at district headquarters; free advisory services
- Cooperatives: Many Uganda coffee cooperatives (KAWACOM, KAPCHORWA COMMERCIAL FARMERS, Uganda Cooperative Alliance members) provide input supply and agronomic training
- Farmer Field Schools (FFS): Run by various NGOs (TechnoServe, Root Capital partners) and government — free group learning

IMPORTANT: Always buy agricultural chemicals from licensed agro-dealers. Counterfeit and diluted products are common in informal markets. Look for NEMA (National Environment Management Authority) registration numbers on product labels.`,
  },
]

async function main() {
  const { embed } = await import('../lib/embeddings')
  const { getSupabase } = await import('../lib/supabase')
  const supabase = getSupabase()

  console.log(`Seeding ${CHUNKS.length} Uganda coffee agronomy chunks...`)
  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const chunk of CHUNKS) {
    const { data: existing } = await supabase
      .from('knowledge_chunks')
      .select('id')
      .eq('source', 'uganda-agronomy')
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
        source: 'uganda-agronomy',
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
