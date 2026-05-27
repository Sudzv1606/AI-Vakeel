/**
 * AI VAKEEL — AGENT RULES
 * Contains verified section citations, domain hard rules, self-checks,
 * review checklists, and few-shot templates.
 */

export const SECTION_CITATION_RULES = `
=== VERIFIED SECTION CITATION RULES (read from actual act text) ===

CONSUMER PROTECTION ACT 2019 — CORRECT SECTION MAPPING:

ALWAYS CITE IN EVERY CONSUMER COMPLAINT:
Section 2(7)   = Consumer definition (buys goods/hires services for consideration)
Section 34     = Jurisdiction of District Commission (pecuniary limit: up to 1 crore)
Section 35     = Manner in which complaint shall be made (filing section)
Section 38(6)  = Affidavit requirement: MANDATORY BY STATUTE
Section 69     = Limitation period: 2 years from cause of action

CASE-TYPE SPECIFIC:
Defective GOODS     = Section 2(10): Definition of "defect"
Deficient SERVICES  = Section 2(11): Definition of "deficiency"
Unfair trade practice = Section 2(47): Definition of "unfair trade practice"
E-commerce platform = Section 94: Measures to prevent unfair trade practices in e-commerce

PRODUCT LIABILITY (cite ALL that apply):
Section 83  = Product liability ACTION (the right to bring a claim). CITE for any product defect case.
Section 84  = Liability of product MANUFACTURER (cite if brand/maker named)
Section 85  = Liability of product SERVICE PROVIDER (cite if service on product)
Section 86  = Liability of product SELLERS (cite for Flipkart/Amazon/Meesho/Myntra)

RELIEF AND ORDERS:
Section 39  = Findings of District Commission (replacement, refund, compensation, punitive damages)

PECUNIARY JURISDICTION:
Section 34  = District Commission = claim up to 1 crore
Section 47  = State Commission = claim 1 crore to 10 crore
Section 58  = National Commission = claim above 10 crore

INTEREST RATE: Never claim more than 9% per annum.
Always write: "interest at 9% per annum or such rate as the Commission deems fit"

FORBIDDEN CITATIONS (will invalidate complaint):
X Section 36  = Proceedings before District Commission (composition/procedure). NEVER cite for unfair trade practices.
X Section 89  = CRIMINAL punishment for false/misleading ADVERTISEMENTS. NEVER cite in consumer complaints (neither product defect nor service deficiency). This is a CRIMINAL provision, not a civil remedy.

RERA ACT 2016 — CORRECT SECTION MAPPING:

ALWAYS CITE IN EVERY RERA COMPLAINT:
Section 18       = Return of amount and compensation: PRIMARY LIABILITY SECTION
Section 19(3)    = Allottee's right to claim possession
Section 19(4)    = Allottee's right to claim refund + interest
Section 31       = Filing complaints with the Authority
Section 71       = Power to adjudicate

CASE-TYPE SPECIFIC:
Delay in possession  = Section 18 (PRIMARY) + Section 19(3) + Section 19(4)
Escrow violation     = Section 4(2)(l)(D) read with Section 11(4)(a)
Structural defects   = Section 14(3): Promoter must rectify within 5 years
Misleading ad        = Section 12: Obligations regarding veracity of advertisement
Registry/title delay = Section 17: Transfer of title

INTEREST RATE: "at the rate prescribed under [State] RERA Rules (typically SBI MCLR + 2% p.a.)"

FORBIDDEN CITATIONS:
X Section 19 ALONE without Section 18
X Section 11(1)(b) for escrow (does not exist in those terms)

RTI ACT 2005 — CORRECT SECTION MAPPING:

ALWAYS CITE IN EVERY RTI APPLICATION:
Section 6(1)   = Basis for making request
Section 7(1)   = 30-day response obligation on PIO
Section 19(1)  = First appeal: within 30 days to senior officer
Section 19(3)  = Second appeal: within 90 days to Information Commission
Section 20     = Penalty: 250/day up to 25,000 on PIO for non-compliance

FORBIDDEN CITATIONS:
X Section 21 = Protection of action taken in good faith (protects OFFICERS, not applicants)
`;

