# Requirements Document

## Introduction

AI Vakeel is an agent swarm system for generating Indian legal documents (complaints). It uses five specialized agents — collectively called "Vakeel Panch" — that run in sequence to intake a user's legal problem, route it to the correct legal domain, research relevant law sections, draft a formal complaint, and review the output for quality. The system supports Consumer Protection Act 2019, RERA Act 2016, and RTI Act 2005 domains.

The application is built with Next.js (App Router), TypeScript, Tailwind CSS, OpenRouter API for LLM inference, Supabase for vector storage (pgvector) and session persistence, and Server-Sent Events for real-time agent progress streaming.

## Glossary

- **Agent_Swarm**: The orchestration system that runs five specialized agents in sequence to produce a legal complaint document
- **Arzdar**: The Intake Agent that listens to the user's problem description and extracts key facts
- **Vivechak**: The Router Agent that determines which legal domain and forum applies to the user's case
- **Shodhak**: The Research Agent that performs RAG (Retrieval-Augmented Generation) to pull relevant legal sections from the knowledge base
- **Munshi**: The Draft Agent that writes the formal complaint document using extracted facts and researched legal sections
- **Nyayadoot**: The Review Agent that reviews the draft, flags missing clauses, and produces a quality score
- **Knowledge_Base**: Supabase pgvector store containing legal texts from Consumer Protection Act 2019, RERA Act 2016, and RTI Act 2005 as vector embeddings
- **Session**: A persistent record of a user's interaction stored in Supabase, including all agent outputs and the final document
- **Quality_Score**: A numerical score (0-100) produced by Nyayadoot indicating the completeness and correctness of the generated complaint
- **SSE_Stream**: Server-Sent Events connection that streams real-time agent status updates and outputs to the client UI
- **OpenRouter_Client**: The HTTP client that sends LLM inference requests to the OpenRouter API
- **Legal_Domain**: One of the three supported areas of law — Consumer Protection Act 2019, RERA Act 2016, or RTI Act 2005

## Requirements

### Requirement 1: User Problem Intake

**User Story:** As a user, I want to describe my legal problem in natural language (English or Hindi), so that the system can understand my situation and generate a complaint.

#### Acceptance Criteria

1. WHEN a user submits a problem description between 50 and 5000 characters, THE Arzdar SHALL extract facts into the following fields: complainant name, respondent name, incident dates, grievance summary, and relief sought
2. WHEN a user submits a problem description in Hindi, THE Arzdar SHALL process the Hindi input and extract the same set of defined fields as for English input without requiring the user to translate
3. IF the problem description lacks one or more essential facts (complainant name, respondent name, grievance summary, or relief sought), THEN THE Arzdar SHALL prompt the user with a specific question identifying the missing field, up to a maximum of 3 follow-up prompts
4. IF the user has not provided all essential facts after 3 follow-up prompts, THEN THE Arzdar SHALL proceed with the available facts and mark the missing fields as "not provided" in the output
5. WHEN fact extraction is complete, THE Arzdar SHALL produce a structured JSON output within 30 seconds containing the fields: complainant name, respondent name, incident dates, grievance summary, relief sought, and original language of input
6. IF the submitted problem description is fewer than 50 characters or exceeds 5000 characters, THEN THE Arzdar SHALL reject the input and display a message indicating the acceptable length range

### Requirement 2: Legal Domain Routing

**User Story:** As a user, I want the system to automatically determine which law and forum applies to my case, so that the correct legal framework is used for my complaint.

#### Acceptance Criteria

1. WHEN the Arzdar output is received, THE Vivechak SHALL classify the case into exactly one Legal_Domain: Consumer Protection Act 2019, RERA Act 2016, or RTI Act 2005, and assign a confidence score between 0.0 and 1.0 indicating classification certainty
2. WHEN the Vivechak classifies a case under Consumer Protection Act 2019, THE Vivechak SHALL select the forum based on the claimed compensation value: District Forum for claims up to ₹1 crore, State Commission for claims above ₹1 crore and up to ₹10 crore, and National Commission for claims above ₹10 crore
3. WHEN the Vivechak classifies a case under RERA Act 2016, THE Vivechak SHALL select the RERA Authority of the state where the real estate project is located as the forum
4. WHEN the Vivechak classifies a case under RTI Act 2005, THE Vivechak SHALL select the Public Information Officer of the relevant public authority as the forum
5. IF the classification confidence score is below 0.5, THEN THE Vivechak SHALL flag the case for user confirmation and present the top classification along with its confidence score before proceeding
6. WHEN classification is complete with a confidence score of 0.5 or above, THE Vivechak SHALL produce a structured JSON output containing the selected Legal_Domain, forum, and confidence score and pass it to the next agent without user intervention

