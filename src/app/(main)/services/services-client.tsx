"use client";

import Image from "next/image";
import type { UpsellItem } from "@/types";
import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import { ArrowUpDown, PlusCircle, Search, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export function ServicesClient({ services }: { services: UpsellItem[] }) {
  const { addToCart, cartItems } = useCart();
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<"recommended" | "price_asc" | "price_desc">(
    "recommended",
  );

  const visibleServices = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    let filtered = services;
    if (query.length > 0) {
      filtered = services.filter((s) => {
        const name = s.name?.toLowerCase() || "";
        const description = s.description?.toLowerCase() || "";
        return name.includes(query) || description.includes(query);
      });
    }

    const sorted = [...filtered];
    if (sort === "price_asc") sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (sort === "price_desc") sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    return sorted;
  }, [q, services, sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Services</p>
          <p className="text-2xl font-semibold tracking-tight">
            Choose what you need
          </p>
          <p className="text-sm text-muted-foreground">
            Showing {visibleServices.length} service
            {visibleServices.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search services..."
              className="pl-9"
              aria-label="Search services"
            />
          </div>
          <div className="grid grid-cols-[auto_1fr] items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) =>
                setSort(e.target.value as "recommended" | "price_asc" | "price_desc")
              }
              className="h-10 rounded-md border bg-background px-3 text-sm"
              aria-label="Sort services"
            >
              <option value="recommended">Recommended</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </div>
      </div>

      {visibleServices.length === 0 ? (
        <Card className="rounded-3xl">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-lg font-semibold">No matches</p>
              <p className="text-sm text-muted-foreground">
                Try a different keyword, or clear your search.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQ("")}
              className="w-full sm:w-auto"
            >
              Clear search
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleServices.map((item) => {
            const isInCart = cartItems.some(
              (c) => c.productType === "upsell" && c.product.id === item.id,
            );
            const canAdd = item.isActive && !isInCart;

            return (
              <Card
                key={item.id}
                className="group overflow-hidden rounded-3xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-48 w-full overflow-hidden">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute left-4 top-4 flex items-center gap-2">
                    <Badge className="bg-background/90 text-foreground hover:bg-background">
                      $
                      {new Intl.NumberFormat("en-US", {
                        maximumFractionDigits: 0,
                      }).format(item.price ?? 0)}
                    </Badge>
                    {!item.isActive && (
                      <Badge variant="secondary">Unavailable</Badge>
                    )}
                  </div>
                </div>

                <CardContent className="flex flex-col gap-4 p-6">
                  <div className="space-y-1">
                    <p className="line-clamp-2 text-lg font-semibold leading-snug">
                      {item.name}
                    </p>
                    <p
                      className={cn(
                        "text-sm text-muted-foreground",
                        item.description ? "line-clamp-3" : "line-clamp-2",
                      )}
                    >
                      {item.description ||
                        "Add this service to make your trip smoother and more comfortable."}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-col gap-2">
                    <Button
                      type="button"
                      onClick={() =>
                        addToCart(item, "upsell", undefined, undefined, undefined, 1)
                      }
                      disabled={!canAdd}
                      className="w-full"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      {isInCart ? "In Cart" : "Add to cart"}
                    </Button>
                    {isInCart && (
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/cart">Go to cart</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
