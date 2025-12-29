"use server";

import { createClient } from "@/lib/supabase/server";
import type { ContactMessage, ContactMessageStatus } from "@/types";
import { revalidatePath } from "next/cache";
import { toCamelCase } from "@/lib/utils";

export async function createContactMessage(input: {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    subject: input.subject ?? null,
    message: input.message,
    status: "new",
  });

  if (error) {
    throw new Error("Failed to create contact message.");
  }

  revalidatePath("/admin/contact-messages");
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown[]).map((row) => toCamelCase(row)) as ContactMessage[];
}

export async function updateContactMessageStatus(
  id: string,
  status: ContactMessageStatus,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_messages")
    .update({ status })
    .eq("id", id);

  if (error) {
    throw new Error("Failed to update contact message status.");
  }

  revalidatePath("/admin/contact-messages");
}

