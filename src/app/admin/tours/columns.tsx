"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Tour } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { deleteTour } from "@/lib/supabase/tours";
import { useTransition } from "react";
import { useToast } from "@/hooks/use-toast";

const TourActions = ({ tour }: { tour: Tour }) => {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this tour? This action cannot be undone.")) {
      startTransition(async () => {
        try {
          await deleteTour(tour.id);
          toast({
            title: "Tour deleted",
            description: "The tour has been successfully deleted.",
          });
        } catch (error) {
          console.error("Failed to delete tour:", error);
          toast({
            title: "Error",
            description: "Failed to delete tour.",
            variant: "destructive",
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
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(tour.slug)}
        >
          Copy Slug
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={isPending}
          className="text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          {isPending ? "Deleting..." : "Delete Tour"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const columns: ColumnDef<Tour>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
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
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const tour = row.original;
      return (
        <Link
          href={`/tours/${tour.slug}`}
          target="_blank"
          className="font-medium text-primary hover:underline"
        >
          {row.getValue("name")}
        </Link>
      );
    },
  },
  {
    accessorKey: "destination",
    header: "Destination",
  },
  {
    accessorKey: "type",
    header: "Categories",
    cell: ({ row }) => {
      const categories = row.getValue("type") as string[];
      return (
        <div className="flex flex-wrap gap-1">
          {categories.map((category) => (
            <Badge key={category} variant="outline">
              {category}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "duration",
    header: "Duration (Days)",
  },
  {
    accessorKey: "priceTiers",
    header: "Starting Price",
    cell: ({ row }) => {
      const priceTiers = row.getValue("priceTiers") as Tour["priceTiers"];
      const startingPrice = priceTiers[0]?.pricePerAdult;
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(startingPrice);

      return <div className="font-mono">{formatted}</div>;
    },
  },
  {
    accessorKey: "availability",
    header: "Availability",
    cell: ({ row }) => {
      const isAvailable = row.getValue("availability");
      return (
        <Badge
          variant={isAvailable ? "default" : "destructive"}
          className={cn(
            isAvailable
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800",
          )}
        >
          {isAvailable ? "Available" : "Unavailable"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const tour = row.original;
      return <TourActions tour={tour} />;
    },
  },
];
