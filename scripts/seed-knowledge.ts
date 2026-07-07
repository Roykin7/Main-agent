/**
 * Seeds knowledge_chunks with a small starter set so the MVP is testable
 * end-to-end. Run with: npm run seed
 *
 * The Phaneroo entries below cover general public info about the ministry.
 * Add specific sermons, devotions, and event details over time (see README
 * "Updating the knowledge base").
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

type SeedEntry = {
  topic: 'coffee' | 'phaneroo'
  title: string
  content: string
  source: string
}

const entries: SeedEntry[] = [
  // --- Coffee ---
  {
    topic: 'coffee',
    title: 'Arabica vs Robusta',
    content:
      'The two main coffee species are Arabica and Robusta. Arabica beans are generally sweeter and more aromatic with higher acidity, and grow best at higher altitudes (around 1000-2000m). Robusta beans are stronger, more bitter, higher in caffeine, and more disease-resistant, typically grown at lower altitudes.',
    source: 'general knowledge',
  },
  {
    topic: 'coffee',
    title: 'Growing conditions',
    content:
      'Coffee grows best in tropical climates with consistent rainfall, rich well-drained soil, and moderate temperatures (15-24°C for Arabica). Many of the best Arabica coffees are grown at high altitude, which slows bean maturation and develops more complex flavors.',
    source: 'general knowledge',
  },
  {
    topic: 'coffee',
    title: 'Processing methods',
    content:
      'After harvesting, coffee cherries are processed using methods like washed (pulp removed before drying, cleaner/brighter flavor), natural/dry (cherries dried whole, fruitier and heavier body), or honey process (some mucilage left on during drying, balance of both).',
    source: 'general knowledge',
  },
  {
    topic: 'coffee',
    title: 'Roast levels',
    content:
      'Light roasts preserve more of the bean origin flavors and acidity, with a lighter body. Medium roasts balance origin flavor with roast flavor. Dark roasts have bold, smoky, sometimes bitter flavors and more visible oil on the bean surface, with origin character less pronounced.',
    source: 'general knowledge',
  },
  {
    topic: 'coffee',
    title: 'Brewing methods',
    content:
      'Common brewing methods include espresso (pressurized hot water through finely-ground coffee), French press (steeping coarse grounds then pressing), pour-over (manually pouring hot water over grounds in a filter for a clean cup), and AeroPress (a quick immersion + pressure method good for travel).',
    source: 'general knowledge',
  },
  {
    topic: 'coffee',
    title: 'Common coffee drinks',
    content:
      'An espresso is a concentrated shot. A latte is espresso with steamed milk and a thin layer of foam. A cappuccino is espresso with roughly equal parts steamed milk and foam. An americano is espresso diluted with hot water, similar in strength to drip coffee.',
    source: 'general knowledge',
  },
  {
    topic: 'coffee',
    title: 'Storing coffee',
    content:
      'Coffee stays freshest stored in an airtight container, away from light, heat, and moisture, ideally at room temperature. Whole beans stay fresh longer than ground coffee. Grinding just before brewing gives the best flavor. Avoid storing coffee in the fridge, where it can absorb moisture and odors.',
    source: 'general knowledge',
  },
  {
    topic: 'coffee',
    title: 'Caffeine content',
    content:
      'Caffeine content varies by brew method and serving size. Roughly, an 8oz cup of drip coffee has about 80-100mg of caffeine, an espresso shot has about 60-80mg, and Robusta beans contain roughly twice the caffeine of Arabica beans.',
    source: 'general knowledge',
  },

  // --- Phaneroo Ministries International ---
  {
    topic: 'phaneroo',
    title: 'About Phaneroo Ministries International',
    content:
      'Phaneroo Ministries International is a Christian (evangelical/neopentecostal) ministry founded on 7 August 2014 by Apostle Grace Lubega, headquartered in Kampala, Uganda. "Phaneroo" comes from a Greek word meaning "to make manifest". The ministry describes itself as "a dynamic, life-transforming, and generational impacting ministry" focused on transforming nations through the Word of God.',
    source: 'phaneroo.org, en.wikipedia.org/wiki/Phaneroo_Ministries_International',
  },
  {
    topic: 'phaneroo',
    title: 'Leadership - Apostle Grace Lubega',
    content:
      'Apostle Grace Lubega is the founder and "vision bearer" of Phaneroo Ministries International. His teaching focuses on God\'s grace and power, divine healing, divine providence, and the Christian\'s supernatural walk with God. He is known for a captivating teaching style with strong use of humor, and for mentoring other ministers and believers.',
    source: 'phaneroo.org/about-apostle-grace-lubega',
  },
  {
    topic: 'phaneroo',
    title: 'Services and location',
    content:
      'Phaneroo holds gatherings at Phaneroo Grounds in Naguru, Kampala, Uganda, which accommodates over 20,000 people. As of recent information, services are held Thursdays at 5 PM, and Sundays at 9 AM and 11 AM. Service times can change, so always confirm the latest schedule on phaneroo.org or their official social media before sharing it as certain.',
    source: 'phaneroo.org, monitor.co.ug',
  },
  {
    topic: 'phaneroo',
    title: 'Online resources',
    content:
      'The official website phaneroo.org offers daily devotions, an audio sermon archive, live streaming, a prayer request platform, new convert registration, a newsletter, and a mobile app (iOS and Android). Phaneroo broadcasts are also aired on TV networks including TBN, God TV, and Daystar. Their YouTube channel is "Phaneroo Ministries International" (@phaneroo) and their Facebook page is "Phaneroo, Kampala".',
    source: 'phaneroo.org, youtube.com/@phaneroo, facebook.com/phanerookampala',
  },
  {
    topic: 'phaneroo',
    title: 'Notable event - Clap for Jesus',
    content:
      'On 30 July 2023, Phaneroo Ministries led an event called "Clap for Jesus" in Kampala, setting a Guinness World Record for the longest applause: 3 hours, 16 minutes and 1 second, with 926 participants.',
    source: 'en.wikipedia.org/wiki/Phaneroo_Ministries_International',
  },
  {
    topic: 'phaneroo',
    title: 'Devotions and sermon references',
    content:
      'Phaneroo Ministries publishes daily devotions (available on phaneroo.org and shared on social media since the ministry began) and an audio sermon archive. ZOE can share a specific devotion for a date, or sermon references and scripture verses for a topic, once that content has been added to its knowledge base. If a specific date or topic is not yet available in the knowledge base, ZOE should say so honestly and point the user to phaneroo.org rather than guessing or inventing a reference.',
    source: 'phaneroo.org',
  },

  // --- Bible word studies (Hebrew/Greek) ---
  // Definitions summarized from Strong's Concordance (public domain).
  {
    topic: 'phaneroo',
    title: 'Word Study: Zoe (ζωή)',
    content:
      'Zoe (Greek "zoe", Strong\'s G2222) means "life" - but specifically the absolute fullness of life, both physical and spiritual, that belongs to God himself and that He gives to those who believe. It is often called "the God-kind of life": eternal, divine, abundant life - different from "bios" (biological life/lifespan) or "psyche" (the soul/natural life). Jesus uses this word in John 10:10, "I came that they may have life (zoe), and have it abundantly", and in John 1:4, "In him was life (zoe), and that life was the light of men." The name ZOE points to this idea of God\'s own life being shared with people.',
    source: "Strong's Concordance (G2222)",
  },
  {
    topic: 'phaneroo',
    title: 'Word Study: Agape (ἀγάπη)',
    content:
      'Agape (Greek, Strong\'s G26) is selfless, sacrificial, unconditional love - the kind of love God has for the world (John 3:16, "For God so loved (agapao) the world...") and the love believers are called to show one another (1 Corinthians 13). Unlike love based on feelings or circumstances, agape is a love that chooses to act for someone\'s good regardless of whether it is deserved or returned.',
    source: "Strong's Concordance (G26)",
  },
  {
    topic: 'phaneroo',
    title: 'Word Study: Charis / Grace (χάρις)',
    content:
      'Charis (Greek, Strong\'s G5485), usually translated "grace", means unearned favor and kindness - a gift freely given, not because it is deserved, but because of the giver\'s generosity. In the New Testament it describes God\'s free gift of salvation and the empowering presence of God at work in a believer\'s life (e.g. Ephesians 2:8, "For by grace you have been saved through faith... it is the gift of God"). Teaching on grace is a major emphasis of Phaneroo Ministries.',
    source: "Strong's Concordance (G5485)",
  },
  {
    topic: 'phaneroo',
    title: 'Word Study: Dunamis / Power (δύναμις)',
    content:
      'Dunamis (Greek, Strong\'s G1411) means "power", "might", or "miraculous strength" - it is the root of English words like "dynamite" and "dynamic". It is used for the power of the Holy Spirit, such as in Acts 1:8: "But you will receive power (dunamis) when the Holy Spirit comes on you." It points to a supernatural ability that comes from God, not from human effort.',
    source: "Strong's Concordance (G1411)",
  },
  {
    topic: 'phaneroo',
    title: 'Word Study: Logos and Rhema (λόγος / ῥῆμα)',
    content:
      'Logos (Greek, Strong\'s G3056) means "word", "message", or "reason" - used of Jesus himself in John 1:1, "In the beginning was the Word (Logos)..." It can refer to God\'s overall written/revealed word. Rhema (Greek, Strong\'s G4487) means a specific spoken word or utterance - often used for a particular word from God spoken or made alive to a person in a moment, as in Matthew 4:4, "Man shall not live on bread alone, but on every word (rhema) that comes from the mouth of God."',
    source: "Strong's Concordance (G3056, G4487)",
  },
  {
    topic: 'phaneroo',
    title: 'Word Study: Pistis / Faith (πίστις)',
    content:
      'Pistis (Greek, Strong\'s G4102), translated "faith" or "belief", means trust, confidence, and persuasion of the truth of something. In the New Testament it describes a confident reliance on God and on his promises, not just an intellectual agreement (Hebrews 11:1, "Now faith is the assurance of things hoped for, the conviction of things not seen.").',
    source: "Strong's Concordance (G4102)",
  },
  {
    topic: 'phaneroo',
    title: 'Word Study: Shalom (שָׁלוֹם)',
    content:
      'Shalom (Hebrew, Strong\'s H7965) is often translated "peace", but its meaning is much wider - it includes completeness, wholeness, health, safety, and well-being in every area of life, not just the absence of conflict. It is a common Hebrew greeting and blessing, and reflects the kind of full-life flourishing God desires for people.',
    source: "Strong's Concordance (H7965)",
  },
  {
    topic: 'phaneroo',
    title: 'Word Study: Chesed (חֶסֶד)',
    content:
      'Chesed (Hebrew, Strong\'s H2617) is often translated "lovingkindness", "mercy", or "steadfast love". It describes God\'s loyal, faithful love toward his people - a love tied to his covenant promises that does not give up, often appearing in phrases like "his steadfast love (chesed) endures forever" (Psalm 136).',
    source: "Strong's Concordance (H2617)",
  },
  {
    topic: 'phaneroo',
    title: 'Word Study: Ruach (רוּחַ)',
    content:
      'Ruach (Hebrew, Strong\'s H7307) means "spirit", "breath", or "wind". It is used for the Holy Spirit ("Ruach HaKodesh") and for the breath of life God breathed into Adam in Genesis 2:7. The same word can describe a gentle breath, a strong wind, or God\'s own Spirit, depending on context.',
    source: "Strong's Concordance (H7307)",
  },
]

async function main() {
  const { embed } = await import('../lib/embeddings')
  const { getSupabase } = await import('../lib/supabase')
  const supabase = getSupabase()

  for (const entry of entries) {
    const embedding = await embed(`${entry.title}\n${entry.content}`)

    const { error } = await supabase.from('knowledge_chunks').insert({
      topic: entry.topic,
      title: entry.title,
      content: entry.content,
      embedding,
      source: entry.source,
    })

    if (error) {
      console.error(`Failed to insert "${entry.title}":`, error.message)
    } else {
      console.log(`Inserted: [${entry.topic}] ${entry.title}`)
    }
  }
}

main().then(() => {
  console.log('Done.')
})
