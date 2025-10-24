/**
 * Seed Knowledge Base with Initial Business Context
 *
 * Extracts information from the current system prompt and populates
 * the knowledge base with essential business information.
 *
 * Run with: npx tsx scripts/seed-knowledge-base.ts
 */

import { createKnowledgeBaseEntry } from '../lib/firebase/knowledgeBase';
import { upsertKnowledgeBase } from '../lib/pinecone/operations';
import { getOrCreateIndex } from '../lib/pinecone/client';

interface SeedEntry {
  question: string;
  answer: string;
  tags: string[];
  variations?: string[];
}

const businessKnowledge: SeedEntry[] = [
  // Hours of Operation
  {
    question: "What are your hours of operation?",
    answer: "We're open Monday through Friday from 9 AM to 7 PM, and Saturday from 10 AM to 6 PM. We're closed on Sundays.",
    tags: ['hours', 'schedule', 'timing'],
    variations: [
      "When are you open?",
      "What time do you close?",
      "Are you open on weekends?",
      "What are your business hours?"
    ]
  },
  {
    question: "Are you open on Sundays?",
    answer: "No, we're closed on Sundays. We're open Monday-Friday 9 AM-7 PM and Saturday 10 AM-6 PM.",
    tags: ['hours', 'sunday', 'closed'],
    variations: [
      "Do you work on Sundays?",
      "Can I book an appointment on Sunday?"
    ]
  },

  // Location
  {
    question: "Where are you located?",
    answer: "We're located in Bandra, Mumbai. Our salon is Luxe Beauty Salon.",
    tags: ['location', 'address'],
    variations: [
      "What's your address?",
      "Where is your salon?",
      "How do I find you?"
    ]
  },

  // Services
  {
    question: "What services do you offer?",
    answer: "We offer haircuts, hair coloring, hair treatments, and styling for special events. We specialize in modern cuts, classic styles, color correction, deep conditioning, and bridal/event styling.",
    tags: ['services', 'offerings'],
    variations: [
      "What can you do for me?",
      "What treatments do you provide?",
      "Do you do haircuts?"
    ]
  },
  {
    question: "Do you do hair coloring?",
    answer: "Yes! We offer professional hair coloring services including full color, highlights, balayage, and color correction. Our stylists are experienced in all coloring techniques.",
    tags: ['services', 'coloring', 'color'],
    variations: [
      "Can you color my hair?",
      "Do you do highlights?",
      "Can you fix my hair color?"
    ]
  },
  {
    question: "Do you offer bridal services?",
    answer: "Yes, we specialize in bridal and special event styling! We can do complete bridal looks including hair styling, makeup, and special updos for your big day.",
    tags: ['services', 'bridal', 'events', 'special-occasions'],
    variations: [
      "Can you do wedding hair?",
      "Do you do event styling?",
      "Can you help with my wedding look?"
    ]
  },

  // Staff
  {
    question: "Who are your stylists?",
    answer: "Our talented team includes Jawed, Toni, Alim, and Ramesh Babu. Each stylist specializes in different techniques and has years of experience.",
    tags: ['staff', 'stylists', 'team'],
    variations: [
      "Can I know about your hairstylists?",
      "Who will do my hair?",
      "Tell me about your team"
    ]
  },
  {
    question: "Can I request a specific stylist?",
    answer: "Yes, you can definitely request a specific stylist when booking your appointment. We have Jawed, Toni, Alim, and Ramesh Babu available. Let me know your preference!",
    tags: ['staff', 'booking', 'preference'],
    variations: [
      "Can I choose my stylist?",
      "I want to book with a specific person"
    ]
  },

  // Booking
  {
    question: "How do I book an appointment?",
    answer: "You can book an appointment by calling us directly. I can help you schedule something right now! What day and time works best for you?",
    tags: ['booking', 'appointments'],
    variations: [
      "How can I schedule an appointment?",
      "Can I make a booking?",
      "I want to book a slot"
    ]
  },
  {
    question: "Do I need an appointment?",
    answer: "Yes, we work by appointment only to ensure you get dedicated time with our stylists. Would you like me to help you book an appointment?",
    tags: ['booking', 'appointments', 'policy'],
    variations: [
      "Can I walk in?",
      "Do you accept walk-ins?",
      "Must I book in advance?"
    ]
  },

  // Pricing (General)
  {
    question: "How much do your services cost?",
    answer: "Our pricing varies depending on the service and stylist. Haircuts typically start at ₹800, coloring services start at ₹2000, and treatments start at ₹1500. Would you like specific pricing for a particular service?",
    tags: ['pricing', 'cost'],
    variations: [
      "What are your prices?",
      "How much does a haircut cost?",
      "What's your rate?"
    ]
  },

  // Contact
  {
    question: "What's your phone number?",
    answer: "You're already speaking with us! This is Luxe Beauty Salon. If you need to call back later, you can reach us at this number during our business hours.",
    tags: ['contact', 'phone'],
    variations: [
      "How can I contact you?",
      "Can I call you back?"
    ]
  },

  // Policies
  {
    question: "What is your cancellation policy?",
    answer: "We require at least 24 hours notice for cancellations or rescheduling. This helps us accommodate other clients. Please call us if you need to make changes to your appointment.",
    tags: ['policy', 'cancellation'],
    variations: [
      "Can I cancel my appointment?",
      "What if I need to reschedule?",
      "Do you charge for cancellations?"
    ]
  },
];

async function seedKnowledgeBase() {
  console.log('🌱 Starting knowledge base seeding...\n');

  try {
    // Ensure Pinecone index exists
    console.log('📌 Checking Pinecone index...');
    await getOrCreateIndex();
    console.log('✅ Pinecone index ready\n');

    let successCount = 0;
    let errorCount = 0;

    for (const entry of businessKnowledge) {
      try {
        console.log(`📝 Adding: "${entry.question}"`);

        // Create in Firebase
        const kbEntry = await createKnowledgeBaseEntry({
          question: entry.question,
          answer: entry.answer,
          type: 'business_context',
          tags: entry.tags,
          variations: entry.variations,
          isActive: true,
        });

        // Sync to Pinecone
        await upsertKnowledgeBase({
          id: kbEntry.id,
          question: entry.question,
          answer: entry.answer,
          type: 'business_context',
          tags: entry.tags,
          isActive: true,
        });

        console.log(`   ✅ Created with ID: ${kbEntry.id}`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error: ${error}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Seeding complete!`);
    console.log(`   Success: ${successCount} entries`);
    console.log(`   Failed: ${errorCount} entries`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Fatal error during seeding:', error);
    process.exit(1);
  }
}

// Run the seeding
seedKnowledgeBase()
  .then(() => {
    console.log('\n🎉 Knowledge base is ready!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  });
