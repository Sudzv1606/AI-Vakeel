/**
 * Munshi (Draft Agent) - PROGRAMMATIC ARCHITECTURE
 * 
 * Instead of asking the LLM to generate the entire document (which fails with
 * gpt-4o-mini), this splits the work:
 * 
 * | Task                                    | Who Does It       |
 * |-----------------------------------------|-------------------|
 * | Document structure, header, jurisdiction | TypeScript code   |
 * | limitation, verification, annexures     | TypeScript code   |
 * | Facts paragraphs (narrative)            | LLM (short prompt)|
 * | Legal grounds (section citations)       | LLM (short prompt)|
 * 
 * The execute() method makes TWO short LLM calls (~400 tokens each),
 * then programmatically assembles the full document.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */

import { MunshiOutputSchema, type MunshiOutput } from '../schemas/munshi-schema';
import type { ArzdarOutput } from '../schemas/arzdar-schema';
import type { VivechakOutput } from '../schemas/vivechak-schema';
import type { ShodhakOutput } from '../schemas/shodhak-schema';
import type { BaseAgent, AgentExecutionResult, JSONSchema } from './base-agent';
import { OpenRouterClient, type ChatMessage } from '../openrouter-client';
import { getDomainKey } from './rules';

// --- Interfaces ---

export interface MunshiInput {
  extractedFacts: ArzdarOutput;
  routing: VivechakOutput;
  legalSections: ShodhakOutput;
}

// Re-export for convenience
export type { MunshiOutput } from '../schemas/munshi-schema';

// --- System Prompt (minimal, used for both LLM calls) ---

const FACTS_SYSTEM_PROMPT = `You are a legal document drafter. Write formal numbered paragraphs for an Indian legal complaint. Use ONLY the facts provided. NEVER invent names, dates, or events.`;

const GROUNDS_SYSTEM_PROMPT = `You are a legal document drafter. Write formal legal grounds citing specific sections of Indian law. Use ONLY the sections provided. NEVER invent section numbers.`;

// --- Agent Implementation ---

export class MunshiAgent implements BaseAgent<MunshiInput, MunshiOutput> {
  name = 'Munshi' as const;
  systemPrompt = FACTS_SYSTEM_PROMPT;
  outputSchema: JSONSchema = MunshiOutputSchema as unknown as JSONSchema;

  private client: OpenRouterClient;

  constructor(client: OpenRouterClient) {
    this.client = client;
  }

  /**
   * Validates that Shodhak output is present and contains at least one legal section.
   */
  validateInput(input: MunshiInput): string | null {
    if (!input.legalSections) {
      return 'Shodhak output is missing. Legal research data is unavailable.';
    }
    if (
      !input.legalSections.legalSections ||
      input.legalSections.legalSections.length === 0
    ) {
      return 'Shodhak output contains no legal sections. Legal research data is unavailable.';
    }
    return null;
  }

  /**
   * Validates raw output against MunshiOutputSchema.
   */
  validateOutput(raw: unknown): MunshiOutput | null {
    const result = MunshiOutputSchema.safeParse(raw);
    if (result.success) {
      return result.data;
    }
    return null;
  }

