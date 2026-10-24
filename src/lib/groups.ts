import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaceSummary } from "./api";
import type { Result } from "./results";
import type { GroupSettings } from "./store";
import { ensureSignedIn, supabase } from "./supabase";

export type GroupRow = {
  code: string;
  host_id: string;
  status: "lobby" | "swiping" | "results";
  settings: GroupSettings;
  deck: PlaceSummary[];
  ends_at: string | null;
  result: Result | null;
  created_at: string;
};

export type MemberRow = {
  group_code: string;
  user_id: string;
  name: string;
  diets: string[];
  swipes: string;
  veto: string | null;
  done: boolean;
  joined_at: string;
};

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I or O, they look like 1 and 0
const makeCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join("");
export const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);

function fail(action: string, e: { message?: string } | null): never {
  throw new Error(`Couldn't ${action}. ${e?.message ?? ""}`.trim());
}

export async function createGroup(name: string, diets: string[], settings: GroupSettings): Promise<string> {
  const uid = await ensureSignedIn();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const { error } = await supabase.from("groups").insert({ code, host_id: uid, settings, status: "lobby" });
    if (error?.code === "23505") continue; // code already taken, try another
    if (error) fail("create the group", error);
    const m = await supabase.from("members").insert({ group_code: code, user_id: uid, name, diets });
    if (m.error) fail("add you to the group", m.error);
    return code;
  }
  throw new Error("Couldn't find a free group code. Try again.");
}

export async function joinGroup(code: string, name: string, diets: string[]) {
  const uid = await ensureSignedIn();
  const { data, error } = await supabase.from("groups").select("code,status").eq("code", code).maybeSingle();
  if (error) fail("look up that group", error);
  if (!data) throw new Error(`There's no group ${code}. Check the code with whoever set it up.`);
  if (data.status === "results") throw new Error(`Group ${code} has already picked a place.`);
  const up = await supabase
    .from("members")
    .upsert({ group_code: code, user_id: uid, name, diets }, { onConflict: "group_code,user_id" });
  if (up.error) fail("join the group", up.error);
}

export async function leaveGroup(code: string) {
  const uid = await ensureSignedIn();
  await supabase.from("members").delete().eq("group_code", code).eq("user_id", uid);
}

export async function startGroup(code: string, deck: PlaceSummary[], minutes: number) {
  const ends_at = new Date(Date.now() + minutes * 60_000).toISOString();
  const { error } = await supabase.from("groups").update({ status: "swiping", deck, ends_at }).eq("code", code);
  if (error) fail("start voting", error);
}

export async function saveVotes(code: string, swipes: string, veto: string | null, done: boolean) {
  const uid = await ensureSignedIn();
  const { error } = await supabase
    .from("members")
    .update({ swipes, veto, done })
    .eq("group_code", code)
    .eq("user_id", uid);
  if (error) fail("save your swipes", error);
}

export async function finishGroup(code: string, result: Result) {
  const { error } = await supabase.from("groups").update({ status: "results", result }).eq("code", code);
  if (error) fail("save the result", error);
}

/** Live view of one group: updates instantly through Supabase Realtime, with a slow poll as a backup. */
export function useGroup(code: string) {
  const [group, setGroup] = useState<GroupRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    const [g, m] = await Promise.all([
      supabase.from("groups").select("*").eq("code", code).maybeSingle(),
      supabase.from("members").select("*").eq("group_code", code).order("joined_at"),
    ]);
    if (!alive.current) return;
    if (g.error || m.error) {
      setError((g.error ?? m.error)?.message ?? "Couldn't load the group.");
      return;
    }
    setError(null);
    setGroup((g.data as GroupRow) ?? null);
    setMembers((m.data as MemberRow[]) ?? []);
    setLoaded(true);
  }, [code]);

  useEffect(() => {
    alive.current = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    ensureSignedIn()
      .then((uid) => {
        if (!alive.current) return;
        setMe(uid);
        load();
        channel = supabase
          .channel(`group-${code}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "groups", filter: `code=eq.${code}` }, load)
          .on("postgres_changes", { event: "*", schema: "public", table: "members", filter: `group_code=eq.${code}` }, load)
          .subscribe();
        poll = setInterval(load, 5000);
      })
      .catch((e) => setError(e.message));
    return () => {
      alive.current = false;
      if (channel) supabase.removeChannel(channel);
      if (poll) clearInterval(poll);
    };
  }, [code, load]);

  return { group, members, me, error, loaded, reload: load };
}
