"use client";

import { HomePageEditorForm } from "@/components/admin/home-page-editor/editor";

export const dynamic = "force-dynamic";

export default function HomePageEditor() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Home Page Editor</h2>
        <p className="text-muted-foreground">
          Modify sections of the main home page. Click &quot;Save Changes&quot;
          at the bottom to commit your updates.
        </p>
      </div>
      <HomePageEditorForm />
    </div>
  );
}