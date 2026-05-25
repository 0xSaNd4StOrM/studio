'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { Tour } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ArrowUp, ArrowDown, ChevronsUpDown, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { deleteTour } from '@/lib/supabase/tours';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const TourActions = ({ tour }: { tour: Tour }) => {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this tour? This action cannot be undone.')) {
      startTransition(async () => {
        try {
          await deleteTour(tour.id);
          router.refresh();
          toast({
            title: 'Tour deleted',
            description: 'The tour has been successfully deleted.',
          });
        } catch (error) {
          console.error('Failed to delete tour:', error);
          const message =
            error instanceof Error
              ? error.message
              : typeof error === 'string'
                ? error
                : 'Failed to delete tour.';
          toast({
            title: 'Error',
            description: message,
            variant: 'destructive',
          });
        }
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={`/admin/tours/${tour.slug}/edit`}>Edit Tour</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/tours/${tour.slug}`} target="_blank">
            View on Site
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(tour.slug)}>
          Copy Slug
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={isPending}
          className="text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          {isPending ? 'Deleting...' : 'Delete Tour'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const columns: ColumnDef<Tour>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4 h-8 data-[state=open]:bg-accent"
        >
          <span>Name</span>
          {column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      const tour = row.original;
      return (
        <div className="flex flex-col">
          <Link
            href={`/tours/${tour.slug}`}
            target="_blank"
            className="font-medium text-foreground hover:underline hover:text-primary transition-colors truncate max-w-[200px] sm:max-w-[300px]"
            title={row.getValue('name')}
          >
            {row.getValue('name')}
          </Link>
          <span className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
            {tour.slug}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'destination',
    header: 'Destination',
    cell: ({ row }) => {
      const tour = row.original;
      const list =
        Array.isArray(tour.destinations) && tour.destinations.length > 0
          ? tour.destinations
          : tour.destination
            ? [tour.destination]
            : [];
      const display = list.length > 1 ? list.join(' · ') : list[0] ?? '';
      return (
        <div
          className="flex items-center gap-2"
          title={list.length > 1 ? list.join(', ') : undefined}
        >
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate">{display}</span>
          {list.length > 1 && (
            <span className="text-xs text-muted-foreground shrink-0">+{list.length - 1}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'type',
    header: 'Categories',
    cell: ({ row }) => {
      const categories = row.getValue('type') as string[];
      const displayLimit = 2;
      const displayed = categories.slice(0, displayLimit);
      const remaining = categories.length - displayLimit;

      return (
        <div className="flex flex-wrap gap-1 items-center">
          {displayed.map((category) => (
            <Badge key={category} variant="secondary" className="rounded-sm font-normal text-xs">
              {category}
            </Badge>
          ))}
          {remaining > 0 && (
            <Badge
              variant="outline"
              className="rounded-sm font-normal text-xs text-muted-foreground"
            >
              +{remaining}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'duration',
    header: 'Duration',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>{row.getValue('duration')} days</span>
      </div>
    ),
  },
  {
    accessorKey: 'priceTiers',
    header: () => <div className="text-right">Starting Price</div>,
    cell: ({ row }) => {
      const tour = row.original;
      const priceTiers = row.getValue('priceTiers') as Tour['priceTiers'];

      let startingPrice: number | undefined;
      if (priceTiers && priceTiers.length > 0) {
        startingPrice = priceTiers[0]?.pricePerAdult;
      } else if (tour.packages && tour.packages.length > 0) {
        // Tours using the packages model — find the lowest adult price across all packages
        const allPrices = tour.packages.flatMap((p) => p.priceTiers.map((t) => t.pricePerAdult));
        startingPrice = allPrices.length > 0 ? Math.min(...allPrices) : undefined;
      }

      if (startingPrice === undefined || isNaN(startingPrice)) {
        return <div className="text-right text-muted-foreground">—</div>;
      }

      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(startingPrice);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'availability',
    header: 'Status',
    cell: ({ row }) => {
      const isAvailable = row.getValue('availability');
      return (
        <div
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            isAvailable
              ? 'border-transparent bg-green-500/15 text-green-700 hover:bg-green-500/25'
              : 'border-transparent bg-destructive/15 text-destructive hover:bg-destructive/25'
          )}
        >
          {isAvailable ? 'Active' : 'Draft'}
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const tour = row.original;
      return <TourActions tour={tour} />;
    },
  },
];
