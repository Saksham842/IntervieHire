// The active, ordered question set an interview session runs against.
//
// Every caller (interview-conversation, evaluation, aviral-evaluation) eager-loads
// `jobRole.questions` with `{ where: { isActive: true }, orderBy: { createdAt: 'asc' } }`,
// so this returns that set. It re-filters `isActive` and re-sorts by `createdAt`
// defensively, so the question order is stable even if a future caller forgets to
// scope the include. Generic in the element type so callers keep the precise
// Prisma `Question` type (and their existing `as unknown as ...` casts) intact.

interface QuestionLike {
  isActive?: boolean;
  createdAt?: Date | string | number;
}

export function getEffectiveQuestions<T extends QuestionLike>(
  session: { jobRole?: { questions?: T[] | null } | null } | null | undefined,
): T[] {
  const questions = session?.jobRole?.questions ?? [];
  return [...questions]
    .filter((q) => q.isActive !== false)
    .sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
}
