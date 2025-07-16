import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function CheckoutSuccessPage() {
  return (
    <div className="flex items-center justify-center py-20">
      <Card className="max-w-md w-full text-center p-8">
        <CardContent className="space-y-6">
          <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto" />
          <h1 className="font-headline text-4xl font-bold text-primary">Order Successful!</h1>
          <p className="text-muted-foreground">
            Thank you for booking with Wanderlust Hub! A confirmation email is on its way to you.
            We can't wait to see you on your next adventure.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href="/">Continue Exploring</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
