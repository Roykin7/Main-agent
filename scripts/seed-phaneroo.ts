/**
 * Seeds knowledge_chunks with comprehensive Phaneroo Ministries International
 * information: ministry overview, leadership, services, events, beliefs, outreach,
 * contact details, and how to get involved.
 *
 * Run with: npm run seed:phaneroo
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

type SeedEntry = {
  topic: 'coffee' | 'phaneroo'
  title: string
  content: string
  source: string
}

const SOURCE = 'Phaneroo Ministries International — phaneroo.org (2026)'

const entries: SeedEntry[] = [
  // ─── IDENTITY & HISTORY ──────────────────────────────────────────────────────
  {
    topic: 'phaneroo',
    title: 'What is Phaneroo Ministries International?',
    content:
      'Phaneroo Ministries International is an evangelical, Neopentecostal Christian ministry headquartered in Kampala, Uganda. It was founded on August 7, 2014 by Apostle Grace Lubega, beginning at Theatre Labonita in central Kampala. The name "Phaneroo" comes from the Greek word φανερόω (phaneroō), meaning "to make manifest" or "to reveal" — hence the ministry\'s tagline: Make Manifest. Today Phaneroo has over 10,000 seated congregants at its weekly fellowships, over 80,000 people watching live online, and more than 500 branches across East Africa and the globe. It is one of Uganda\'s fastest-growing ministries.',
    source: SOURCE,
  },
  {
    topic: 'phaneroo',
    title: 'Apostle Grace Lubega — founder and senior pastor',
    content:
      'Apostle Grace Lubega Matovu was born in Wakiso District, Uganda, around 1987. He was raised in a Roman Catholic family but became born-again at the age of four during a crusade. He studied Social Work and Social Administration at Uganda Christian University and worked as a Customer Care Supervisor at Kenya Commercial Bank (KCB) before leaving banking to pursue full-time ministry around 2016–2018. He founded Phaneroo Ministries International in 2014 and has since grown it into a ministry that serves tens of thousands across Uganda and beyond. In February 2023 he received an Honorary Doctorate of Divinity from Zoe Life Theological College. He is married to Nicole Kavuma Lubega (daughter of businessman Dennis Paul Kavuma); they married on 19 March 2019 and have a daughter born in 2020. His teachings are known for their depth, clear language, and focus on the identity of the believer, faith, righteousness, and the Word of God.',
    source: SOURCE,
  },
  {
    topic: 'phaneroo',
    title: 'Phaneroo vision, mission and core beliefs',
    content:
      'Vision: "Transform nations through the preaching of the gospel and raise a generation of believers who walk in the full knowledge and manifestation of the Word of God." Mission: To nurture deep scriptural understanding, foster spiritual growth, and cultivate personal relationships with Jesus Christ — through love, faith, and the power of the Holy Spirit. Core beliefs: (1) The Bible is the infallible Word of God. (2) Salvation is by grace through faith in Jesus Christ alone. (3) Every believer carries the nature of God and is called to walk in the fullness of that identity. (4) The Holy Spirit is active and present today. (5) The local church is God\'s vehicle for transformation. Phaneroo is evangelical and Neopentecostal in doctrine, with a strong emphasis on expository, word-centred teaching.',
    source: SOURCE,
  },

  // ─── SERVICES & SCHEDULE ─────────────────────────────────────────────────────
  {
    topic: 'phaneroo',
    title: 'Weekly service times — Thursday fellowship and Sunday services',
    content:
      'Phaneroo Ministries holds three weekly in-person services at Phaneroo Grounds, Naguru, Kampala:\n\n• Thursday Fellowship: Every Thursday at 5:00 PM — This is Phaneroo\'s flagship weekly gathering, centred on deep Bible teaching by Apostle Grace Lubega.\n• Sunday First Service: Every Sunday at 9:00 AM\n• Sunday Second Service: Every Sunday at 11:00 AM\n\nAll services are also streamed live at live.phaneroo.org and on the Phaneroo App (available on Google Play Store and Apple App Store). Attendance is free.',
    source: SOURCE,
  },
  {
    topic: 'phaneroo',
    title: 'Phaneroo Grounds — physical location and address',
    content:
      'Phaneroo Ministries International is located at Phaneroo Grounds, Naguru, Kampala, Uganda. The grounds host all main weekly services (Thursday and Sunday) as well as annual conferences and special events. The ministry administration offices are at Plot 6 Kyambogo Drive, Ministers Village — off Martyrs Way, Ntinda, Kampala. P.O. Box 10830, Kampala, Uganda.',
    source: SOURCE,
  },

  // ─── CONTACT & ONLINE ─────────────────────────────────────────────────────────
  {
    topic: 'phaneroo',
    title: 'How to contact Phaneroo Ministries',
    content:
      'Phone: (+256) 0200 999 400\nEmail: info@phaneroo.org\nWebsite: phaneroo.org\nFacebook: facebook.com/phanerookampala\nInstagram: instagram.com/phaneroo\nTwitter/X: twitter.com/phanerookampala\nYouTube: search "Phaneroo Ministries International" on YouTube\n\nFor prayer requests, visit prayer.phaneroo.org\nFor testimonies, visit phaneroo.org/testimonies\nFor new convert registration, visit phaneroo.org/salvation\nFor financial giving, visit phaneroo.org/give',
    source: SOURCE,
  },
  {
    topic: 'phaneroo',
    title: 'Phaneroo App and online resources',
    content:
      'Phaneroo offers multiple online resources:\n• Phaneroo App — available free on Google Play Store and Apple App Store. Contains daily devotions, freely available sermons for streaming, service notifications, and event details.\n• Live streaming — every Thursday and Sunday service is streamed live at live.phaneroo.org\n• Daily devotions online — phaneroo.org/daily-devotion\n• Prayer platform — prayer.phaneroo.org (submit and track prayer requests)\n• The Phaneroo Herald — a ministry newsletter; subscribe via the website\n• Sermons — phaneroo.org/sermons (full archive of teachings)',
    source: SOURCE,
  },
  {
    topic: 'phaneroo',
    title: 'Phaneroo on TV and Radio — broadcast schedule',
    content:
      'Phaneroo Ministries broadcasts on multiple TV and radio channels internationally:\n• Manifest TV (Uganda) — flagship Phaneroo TV channel\n• TBN Africa — Teaching across the African continent\n• TBN UK — United Kingdom audience\n• GOD TV — International Christian network\n• Daystar Canada — Canadian Christian broadcast\n• Radio stations in Uganda, Burundi, Rwanda, Ghana, India, and the United Kingdom\n\nFor the full TV and radio broadcast schedule, visit phaneroo.org/broadcast',
    source: SOURCE,
  },

  // ─── ANNUAL EVENTS ────────────────────────────────────────────────────────────
  {
    topic: 'phaneroo',
    title: 'Night of Prayer — New Year\'s crossover (December 31)',
    content:
      'The Night of Prayer is Phaneroo\'s annual New Year\'s Eve crossover event held every 31st December at Phaneroo Grounds, Naguru, Kampala. The event runs from 6:00 PM to 5:00 AM EAT (East Africa Time). It is a powerful night of corporate prayer, worship, and the Word. Key verse: "Call to Me, and I will answer you, and show you great and mighty things" (Jeremiah 33:3 NKJV). Entrance is free. Thousands attend in person with a much larger online audience. It is one of Kampala\'s biggest faith gatherings to welcome the new year.',
    source: SOURCE,
  },
  {
    topic: 'phaneroo',
    title: 'Men Gather Conference — annual men\'s event (March)',
    content:
      'Men Gather is Phaneroo\'s annual conference for men, held every March at Phaneroo Grounds, Naguru, Kampala. It runs from 8:00 AM to 7:00 PM. The conference focuses on wisdom, vision, leadership, and achievement — calling men to be nation builders, visionaries, and marketplace leaders. It is a full-day immersive experience of teaching, worship, and practical tools for purpose. Attendance is free. MenGather 2026 is on Saturday 7 March 2026. Website: mengather.org',
    source: SOURCE,
  },
  {
    topic: 'phaneroo',
    title: 'My Great Price Conference — annual women\'s event (June)',
    content:
      'My Great Price is Phaneroo\'s annual conference for women, held every June at Phaneroo Grounds, Naguru, Kampala. It runs from 8:00 AM to 7:00 PM. The conference celebrates the potential and dignity of women, drawing on the truth that "the greatest achievers, nations and institutions are fruits of potent wombs." It is a full-day experience of worship, powerful teaching, and impartation. Attendance is free. My Great Price Season VIII is on Saturday 13 June 2026. Website: mygreatprice.org',
    source: SOURCE,
  },
  {
    topic: 'phaneroo',
    title: 'Inter Schools Conference — annual students\' event (January)',
    content:
      'The Inter Schools Conference is Phaneroo\'s annual conference for primary and secondary school students, including those on vacation from boarding schools. It is held every January at Phaneroo Grounds, Naguru, Kampala, from 11:00 AM to 7:00 PM. It features worship, Bible teaching, interactive sessions, and impartation for students. The 2026 edition (Season IV) was held on Saturday 24 January 2026. Attendance is free.',
    source: SOURCE,
  },
  {
    topic: 'phaneroo',
    title: 'Global Inter-University Conference — annual students\' event (November)',
    content:
      'The Global Inter-University Conference is Phaneroo\'s annual gathering for university students, recent graduates, and young professionals. It is held every November at Phaneroo Grounds, Naguru, Kampala. The conference features worship, teaching, and divine impartation, equipping the next generation of leaders. The 2025 edition was held on Saturday 15 November 2025.',
    source: SOURCE,
  },
  {
    topic: 'phaneroo',
    title: 'Phaneroo Anniversary Celebrations',
    content:
      'Phaneroo Ministries marks its founding anniversary every August, celebrating the date the ministry was launched on August 7, 2014. Anniversary celebrations are major events featuring worship, thanksgiving, and special teaching. In 2023 Phaneroo held the "Clap for Jesus" event during anniversary celebrations, setting a Guinness World Record for the longest applause at 3 hours, 16 minutes, and 1 second — with 926 participants praising God together.',
    source: SOURCE,
  },

  // ─── OUTREACH PROGRAMMES ─────────────────────────────────────────────────────
  {
    topic: 'phaneroo',
    title: 'Manifest Fellowship — schools and university outreach',
    content:
      'Phaneroo runs Manifest Fellowship, a discipleship and evangelism programme with an active presence in over 200 educational institutions in Uganda — including primary schools, secondary schools, and universities. Manifest Fellowship holds regular meetings on campuses, equipping students with the Word of God and creating communities of faith within schools. The Global Inter-University Conference and Inter Schools Conference are the flagship annual events for this arm of the ministry.',
    source: SOURCE,
  },
  {
    topic: 'phaneroo',
    title: 'Phaneroo prisons and hospital ministry',
    content:
      'Phaneroo Ministries International has a vibrant prisons ministry conducting weekly outreach in over 15 prisons across Uganda, bringing the Gospel, practical support, and spiritual transformation to incarcerated individuals and their families. Phaneroo also reaches out to hospitals, bringing prayer, worship, and the Word to patients and health workers. These outreach programmes are part of the ministry\'s broader mission to transform every sector of society through the Gospel.',
    source: SOURCE,
  },

  // ─── HOW TO GET INVOLVED ─────────────────────────────────────────────────────
  {
    topic: 'phaneroo',
    title: 'How to get saved — receiving Jesus Christ at Phaneroo',
    content:
      'If you have never given your life to Jesus Christ or want to recommit your life to Him, Phaneroo warmly welcomes you. You can pray to receive Christ right now — believe that Jesus died for your sins and rose again, confess Him as Lord, and accept His gift of salvation. After praying, register as a new convert at phaneroo.org/salvation so the Phaneroo team can follow up with you, provide resources, and connect you to a local fellowship. You can also connect with them at any Thursday or Sunday service at Phaneroo Grounds.',
    source: SOURCE,
  },
  {
    topic: 'phaneroo',
    title: 'How to give and support Phaneroo Ministries',
    content:
      'You can support the work of Phaneroo Ministries financially through the giving platform at phaneroo.org/give. Giving supports the ministry\'s free-to-attend services, conferences, outreach to schools, prisons, and hospitals, TV and radio broadcasting, and the production of free resources (devotions, sermons, app). All services and conferences are free to attend — financial support is voluntary and by faith.',
    source: SOURCE,
  },
  {
    topic: 'phaneroo',
    title: 'Prayer requests and testimonies at Phaneroo',
    content:
      'Phaneroo has a dedicated prayer platform where you can submit prayer requests and receive prayer from the Phaneroo prayer team. Visit prayer.phaneroo.org to submit a request. If God has answered a prayer or done something great in your life, you can also share your testimony at phaneroo.org/testimonies. Testimonies are a key part of Phaneroo\'s culture — celebrating what God is doing in the lives of people across Uganda and the world.',
    source: SOURCE,
  },

  // ─── KEY TEACHINGS ──────────────────────────────────────────────────────────
  {
    topic: 'phaneroo',
    title: 'Core teaching themes of Apostle Grace Lubega',
    content:
      'Apostle Grace Lubega\'s teachings are known for their depth, expository style, and use of original Hebrew and Greek words to illuminate scripture. Key recurring themes include:\n• The Identity of the Believer — who you are in Christ, the nature God has given you\n• Faith and Righteousness — right standing with God, not by works but by faith\n• The Word of God — deep study of scripture, understanding what God actually said\n• The Holy Spirit — His person, His work, walking in the Spirit daily\n• Kingdom living — practical application of the Gospel in everyday life\n• Time and Seasons — understanding God\'s timing for your life and assignment\n\nNotable recent sermon titles include "The Power to Fulfil Your Assignment", "Living Under Open Heavens", "God\'s Template for Winning in Life: Cracking the Code of Time and Chance", and "Blessed and Not Breaking: The Mystery of the Unbroken Net."',
    source: SOURCE,
  },
  {
    topic: 'phaneroo',
    title: 'Where to access Phaneroo sermons and teachings',
    content:
      'Phaneroo sermons are available free across multiple platforms:\n• Website: phaneroo.org/sermons — full archive of Thursday and Sunday teachings\n• Phaneroo App — download on Google Play or Apple App Store for easy mobile access\n• YouTube — search "Phaneroo Ministries International" for video recordings of services\n• Podcast — available on Apple Podcasts (id1362019869 or id1517013380) and Spotify (search "Phaneroo Ministries International")\n• TV — Manifest TV, TBN Africa, TBN UK, GOD TV, and Daystar Canada\n• Social Media — clips and highlights on Facebook (phanerookampala), Instagram (phaneroo), and TikTok',
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
