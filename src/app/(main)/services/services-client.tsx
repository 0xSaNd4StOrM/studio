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

function getUpsellCategory(item: UpsellItem) {
  const haystack = `${item.name ?? ""} ${item.description ?? ""}`.toLowerCase();
  if (
    haystack.includes("airport") ||
    haystack.includes("pickup") ||
    haystack.includes("pick up") ||
    haystack.includes("dropoff") ||
    haystack.includes("drop off") ||
    haystack.includes("transfer")
  ) {
    return "Airport Transfers";
  }
  if (haystack.includes("sim") || haystack.includes("esim") || haystack.includes("internet")) {
    return "SIM & Internet";
  }
  if (
    haystack.includes("driver") ||
    haystack.includes("private car") ||
    haystack.includes("rent car") ||
    haystack.includes("car with driver") ||
    haystack.includes("vehicle")
  ) {
    return "Private Driver";
  }
  if (
    haystack.includes("guide") ||
    haystack.includes("assistant") ||
    haystack.includes("meet & assist") ||
    haystack.includes("meet and assist")
  ) {
    return "Meet & Assist";
  }
  if (haystack.includes("ticket") || haystack.includes("entry") || haystack.includes("pass")) {
    return "Tickets";
  }
  return "Other";
}

export function ServicesClient({
  services,
  showTypeFilter = false,
  badgeLabel = "Services",
  title = "Choose what you need",
  description = "Add services that make your trip smoother.",
  searchPlaceholder = "Search services...",
}: {
  services: UpsellItem[];
  showTypeFilter?: boolean;
  badgeLabel?: string;
  title?: string;
  description?: string;
  searchPlaceholder?: string;
}) {
  const { addToCart, cartItems } = useCart();
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<"recommended" | "price_asc" | "price_desc">(
    "recommended",
  );
  const [typeFilter, setTypeFilter] = React.useState<"all" | UpsellItem["type"]>("all");
  const [category, setCategory] = React.useState<string>("All");

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const item of services) set.add(getUpsellCategory(item));
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [services]);

  const visibleServices = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    let filtered = services;

    if (showTypeFilter && typeFilter !== "all") {
      filtered = filtered.filter((s) => s.type === typeFilter);
    }

    if (category !== "All") {
      filtered = filtered.filter((s) => getUpsellCategory(s) === category);
    }

    if (query.length > 0) {
      filtered = filtered.filter((s) => {
        const name = s.name?.toLowerCase() || "";
        const description = s.description?.toLowerCase() || "";
        return name.includes(query) || description.includes(query);
      });
    }

    const sorted = [...filtered];
    if (sort === "price_asc") sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (sort === "price_desc") sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    return sorted;
  }, [category, q, services, showTypeFilter, sort, typeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{badgeLabel}</p>
          <p className="text-2xl font-semibold tracking-tight">
            {title}
          </p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
              aria-label={`Search ${badgeLabel}`}
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
              aria-label={`Sort ${badgeLabel}`}
            >
              <option value="recommended">Recommended</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {showTypeFilter ? (
          <div className="flex flex-wrap gap-2">
            {[
              { label: "All", value: "all" as const },
              { label: "Services", value: "service" as const },
              { label: "Tour Add-ons", value: "tour_addon" as const },
            ].map((t) => (
              <Button
                key={t.value}
                type="button"
                variant={typeFilter === t.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Button
              key={c}
              type="button"
              variant={category === c ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {visibleServices.length} item{visibleServices.length === 1 ? "" : "s"}
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
            const itemCategory = getUpsellCategory(item);

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
                    <Badge variant="secondary" className="bg-background/90">
                      {itemCategory}
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
                    {!item.isActive ? (
                      <Button asChild variant="outline" className="w-full">
                        <Link
                          href={`/contact?service=${encodeURIComponent(item.name)}`}
                        >
                          Request availability
                        </Link>
                      </Button>
                    ) : null}
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
