/**
 * Generate real example complaints by running test cases through the pipeline API.
 * Captures the actual generated documents and saves them to lib/example-complaints.ts
 */

const fs = require('fs');
const path = require('path');

const TEST_CASES = [
  {
    slug: 'consumer-complaint-flipkart-mobile',
    title: 'Consumer Complaint Against E-Commerce Platform for Defective Mobile Phone',
    domain: 'Consumer Protection',
    forum: 'District Consumer Disputes Redressal Commission',
    sectionsCited: ['Section 2(7)', 'Section 2(10)', 'Section 34', 'Section 35', 'Section 83', 'Section 86'],
    description: 'A consumer complaint filed against an e-commerce marketplace for selling a defective mobile phone and refusing to process a return.',
    input: 'My name is Rajesh Kumar and I purchased a Samsung Galaxy S24 Ultra mobile phone from Flipkart on 5th March 2024 for Rs 1,29,999. Within 10 days the phone started overheating and the screen developed green lines. I contacted Flipkart customer care on 16th March and they refused to replace it saying it was physical damage, which is completely false. I have the unboxing video as proof. Samsung service center confirmed it is a manufacturing defect. I want a full refund of Rs 1,29,999 and Rs 25,000 compensation for mental harassment and wasted time.',
  },
  {
    slug: 'consumer-complaint-insurance-claim',
    title: 'Consumer Complaint Against Insurance Company for Claim Rejection',
    domain: 'Consumer Protection',
    forum: 'District Consumer Disputes Redressal Commission',
    sectionsCited: ['Section 2(7)', 'Section 2(11)', 'Section 34', 'Section 35'],
    description: 'A consumer complaint against a health insurance company for wrongful rejection of a hospitalization claim.',
    input: 'I am Priya Sharma, resident of Andheri West, Mumbai. I hold a health insurance policy with SecureLife Insurance Company, policy number SL2022-45678, sum insured Rs 10 lakhs, active since March 2022. On 10th November 2024 I was admitted to City Hospital for emergency appendectomy surgery. Total bill was Rs 2,85,000. The insurance company rejected my cashless claim saying pre-existing condition not disclosed. Appendicitis is an acute condition, not pre-existing. I have paid all premiums regularly for 2.5 years. I want reimbursement of Rs 2,85,000 plus Rs 50,000 compensation for mental agony.',
  },
  {
    slug: 'rera-complaint-delayed-possession-mumbai',
    title: 'RERA Complaint for Delayed Possession in Mumbai',
    domain: 'RERA',
    forum: 'Maharashtra Real Estate Regulatory Authority (MahaRERA)',
    sectionsCited: ['Section 18', 'Section 19(4)', 'Section 31', 'Section 71'],
    description: 'A RERA complaint filed against a Mumbai builder for delaying possession by over 2 years.',
    input: 'I am Vikram Desai, resident of Borivali West, Mumbai. I booked a 2BHK flat in Skyline Heights project in Thane West from Skyline Developers Pvt Ltd in June 2021. MahaRERA registration number P51800045678. Agreement for Sale dated 20 June 2021 for total consideration of Rs 85 lakhs. Possession was promised by December 2023. I have paid Rs 78.5 lakhs so far. It is now 2025 and the project is only 70% complete. Builder keeps giving false promises. I want either possession within 3 months or full refund with interest plus Rs 2 lakhs compensation for paying both EMI of Rs 58000 per month and rent of Rs 25000 per month.',
  },
  {
    slug: 'rti-road-construction-budget',
    title: 'RTI Application for Road Construction Budget Information',
    domain: 'RTI',
    forum: 'Public Information Officer, PWD',
    sectionsCited: ['Section 6(1)', 'Section 7(1)', 'Section 20'],
    description: 'An RTI application seeking road construction budget and contractor details.',
    input: 'I am Amit Verma, resident of Sector 15, Noida, Uttar Pradesh. I want to know how much money was allocated and spent by the Noida Authority on road repair and maintenance in Sector 15 during the financial year 2023-2024. The roads in our sector are in terrible condition despite multiple complaints. I want copies of all work orders issued, contractor details, bills paid, and completion certificates for road work in Sector 15 from April 2023 to March 2024. I prefer to receive this information by email at amit.verma@email.com.',
  },
];

async function runPipeline(problemDescription) {
  try {
    const response = await fetch('http://localhost:3000/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problemDescription }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API error ${response.status}: ${err}`);
    }

    // Read the SSE stream to get the final document
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let finalDocument = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      fullText += decoder.decode(value, { stream: true });

      // Parse SSE events
      const lines = fullText.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'pipeline_complete' && event.data) {
              finalDocument = event.data.finalDocument;
            }
          } catch {}
        }
      }
    }

    return finalDocument;
  } catch (err) {
    console.error('Pipeline error:', err.message);
    return null;
  }
}

async function main() {
  console.log('=== Generating Real Example Complaints ===\n');
  console.log('Running test cases through the pipeline API...\n');

  const results = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    console.log(`[${i + 1}/${TEST_CASES.length}] ${tc.title}`);
    console.log(`  Input: ${tc.input.substring(0, 80)}...`);

    const document = await runPipeline(tc.input);

    if (document) {
      console.log(`  ✅ Generated (${document.length} chars)\n`);
      results.push({ ...tc, document });
    } else {
      console.log(`  ❌ Failed - using placeholder\n`);
      results.push({ ...tc, document: `[Generation failed - run again when pipeline is working]` });
    }

    // Wait between calls to avoid rate limiting
    if (i < TEST_CASES.length - 1) {
      console.log('  Waiting 5s before next...\n');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Write results to file
  const outputPath = path.join(__dirname, '..', 'lib', 'example-complaints-generated.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n=== Done ===`);
  console.log(`Results saved to: ${outputPath}`);
  console.log(`\nNext: Copy the generated documents into lib/example-complaints.ts`);
}

main().catch(e => console.error('Fatal:', e.message));
