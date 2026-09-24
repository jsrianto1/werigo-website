import "server-only";
import transcripts from "./sagaTranscripts.json";
import type { SagaEpisode } from "./saga";

export interface SagaTranscriptBeat {
  label: string;
  text: string;
  lines: { who: string; text: string }[];
}

/** English transcript of an episode (server only, keeps the JSON out of client bundles). */
export function getTranscript(episode: SagaEpisode): SagaTranscriptBeat[] {
  return (transcripts as Record<string, SagaTranscriptBeat[]>)[String(episode.number)] ?? [];
}
