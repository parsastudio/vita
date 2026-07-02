import { Card as FSRSCard, State as FSRSState, createEmptyCard } from "ts-fsrs";
import { LanguageCard } from "./db/client";

export function createNewFSRSCard(): Omit<
  LanguageCard,
  | "id"
  | "userId"
  | "originalText"
  | "translation"
  | "focusWord"
  | "srsStatus"
  | "createdAt"
  | "updatedAt"
  | "synced"
> {
  const empty = createEmptyCard();
  return {
    due: empty.due,
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsedDays: empty.elapsed_days,
    scheduledDays: empty.scheduled_days,
    reps: empty.reps,
    lapses: empty.lapses,
    state: empty.state,
    lastReview: empty.last_review || null,
  };
}

export function mapToFSRSCard(card: LanguageCard): FSRSCard {
  return {
    due: new Date(card.due),
    stability: Number(card.stability),
    difficulty: Number(card.difficulty),
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as FSRSState,
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  };
}

export function mapFromFSRSCard(
  fsrsCard: FSRSCard,
): Pick<
  LanguageCard,
  | "due"
  | "stability"
  | "difficulty"
  | "elapsedDays"
  | "scheduledDays"
  | "reps"
  | "lapses"
  | "state"
  | "lastReview"
> {
  return {
    due: fsrsCard.due,
    stability: fsrsCard.stability,
    difficulty: fsrsCard.difficulty,
    elapsedDays: fsrsCard.elapsed_days,
    scheduledDays: fsrsCard.scheduled_days,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    state: fsrsCard.state,
    lastReview: fsrsCard.last_review || null,
  };
}
