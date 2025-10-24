/**
 * Add Master Business Context to Knowledge Base
 * This is the primary source of truth for all business information
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'firebaseServiceAccount.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const MASTER_BUSINESS_CONTEXT = {
  question: "MASTER_BUSINESS_CONTEXT",
  answer: JSON.stringify({
    workingHours: {
      schedule: "Tuesday to Sunday: 6:00 PM - 7:00 PM",
      closed: "Monday",
      note: "We are closed on Mondays. Open all other days from 6 PM to 7 PM."
    },
    pricing: {
      mensHaircut: "₹500 - ₹800",
      womensHaircut: "₹800 - ₹1500",
      hairColoring: "₹2000 - ₹5000",
      facialBasic: "₹1200",
      facialPremium: "₹2500",
      manicure: "₹600",
      pedicure: "₹800",
      bridalPackage: "₹15000 - ₹50000",
      note: "Prices vary based on hair length and stylist expertise"
    },
    facilities: {
      parking: {
        available: true,
        type: "Valet parking",
        hours: "Same as salon hours (Tue-Sun 6 PM - 7 PM)",
        cost: "Complimentary for clients"
      },
      wifi: true,
      refreshments: "Tea, coffee, and snacks complimentary",
      waitingArea: "Comfortable seating with magazines"
    },
    location: {
      address: "Luxe Beauty Salon, 123 Main Street, Bandra West, Mumbai - 400050",
      landmark: "Near Bandra Station, opposite to Shoppers Stop",
      accessibility: "Ground floor, wheelchair accessible"
    },
    services: {
      hairServices: ["Haircut", "Hair Coloring", "Hair Styling", "Hair Treatment", "Keratin Treatment"],
      skinServices: ["Facials", "Cleanup", "Bleach", "Waxing", "Threading"],
      nailServices: ["Manicure", "Pedicure", "Nail Art", "Gel Nails"],
      bridalServices: ["Bridal Makeup", "Bridal Hair", "Pre-bridal Packages"],
      mensServices: ["Men's Haircut", "Beard Styling", "Hair Coloring", "Facials"]
    },
    staff: {
      stylists: ["Priya (Senior Stylist - 10 years exp)", "Rahul (Hair Color Specialist)", "Sneha (Bridal Makeup Artist)"],
      availability: "Book specific stylist by request, subject to availability"
    },
    appointment: {
      booking: "Call us or book online through our website",
      cancellation: "Free cancellation up to 24 hours before appointment",
      reschedule: "Can reschedule up to 2 hours before appointment",
      walkIns: "Subject to availability, appointment recommended"
    },
    policies: {
      payment: "Cash, Card, UPI accepted",
      lateness: "Please arrive 10 minutes early. Late arrivals may result in shortened service time",
      children: "Children welcome, kids haircut available",
      productSales: "Professional hair care products available for purchase"
    }
  }, null, 2),
  type: "business_context",
  tags: ["business_context", "master", "working_hours", "pricing", "facilities", "location", "services", "staff", "appointment", "policies"],
  isActive: true,
  isPinned: true
};

async function addMasterContext() {
  try {
    console.log('Adding master business context to knowledge base...');

    // Check if already exists
    const existing = await db.collection('knowledgeBase')
      .where('type', '==', 'business_context')
      .where('question', '==', 'MASTER_BUSINESS_CONTEXT')
      .get();

    if (!existing.empty) {
      console.log('Master context already exists, updating...');
      const docId = existing.docs[0].id;
      await db.collection('knowledgeBase').doc(docId).update({
        ...MASTER_BUSINESS_CONTEXT,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Updated master context: ${docId}`);
    } else {
      console.log('Creating new master context...');
      const docRef = await db.collection('knowledgeBase').add({
        ...MASTER_BUSINESS_CONTEXT,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Created master context: ${docRef.id}`);
    }

    console.log('\n✅ Master business context added successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: curl -X POST http://localhost:3000/api/knowledge-base/sync');
    console.log('2. This will sync the master context to Pinecone');
    console.log('3. Rebuild agent service: docker-compose build agent && docker-compose up -d agent');

    process.exit(0);
  } catch (error) {
    console.error('Error adding master context:', error);
    process.exit(1);
  }
}

addMasterContext();