  /**
   * Parse JSON from LLM response, handling potential markdown code blocks.
   */
  parseJsonResponse(content: string): Record<string, unknown> | null {
    try {
      return JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch {
          return null;
        }
      }
      const objectMatch = content.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[0]);
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  /**
   * Execute the Munshi agent using PROGRAMMATIC architecture:
   * 1. Validate input
   * 2. Call LLM for ONLY facts paragraphs (short prompt)
   * 3. Call LLM for ONLY legal grounds (short prompt)
   * 4. Programmatically assemble full document using code skeleton + LLM content
   * 5. Return assembled document
   */
  async execute(input: MunshiInput): Promise<AgentExecutionResult<MunshiOutput>> {
    const startTime = Date.now();

    // Step 1: Validate input
    const validationError = this.validateInput(input);
    if (validationError) {
      return {
        success: false,
        error: {
          category: 'dependency_failure',
          description: validationError,
        },
        durationMs: Date.now() - startTime,
      };
    }

    try {
      const { extractedFacts, routing, legalSections } = input;
      const domainKey = getDomainKey(routing.legalDomain);

      // Step 2: LLM call for facts paragraphs
      let factsContent: string;
      try {
        factsContent = await this.generateFacts(extractedFacts, routing);
      } catch {
        // Fallback: use raw facts if LLM fails
        factsContent = this.buildFallbackFacts(extractedFacts);
      }

      // Step 3: LLM call for legal grounds
      let groundsContent: string;
      try {
        groundsContent = await this.generateGrounds(legalSections, domainKey, extractedFacts);
      } catch {
        // Fallback: use raw sections if LLM fails
        groundsContent = this.buildFallbackGrounds(legalSections);
      }

      // Step 4: Programmatically assemble the full document
      const skeleton = this.buildDocumentSkeleton(
        extractedFacts, routing, domainKey, factsContent, groundsContent
      );

      // Step 5: Build MunshiOutput
      const documentStructure = this.buildDocumentStructure(
        extractedFacts, routing, domainKey, factsContent, groundsContent
      );

      const output: MunshiOutput = {
        complaintDocument: skeleton,
        documentStructure,
      };

      // Validate output
      const validated = this.validateOutput(output);
      if (!validated) {
        return {
          success: false,
          error: {
            category: 'schema_validation',
            description: 'Assembled output does not conform to MunshiOutputSchema',
          },
          durationMs: Date.now() - startTime,
        };
      }

      return {
        success: true,
        output: validated,
        durationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;

      if (typeof err === 'object' && err !== null && 'type' in err) {
        const openRouterErr = err as { type: string; message: string };
        if (openRouterErr.type === 'timeout' || openRouterErr.type === 'exhausted_retries') {
          return {
            success: false,
            error: { category: 'llm_timeout', description: openRouterErr.message },
            durationMs,
          };
        }
        return {
          success: false,
          error: { category: 'unhandled_exception', description: openRouterErr.message },
          durationMs,
        };
      }

      return {
        success: false,
        error: {
          category: 'unhandled_exception',
          description: err instanceof Error ? err.message : String(err),
        },
        durationMs,
      };
    }
  }

  // ─── LLM CALL: Generate Facts Paragraphs ───

  private async generateFacts(
    facts: ArzdarOutput,
    routing: VivechakOutput
  ): Promise<string> {
    const timelineStr = (facts.timeline || [])
      .map(t => `- ${t.date}: ${t.event}`)
      .join('\n');

    const partiesStr = (facts.allOppositeParties || [])
      .map(p => `${p.name} (${p.role})`)
      .join(', ');

    // Prevent LLM from inventing when fields are "not provided"
    const complainantDisplay = (facts.complainantName && facts.complainantName !== 'not provided')
      ? facts.complainantName
      : '[COMPLAINANT NAME - NOT PROVIDED]';

    const userPrompt = `Turn these facts into 5-7 numbered paragraphs for a legal complaint.

RULES:
- Use ONLY facts below. NEVER invent.
- If any field shows [NOT PROVIDED]: write it EXACTLY as shown. NEVER replace with invented names.
- NEVER use "John Doe", "ABC", or any made-up placeholder.
- Start each: "1. That the Complainant..."
- Include ALL dates, amounts, party names
- Formal legal language

FACTS:
- Complainant: ${complainantDisplay}
- Against: ${partiesStr || facts.respondentName}
- Product: ${facts.productName || 'N/A'}, Amount: ₹${facts.productAmount ?? 'N/A'}
- Timeline:
${timelineStr || `- ${Array.isArray(facts.incidentDates) ? facts.incidentDates.join(', ') : facts.incidentDates}: incident occurred`}
- Grievance: ${facts.grievanceSummary}
- Relief: ${facts.reliefSought}

Respond with ONLY numbered paragraphs. No JSON, no explanation.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: FACTS_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.client.chatCompletion(messages);
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('LLM returned empty response for facts');
    }
    return content.trim();
  }

  // ─── LLM CALL: Generate Legal Grounds ───

  private async generateGrounds(
    legalSections: ShodhakOutput,
    domainKey: string,
    facts?: ArzdarOutput
  ): Promise<string> {
    // Build mandatory sections list based on case type (code-enforced, not LLM-dependent)
    const mandatorySections = this.buildMandatorySections(domainKey, facts);

    // Combine Shodhak sections with mandatory sections
    const shodhakStr = legalSections.legalSections
      .map(s => `- ${s.sectionNumber}: ${s.content.substring(0, 80)}`)
      .join('\n');

    let forbiddenNote = '';
    if (domainKey === 'CONSUMER') {
      const isGoods = facts?.productName && facts.productName !== 'not provided';
      const hasManufacturer = (facts?.allOppositeParties || []).some(p => p.liabilityType === 'product_manufacturer');
      const hasSeller = (facts?.allOppositeParties || []).some(p => p.liabilityType === 'product_seller');

      forbiddenNote = `MANDATORY RULES FOR THIS CASE:
- This is a ${isGoods ? 'GOODS (product)' : 'SERVICE'} complaint
- ${isGoods ? 'Use Section 2(10) for defect. NOT Section 2(11) which is for services' : 'Use Section 2(11) for deficiency. NOT Section 2(10) which is for goods'}
- Section 83: Product liability action. ALWAYS include if product involved
${hasManufacturer ? '- Section 84: Manufacturer liability. YES, manufacturer is named' : ''}
${hasSeller ? '- Section 86: Product seller liability. YES, marketplace/seller is named' : ''}
- NEVER cite Section 36 (Commission composition) or Section 89 (advertiser penalties)
- Section 34: Pecuniary jurisdiction. ALWAYS include
- Section 69: 2-year limitation. ALWAYS include`;
    } else if (domainKey === 'RERA') {
      forbiddenNote = `- Section 18 is PRIMARY liability section. ALWAYS cite first.
- NEVER cite Section 19 alone without Section 18
- NEVER cite Section 11(1)(b)`;
    } else {
      forbiddenNote = `- NEVER cite Section 21 (protects officers, not applicants)
- Section 20 penalty deterrent. ALWAYS include.`;
    }

    const userPrompt = `Write 5-7 legal grounds for a ${domainKey.toLowerCase()} complaint.

${forbiddenNote}

MANDATORY SECTIONS TO CITE (from code analysis):
${mandatorySections}

ADDITIONAL SECTIONS FROM RESEARCH:
${shodhakStr}

Format: "1. That under Section X of the Act..."

Respond with ONLY numbered paragraphs. No JSON, no explanation.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: GROUNDS_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    const response = await this.client.chatCompletion(messages);
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('LLM returned empty response for legal grounds');
    }
    return content.trim();
  }