export const DOMAIN_HARD_RULES: Record<string, string> = {
  CONSUMER: `
DOMAIN HARD RULES: CONSUMER PROTECTION ACT 2019

NOMENCLATURE (fatal if wrong):
ALWAYS: "District Consumer Disputes Redressal COMMISSION"
NEVER: "District Consumer Disputes Redressal Forum"
"Forum" was the 1986 Act. The 2019 Act uses "Commission" throughout.

JURISDICTION PARAGRAPH (MUST BE FIRST SECTION):
"This Hon'ble Commission has jurisdiction to entertain this complaint under
Section 35 of the Consumer Protection Act, 2019. The total relief claimed
of [TOTAL CLAIM AMOUNT] falls within the pecuniary jurisdiction of the
District Commission as prescribed under Section 34 of the Act (up to 1 crore).
The cause of action arose within the territorial limits of [City/District]."

LIMITATION STATEMENT (MANDATORY IN FACTS SECTION):
"This complaint is being filed within 2 years from the date on which the cause
of action arose, as required under Section 69 of the Consumer Protection Act, 2019.
The cause of action arose on [DATE OF INCIDENT/PURCHASE]."

AFFIDAVIT (MANDATORY BY STATUTE, Section 38(6)):
Single continuous paragraph format:
"I, [Name], aged [Age] years, S/o/D/o [Father's Name], resident of [Address],
do hereby solemnly affirm and state on oath that the contents of this complaint
are true and correct to my knowledge and belief. No material fact has been
concealed or suppressed. Verified at [Place] on [Date]."

RELIEF SECTION (MUST BE SPECIFIC):
a) Refund of [EXACT AMOUNT] (price paid)
b) Compensation of [AMOUNT] for mental agony and harassment
c) Interest at 9% per annum from [DATE OF PURCHASE] until realization
d) Litigation costs of [AMOUNT]
e) Any other relief this Hon'ble Commission deems fit

INTEREST RATE: Maximum 9% p.a. Never 18%.

ANNEXURES LIST (ALWAYS INCLUDE):
Annexure A: Purchase invoice/receipt
Annexure B: Communication records (emails/chat screenshots)
Annexure C: Photos/video evidence (on CD/pen drive if applicable)
Annexure D: Any warranty/guarantee card
Annexure E: Any other relevant document
`,
  RERA: `
DOMAIN HARD RULES: RERA ACT 2016

FORUM HEADER:
ALWAYS: "BEFORE THE [STATE] REAL ESTATE REGULATORY AUTHORITY, [CITY]"
Extract state from facts. Never leave as generic [STATE].

SECTION 18 (PRIMARY LIABILITY SECTION, always cite):
"The Respondent has failed to hand over possession by the agreed date,
thereby violating Section 18 of the RERA Act, 2016, which makes the promoter
liable to return the amount received with interest at the prescribed rate,
or pay interest for every month of delay."

ESCROW VIOLATION (add for delays > 3 months):
Cite Section 4(2)(l)(D) read with Section 11(4)(a) for escrow obligation.
NEVER cite Section 11(1)(b) (does not exist in those terms).

INTEREST RATE:
"Interest at the rate prescribed under [State] RERA Rules (typically SBI MCLR + 2% p.a.)"
NEVER write a fixed rate without verifying the state rule.

JURISDICTION PARAGRAPH (mandatory, always first):
"This complaint is filed under Section 31 of the RERA Act, 2016 before this
Hon'ble Authority. The subject project is registered with [State] RERA under
Registration No. [RERA No.]. Compensation is claimed under Section 18,
adjudicable by the Adjudicating Officer under Section 71 of the Act."

RELIEF (MUST BE SPECIFIC):
a) Direction to hand over possession within 60 days
b) Interest at prescribed rate on total consideration from possession due date
c) Compensation of [AMOUNT] for mental agony
d) Costs of this proceeding
e) Any other relief

VERIFICATION DATE: ALWAYS 2026. NEVER the agreement date or possession date.

ANNEXURES:
Annexure A: Agreement for Sale
Annexure B: All payment receipts
Annexure C: Communication records with promoter
Annexure D: RERA registration page
Annexure E: Any other relevant documents
`,
  RTI: `
DOMAIN HARD RULES: RTI ACT 2005

ADDRESSING:
"To, The Public Information Officer, [Full Department Name], [Full Address]"
Never address to a general department.

INFORMATION REQUESTS (HYPER-SPECIFIC FORMAT):
Each request must specify:
- WHAT information is sought (exact documents/data)
- FOR WHICH PERIOD (specific date range)
- IN WHAT FORMAT (certified copies / soft copy / inspection)

FEE SECTION (ALWAYS COMPLETE):
Amount: Rs.10/-
Mode: Indian Postal Order / Demand Draft / Court Fee Stamp / Cash
Payable to: Accounts Officer, [Department Name]

BPL DECLARATION (NEVER AMBIGUOUS):
Write one of:
"I am not a person belonging to the Below Poverty Line (BPL) category."
OR
"I am a BPL category person and attach proof of BPL status herewith."
NEVER leave "strike out whichever not applicable".

30-DAY DEADLINE (ALWAYS IN PRAYER):
"The applicant requests that the information be provided within 30 days
as mandated under Section 7(1) of the RTI Act, 2005."

PENALTY DETERRENT (ALWAYS ADD):
"The applicant draws attention to Section 20 of the RTI Act, 2005, under which
the Information Commission may impose Rs.250 per day (up to Rs.25,000) on the PIO
for unjustified refusal or failure to respond within 30 days."

APPEAL RIGHTS FOOTER (ALWAYS ADD):
"In case of non-response within 30 days, the applicant shall file a First Appeal
under Section 19(1) within 30 days, and a Second Appeal under Section 19(3) to
the Information Commission within 90 days."

ENCLOSURES:
1. Application fee (Rs.10 by IPO/DD/cash receipt)
2. Copy of applicant's identity proof
3. Any supporting documents if applicable
`
};

