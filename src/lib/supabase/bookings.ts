"use server";

import { createClient } from "@/lib/supabase/server";
import type { Booking, CartItem, Tour, UpsellItem, PriceTier } from "@/types";
import { revalidatePath } from "next/cache";
import { toCamelCase } from "@/lib/utils";

export async function getBookings(): Promise<Booking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*, booking_items(*, tours(name, slug), upsell_items(name, price))")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching bookings:", error);
    return [];
  }
  return data.map(toCamelCase) as Booking[];
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*, booking_items(*, tours(name, slug, packages), upsell_items(name, price))")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error fetching booking by ID ${id}:`, error);
    return null;
  }
  if (!data) return null;

  return toCamelCase(data) as Booking;
}

export async function updateBookingStatus(
  bookingId: string,
  status: Booking["status"],
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);

  if (error) {
    console.error("Error updating booking status:", error);
    throw new Error("Failed to update booking status.");
  }

  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function deleteBooking(bookingId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) {
    console.error("Error deleting booking:", error);
    throw new Error("Failed to delete booking.");
  }

  revalidatePath("/admin/bookings");
}

interface CreateBookingData {
  customerName: string;
  customerEmail: string;
  phoneNumber: string;
  nationality: string;
  cartItems: CartItem[];
  totalPrice: number;
  paymentMethod: "cash" | "online";
}

export async function createBooking(data: CreateBookingData) {
  const supabase = await createClient();

  // 1. Insert into bookings table
  const status = data.paymentMethod === "cash" ? "Confirmed" : "Pending";
  const insertPayload = {
    customer_name: data.customerName,
    customer_email: data.customerEmail,
    phone_number: data.phoneNumber,
    nationality: data.nationality,
    total_price: data.totalPrice,
    status,
    booking_date: new Date().toISOString(),
    payment_method: data.paymentMethod,
  };

  let bookingData: { id: string } | null = null;
  let bookingError: { message?: string } | null = null;

  {
    const res = await supabase
      .from("bookings")
      .insert(insertPayload)
      .select("id")
      .single();
    bookingData = (res.data as { id: string } | null) ?? null;
    bookingError = (res.error as { message?: string } | null) ?? null;
  }

  if (bookingError?.message?.includes("payment_method")) {
    const { payment_method: _paymentMethod, ...fallbackPayload } = insertPayload;
    const res = await supabase
      .from("bookings")
      .insert(fallbackPayload)
      .select("id")
      .single();
    bookingData = (res.data as { id: string } | null) ?? null;
    bookingError = (res.error as { message?: string } | null) ?? null;
  }

  if (bookingError || !bookingData) {
    console.error("Error creating booking:", bookingError);
    throw new Error("Failed to create booking.");
  }

  const bookingId = bookingData.id;

  // 2. Insert into booking_items table
  const bookingItemsToInsert = data.cartItems.map((item) => {
    let itemPrice = 0;
    let tourId: string | undefined;
    let upsellItemId: string | undefined;

    if (item.productType === "tour") {
      const tour = item.product as Tour;
      tourId = tour.id;
      const totalPeople = (item.adults ?? 0) + (item.children ?? 0);
      
      let priceTiers = tour.priceTiers;
      
      // If a package is selected, use its price tiers
      if (item.packageId && tour.packages) {
        const selectedPackage = tour.packages.find(p => p.id === item.packageId);
        if (selectedPackage) {
          priceTiers = selectedPackage.priceTiers;
        }
      }

      // Fallback to default tiers if no package tiers found (safety check)
      priceTiers = priceTiers || [];

      const priceTier =
        priceTiers.find(
          (tier: PriceTier) =>
            totalPeople >= tier.minPeople &&
            (tier.maxPeople === null || totalPeople <= tier.maxPeople),
        ) || priceTiers[priceTiers.length - 1];

      if (priceTier) {
        itemPrice =
          (item.adults ?? 0) * priceTier.pricePerAdult +
          (item.children ?? 0) * priceTier.pricePerChild;
      }
    } else if (item.productType === "upsell") {
      const upsellItem = item.product as UpsellItem;
      upsellItemId = upsellItem.id;
      const variant =
        item.packageId && upsellItem.variants
          ? upsellItem.variants.find((v) => v.id === item.packageId)
          : undefined;
      const price = variant?.price ?? upsellItem.price;
      itemPrice = price * (item.quantity ?? 1);
    }

    return {
      booking_id: bookingId,
      tour_id: tourId || null,
      upsell_item_id: upsellItemId || null,
      package_id: item.packageId || null,
      package_name: item.packageName || null,
      adults: item.adults ?? 0,
      children: item.children ?? 0,
      item_date: item.date || null,
      price: itemPrice,
    };
  });

  const { error: itemsError } = await supabase
    .from("booking_items")
    .insert(bookingItemsToInsert);

  if (itemsError) {
    console.error("Error creating booking items:", itemsError);
    throw new Error("Failed to create booking items.");
  }

  revalidatePath("/admin/bookings");
  return bookingId as string;
}