  // ─── MANDATORY SECTIONS BUILDER (code-enforced) ───

  private buildMandatorySections(domainKey: string, facts?: ArzdarOutput): string {
    const parties = facts?.allOppositeParties || [];
    const hasManufacturer = parties.some(p => p.liabilityType === 'product_manufacturer');
    const hasSeller = parties.some(p => p.liabilityType === 'product_seller');
    const isGoods = facts?.productName && facts.productName !== 'not provided';

    if (domainKey === 'CONSUMER') {
      const sections: string[] = [
        'Section 2(7): Consumer definition',
        isGoods ? 'Section 2(10): Defect in goods' : 'Section 2(11): Deficiency in service',
        'Section 34: Pecuniary jurisdiction of District Commission',
        'Section 35: Manner of filing complaint',
        'Section 38(6): Hearing on basis of affidavit (mandatory)',
        'Section 69: Limitation period of 2 years',
        'Section 39: Relief powers of District Commission',
      ];
      if (isGoods) sections.push('Section 83: Product liability action');
      if (hasManufacturer) sections.push('Section 84: Liability of product manufacturer');
      if (hasSeller) sections.push('Section 86: Liability of product seller/marketplace');
      return sections.map(s => `- ${s}`).join('\n');
    } else if (domainKey === 'RERA') {
      return [
        '- Section 18: Return of amount and compensation (PRIMARY)',
        '- Section 19(3): Allottee right to claim possession',
        '- Section 19(4): Allottee right to claim refund + interest',
        '- Section 31: Filing complaints with Authority',
        '- Section 71: Power to adjudicate',
        '- Section 4(2)(l)(D): Escrow obligation (if delay > 3 months)',
      ].join('\n');
    } else {
      return [
        '- Section 6(1): Basis for making request',
        '- Section 7(1): 30-day response obligation',
        '- Section 19(1): First appeal within 30 days',
        '- Section 19(3): Second appeal within 90 days',
        '- Section 20: Penalty on PIO for non-compliance',
      ].join('\n');
    }
  }

