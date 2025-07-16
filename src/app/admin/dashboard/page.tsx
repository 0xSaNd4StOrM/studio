import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AdminDashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome, Admin!</CardTitle>
        <CardDescription>
          This is your control panel. You can manage tours, bookings, and users
          from here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Dashboard content will go here.</p>
      </CardContent>
    </Card>
  );
}
