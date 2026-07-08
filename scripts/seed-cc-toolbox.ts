/**
 * Seeds the coffee&climate (c&c) toolbox into ZOE's knowledge base.
 * Source: https://www.toolbox.coffee (Uganda / English edition)
 * Press release: September 2024 launch by initiative for coffee&climate.
 *
 * Usage:
 *   npm run seed:cc-toolbox
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

const TOOLS: Array<{ id: string; title: string; content: string }> = [
  {
    id: 'initiative',
    title: 'coffee&climate (c&c) Initiative Overview',
    content: `The initiative for coffee&climate (c&c) is a global pre-competitive partnership of leading coffee companies and development partners working to make smallholder coffee production climate-resilient. Launched in 2010, c&c operates in seven regions worldwide including Uganda. Over 133,000 coffee farming households have been trained on climate-smart techniques to date.

The c&c toolbox (www.toolbox.coffee) is a free interactive web app for climate-smart coffee cultivation, launched September 2024. It provides easy-to-use step-by-step instructions for farmers and agronomists, accessible via smartphone or tablet even in low-bandwidth areas. Available in multiple languages including Luganda and Swahili. The toolbox won the Red Dot "Best of the Best" Award 2025 for digital design.

Partners include: Lavazza Foundation, Tchibo, Paulig, Löfbergs, Neumann Kaffee Gruppe, Delta Cafés, Franck, Joh. Johannson (founding members), Julius Meinl, J.M. Smucker, Tim Hortons, Walter Matter (associate members), and Sida (Swedish International Development Cooperation Agency). Coordinated by Hanns R. Neumann Stiftung (HRNS). Scientific partner: Alliance of Bioversity International and CIAT.`,
  },
  {
    id: 'tool-101',
    title: 'c&c Toolbox #101: Companion Trees',
    content: `Companion trees are integrated into coffee plantations to provide shade, wind protection, and additional income while improving soil health. Climate-smart practice from the coffee&climate toolbox.

Key benefits: protects coffee from intense sun, heat, heavy rain; reduces erosion; slows cherry ripening for better quality; can reduce stem borers; provides food, timber, or income.

Selection criteria: choose trees that don't compete with coffee for nutrients/water/light; avoid trees that harbour coffee diseases; prefer deciduous species (shed leaves when coffee needs more sun); prefer multi-use species (legumes, fruit, timber). Ideal species include Inga, Acacia (legumes), Banana, Avocado, Macadamia (fruit), Cedar, Grevillea robusta, Mahogany (timber), Leucaena leucocephala, Tephrosia (shrubs).

Implementation: plant at rainy season start, ideally one year before new coffee fields. Prepare holes with compost. Plan ongoing pruning. Caution: excessive tree density raises humidity and can increase fungal diseases and reduce productivity. Trees take several years to reach functional maturity; fast-growing shrubs provide interim coverage.

Economic benefits: higher yields, reduced irrigation costs, extended coffee tree lifespan, potential income from tree products, carbon farming opportunities. Related practices: cover crops, mulching, biochar.`,
  },
  {
    id: 'tool-102',
    title: 'c&c Toolbox #102: Deeper Polybags',
    content: `Deeper polybags (up to 28 cm deep vs standard <20 cm) in coffee nurseries develop stronger root systems before field transplantation. Climate-smart practice from the coffee&climate toolbox.

Key benefits: improves drought tolerance; reduces mortality rates by ~20%; increases yields; extends tree lifespan. Seedlings stay in nurseries ~11 months, creating "jumbo seedlings" with superior establishment.

Implementation: use 28×14 cm or 15×25 cm polybags filled with potting soil (optionally 30% compost). Plant seeds or certified seedlings; water from below to encourage deep root development. Transplant when plants show first lateral branches (after 11 months) at rainy season onset into 40×40×40 cm pits. First production: 18–24 months after transplanting.

Timing: sow December–January; transplant November–December. Combine with mulch and shade trees for optimal drought protection. Note: larger bags make seedlings heavier during transport. Applicable to both Arabica and Robusta.`,
  },
  {
    id: 'tool-103',
    title: 'c&c Toolbox #103: Symbiotic Fungi (Mycorrhizae & Trichoderma)',
    content: `Symbiotic fungi form beneficial associations with coffee roots to enhance nutrition, water uptake, drought tolerance, disease resistance, and yield. Climate-smart practice from the coffee&climate toolbox.

Mycorrhizae colonise plant roots and provide water and nutrients (especially phosphorus) in exchange for sugars. They protect against pathogens including root-knot nematodes. Trichoderma promotes root growth by secreting root-branching compounds and inhibits phytopathogens through mycoparasitism.

Application — Mycorrhizae: 5 g per seedling mixed into soil; 60 g per plant at nursery stage. Application — Trichoderma: 28 g per square metre for seedlings; 40 ml per plant of 10 g/litre mixture at nursery stage.

Critical: inoculate at nursery stage before transplanting — costs increase at later stages. Combine with deeper polybags, mulching, or biochar for comprehensive soil rehabilitation. Inoculated trees require less synthetic fertilizer and pesticide. Commercial products combining both types are available.

Economic benefits: reduced fertilizer and pesticide costs; lower renovation costs; increased yields. Environmental benefits: reduced synthetic inputs; improved soil microorganism populations.`,
  },
  {
    id: 'tool-104',
    title: 'c&c Toolbox #104: Black Coffee Twig Borer Traps',
    content: `Black Coffee Twig Borer (BCTB, Xylosandrus compactus) traps protect coffee trees from this pest that can reduce yields by up to 50%. Technology developed by Uganda's NARO (National Coffee Research Organization) — also called the NARO-Uganda Beetle Trap or Broca trap. Climate-smart practice from the coffee&climate toolbox.

The pest: primarily attacks Robusta (Arabica infestations also documented). Female beetles bore into xylem to create egg chambers, blocking water and nutrient translocation and causing branches to dry out.

Trap construction (per hectare): 22 transparent plastic bottles + 22 small pharmaceutical bottles + strings + 5 litres soapy water + 1.5 litres 75% ethanol. Cut two opposite windows in each large bottle, fill one-quarter with soapy water, fill small bottle with ethanol (left slightly open). Hang two-thirds up on coffee branches, at least one trap per 30 plants, spaced ~50 m apart.

Monitoring thresholds: 3 insects/week = approaching risk (1% fruit damage); 5/week = elevated risk; 8/week = severe, immediate action needed. Clean and refill every two weeks.

Complementary measures: apply biochar or compost; regular inspection; remove and burn affected plant parts; prune to reduce bushiness; use shade trees like Albizia coriaria or Ficus. Critical: fighting BCTB requires community-wide action as beetles fly long distances. Applicable to Robusta and Arabica. Available in Uganda.`,
  },
  {
    id: 'tool-105',
    title: 'c&c Toolbox #105: Coffee Berry Borer Traps',
    content: `Coffee Berry Borer (CBB) is the most serious and widespread coffee pest, causing 30–35% yield reduction. The same NARO-Uganda bottle trap technology (Broca trap) is used to attract and drown CBB beetles. Climate-smart practice from the coffee&climate toolbox.

The pest: female beetle drills into coffee cherries within 8 weeks after flowering through harvest, laying ~70 eggs. Larvae damage beans, causing cherries to fall or rot with secondary bacterial/fungal infections. Due to climate change, CBB now infests highland areas above 1,200 m.

Materials (per hectare): 22 transparent plastic bottles, 22 pharmaceutical bottles, 5 litres soapy water, 1.5 litres ethanol (75%), methanol, or commercial CBB attractant.

Assembly: cut two opposite windows in large bottle; fill one-quarter with soapy water; fill small bottle with attractant (lid slightly open or pierced); hang both inside each other on branches two-thirds up from ground. Place minimum one trap per 30 plants, spaced 24 m along furrows and 24 m between furrows. Clean and refill every two weeks.

Monitoring: 3 insects/week = risk threshold; 5/week = greater risk; 8/week = severe attack. During high infestation monitor every 3 days. Install traps before beetle emergence.

Complementary: improve soil fertility; collect and burn fallen cherries; prune to reduce bushiness; plant shade trees to attract pest-eating birds. Community-wide action essential. Applicable to Arabica and Robusta.`,
  },
  {
    id: 'tool-106',
    title: 'c&c Toolbox #106: Coffee Rehabilitation (Pruning, Stumping, De-Suckering)',
    content: `Coffee rehabilitation encompasses agronomic practices to rejuvenate ageing coffee plants and sustain productivity. Climate-smart practice from the coffee&climate toolbox.

Pruning: removes unproductive, damaged, or dead branches to improve water and nutrient distribution. Best timing: immediately after harvest when plants are dormant. Benefits: enhanced light availability, better air circulation, improved drought tolerance.

Stumping: cuts back stem(s) to restart growth cycle. Initial stumping at 10 years of age, repeating every 7 years (timing varies by climate — hot/humid areas: 10–12 years; moderate climates: 15+ years). Trees resume bearing fruit 1–2 years after stumping.

De-suckering: removes vertical sprouts from trunks and older branches. Apply twice yearly (May and October) in productive plants, beginning when shoots reach 3–4 months old.

Essential: clean all tools with 75% ethanol between trees to prevent disease transmission; use sharp, clean implements; apply fungicide paste to cut stems in rainy regions; maintain >3,000 plants/hectare; ensure healthy root systems before rehabilitation; combine with soil testing, organic fertilization, and integrated pest management.

Benefits: increased yields, extended productivity, reduced pesticide/fertilizer needs, improved drought resilience, enhanced microclimate balance.`,
  },
  {
    id: 'tool-107',
    title: 'c&c Toolbox #107: Coffee Plot Renovation (Replanting)',
    content: `Coffee plot renovation involves removing old, unproductive coffee trees (typically over 20 years old) and replacing with new seedlings. Climate-smart practice from the coffee&climate toolbox.

Coffee reaches maximum production at 6–8 years then declines. Renovation may be needed at 20–25 years (up to 40–50 years regionally), on significant yield reduction, severe pest/disease damage, or when climate change requires drought/disease-resistant varieties.

Steps:
1. Evaluation: assess field, identify plants for removal, plan spacing (2.5–3.5 m between lines, 0.5–0.75 m between plants).
2. Removal: cut stems, dig around root systems, extract entire plants including roots, dispose away from field.
3. Site preparation: clear weeds, rocks, debris; loosen soil minimally; allow 2–3 month rest if possible.
4. Soil preparation: dig planting holes (40×40×40 cm); test pH (ideal 5.5–6.5); apply lime if needed; add gypsum and compost/fertilizer.
5. Planting: place seedlings with root collar above soil; fill holes; press gently; water immediately.
6. Management: apply Good Agricultural Practices; consider intercropping, companion trees, mulch, or cover crops.

Key principle: "80% of plants should be in production and 20% in renovation and rehabilitation." Replanting at rainy season start, completed by mid-season. Yield recovery exceeds previous levels within 2–5 years.`,
  },
  {
    id: 'tool-108',
    title: 'c&c Toolbox #108: Bio Insecticide — Neem Tree Leaf Extract',
    content: `Neem tree leaf extract (Azadirachta indica) used as a natural bio insecticide for coffee. Climate-smart practice from the coffee&climate toolbox.

Targets: mealybugs, antestia bugs, coffee leaf miners, coffee berry borers, aphids, red spider mites. Safe for pollinators and operators when used correctly. Field trials in Tanzania showed 100% mortality of coffee leaf miner pupae, 80% of eggs, 70% of larvae.

Preparation (per 20-litre sprayer): collect 0.3 kg fresh neem leaves; wilt in shade 2–3 hours (preserves active compounds — DO NOT expose to direct sunlight); grind into fine powder; mix 250 g per 20 litres water; soak overnight; filter through cloth, squeezing thoroughly; ready to apply.

Application: spray evenly at pest infestation onset; repeat at 14-day intervals until pest is eliminated; apply during cooler hours (early morning or evening) to prevent UV degradation.

Critical warnings: apply ONLY tested concentrations — excessive doses cause phytotoxic effects (stunted growth, wilting, tissue discoloration). Store in sealed containers in cool, dark locations. Always wear full PPE (protective clothing, gloves, goggles, boots). Use as part of integrated pest management alongside cultural practices and natural enemies. Applicable to Arabica and Robusta.`,
  },
  {
    id: 'tool-109',
    title: 'c&c Toolbox #109: Bio Insecticide — Tephrosia Leaf Extract',
    content: `Tephrosia vogelii leaf extract used as a natural bio insecticide to reduce mealybugs, mites, and aphids on coffee. Climate-smart practice from the coffee&climate toolbox.

IMPORTANT SAFETY WARNING: Tephrosia extract MUST NOT be consumed — it is toxic to humans and harmful to aquatic ecosystems. Always wear full PPE during application.

Preparation (per 20-litre sprayer): harvest 0.25 kg mature Tephrosia leaves; wilt in shade 2–3 hours; grind dried leaves into fine powder; mix 200 g powder per 20 litres water; soak 24 hours; filter and squeeze plant material thoroughly.

Application: spray at pest infestation onset; reapply every 14 days until pests disappear; apply during cooler hours. Store in sealed containers in cool, dark conditions.

Critical: apply ONLY tested concentrations — excessive amounts cause phytotoxic effects (stunted growth, wilting, tissue discoloration). Use as part of integrated pest management. Applicable to Arabica and Robusta.`,
  },
  {
    id: 'tool-110',
    title: 'c&c Toolbox #110: Bio Insecticide — Ginger Root Extract',
    content: `Ginger root extract (Zingiber officinale) used as a natural pest control agent for coffee, targeting Coffee Leaf Miner and Coffee Berry Borer. Climate-smart practice from the coffee&climate toolbox.

Bioactive compounds in ginger disrupt insect metabolism. Benefits: reduces pest populations; increases yield; improves quality.

Materials (per 20-litre tank): 0.2 kg dried ginger roots, 20 litres water, grinder, bucket, filter cloth, 20-litre sprayer, full PPE.

Preparation: grind dried ginger roots into paste; mix 200 g per 20 litres water; soak ~24 hours; filter to separate solids from liquid; squeeze material to maximise extraction.

Application: spray at pest infestation onset; repeat at 14-day intervals until pest eliminated; apply during cooler hours (early morning or evening) to prevent degradation from heat and UV exposure. Store in cool, dark, sealed containers.

Critical: apply only tested concentrations to avoid phytotoxic effects. Use as part of integrated pest management with continuous field monitoring. Applicable to Arabica and Robusta.`,
  },
  {
    id: 'tool-111',
    title: 'c&c Toolbox #111: Bio Insecticide — Garlic Extract',
    content: `Garlic extract (Allium sativum) used as a natural pest control method for coffee. Sulfur-based compounds disrupt pest feeding habits and reproductive cycles by interfering with pheromones. Targets: Coffee Leaf Miner, Coffee Berry Borer, mealybugs, mites, and aphids. Climate-smart practice from the coffee&climate toolbox.

Materials (per 20-litre tank): 14 garlic bulbs, 0.4 litres liquid soap, 13 litres water, food processor/blender, fine mesh strainer, 20-litre sprayer.

Preparation: peel garlic cloves and blend with 235 ml water until smooth; add 700 ml water and 30 ml liquid soap, blend again; transfer to jar and infuse overnight (minimum 12 hours); strain through muslin cloth; pour into sprayer (store in refrigerator between uses); repeat to fill 20-litre tank.

Application: apply at pest infestation onset at 14-day intervals; or weekly as preventative treatment; spray from 15–30 cm distance, coating both leaf surfaces; apply during cooler hours; reapply every few days after rainfall during active infestations. Always wear full PPE.

Critical: apply only recommended concentrations to avoid phytotoxic effects. Use as part of integrated pest management. Applicable to Arabica and Robusta.`,
  },
  {
    id: 'tool-112',
    title: 'c&c Toolbox #112: Bio Insecticide — Mandarin Orange Peel Extract',
    content: `Mandarin orange peel extract (Citrus reticulata) used as a natural pest control for coffee. Contains citric acid-derived compounds that directly control pests and strengthen plant immunity. Targets: Coffee Berry Borer, Coffee Leaf Miner, Mealybugs, Antestia bugs. Climate-smart practice from the coffee&climate toolbox.

Materials: 10 kg chopped orange peels, 20 litres water, cheesecloth filter, 20-litre sprayer.

Preparation: boil chopped orange peels with water; filter through cheesecloth; dilute according to infestation severity.

Application: spray at pest infestation onset; repeat every 14 days until pests eliminated; apply during cooler hours (early/late day); reduce sprayed area progressively as infestation decreases. Always wear full PPE. Store in sealed containers in cool, dark places.

Critical: apply only tested concentrations — excessive doses cause phytotoxic effects. Use within integrated pest management. Applicable to Arabica and Robusta.`,
  },
  {
    id: 'tool-113',
    title: 'c&c Toolbox #113: Bio Insecticide — Chrysanthemum Flower Extract',
    content: `Chrysanthemum flower extract (Chrysanthemum cinerariaefolium) used as a biological pesticide for coffee. Contains pyrethrins that target the nervous system of insects. Targets: Antestia bug, Coffee Berry Borer, Coffee Leaf Miner, Aphids, Whiteflies. Climate-smart practice from the coffee&climate toolbox.

Materials: 10 cups dried chrysanthemum flowers, grinder, 0.2 litres liquid soap, 20 litres water, protective equipment (gloves, mask), 20-litre sprayer.

Preparation: harvest flower heads at peak bloom; dry in cool, dark area; store in airtight container away from heat/light; grind dried flowers into powder wearing protective gear; blend with liquid soap and water to sprayable consistency.

Application: apply at pest infestation onset; repeat every 14 days until pests eliminated; apply during cooler hours; store prepared extract in sealed, cool container away from sunlight.

Critical: apply only tested concentrations — excessive amounts damage coffee plants. Use as part of integrated pest management. Applicable to Arabica and Robusta.`,
  },
  {
    id: 'tool-114',
    title: 'c&c Toolbox #114: Grafting in Nurseries',
    content: `Grafting is a vegetative propagation technique combining plant parts from different species. The rootstock (base) provides robustness and stress tolerance; the scion (upper shoot) contributes high yield or quality. Robusta is frequently used as rootstock due to extensive root development and nematode resistance. Climate-smart practice from the coffee&climate toolbox.

Key benefits: improved resistance to pests and diseases; enhanced tolerance to rising temperatures and drought; increased yield; improved coffee quality; extended tree lifespan.

Procedure:
- Sow rootstock seeds (e.g., Robusta)
- After 8–10 days, sow scion seeds (e.g., Arabica)
- Wait 45–60 days before grafting
- Sanitise tools with 70% alcohol
- Cut rootstock aerial portion, leaving 15–30 cm stem; split centre 2–2.5 cm
- Prepare scion with wedge-shaped cut (2–2.5 cm); discard roots
- Insert wedge into rootstock split; bind tightly with parafilm or plastic tape
- Transfer to seedling bags or propagator immediately; irrigate

Post-grafting care: maintain 50–70% shade at 20–28°C; water regularly in small volumes; after 10 days resume standard seedling management; monitor for pests and rootstock regrowth; after 45–50 days gradually introduce sunlight and begin light fertilisation.

Critical notes: must be performed by experienced grafting experts; Robusta rootstock shows limitations above 1,200 m elevation. Full callus development takes 45–50 days.`,
  },
  {
    id: 'tool-201',
    title: 'c&c Toolbox #201: Rainwater Basins in the Field',
    content: `Rainwater basins are small depressions dug between coffee rows to reduce runoff, improve water infiltration, and prevent erosion. Climate-smart practice from the coffee&climate toolbox.

Key benefits: reduces erosion; improves water infiltration; enhances plant nutrition and soil biodiversity; can increase yields and lower coffee plant mortality.

Important: this is a SHORT-TERM or emergency measure during high erosion risk or insufficient water infiltration — not a permanent practice, as repeated earthmoving can damage soil long-term.

Implementation: excavate BEFORE rainy season, especially after droughts or before heavy rainfall. Dimensions: ~0.6 × 0.6 m wide and 0.3 m deep between coffee rows. Spacing: one basin per two coffee plants (at standard 2,000 plants/hectare). Re-excavate every two years and after significant rainfalls.

Recommendations: combine with cover crops or mulching to prevent soil washout into basins; avoid digging around tree trunks (damages feeder roots); pair with long-term conservation practices like level planting, terraces, and runoff barriers; accumulated organic matter can be redistributed as compost. Applicable to Arabica and Robusta.`,
  },
  {
    id: 'tool-202',
    title: 'c&c Toolbox #202: Runoff Barriers',
    content: `Runoff barriers reduce erosion, improve water infiltration, and balance soil humidity on steep slopes. Climate-smart practice from the coffee&climate toolbox.

Three barrier types: (1) Artificial dams and drop structures; (2) Stone or vegetative terraces on hillsides; (3) Swales (shallow, vegetated channels).

Implementation:
Step 1 — Physical barriers (slopes >30%): build barriers using stones, soil, or inert materials perpendicular to slope. In gullies, line with stones or sandbags to reduce erosion velocity.
Step 2 — Vegetative barriers: plant dense-growing perennials (Brachiaria, elephant grass, vetiver, lemongrass, German iris) perpendicular to slope. Closer spacing suits steeper terrain. In high-rainfall zones, apply 0.5–5% gradient during planting to enable drainage while preventing erosion.
Step 3 — Stream management: secure tree branches across streams with vertical posts as partial dams. Line downstream with rocks forming catchment basins where water drops 1–2 metres.

Install before or after planting (pre-planting reduces damage). Particularly valuable after droughts and before heavy rains. Benefits: extends coffee tree lifespan, reduces renovation costs, increases yields, enhances soil life.`,
  },
  {
    id: 'tool-203',
    title: 'c&c Toolbox #203: Mulching',
    content: `Mulching applies a protective layer of dried or decomposed plant material across soil between coffee rows to enhance soil health and adapt to climate change. Climate-smart practice from the coffee&climate toolbox.

Key benefits: balances soil humidity and temperature; reduces erosion; suppresses weed growth; improves soil structure and organic matter; enhances soil biodiversity and plant nutrition uptake.

Application: clear weeds and debris first; distribute mulch evenly 10–20 cm thick; maintain clearance around tree trunks — at least 30 cm for mature trees, 15 cm for young plants (prevents infections). Renew every season.

Approved materials: maize, sorghum, soybean, banana, millet, elephant grass, Brachiaria, legumes like pigeon pea and velvet bean.

Critical precautions: AVOID coffee husks due to pest and disease risks unless pre-composted; cut materials BEFORE seed-bearing stage to prevent uncontrolled spread; monitor fire hazards during dry seasons; NEVER allow mulch to contact tree trunks directly.

Best timing: apply right before the rainy season or immediately after 2–3 rains to maximise water retention. Reduces labour, irrigation, and herbicide requirements.`,
  },
  {
    id: 'tool-204',
    title: 'c&c Toolbox #204: Cover Crops (Living Mulch)',
    content: `Cover crops (also called living mulch) are annual or perennial plants sown between coffee rows to protect bare soil, reduce erosion, moderate temperature/moisture, suppress weeds, and enhance soil structure. Climate-smart practice from the coffee&climate toolbox.

Recommended species for Uganda:
- Brachiaria ruziziensis — deep-rooted drought-resistant grass promoting nutrient cycling
- Cajanus cajan (Pigeon pea) — nitrogen-fixing legume with temporary shade
- Crotalaria sp. — legume with shade benefits
- Raphanus sativus (Radish) — deep-rooted soil conditioner, usable as fodder
- Fagopyrum esculentum (Buckwheat) — pseudocereal for food production
- Millet — small-seeded grass for food or animal feed

Implementation: maintain adequate spacing between coffee rows (minimum 2.5 m for Arabica, 3 m for Robusta). Create furrows midway between rows. Sow seeds mid-way between rows at rainy season onset. Maintain 25–50 cm clearance between cover crops and coffee stems. Use machete cutting rather than chemical weed control. Cut perennials like Brachiaria 3–4 times annually; cut legumes before flowering if using as green manure (preserves nitrogen). Lay cut material around coffee stems as mulch.

Visible soil improvements expected within 1–2 years. Avoid invasive varieties that climb or choke trees. Applicable to Arabica and Robusta.`,
  },
  {
    id: 'tool-205',
    title: 'c&c Toolbox #205: Compost',
    content: `Compost is organic soil amendment from aerobic decomposition. For coffee farms, primary ingredients are coffee husks and manure (cow or chicken), plus farm and kitchen waste. Complete process: 3–4 months. Climate-smart practice from the coffee&climate toolbox.

Layer construction: alternate 20–25 cm layers of plant material and manure; build dome-shaped heap (max 1.5 m high).
Material ratios (per 1 tonne finished compost): 3 tonnes plant material (coffee husks, stalks, leaves, grass, kitchen waste) + 1 tonne cow manure OR 600 kg chicken manure. Optional: rock powders (P, K) up to 20% by weight; biochar up to 10% by weight.

Moisture: target 45–50%. Hand test: squeezed sample should release few drops, not crumble or drip.
Temperature: ideal 55–65°C for 60–70 days. Iron bar test: insert 40 cm, bar should be too hot to hold comfortably.
Turning: with ventilation sticks — leave 3 weeks then turn every 15 days. Without ventilation sticks — turn weekly for first 3 weeks then every 15 days.

Readiness: dark grey/black colour; fluffy structure; pleasant smell; original materials unrecognisable; temperature cools to ambient level after 3–4 months.

Application rates:
- New coffee fields: 10 t/ha in furrows + 2 t/ha surface after planting; 1–2 kg per plant
- Established fields: 7–8 t/ha initially (reducible to 5 t/ha); 250 g per plant; apply early morning or late afternoon
- Nurseries: mix 10–30% maximum with potting soil

AVOID: meat, bones, fish, dairy, treated wood sawdust, diseased plants, human waste, seed-bearing weeds. Apply annually; analyse soil yearly. Applicable to Arabica and Robusta, available for Uganda.`,
  },
  {
    id: 'tool-206',
    title: 'c&c Toolbox #206: Bokashi (Fermented Compost)',
    content: `Bokashi is fermented compost using semi-anaerobic fermentation with effective microorganisms. Faster than traditional composting (2–3 months). Rich in nitrogen (N) and potassium (K); increases accessibility of phosphorus (P), boron (B), manganese (Mn), zinc (Zn), and copper (Cu). Climate-smart practice from the coffee&climate toolbox.

Materials (for 0.1 hectare): 500 kg coffee husks, 500 kg animal manure (or 300 kg chicken manure), 15 kg sugar or molasses, 30 kg milled maize/bran, 0.5 kg moist yeast, 150 litres water. Optional: 15 kg wood ash, 50 kg castor pie, 100 kg natural phosphate.

Production: layer coffee husks and manure (max 1.5 m high); add milled maize/bran; dissolve yeast and sugar in 150 litres water and pour over pile; mix thoroughly; target ~50% humidity (squeezed sample: a few drops between fingers = correct, crumbles = too dry, drips = too wet); dig 5×5 cm canal around preparation; cover with plastic tarp, seal with stones and soil.

Temperature: monitor weekly — must NOT exceed 50°C. If exceeded, turn pile to prevent microorganism death. Hot but holdable iron bar (40 cm deep) = ideal.

Readiness: temperature equals ambient; colour becomes black; coffee husks lose identifiable shape (after 2–3 months).

Application:
- New plantations: dig canals 3–4 m apart, min 20 cm deep; apply ~3 kg bokashi per plant
- Established fields: dig 10 cm deep canals beside plant rows; add 3 kg bokashi per plant after harvest; cover with mulch
- Nurseries: mix max 30% with potting soil

Timing: prepare after harvest when coffee husks are fresh. Bokashi often lacks sufficient phosphorus — supplement with phosphate rock powders during preparation. Storage: sealed bags in cool, ventilated room — lasts 1–2 years properly stored. Applicable to Arabica and Robusta, available for Uganda.`,
  },
  {
    id: 'tool-207',
    title: 'c&c Toolbox #207: Biochar',
    content: `Biochar is created by heating carbon-based feedstock (coffee husks, wood, rice hulls) to ~500°C with minimal oxygen (pyrolysis). It improves soil structure, plant nutrition, and coffee yields. Its porous composition retains water and air; high cationic exchange capacity stores and releases nutrients like ammonium, potassium, and calcium. Sandy and nutrient-poor soils benefit most. Climate-smart practice from the coffee&climate toolbox.

Production methods: Pit method (basic, not suitable for light materials like coffee husks); Kon-tiki (metal cone-shaped container for better handling); Pyrolyzer (controlled oven for lighter materials). Production takes ~2 days.

Pit production steps:
1. Dig funnel-shaped pit ~0.75 m deep, 1.5 m wide at top.
2. Fill one-third with wood in crisscross layers (each rotated 90°).
3. Start fire with matches and flammable material; continuously add wood while maintaining flame without overloading.
4. Stir regularly; success shown by orange flames and NO smoke.
5. When wood begins turning whitish, immediately extinguish with water before ash forms.
6. Continue watering until completely cool.
Result: dark, porous, odour-free material; ~10% water content after drying; volume ~¼ of original biomass.

Application with Bokashi (per 0.1 hectare): 0.25 tonnes biochar + 0.7 tonnes bokashi. Crush biochar to ground-coffee particle size before mixing.
- New plantings: dig 20 cm deep canals 3.5–3.8 m apart; distribute ~2 kg biochar-bokashi mixture per plant; plant seedlings at 0.6 m intervals.
- Established fields: shallow 10 cm canals beside plant lines; same per-plant dosage; OR spread on surface with light soil coverage.

Important: biochar lacks sufficient balanced nutrients independently — always mix with bokashi or compost. Initial results may appear neutral in year one; visible improvements from year two onward. Sequesters CO₂ from atmosphere. Store in sealed bags for 1–2 years.`,
  },
  {
    id: 'tool-208',
    title: 'c&c Toolbox #208: Gypsum Application to Soil',
    content: `Gypsum (calcium sulfate, CaSO₄) is a soil conditioner that regulates pH, improves soil structure and water infiltration, promotes deeper root development, enhances drought tolerance, and optimises plant nutrition. Unlike lime, gypsum is far more soluble and penetrates deeper into soil profiles. Climate-smart practice from the coffee&climate toolbox.

Key benefits: regulates soil pH; improves soil structure; promotes deeper roots; enhances drought tolerance; increases coffee yield. Ameliorates sodic and highly acidic soils; reduces aluminium toxicity.

Dosage calculation: Gypsum Requirement (kg/ha) = 75 × (% clay). Alternatively, apply up to 25% of required lime application. Maximum: 3 tonnes per hectare.

Application:
- New plantings: apply in planting furrows, optionally mixed with fertilisers, organic matter, or lime.
- Established plants: distribute around plants at 10 cm distance from stems.
- Large applications during field preparation through year three; supplementary doses at dry season's end/rainy season's beginning.

Critical: conduct soil analysis at multiple depths (0–20, 20–40, 40–60 cm) before application. Avoid sandy soils and high-rainfall risk areas. High gypsum doses can create nutrient imbalances with magnesium and potassium — monitor with soil and leaf analyses. Applicable to Arabica and Robusta; available for Uganda.`,
  },
  {
    id: 'tool-211',
    title: 'c&c Toolbox #211: Lime Application to Soil',
    content: `Lime application corrects soil acidity in coffee production systems to improve nutrient availability and plant health. Optimal soil pH for coffee: 5.5–6.5. Climate-smart practice from the coffee&climate toolbox.

Key benefits: regulates soil pH; improves plant nutrition; fosters deeper root development; enhances fertiliser efficiency; increases yields; improves soil microbial activity; builds climate resilience.

CRITICAL: application MUST be guided by laboratory soil analysis (test top 15–20 cm). Use only agricultural-grade lime with appropriate neutralising capacity and particle size.

Timing:
- New plantations: apply during land preparation, 2–3 months BEFORE planting.
- Established fields: apply during dry season, 2–3 months before fertilisation.
- Reapplication: typically every 2–3 years based on soil testing.

Application:
- New sites: distribute lime evenly and incorporate into top 15–20 cm.
- Established plantations: apply locally around individual plants, maintaining 10 cm distance from stem to prevent plant damage.

CRITICAL WARNING: NEVER apply lime simultaneously with nitrogen fertilisers — lime causes nitrogen to volatilise and escape as gas. Space applications by at least 2–3 weeks. Avoid overapplication, which reduces micronutrient availability.

Lime enhances effectiveness of existing nutrient programmes but is NOT a fertiliser replacement. Applicable to Arabica and Robusta; available for Uganda.`,
  },
  {
    id: 'tool-301',
    title: 'c&c Toolbox #301: Rainwater Harvesting — Cemented Ground Catchment',
    content: `Construction of a circular cemented rainwater harvesting tank storing ~15,000 litres to irrigate 0.2 hectares for up to 3 months during dry periods. Developed for Uganda. Climate-smart practice from the coffee&climate toolbox.

Site requirements: locate where surface runoff accumulates (slope ≤4%); adequate catchment area; away from large trees (prevents root-caused cracks); near cultivation areas; away from houses/roads with protective fencing; orient tank opening toward rainfall flow.

Materials: 4 m³ sand, 60 m² chicken wire mesh, 12 bags cement (50 kg each), 8 kg waterproof cement, 500 litres water, 8 kg nails (6"), 500 bricks, 1.5 iron bars, wood pegs (~50 cm).

Construction steps:
1. Clear vegetation; mark circular outline (2.4 m radius).
2. Dig funnel-shaped pit 1.8 m deep (2.4 m radius at bottom, 4 m at top).
3. Apply two 1-cm plaster layers (sand:cement:waterproof cement 2.5:1:1); insert chicken mesh between layers and iron bars as ring beam.
4. Build brick protection wall around opening to 0.9 m height (sand/cement 4:1 mortar). Leave 0.5 m space for water inlet.
5. Build brick inlet (4–6 m length) following natural water flow.
6. Install wooden peg mud filters with mesh at 2–3 m intervals to filter debris.
7. Cure for several days while sprinkling water to prevent cracking.
8. Construct protective fence.

Use buckets, treadle pumps, or flexi pumps for irrigation. Water can fill bottles for drip irrigation.
Maintenance: clear mud filters regularly; remove sediment when tank empties; monitor for cracks and repair immediately. Consider floating Water Lily cover to reduce evaporation and mosquito breeding.
Timing: excavate at dry season onset; plaster during dry season before rains.`,
  },
  {
    id: 'tool-302',
    title: 'c&c Toolbox #302: Bottle Irrigation',
    content: `Bottle irrigation is a simple drip irrigation method using pierced plastic bottles for individual plants like seedlings and small coffee plants. Climate-smart practice from the coffee&climate toolbox.

How it works: plant a pierced plastic bottle upside down into soil near the plant. As air bubbles into the bottle, water gradually releases into the surrounding soil, providing moisture over hours to days depending on soil texture. A Ugandan study found nearly 100% survival rates for Robusta seedlings using this method versus 30% without it.

Materials: plastic drinking water bottles, water (rainwater preferred), nail or needle, optional soluble fertiliser, optional mulching material.

Steps:
1. Pierce bottle bottoms using nail or needle.
2. Fill with water (fertiliser optional).
3. Plant bottle necks ~8 cm into soil close to coffee tree or seedling.
4. Surround with mulch ~15 cm from the coffee stem.
5. Monitor and refill regularly.
6. Dispose of plastic bottles properly after use.

Best for: young individual plants, seedlings, small areas during dry seasons and droughts. NOT suitable for large areas or mature trees with high water demands.

Important: freshly cut banana stems used as mulch provide supplemental soil moisture. All plastic bottles MUST be collected and disposed of properly to avoid environmental pollution. Applicable to Robusta and Arabica; Uganda-specific data available.`,
  },
  {
    id: 'tool-401',
    title: 'c&c Toolbox #401: Solar Dryers for Coffee Post-Harvest',
    content: `Solar dryers are transparent polyethylene-covered cabinet structures with synthetic mesh trays for drying coffee after harvest. They reduce drying time by 30–40% and improve quality versus open-air drying. Climate-smart practice from the coffee&climate toolbox.

Key benefits: reduces drying time 30–40%; protects from rain, dust, debris, contamination; prevents mould and mildew; maintains bean size, flavour, aroma; produces cleaner grain without stains.

How it works: heated interior air from solar radiation reduces humidity; natural convection moves moisture from beans through the polyethylene tarp.

Dome-type specifications: 3–3.4 m wide × 10 m long × 2.25 m high; capacity 360–440 kg per dryer; useful life 8 years (polyethylene film: 2–3 years).

Operation steps:
1. Select sunny location (3.5 × 10 m), no shade.
2. Allow washed coffee to drain on patio one day before placing in dryer.
3. Spread coffee on mesh trays — maximum layer of 4 cm for air circulation. Do NOT spread wet coffee directly (extends drying to 7–8 days).
4. On hot days, fold up polyethylene sides for ventilation; on cloudy/rainy days, leave sides unfolded.
5. Move coffee 8–10 times daily at 45–60 minute intervals for uniform drying.
6. CLOSE ventilation windows at night or during rainfall to prevent moisture reabsorption.
7. Target moisture content: 11–13% (beans rattle when shaken). Typical drying: 11–18 days.
8. Remove promptly at optimal moisture to prevent overdrying.

Storage: use gunny or polyester bags on raised pallets; storage free from agro-chemicals and strong odours (coffee absorbs odours); ensure ventilation; inspect monthly; redry if damp; process within 30 days.

Best for: regions with rainfall during harvest season. For small-scale operations up to 1.5 hectares, conventional tarpaulin remains viable, but solar dryers recommended as climate uncertainty increases.`,
  },
  {
    id: 'tool-601',
    title: 'c&c Toolbox #601: Record Keeping and Profitability Analysis',
    content: `Systematic record keeping helps coffee farmers track expenses, labour, and income to understand real production costs and net profitability per kg or per hectare. Supports compliance with buyers and certification schemes. Climate-smart practice from the coffee&climate toolbox.

System setup: choose practical recording method (paper notebook or digital app); gather materials: notebook, pens, calculator, folders, measuring tools, price references.

What to record:
1. Farm activities and expenses as they occur (fertilisation, pruning, harvesting). Labour often represents a major share of production costs — record separately and clearly. Value unpaid family labour at standard wage rates.
2. Harvests: weigh each batch; record dates and quantities; tag lots to link yields with costs; note quality issues.
3. Sales and income: record transaction dates, quantities, prices, buyer information, premiums, and selling costs.
4. Documentation: maintain receipts, invoices, delivery notes linked to corresponding records.

Analysis: calculate gross profit; cost-per-unit metrics; compare across seasons to identify inefficiencies and plan next cycle.

Frequency: daily or weekly entries; monthly cash flow summaries; seasonal reviews for key indicators and planning. Note exceptional events (pests, weather, market disruptions) to explain cost/yield changes.

Key principle: "Records should inform action. Data collection has value only when it is used to identify inefficiencies and adjust practices."

Materials needed: notebook/ledger, pens, calculator, optional spreadsheet software, labels/tags, measuring tools, reference price sheet, calendar. Applicable to Arabica and Robusta; available for Uganda.`,
  },
  {
    id: 'tool-701',
    title: 'c&c Toolbox #701: Domestic Rainwater Harvesting (Rooftop Catchment)',
    content: `Domestic rainwater harvesting collects rainfall from rooftops for household and small-scale agricultural use via gutters to storage tanks. Reduces water collection burden and provides water during dry periods. Climate-smart practice from the coffee&climate toolbox.

Tank sizing: minimum 5,000–10,000 litres; should provide water for ~3-month dry seasons. Tank height must be less than the collection building. Must be closed/covered to prevent debris and insect contamination. Material options: plastic (30+ year lifespan), metal, or masonry tanks built by local craftspeople.

Installation steps:
1. Select stable, level location ~1.5 m from buildings. Prepare solid base slightly larger than tank diameter.
2. Place tank; drill water inlet/outlet at 90° following manufacturer specs. Install overflow piping larger in diameter than inlet pipes.
3. Gutter installation: cut PVC or galvanised metal gutters to length; space brackets every 1 m; maintain 1% slope (10 cm per 10 m); for gutters >15 m use 0.5% then 1% slope.
4. Connect downpipes to first-flush system that diverts initial contaminated runoff.
5. First-flush vessel collects initial non-potable water (can irrigate gardens) to prevent contaminants from entering main storage.

Operational management: at start of dry season and first rain of wet season, direct downpipe away from tank or into first-flush device to clear roof debris. Draw water sparingly throughout dry season. Boil or disinfect with chlorine before drinking.

Maintenance: clean gutters after leaf fall; clean tank interior twice yearly; check drain pits annually; monitor water levels regularly.

Mosquito prevention: avoid standing water in overflow areas; ensure overflow systems function. Install before rainy seasons to maximise water capture. Economic benefit includes potential income from selling water to neighbours.`,
  },
]

async function main() {
  const { embed } = await import('../lib/embeddings')
  const { getSupabase } = await import('../lib/supabase')
  const supabase = getSupabase()

  console.log(`Seeding ${TOOLS.length} coffee&climate toolbox entries...`)
  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const tool of TOOLS) {
    // Dedup check
    const { data: existing } = await supabase
      .from('knowledge_chunks')
      .select('id')
      .eq('source', 'cc-toolbox')
      .eq('source_id', tool.id)
      .maybeSingle()

    if (existing) {
      console.log(`  SKIP (exists): ${tool.title}`)
      skipped++
      continue
    }

    try {
      const embedding = await embed(`${tool.title}\n${tool.content}`)
      const { error } = await supabase.from('knowledge_chunks').insert({
        topic: 'coffee',
        title: tool.title,
        content: tool.content,
        embedding,
        source: 'cc-toolbox',
        source_id: tool.id,
      })

      if (error) {
        console.error(`  ERROR inserting ${tool.id}:`, error.message)
        errors++
      } else {
        console.log(`  [${++inserted}] ${tool.title}`)
      }

      await sleep(300) // respect Voyage AI rate limits
    } catch (err) {
      console.error(`  ERROR embedding ${tool.id}:`, err)
      errors++
    }
  }

  console.log(`\nDone. Inserted: ${inserted}  Skipped: ${skipped}  Errors: ${errors}`)
}

main()