  // ─── FALLBACK: Raw facts when LLM fails ───

  private buildFallbackFacts(facts: ArzdarOutput): string {
    const lines: string[] = [];
    lines.push(`1. That the Complainant, ${facts.complainantName}, purchased/availed services from ${facts.respondentName}.`);
    if (facts.productName && facts.productName !== 'not provided') {
      lines.push(`2. That the product/service in question is ${facts.productName}${facts.productAmount ? ` costing ₹${facts.productAmount}` : ''}.`);
    }
    if (facts.timeline && facts.timeline.length > 0) {
      facts.timeline.forEach((t, i) => {
        lines.push(`${lines.length + 1}. That on ${t.date}, ${t.event}.`);
      });
    }
    lines.push(`${lines.length + 1}. That the Complainant's grievance is: ${facts.grievanceSummary}.`);
    lines.push(`${lines.length + 1}. That the Complainant seeks: ${facts.reliefSought}.`);
    return lines.join('\n\n');
  }

  // ─── FALLBACK: Raw grounds when LLM fails ───

  private buildFallbackGrounds(legalSections: ShodhakOutput): string {
    return legalSections.legalSections
      .map((s, i) => `${i + 1}. That under ${s.sectionNumber} of the ${s.actName}, ${s.content.substring(0, 120)}.`)
      .join('\n\n');
  }

  // ─── PROGRAMMATIC SKELETON BUILDERS ───

  /**
   * Build the ENTIRE document programmatically based on domain.
   * LLM-generated content is inserted at [LLM_GENERATED_FACTS] and [LLM_GENERATED_GROUNDS].
   */
  private buildDocumentSkeleton(
    facts: ArzdarOutput,
    routing: VivechakOutput,
    domainKey: string,
    factsContent: string,
    groundsContent: string
  ): string {
    switch (domainKey) {
      case 'CONSUMER':
        return this.buildConsumerSkeleton(facts, routing, factsContent, groundsContent);
      case 'RERA':
        return this.buildReraSkeleton(facts, routing, factsContent, groundsContent);
      case 'RTI':
        return this.buildRtiSkeleton(facts, routing, factsContent, groundsContent);
      default:
        return this.buildConsumerSkeleton(facts, routing, factsContent, groundsContent);
    }
  }

  // ─── CONSUMER SKELETON ───

  private buildConsumerSkeleton(
    facts: ArzdarOutput,
    routing: VivechakOutput,
    factsContent: string,
    groundsContent: string
  ): string {
    const city = this.extractCity(routing.forum, facts);
    const complainant = facts.complainantName;
    const address = facts.complainantAddress || '[TO BE PROVIDED BY COMPLAINANT]';
    const parties = facts.allOppositeParties || [];
    const firstDate = this.getFirstDate(facts);
    const totalClaim = facts.financialClaims?.total
      ? `₹${facts.financialClaims.total}`
      : '[TO BE PROVIDED BY COMPLAINANT]';
    const refund = facts.financialClaims?.productRefund
      ? `₹${facts.financialClaims.productRefund}`
      : (facts.productAmount ? `₹${facts.productAmount}` : '[AMOUNT]');
    const compensation = facts.financialClaims?.compensation
      ? `₹${facts.financialClaims.compensation}`
      : '[AMOUNT]';

    // Build parties section
    let partiesSection = `**${complainant}**, ${address} ... **Complainant**\n\nAND\n\n`;
    if (parties.length > 0) {
      parties.forEach((p, i) => {
        partiesSection += `**${p.name}** (${p.role}) ... **Opposite Party ${i + 1}**`;
        if (i < parties.length - 1) partiesSection += '\n\nAND\n\n';
      });
    } else {
      partiesSection += `**${facts.respondentName}** ... **Opposite Party 1**`;
    }

    return `# BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION, ${city}

**Case No.: ______/2026**
**Date of Filing: ______**

**BETWEEN:**
${partiesSection}

**COMPLAINT UNDER SECTION 35 OF THE CONSUMER PROTECTION ACT, 2019**

---

### JURISDICTION
This Hon'ble Commission has jurisdiction under Section 35 of the Consumer Protection Act, 2019. The total relief claimed of ${totalClaim}/- falls within the pecuniary jurisdiction of the District Commission under Section 34 (up to ₹1 crore). The cause of action arose within ${city}.

### LIMITATION
This complaint is filed within 2 years of the cause of action as required under Section 69. The cause of action arose on ${firstDate}.

### FACTS OF THE COMPLAINT
${factsContent}

### LEGAL GROUNDS
${groundsContent}

### RELIEF CLAIMED
1. Refund of ${refund}
2. Compensation of ${compensation} for mental agony and harassment
3. Interest at 9% per annum from ${firstDate} until realization
4. Litigation costs
5. Any other relief this Hon'ble Commission deems fit

### AFFIDAVIT
I, ${complainant}, S/o/D/o [Parent's Name], aged [Age] years, resident of ${address}, do hereby solemnly affirm and state on oath that the contents of this complaint are true and correct to my knowledge and belief. No material fact has been concealed or suppressed. Verified at ${city} on [Date].

### LIST OF ANNEXURES
1. Annexure A: Purchase invoice/receipt
2. Annexure B: Communication records (emails/chat screenshots)
3. Annexure C: Evidence (photos/video)
4. Annexure D: Any other relevant documents`;
  }