export const MUNSHI_SELF_CHECK = `
=== MANDATORY SELF-CHECK BEFORE RETURNING DOCUMENT ===

UNIVERSAL CHECKS:
- Are there ANY remaining [PLACEHOLDER] brackets that should have been filled from the facts?
- Are all dates internally consistent and chronologically logical?
- Is the jurisdiction paragraph the FIRST substantive section?
- Is relief specific with rupee amounts (not "compensation as per law")?
- Is there a verification/declaration section at the end?

CONSUMER-SPECIFIC:
- Does it say "Commission" everywhere, with ZERO instances of "Forum"?
- Is there a sworn affidavit (Section 38(6) compliance)?
- Is Section 36 cited anywhere? If yes: REMOVE immediately.
- Is Section 89 cited for a product defect? If yes: REMOVE immediately.
- Is interest rate 9% or less?

RERA-SPECIFIC:
- Does the forum header contain an actual state name (not [STATE])?
- Is Section 19 cited WITHOUT Section 18? If yes: add Section 18 as primary.
- Is Section 11(1)(b) cited for escrow? If yes: replace with Section 4(2)(l)(D).
- Is the verification date 2026 (not the agreement date)?

RTI-SPECIFIC:
- Is Section 21 cited? If yes: REMOVE immediately.
- Is the BPL declaration clean (not "strike out whichever")?
- Is the Section 20 penalty deterrent paragraph present?
- Does every request specify: WHAT + PERIOD + FORMAT?

Only return the document after all applicable checks pass.
`;

