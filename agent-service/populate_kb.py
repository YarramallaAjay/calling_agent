#!/usr/bin/env python3
"""
Populate knowledge base with sample salon data
"""
import asyncio
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv()

# Sample knowledge base entries
SAMPLE_DATA = [
    {
        "question": "What are your working hours?",
        "answer": "We're open Monday to Saturday from 9 AM to 7 PM. We're closed on Sundays.",
        "type": "hours",
        "tags": "hours,schedule,timing"
    },
    {
        "question": "Do you have parking available?",
        "answer": "Yes, we have complimentary valet parking for all our clients.",
        "type": "facilities",
        "tags": "parking,facilities,amenities"
    },
    {
        "question": "What services do you offer?",
        "answer": "We offer haircuts, styling, coloring, highlights, spa treatments, manicures, pedicures, facials, and bridal makeup.",
        "type": "services",
        "tags": "services,treatments,offerings"
    },
    {
        "question": "How much does a haircut cost?",
        "answer": "Our haircut prices start from ₹800 for basic cuts and go up to ₹2500 for premium styling with senior stylists.",
        "type": "pricing",
        "tags": "pricing,cost,haircut"
    },
    {
        "question": "Do I need an appointment?",
        "answer": "While we accept walk-ins, we highly recommend booking an appointment to avoid wait times. You can book online or call us.",
        "type": "booking",
        "tags": "appointment,booking,reservation"
    },
    {
        "question": "Where are you located?",
        "answer": "We're located in Bandra West, Mumbai, near Linking Road. The exact address is available on our website.",
        "type": "location",
        "tags": "location,address,directions"
    },
    {
        "question": "Do you offer bridal packages?",
        "answer": "Yes! We have comprehensive bridal packages including makeup, hair styling, pre-bridal treatments, and trial sessions. Prices start from ₹15,000.",
        "type": "services",
        "tags": "bridal,wedding,packages,services"
    },
    {
        "question": "Can I cancel or reschedule my appointment?",
        "answer": "Yes, you can cancel or reschedule up to 24 hours before your appointment without any charges. Please call us or use our online portal.",
        "type": "policy",
        "tags": "cancellation,policy,reschedule"
    },
]

async def populate_knowledge_base():
    """Add sample entries to knowledge base via API"""

    api_url = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")

    async with aiohttp.ClientSession() as session:
        print(f"[INFO] Adding {len(SAMPLE_DATA)} entries to knowledge base...")
        print(f"API URL: {api_url}")
        print()

        for i, entry in enumerate(SAMPLE_DATA, 1):
            try:
                async with session.post(
                    f"{api_url}/api/knowledge-base/entries",
                    json=entry,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        print(f"[SUCCESS] [{i}/{len(SAMPLE_DATA)}] Added: {entry['question'][:60]}...")
                    else:
                        error_text = await response.text()
                        print(f"[ERROR] [{i}/{len(SAMPLE_DATA)}] Failed: {entry['question'][:60]}...")
                        print(f"   Error: {error_text[:100]}")

            except Exception as e:
                print(f"[ERROR] [{i}/{len(SAMPLE_DATA)}] Error adding entry: {e}")

        print()
        print("[SUCCESS] Knowledge base population complete!")
        print()
        print("Next steps:")
        print("1. Verify at: http://localhost:3000/dashboard/knowledge")
        print("2. Test the agent with: 'What are your working hours?'")

if __name__ == "__main__":
    asyncio.run(populate_knowledge_base())