  // ─── RERA SKELETON ───

  private buildReraSkeleton(
    facts: ArzdarOutput,
    routing: VivechakOutput,
    factsContent: string,
    groundsContent: string
  ): string {
    const city = this.extractCity(routing.forum, facts);
    const state = this.extractState(routing.forum);
    const complainant = facts.complainantName;
    const address = facts.complainantAddress || '[TO BE PROVIDED BY COMPLAINANT]';
    const respondent = facts.respondentName;
    const firstDate = this.getFirstDate(facts);
    const totalAmount = facts.financialClaims?.total
      ? `₹${facts.financialClaims.total}`
      : (facts.productAmount ? `₹${facts.productAmount}` : '[TOTAL CONSIDERATION]');
    const compensation = facts.financialClaims?.compensation
      ? `₹${facts.financialClaims.compensation}`
      : '[AMOUNT]';

    return `# BEFORE THE ${state} REAL ESTATE REGULATORY AUTHORITY, ${city}

**Complaint No.: ______/2026**
**Date of Filing: ______**

**BETWEEN:**
**${complainant}**, ${address} ... **Complainant/Allottee**

AND

**${respondent}** ... **Respondent/Promoter**

**COMPLAINT UNDER SECTION 31 OF THE REAL ESTATE (REGULATION AND DEVELOPMENT) ACT, 2016**

---

### JURISDICTION
This complaint is filed under Section 31 of the RERA Act, 2016 before this Hon'ble Authority. The subject project is registered with ${state} RERA under Registration No. [RERA REG. NO.]. Compensation is claimed under Section 18, adjudicable by the Adjudicating Officer under Section 71 of the Act.

### LIMITATION
This complaint is filed within the prescribed limitation period. The cause of action arose on ${firstDate}.

### FACTS OF THE COMPLAINT
${factsContent}

### LEGAL GROUNDS
${groundsContent}

### RELIEF CLAIMED
1. Direction to hand over possession within 60 days
2. Interest at the rate prescribed under ${state} RERA Rules (typically SBI MCLR + 2% p.a.) on total consideration of ${totalAmount} from the promised possession date
3. Compensation of ${compensation} for mental agony and harassment
4. Costs of this proceeding
5. Any other relief this Hon'ble Authority deems fit

### VERIFICATION
I, ${complainant}, S/o/D/o [Parent's Name], aged [Age] years, resident of ${address}, do hereby solemnly affirm and state on oath that the contents of this complaint are true and correct to my knowledge and belief. No material fact has been concealed or suppressed. Verified at ${city} on [Date] 2026.

### LIST OF ANNEXURES
1. Annexure A: Agreement for Sale
2. Annexure B: All payment receipts
3. Annexure C: Communication records with promoter
4. Annexure D: RERA registration page
5. Annexure E: Any other relevant documents`;
  }

  // ─── RTI SKELETON ───

