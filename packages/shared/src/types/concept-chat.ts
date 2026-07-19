// On-the-fly concept chat DTOs (always-available AI persona = the concept's originator).
// Stateless on the server: the client holds the persona + transcript in memory and sends
// them back each turn. No persistence, no scheduling, no peer pool.

export interface ConceptPersonaDTO {
  /** Historical originator/pioneer most associated with the concept. */
  name: string;
  /** One short sentence: who they are + key contribution (verified via Wikipedia). */
  description: string;
  /** Real portrait (Wikimedia Commons thumbnail) when available; monogram fallback otherwise. */
  portraitUrl?: string;
}

export interface ConceptChatMessageDTO {
  role: 'user' | 'assistant';
  content: string;
}

export interface StartConceptChatRequest {
  conceptLabel: string;
  /** Optional learning context (level + related concepts/field) to disambiguate + tailor. */
  context?: string;
}

export interface StartConceptChatResponse {
  persona: ConceptPersonaDTO;
  /** In-character opening line from the persona. */
  greeting: string;
}

export interface SendConceptChatRequest {
  conceptLabel: string;
  /** Prior turns (excluding the new message), oldest first. */
  history: ConceptChatMessageDTO[];
  message: string;
}

export interface SendConceptChatResponse {
  reply: string;
}
