/** [placeId, yes votes, vetoed (1) or not (0)] */
export type ResultRow = [string, number, number];
export type Result = { r: ResultRow[]; tie: string[]; w: string | null; n: number };
export type Voter = { swipes: string; veto: string | null };

/**
 * Works out the winner.
 * Vetoed places are out. Most yes votes wins. A tie (up to 8 places) goes to the wheel,
 * and the winner is picked here so every phone spins to the same answer.
 */
export function computeResult(ids: string[], voters: Voter[], random: () => number = Math.random): Result {
  const vetoed = new Set(voters.map((v) => v.veto).filter((id): id is string => !!id && ids.includes(id)));
  const r: ResultRow[] = ids.map((id, i) => [
    id,
    voters.reduce((s, v) => s + ((v.swipes || "")[i] === "1" ? 1 : 0), 0),
    vetoed.has(id) ? 1 : 0,
  ]);
  r.sort((a, b) => a[2] - b[2] || b[1] - a[1]);
  const alive = r.filter((x) => !x[2]);
  if (!alive.length) return { r, tie: [], w: null, n: voters.length };
  const top = alive[0][1];
  const tie = alive.filter((x) => x[1] === top).map((x) => x[0]).slice(0, 8);
  return { r, tie, w: tie[Math.floor(random() * tie.length)], n: voters.length };
}

export function isResult(x: unknown): x is Result {
  const o = x as Result;
  return !!o && Array.isArray(o.r) && Array.isArray(o.tie) && typeof o.n === "number";
}