  private buildRtiSkeleton(
    facts: ArzdarOutput,
    routing: VivechakOutput,
    factsContent: string,
    groundsContent: string
  ): string {
    const complainant = facts.complainantName;
    const address = facts.complainantAddress || '[TO BE PROVIDED BY APPLICANT]';
    const respondent = facts.respondentName;

    return `# APPLICATION UNDER THE RIGHT TO INFORMATION ACT, 2005

To,
The Public Information Officer,
${respondent},
[Full Address of Department]

**Date:** ______

---

### APPLICANT DETAILS
- **Name:** ${complainant}
- **Address:** ${address}
- **Phone:** [TO BE PROVIDED]
- **Email:** [TO BE PROVIDED]

---

### SUBJECT
Request for information under Section 6(1) of the Right to Information Act, 2005.

### INFORMATION SOUGHT
${factsContent}

### LEGAL BASIS
${groundsContent}

### FEE
Amount: Rs.10/-
Mode: Indian Postal Order / Demand Draft / Court Fee Stamp
Payable to: Accounts Officer, ${respondent}

### BPL DECLARATION
I am not a person belonging to the Below Poverty Line (BPL) category.

### PENALTY NOTE
The applicant draws attention to Section 20 of the RTI Act, 2005, under which the Information Commission may impose Rs.250 per day (up to Rs.25,000) on the PIO for unjustified refusal or failure to respond within 30 days.

### PRAYER
The applicant prays that the information be provided within 30 days as mandated under Section 7(1) of the RTI Act, 2005.

### APPEAL RIGHTS
In case of non-response within 30 days, the applicant shall file a First Appeal under Section 19(1) within 30 days to the senior officer, and a Second Appeal under Section 19(3) to the Information Commission within 90 days.

### DECLARATION
I, ${complainant}, declare that I am a citizen of India and the information sought does not relate to any other person's personal information which has no relationship to any public activity or interest.

### ENCLOSURES
1. Application fee (Rs.10 by IPO/DD/Court Fee Stamp)
2. Copy of applicant's identity proof
3. Any supporting documents if applicable`;
  }

  // ─── DOCUMENT STRUCTURE BUILDER ───

  private buildDocumentStructure(
    facts: ArzdarOutput,
    routing: VivechakOutput,
    domainKey: string,
    factsContent: string,
    groundsContent: string
  ): MunshiOutput['documentStructure'] {
    const city = this.extractCity(routing.forum, facts);
    const complainant = facts.complainantName;
    const address = facts.complainantAddress || '[TO BE PROVIDED BY COMPLAINANT]';
    const firstDate = this.getFirstDate(facts);
    const refund = facts.financialClaims?.productRefund
      ? `₹${facts.financialClaims.productRefund}`
      : (facts.productAmount ? `₹${facts.productAmount}` : '[AMOUNT]');
    const compensation = facts.financialClaims?.compensation
      ? `₹${facts.financialClaims.compensation}`
      : '[AMOUNT]';

    let header: string;
    let prayerClause: string;
    let verification: string;

    if (domainKey === 'CONSUMER') {
      header = `BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION, ${city}`;
      prayerClause = `1. Refund of ${refund}\n2. Compensation of ${compensation} for mental agony and harassment\n3. Interest at 9% per annum from ${firstDate} until realization\n4. Litigation costs\n5. Any other relief this Hon'ble Commission deems fit`;
      verification = `I, ${complainant}, S/o/D/o [Parent's Name], aged [Age] years, resident of ${address}, do hereby solemnly affirm and state on oath that the contents of this complaint are true and correct to my knowledge and belief. No material fact has been concealed or suppressed. Verified at ${city} on [Date].`;
    } else if (domainKey === 'RERA') {
      const state = this.extractState(routing.forum);
      const totalAmount = facts.financialClaims?.total
        ? `₹${facts.financialClaims.total}`
        : (facts.productAmount ? `₹${facts.productAmount}` : '[TOTAL CONSIDERATION]');
      header = `BEFORE THE ${state} REAL ESTATE REGULATORY AUTHORITY, ${city}`;
      prayerClause = `1. Direction to hand over possession within 60 days\n2. Interest at prescribed rate on total consideration of ${totalAmount}\n3. Compensation of ${compensation} for mental agony\n4. Costs of this proceeding\n5. Any other relief this Hon'ble Authority deems fit`;
      verification = `I, ${complainant}, S/o/D/o [Parent's Name], aged [Age] years, resident of ${address}, do hereby solemnly affirm and state on oath that the contents of this complaint are true and correct to my knowledge and belief. No material fact has been concealed or suppressed. Verified at ${city} on [Date] 2026.`;
    } else {
      header = `APPLICATION UNDER THE RIGHT TO INFORMATION ACT, 2005`;
      prayerClause = `The applicant prays that the information be provided within 30 days as mandated under Section 7(1) of the RTI Act, 2005.`;
      verification = `I, ${complainant}, declare that I am a citizen of India and the information sought does not relate to any other person's personal information which has no relationship to any public activity or interest.`;
    }

    const structure: MunshiOutput['documentStructure'] = {
      header,
      factsOfCase: factsContent,
      legalGrounds: groundsContent,
      prayerClause,
      verification,
    };

    // Add Hindi prayer clause if originalLanguage is 'hi'
    if (facts.originalLanguage === 'hi') {
      structure.hindiPrayerClause = this.buildHindiPrayerClause(facts);
    }

    return structure;
  }

