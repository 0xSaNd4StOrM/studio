import { getContactMessages, updateContactMessageStatus } from "@/lib/supabase/contact-messages";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ContactMessagesPage() {
  const messages = await getContactMessages();

  const markRead = async (id: string) => {
    "use server";
    await updateContactMessageStatus(id, "read");
  };

  const archive = async (id: string) => {
    "use server";
    await updateContactMessageStatus(id, "archived");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Contact Messages</h2>
        <p className="text-muted-foreground">
          Inbox for messages submitted from the Contact page.
        </p>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 text-muted-foreground">
          No messages yet.
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.status}</TableCell>
                  <TableCell>{m.name}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell className="max-w-[260px] truncate">
                    {m.subject || "—"}
                  </TableCell>
                  <TableCell>
                    {m.createdAt ? new Date(m.createdAt).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {m.status !== "read" && (
                      <form action={markRead.bind(null, m.id)} className="inline">
                        <Button type="submit" variant="outline" size="sm">
                          Mark read
                        </Button>
                      </form>
                    )}
                    {m.status !== "archived" && (
                      <form action={archive.bind(null, m.id)} className="inline">
                        <Button type="submit" variant="secondary" size="sm">
                          Archive
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

