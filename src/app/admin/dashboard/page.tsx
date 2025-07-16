import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
import { DollarSign, Package, ShoppingCart } from 'lucide-react';
  

const recentBookings = [
    {
      user: "Olivia Martin",
      email: "olivia.martin@email.com",
      tour: "Pyramids & Sphinx Expedition",
      amount: "$180.00",
    },
    {
      user: "Jackson Lee",
      email: "jackson.lee@email.com",
      tour: "Nile Cruise from Aswan",
      amount: "$500.00",
    },
    {
      user: "Isabella Nguyen",
      email: "isabella.nguyen@email.com",
      tour: "Red Sea Diving Adventure",
      amount: "$560.00",
    },
    {
      user: "William Kim",
      email: "will@email.com",
      tour: "Luxor: Valley of the Kings",
      amount: "$240.00",
    },
    {
      user: "Sofia Davis",
      email: "sofia.davis@email.com",
      tour: "Hurghada Beach Getaway",
      amount: "$360.00",
    },
]

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">$45,231.89</div>
                    <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">+2350</div>
                    <p className="text-xs text-muted-foreground">+180.1% from last month</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Tours</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">+19</div>
                    <p className="text-xs text-muted-foreground">Total tours available</p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
                <CardDescription>A list of the most recent tour bookings.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Tour</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentBookings.map((booking, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <div className="font-medium">{booking.user}</div>
                                    <div className="text-sm text-muted-foreground">{booking.email}</div>
                                </TableCell>
                                <TableCell>{booking.tour}</TableCell>
                                <TableCell className="text-right">{booking.amount}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}