  // ─── HINDI PRAYER CLAUSE ───

  private buildHindiPrayerClause(facts: ArzdarOutput): string {
    const refund = facts.financialClaims?.productRefund
      ? `₹${facts.financialClaims.productRefund}`
      : (facts.productAmount ? `₹${facts.productAmount}` : '[राशि]');
    const compensation = facts.financialClaims?.compensation
      ? `₹${facts.financialClaims.compensation}`
      : '[राशि]';

    return `प्रार्थना: उपरोक्त तथ्यों एवं परिस्थितियों के आधार पर, प्रार्थी विनम्रतापूर्वक निम्नलिखित अनुतोष की प्रार्थना करता/करती है:\n(क) ${refund} की पूर्ण धनवापसी\n(ख) ${compensation} का मानसिक पीड़ा हेतु मुआवजा\n(ग) भुगतान की तिथि से वसूली तक 9% प्रतिवर्ष ब्याज\n(घ) वाद व्यय`;
  }

  // ─── UTILITY HELPERS ───

  /**
   * Extract city from the forum string or facts.
   */
  private extractCity(forum: string, facts: ArzdarOutput): string {
    // Try to extract city from forum string
    // e.g., "District Consumer Disputes Redressal Commission, Mumbai" → "Mumbai"
    const commaMatch = forum.match(/,\s*(.+)$/);
    if (commaMatch && commaMatch[1]) {
      return commaMatch[1].trim();
    }

    // Try to extract from complainant address
    if (facts.complainantAddress && facts.complainantAddress !== 'not provided') {
      // Take last meaningful word as city (heuristic)
      const parts = facts.complainantAddress.split(',');
      if (parts.length > 1) {
        const lastPart = parts[parts.length - 1].trim();
        // Filter out pin codes
        if (!/^\d+$/.test(lastPart)) {
          return lastPart;
        }
        if (parts.length > 2) {
          return parts[parts.length - 2].trim();
        }
      }
    }

    return '[CITY]';
  }

  /**
   * Extract state from forum string for RERA cases.
   */
  private extractState(forum: string): string {
    // e.g., "Maharashtra RERA Authority, Mumbai" → "MAHARASHTRA"
    // e.g., "UP RERA, Lucknow" → "UP"
    const reraMatch = forum.match(/^(.+?)\s*(?:RERA|Real Estate)/i);
    if (reraMatch && reraMatch[1]) {
      return reraMatch[1].trim().toUpperCase();
    }

    // Try before comma
    const parts = forum.split(',');
    if (parts.length > 0) {
      const firstPart = parts[0].trim();
      // If it contains "Authority" strip it
      const cleaned = firstPart.replace(/\s*(Authority|Regulatory).*$/i, '').trim();
      if (cleaned.length > 0 && cleaned.length < 30) {
        return cleaned.toUpperCase();
      }
    }

    return '[STATE]';
  }

  /**
   * Get the first/earliest date from facts for limitation purposes.
   */
  private getFirstDate(facts: ArzdarOutput): string {
    if (facts.timeline && facts.timeline.length > 0) {
      return facts.timeline[0].date;
    }
    if (Array.isArray(facts.incidentDates) && facts.incidentDates.length > 0) {
      return facts.incidentDates[0];
    }
    if (typeof facts.incidentDates === 'string' && facts.incidentDates !== 'not provided') {
      return facts.incidentDates;
    }
    return '[DATE]';
  }
}