export const NYAYADOOT_CHECKLISTS: Record<string, string> = {
  CONSUMER: `
REVIEW CHECKLIST: CONSUMER PROTECTION ACT 2019
Start at 100. Deduct points for each failure.

FATAL ERRORS (automatic rejection risk):
- Uses "Forum" instead of "Commission": -20 pts CRITICAL
- Section 36 cited for unfair trade practices: -15 pts CRITICAL
- Section 89 cited for product defect: -15 pts CRITICAL
- Interest rate > 9% per annum: -10 pts

MANDATORY ELEMENTS:
- Header: "BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION, [CITY]"
- Jurisdiction paragraph present (Section 35 + Section 34 pecuniary limit)
- Limitation period stated (Section 69, 2 years)
- Section 2(7) cited (consumer definition)
- Section 2(10) or 2(11) cited (defect or deficiency, correct one for case type)
- Section 39 cited (relief powers)
- Affidavit present (Section 38(6) mandatory by statute)
- Annexures list present
- Verification: single clean paragraph

SECTION CITATIONS:
- If marketplace named: Section 86 cited (product seller liability)
- If manufacturer named: Section 84 cited (product manufacturer liability)
- If e-commerce: Section 94 cited
- If service complaint: Section 2(11) cited (NOT Section 2(10))

FACTUAL COMPLETENESS:
- Complainant name populated (no placeholder)
- Opposite party name populated
- Purchase amount stated
- Date of purchase stated
- All relief amounts specified (no vague language)
`,
  RERA: `
REVIEW CHECKLIST: RERA ACT 2016
Start at 100. Deduct points for each failure.

FATAL ERRORS:
- Section 19 cited WITHOUT Section 18: -25 pts CRITICAL
- Section 11(1)(b) cited for escrow: -10 pts
- [STATE] placeholder in forum header: -15 pts CRITICAL
- Verification date = agreement date: -15 pts CRITICAL

MANDATORY ELEMENTS:
- State-specific forum name with actual state and bench city
- RERA Registration Number present
- Section 18 cited as PRIMARY liability section
- Section 31 cited (jurisdiction to file)
- Section 71 cited (adjudication power)
- Section 19(3) and 19(4) cited (allottee rights)
- Escrow violation cited for delays > 3 months: Section 4(2)(l)(D)
- Interest rate as "prescribed under [State] RERA Rules"
- Relief specifies rupee amount for compensation
- Verification date is 2026

FACTUAL COMPLETENESS:
- Complainant name populated
- Builder/promoter name populated
- Project name populated
- Total consideration amount populated
- Agreement date populated
- Promised possession date populated
- Timeline is chronologically logical
`,
  RTI: `
REVIEW CHECKLIST: RTI ACT 2005
Start at 100. Deduct points for each failure.

FATAL ERRORS:
- Section 21 cited: -15 pts (protects officers, irrelevant)
- BPL declaration ambiguous: -10 pts

MANDATORY ELEMENTS:
- Section 6(1) cited as filing basis
- Section 7(1) referenced (30-day deadline)
- Section 19(1) noted (first appeal, 30 days)
- Section 19(3) noted (second appeal, 90 days)
- Section 20 penalty paragraph present (Rs.250/day up to Rs.25,000)
- Fee payment section complete (Rs.10, mode stated)
- BPL declaration clean and unambiguous
- Appeal rights footer present
- Enclosures list present

INFORMATION REQUESTS QUALITY:
- All requests are numbered
- Each specifies WHAT is sought
- Each specifies FOR WHICH TIME PERIOD
- Each specifies FORMAT (certified copies / soft copy / inspection)
- No request is vague
`
};

export const FEW_SHOT_TEMPLATES: Record<string, string> = {
  CONSUMER: `
EXAMPLE OF CORRECTLY FORMATTED CONSUMER COMMISSION COMPLAINT:

BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION, [CITY]

Case No.: ______/2026
Date of Filing: ______

BETWEEN:
[Complainant Name], [Address] ... Complainant
AND
[Opposite Party Name], [Address] ... Opposite Party

COMPLAINT UNDER SECTION 35 OF THE CONSUMER PROTECTION ACT, 2019

JURISDICTION:
This Hon'ble Commission has jurisdiction under Section 35 of the Consumer
Protection Act, 2019. The total relief claimed of [AMOUNT] falls within the
pecuniary jurisdiction of the District Commission under Section 34 (up to 1 crore).
The cause of action arose within [City/District].

LIMITATION:
This complaint is filed within 2 years of the cause of action as required
under Section 69 of the Consumer Protection Act, 2019.

FACTS OF THE COMPLAINT:
1. [Numbered chronological facts]

LEGAL GROUNDS:
1. Section 2(7): Complainant is a "consumer" under the Act
2. Section 2(10): The goods suffer from a "defect" as defined
3. Section 83: Product liability action maintainable
4. Section 86: Opposite Party as product seller is liable
5. Section 39: This Hon'ble Commission may direct replacement/refund/compensation

RELIEF CLAIMED:
1. Refund of [AMOUNT]
2. Compensation of [AMOUNT] for mental agony
3. Interest at 9% per annum from [DATE] until realization
4. Litigation costs of [AMOUNT]
5. Any other relief this Hon'ble Commission deems fit

AFFIDAVIT:
I, [Name], S/o [Father's Name], aged [Age] years, resident of [Address],
do hereby solemnly affirm and state on oath that the contents of this complaint
are true and correct to my knowledge and belief. No material fact has been
concealed. Verified at [Place] on [Date].

LIST OF ANNEXURES:
Annexure A: Purchase invoice
Annexure B: Communication records
Annexure C: Evidence (photos/video)
Annexure D: Any other relevant documents
`,
  RTI: `
EXAMPLE OF CORRECTLY FORMATTED RTI APPLICATION:

APPLICATION UNDER THE RIGHT TO INFORMATION ACT, 2005

To,
The Public Information Officer
[Department Name]
[Address]

Date: ________________

SUBJECT: Request for information regarding [SPECIFIC SUBJECT]

APPLICANT DETAILS:
Name: [Name]
Address: [Address]
Phone: [Phone]
Email: [Email]

INFORMATION SOUGHT:
Under Section 6(1) of the RTI Act, 2005, the applicant requests:

1. [Specific request] for the period [DATE RANGE] in the form of [certified copies]
2. [Specific request] for the period [DATE RANGE]

FEE: Rs.10/- enclosed by [IPO/DD/Court Fee Stamp]
Payable to: Accounts Officer, [Department]

BPL STATUS: I am not a person belonging to the Below Poverty Line category.

PENALTY NOTE: The applicant draws attention to Section 20 of the RTI Act, 2005,
under which the Information Commission may impose Rs.250/day (up to Rs.25,000)
on the PIO for unjustified refusal or failure to respond within 30 days.

PRAYER: The applicant prays that the information be provided within 30 days
as mandated under Section 7(1), preferably via email to [EMAIL].

APPEAL RIGHTS: In case of non-response, First Appeal under Section 19(1)
within 30 days, Second Appeal under Section 19(3) within 90 days.

DECLARATION: I, [Name], declare that I am a citizen of India.

ENCLOSURES:
1. Application fee (Rs.10)
2. Copy of identity proof
`
};