### Requirement 3: Legal Research via RAG

**User Story:** As a user, I want the system to find relevant legal sections and precedents for my case, so that my complaint references the correct laws.

#### Acceptance Criteria

1. WHEN the Vivechak output is received, THE Shodhak SHALL query the Knowledge_Base using vector similarity search with the extracted facts and classified Legal_Domain
2. THE Shodhak SHALL retrieve a minimum of 3 and maximum of 10 legal sections from the Knowledge_Base per query, selecting only sections with a similarity score above 0.7
3. IF fewer than 3 sections meet the 0.7 similarity threshold, THEN THE Shodhak SHALL lower the threshold in 0.05 decrements until at least 3 sections are retrieved or a minimum threshold of 0.5 is reached
4. WHEN relevant sections are retrieved, THE Shodhak SHALL rank the sections by similarity score in descending order
5. WHEN research is complete, THE Shodhak SHALL produce a structured JSON output containing the retrieved legal sections, their source references (act name, section number, and chapter), and similarity scores
6. IF the Knowledge_Base is unavailable or returns an error, THEN THE Shodhak SHALL retry the query up to 2 additional times, and if all retries fail, SHALL halt execution and report the failure to the Agent_Swarm with an error indication specifying the Knowledge_Base as the failing dependency

### Requirement 4: Complaint Document Drafting

**User Story:** As a user, I want the system to generate a properly formatted legal complaint document, so that I can file it with the appropriate authority.

#### Acceptance Criteria

1. WHEN the Shodhak output is received, THE Munshi SHALL generate a complaint document in English following the format for the identified Legal_Domain and forum within 30 seconds of receiving the input
2. THE Munshi SHALL include all extracted facts from Arzdar, the forum details from Vivechak, and relevant legal sections from Shodhak in the complaint document, producing the output as structured text (markdown)
3. THE Munshi SHALL structure the complaint with: header (forum name, case parties, date, case number placeholder), body (facts in numbered paragraphs, legal grounds with section references), prayer clause (specific relief sought), and verification section (declaration by complainant)
4. WHEN the Legal_Domain is Consumer Protection Act 2019, THE Munshi SHALL format the complaint as per the Consumer Disputes Redressal Commission format including: complainant and opposite party details, jurisdiction statement, facts of the case, legal grounds citing specific sections of the Act, relief claimed with monetary amounts where applicable, and verification affidavit section
5. WHEN the Legal_Domain is RERA Act 2016, THE Munshi SHALL format the complaint as per the RERA Authority complaint format including: project and promoter details, allottee details, RERA registration number placeholder, chronological facts, violations cited with specific RERA sections, and relief sought
6. WHEN the Legal_Domain is RTI Act 2005, THE Munshi SHALL format the document as an RTI application addressed to the Public Information Officer including: applicant details, subject line, specific information sought as numbered items, period for which information is requested, and preferred mode of receiving information
7. IF the Shodhak output is missing or contains no legal sections, THEN THE Munshi SHALL halt document generation and return an error indication specifying that legal research data is unavailable
8. IF the user's original problem description was submitted in Hindi, THEN THE Munshi SHALL generate the complaint document in English with a Hindi translation of the prayer clause

### Requirement 5: Document Quality Review

**User Story:** As a user, I want the generated complaint to be reviewed for completeness and correctness, so that I can be confident in its quality before filing.

#### Acceptance Criteria

1. WHEN the Munshi output is received, THE Nyayadoot SHALL review the complaint document against a checklist of required elements for the identified Legal_Domain, verifying presence of: header with forum and parties, statement of facts, legal grounds with section references, prayer clause, and verification section
2. WHEN the review is performed, THE Nyayadoot SHALL produce a Quality_Score between 0 and 100 by evaluating four categories: completeness of required sections (all checklist elements present), legal reference validity (cited sections belong to the identified Legal_Domain), formatting compliance (document follows the structure defined for the Legal_Domain forum), and factual consistency (facts from Arzdar output are accurately reflected in the complaint)
3. IF the Quality_Score is below 70, THEN THE Nyayadoot SHALL flag a maximum of 10 specific issues, each identifying the affected section, the type of deficiency (missing element, incorrect reference, formatting error, or factual inconsistency), and a suggested correction
4. IF the Quality_Score is 70 or above, THEN THE Nyayadoot SHALL mark the document as approved with no required changes
5. WHEN the review is complete, THE Nyayadoot SHALL produce a structured JSON output containing the Quality_Score, the approval status (approved if score is 70 or above, needs revision if below 70), the list of flagged issues (empty list if approved), and the final document

