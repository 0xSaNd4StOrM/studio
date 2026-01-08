import { createClient } from "@/lib/supabase/client";
import type { Tour } from "@/types";

// Client-safe fetcher for minimal tour data used in selects.
// Avoids importing server-only modules into client components.
export async function getToursSelect(): Promise<Array<Pick<Tour, "id" | "name" | "destination">>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tours")
    .select("id, name, destination")
    .order("name", { ascending: true });
  if (error) {
    console.error("Error fetching tours (select):", error);
    return [];
  }
  return (data ?? []) as Array<Pick<Tour, "id" | "name" | "destination">>;
}
