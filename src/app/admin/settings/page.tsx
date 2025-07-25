import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
       <div>
            <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground">
                Manage your site settings and configurations.
            </p>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Tour Categories</CardTitle>
                <CardDescription>
                    Manage the categories available for tours. This feature is coming soon.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    The ability to add, edit, and delete tour categories will be available here.
                </p>
            </CardContent>
        </Card>
    </div>
  );
}