### Requirement 6: Agent Orchestration Pipeline

**User Story:** As a developer, I want the five agents to execute in a defined sequence with proper data passing, so that each agent receives the correct input from the previous agent.

#### Acceptance Criteria

1. THE Agent_Swarm SHALL execute agents in the fixed order: Arzdar → Vivechak → Shodhak → Munshi → Nyayadoot
2. WHEN an agent completes execution, THE Agent_Swarm SHALL validate that the agent's output is well-formed JSON conforming to that agent's expected schema, and pass it as input to the next agent in the sequence
3. IF any agent fails due to LLM timeout after retries are exhausted, produces output that fails JSON schema validation after 1 re-prompt attempt, or throws an unhandled exception, THEN THE Agent_Swarm SHALL halt the pipeline, record the error in the Session including the failing agent name, error category, and error description, and notify the user within 2 seconds of failure detection
4. THE Agent_Swarm SHALL record each agent's input, output, and execution duration (in milliseconds) in the Session for auditability
5. WHEN the Nyayadoot agent completes execution successfully, THE Agent_Swarm SHALL mark the pipeline as complete in the Session and emit the final document to the client
6. IF the total pipeline execution time exceeds 5 minutes, THEN THE Agent_Swarm SHALL halt the pipeline, record a timeout error in the Session, and notify the user indicating which agent was executing when the timeout occurred

### Requirement 7: Real-Time Agent Progress Streaming

**User Story:** As a user, I want to see each agent's status (Waiting, Running, Done) in real time, so that I understand the progress of my complaint generation.

#### Acceptance Criteria

1. WHEN the pipeline starts, THE SSE_Stream SHALL emit an initial event containing all five agents with "Waiting" status within 500ms of pipeline initiation
2. WHEN an agent begins execution, THE SSE_Stream SHALL emit a status update event changing that agent's status to "Running" within 500ms of execution start
3. WHEN an agent completes execution, THE SSE_Stream SHALL emit a status update event changing that agent's status to "Done" within 500ms of completion, including a text summary of the agent's key output limited to 200 characters
4. WHILE the pipeline is executing, THE SSE_Stream SHALL maintain the connection without timeout for pipelines completing within 5 minutes
5. IF the pipeline execution exceeds 5 minutes, THEN THE SSE_Stream SHALL close the connection and emit a final event indicating a timeout occurred along with the last known status of each agent
6. IF an agent encounters an unrecoverable error during execution, THEN THE SSE_Stream SHALL emit a status update event changing that agent's status to "Error" and include a description of the failure reason within 500ms of the error occurrence

### Requirement 8: Agent Output Visualization

**User Story:** As a user, I want to view each agent's individual output in the UI, so that I can understand what each agent contributed to the final document.

#### Acceptance Criteria

1. THE UI SHALL display all five agents as distinct cards in pipeline order (Arzdar, Vivechak, Shodhak, Munshi, Nyayadoot), each showing the agent name, a status indicator (Waiting, Running, or Done), and a collapsible output section that is collapsed by default
2. WHEN an agent's status changes to "Done", THE UI SHALL make that agent's output section expandable and display a summary of the agent's output limited to a maximum of 200 characters, truncated with an ellipsis if longer
3. WHEN the user expands an agent card, THE UI SHALL display the full structured JSON output of that agent with key-value pairs presented as labeled fields, preserving hierarchy and rendering text content with line breaks and paragraph separation
4. WHEN the Nyayadoot agent's status changes to "Done", THE UI SHALL display the final complaint document in a dedicated section separate from the agent cards, with headings, paragraphs, and legal section references rendered as formatted text
5. IF an agent's status indicates an error, THEN THE UI SHALL display the agent card with an error status indicator and show the error description within the card without making the output section expandable

### Requirement 9: Document Export