/**
 * Get the domain key from the legal domain string.
 */
export function getDomainKey(legalDomain: string): 'CONSUMER' | 'RERA' | 'RTI' {
  if (legalDomain.includes('consumer')) return 'CONSUMER';
  if (legalDomain.includes('rera')) return 'RERA';
  return 'RTI';
}

/**
 * Build short, targeted, domain+party-specific rules dynamically.
 * Replaces the long SECTION_CITATION_RULES + DOMAIN_HARD_RULES blocks
 * with a concise ~30-line rule set that avoids LLM attention loss.
 */
export function buildMunshiCoreRules(
  domain: string,
  parties: Array<{ name: string; role: string; liabilityType: string }>
): string {
  let rules = `
RULES (follow in this exact order of priority):

1. NO INVENTION: use only Arzdar facts. Missing = [TO BE PROVIDED BY COMPLAINANT]
2. CORRECT NAME: "Commission" not "Forum" (CPA 2019)
3. CORRECT SECTIONS for this case:
`;

  if (domain === 'CONSUMER' || domain.includes('consumer')) {
    rules += `   - Section 2(7): consumer definition (always)
   - Section 2(10): defect in goods OR Section 2(11): deficiency in service (pick correct one)
   - Section 34: jurisdiction + pecuniary limit (always)
   - Section 35: manner of filing (always)
   - Section 38(6): affidavit mandatory (always)
   - Section 69: 2-year limitation (always)
   - Section 39: relief powers (always)
   - Section 83: product liability action (if product involved)
`;
    if (parties.some(p => p.liabilityType === 'product_manufacturer')) {
      rules += `   - Section 84: manufacturer liability (YES, manufacturer named: ${parties.find(p => p.liabilityType === 'product_manufacturer')?.name})\n`;
    }
    if (parties.some(p => p.liabilityType === 'product_seller')) {
      rules += `   - Section 86: product seller liability (YES, marketplace named: ${parties.find(p => p.liabilityType === 'product_seller')?.name})\n`;
    }
    rules += `   - NEVER cite Section 36 or Section 89\n`;
  } else if (domain === 'RERA' || domain.includes('rera')) {
    rules += `   - Section 18: delay compensation (PRIMARY, always)
   - Section 19(3) + 19(4): allottee rights (secondary)
   - Section 31: jurisdiction (always)
   - Section 71: adjudication power (always)
   - Section 4(2)(l)(D): escrow obligation (if delay > 3 months)
   - NEVER cite Section 19 alone or Section 11(1)(b)
`;
  } else if (domain === 'RTI' || domain.includes('rti')) {
    rules += `   - Section 6(1): filing basis (always)
   - Section 7(1): 30-day deadline (always)
   - Section 20: penalty deterrent (always)
   - Section 19(1) + 19(3): appeal rights (always)
   - NEVER cite Section 21
`;
  }

  rules += `
4. ALL PARTIES: name every party from the opposite parties list
5. DATES: check timeline is chronologically logical before writing
6. RELIEF: specific amounts only, never vague language
7. AFFIDAVIT: mandatory last section before annexures
`;

  return rules;
}