**User Story:** As a user, I want to download or copy the generated complaint document, so that I can use it for filing.

#### Acceptance Criteria

1. WHEN the pipeline completes successfully, THE UI SHALL display both a download button and a copy button adjacent to the final complaint document
2. WHEN the user clicks the download button, THE UI SHALL generate and download the complaint as a PDF file preserving headings, numbered paragraphs, and legal section formatting
3. WHEN the user clicks the copy button, THE UI SHALL copy the complaint text to the system clipboard and display a confirmation message visible for 3 seconds
4. IF PDF generation fails, THEN THE UI SHALL display an error message and offer a plain text download as a fallback
5. THE UI SHALL display the Quality_Score as a numerical badge (0-100) alongside the final document with color coding: green for 70 and above, yellow for 50-69, red for below 50

### Requirement 10: Session Persistence

**User Story:** As a user, I want my complaint generation sessions to be saved, so that I can return to view previous results.

#### Acceptance Criteria

1. WHEN a pipeline execution begins, THE Session SHALL be created in Supabase with a UUID identifier, ISO 8601 UTC timestamp, the user's original problem description, and a status of "in_progress"
2. WHEN each agent completes, THE Session SHALL be updated by appending that agent's structured JSON output to the session record in Supabase within 3 seconds of agent completion
3. IF the pipeline halts due to an agent error, THEN THE Session SHALL be updated with a status of "failed" and the session SHALL remain viewable with all agent outputs collected up to the point of failure
4. WHEN a user navigates to the session history page, THE UI SHALL display a list of previous sessions sorted by most recent first, showing each session's timestamp, status, and a case summary derived from the first 150 characters of the original problem description
5. WHEN a user selects a previous session, THE UI SHALL display all available agent outputs in the same card layout used during live execution and the final complaint document if the pipeline completed successfully
6. THE UI SHALL display a maximum of 20 sessions per page with pagination controls to access older sessions

### Requirement 11: OpenRouter LLM Integration

**User Story:** As a developer, I want all LLM calls to go through OpenRouter API, so that the system uses a unified inference endpoint with configurable model selection.

#### Acceptance Criteria

1. THE OpenRouter_Client SHALL send all LLM inference requests to the OpenRouter API endpoint using the configured API key and include the configured model identifier in each request
2. WHEN sending a request, THE OpenRouter_Client SHALL enforce a maximum request token limit of 4096 tokens for input messages and accept responses up to 4096 tokens
3. IF the OpenRouter API returns a server error (5xx) or the request times out after 60 seconds, THEN THE OpenRouter_Client SHALL retry the request up to 2 additional times with exponential backoff starting at 1 second delay and doubling each retry
4. IF the OpenRouter API returns a client error (4xx) other than rate limiting (429), THEN THE OpenRouter_Client SHALL not retry and SHALL propagate the error to the calling agent immediately
5. IF all retry attempts are exhausted without a successful response, THEN THE OpenRouter_Client SHALL return an error to the calling agent indicating the failure reason and the number of attempts made
6. THE OpenRouter_Client SHALL pass agent-specific system prompts and user messages as structured chat completion requests containing a system message and one or more user/assistant messages
7. IF the OpenRouter API returns a rate limit response (429), THEN THE OpenRouter_Client SHALL wait for the duration indicated in the response retry-after header before retrying, up to a maximum wait of 30 seconds

### Requirement 12: Knowledge Base Vector Search

**User Story:** As a developer, I want legal texts stored as vector embeddings in Supabase, so that the Shodhak agent can perform semantic search over the legal knowledge base.

#### Acceptance Criteria

1. THE Knowledge_Base SHALL store legal text chunks of 200 to 1000 tokens each, with 50-token overlap between consecutive chunks, from Consumer Protection Act 2019, RERA Act 2016, and RTI Act 2005 as vector embeddings in Supabase pgvector
2. THE Knowledge_Base SHALL support similarity search queries that return a maximum of 20 text chunks ranked by cosine similarity score in descending order
3. THE Knowledge_Base SHALL store metadata with each embedding including: source act name, section number, chapter, and original text content
4. WHEN a similarity search is performed, THE Knowledge_Base SHALL return results within 2 seconds for queries against the full legal corpus
5. IF a similarity search returns no results above the requested similarity threshold or the vector search operation fails, THEN THE Knowledge_Base SHALL return an empty result set with a status indicator distinguishing between "no matches found" and "search error"
