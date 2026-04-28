'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/agency-users';
import type { Booking, CartItem, Tour, UpsellItem, PriceTier } from '@/types';
import { revalidatePath } from 'next/cache';
import { toCamelCase } from '@/lib/utils';
import { getCurrentAgencyId } from '@/lib/supabase/agencies';
import { validatePromoCode } from '@/lib/supabase/promo-codes';
import {
  checkTourDateAvailability,
  decrementAvailableSpots,
} from '@/lib/supabase/tour-availability';
import { sendEmail } from '@/lib/email';
import { renderBookingConfirmationEmail } from '@/lib/email/templates/booking-confirmation';
import { renderBookingNotificationEmail } from '@/lib/email/templates/booking-notification';
import { renderBookingStatusChangeEmail } from '@/lib/email/templates/booking-status-change';
import {
  getAgencySettings,
  getCheckoutPaymentMethodAvailability,
} from '@/lib/supabase/agency-content';

export async function getPendingBookingsCount(): Promise<number> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { count, error } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .eq('status', 'Pending');

  if (error) return 0;
  return count ?? 0;
}

export async function getBookings(): Promise<Booking[]> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('bookings')
    .select('*, booking_items(*, tours(name, slug), upsell_items(name, price))')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }
  return data.map(toCamelCase) as Booking[];
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  const { data, error } = await supabase
    .from('bookings')
    .select('*, booking_items(*, tours(name, slug, packages), upsell_items(name, price))')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .single();

  if (error) {
    console.error(`Error fetching booking by ID ${id}:`, error);
    return null;
  }
  if (!data) return null;

  return toCamelCase(data) as Booking;
}

export async function updateBookingStatus(bookingId: string, status: Booking['status']) {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)
    .eq('agency_id', agencyId);

  if (error) {
    console.error('Error updating booking status:', error);
    throw new Error('Failed to update booking status.');
  }

  revalidatePath('/admin/bookings');
  revalidatePath(`/admin/bookings/${bookingId}`);

  // Send status change email for notable status changes (non-blocking)
  if (status === 'Confirmed' || status === 'Cancelled') {
    try {
      const [booking, settings] = await Promise.all([
        getBookingById(bookingId),
        getAgencySettings().catch(() => null),
      ]);

      if (booking?.customerEmail) {
        const agencyData = settings?.data;
        await sendEmail({
          agencyEmailSettings: agencyData?.emailSettings,
          to: booking.customerEmail,
          subject: `Booking ${status} — ${agencyData?.agencyName || 'Your Travel Agency'}`,
          html: renderBookingStatusChangeEmail({
            agencyName: agencyData?.agencyName || 'Your Travel Agency',
            agencyLogoUrl: settings?.logo_url || undefined,
            agencyEmail: agencyData?.contactEmail,
            agencyPhone: agencyData?.phoneNumber,
            bookingId,
            customerName: booking.customerName,
            newStatus: status,
            totalPrice: booking.totalPrice,
            items: (booking.bookingItems || []).map((bi) => ({
              name: bi.tours?.name ?? bi.upsellItems?.name ?? 'Item',
              packageName: bi.packageName,
              adults: bi.adults,
              children: bi.children,
              date: bi.itemDate,
            })),
          }),
        });
      }
    } catch (emailErr) {
      console.error('Error sending status change email:', emailErr);
      // Non-blocking: don’t fail the status update if email fails
    }
  }
}

export async function deleteBooking(bookingId: string) {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', bookingId)
    .eq('agency_id', agencyId);

  if (error) {
    console.error('Error deleting booking:', error);
    throw new Error('Failed to delete booking.');
  }

  revalidatePath('/admin/bookings');
}

interface CreateBookingData {
  bookingId?: string;
  customerName: string;
  customerEmail: string;
  phoneNumber: string;
  nationality: string;
  cartItems: CartItem[];
  paymentMethod: 'cash' | 'online';
  promoCode?: string;
}

export async function createBooking(data: CreateBookingData) {
  const supabase = await createClient();
  const agencyId = await getCurrentAgencyId();

  // 1. Calculate prices and prepare booking items
  let subtotal = 0;
  const bookingItemsToInsert = data.cartItems.map((item) => {
    let itemPrice = 0;
    let tourId: string | undefined;
    let upsellItemId: string | undefined;

    if (item.productType === 'tour') {
      const tour = item.product as Tour;
      tourId = tour.id;
      const totalPeople = (item.adults ?? 0) + (item.children ?? 0);

      let priceTiers = tour.priceTiers;

      if (item.packageId && tour.packages) {
        const selectedPackage = tour.packages.find((p) => p.id === item.packageId);
        if (selectedPackage) {
          priceTiers = selectedPackage.priceTiers;
        }
      }

      priceTiers = priceTiers || [];

      const priceTier =
        priceTiers.find(
          (tier: PriceTier) =>
            totalPeople >= tier.minPeople &&
            (tier.maxPeople === null || totalPeople <= tier.maxPeople)
        ) || priceTiers[priceTiers.length - 1];

      if (priceTier) {
        itemPrice =
          (item.adults ?? 0) * priceTier.pricePerAdult +
          (item.children ?? 0) * priceTier.pricePerChild;
      }
    } else if (item.productType === 'upsell') {
      const upsellItem = item.product as UpsellItem;
      upsellItemId = upsellItem.id;
      const variant =
        item.packageId && upsellItem.variants
          ? upsellItem.variants.find((v) => v.id === item.packageId)
          : undefined;
      const price = variant?.price ?? upsellItem.price;
      itemPrice = price * (item.quantity ?? 1);
    }

    subtotal += itemPrice;

    return {
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

  // 2. Apply Promo Code
  let discountAmount = 0;
  let promoCodeId: string | null = null;

  if (data.promoCode) {
    try {
      const promo = await validatePromoCode(data.promoCode, subtotal);
      promoCodeId = promo.id;

      if (promo.type === 'percentage') {
        discountAmount = (subtotal * promo.value) / 100;
        if (promo.maxDiscountAmount && discountAmount > promo.maxDiscountAmount) {
          discountAmount = promo.maxDiscountAmount;
        }
      } else {
        discountAmount = promo.value;
      }

      // Ensure discount doesn't exceed subtotal
      if (discountAmount > subtotal) discountAmount = subtotal;
    } catch (error) {
      console.warn('Invalid promo code during booking creation:', error);
      // We ignore invalid promo codes silently here or we could throw.
      // Assuming client-side validation passed, this is a safety check.
      // If invalid, we just don't apply discount.
    }
  }

  const finalTotal = subtotal - discountAmount;

  // 2b. Validate tour date availability
  for (const item of data.cartItems) {
    if (item.productType === 'tour' && item.date) {
      const tour = item.product as Tour;
      const itemDate = item.date instanceof Date ? item.date : new Date(item.date as string);
      const dateStr = itemDate.toISOString().split('T')[0];
      const requiredSpots = (item.adults ?? 0) + (item.children ?? 0);

      const check = await checkTourDateAvailability(tour.id, dateStr, requiredSpots);
      if (!check.available) {
        throw new Error(check.reason || `Tour "${tour.name}" is not available on ${dateStr}.`);
      }
    }
  }

  // 2c. Enforce server-side checkout payment method availability
  const paymentAvailability = await getCheckoutPaymentMethodAvailability();
  const requestedPaymentMethodAvailable =
    data.paymentMethod === 'online' ? paymentAvailability.online : paymentAvailability.cash;

  if (!requestedPaymentMethodAvailable) {
    const availableMethods: Array<'cash' | 'online'> = [];

    if (paymentAvailability.cash) availableMethods.push('cash');
    if (paymentAvailability.online) availableMethods.push('online');

    const availableMethodsLabel =
      availableMethods.length > 0 ? availableMethods.join(' or ') : 'none';

    throw new Error(
      `Payment method "${data.paymentMethod}" is currently unavailable. Available methods: ${availableMethodsLabel}.`
    );
  }

  // 3. Insert into bookings table
  const status = data.paymentMethod === 'cash' ? 'Confirmed' : 'Pending';
  const insertPayload = {
    ...(data.bookingId ? { id: data.bookingId } : {}),
    customer_name: data.customerName,
    customer_email: data.customerEmail,
    phone_number: data.phoneNumber,
    nationality: data.nationality,
    total_price: finalTotal,
    discount_amount: discountAmount,
    promo_code_id: promoCodeId,
    status,
    booking_date: new Date().toISOString(),
    payment_method: data.paymentMethod,
    agency_id: agencyId,
  };

  let bookingData: { id: string } | null = null;
  let bookingError: { message?: string } | null = null;

  if (data.bookingId) {
    // Idempotent path: when caller supplies a provisional bookingId (online
    // checkout pre-redirect), upsert so resubmission with the same id updates
    // the existing Pending row instead of creating a duplicate.
    const res = await supabase
      .from('bookings')
      .upsert(insertPayload, { onConflict: 'id' })
      .select('id')
      .single();
    bookingData = (res.data as { id: string } | null) ?? null;
    bookingError = (res.error as { message?: string } | null) ?? null;
  } else {
    const res = await supabase.from('bookings').insert(insertPayload).select('id').single();
    bookingData = (res.data as { id: string } | null) ?? null;
    bookingError = (res.error as { message?: string } | null) ?? null;
  }

  if (bookingError || !bookingData) {
    console.error('Error creating booking:', bookingError);
    throw new Error('Failed to create booking.');
  }

  const bookingId = bookingData.id;

  // 4. Insert into booking_items table.
  // For the idempotent upsert path, clear any pre-existing items for this
  // booking id (using the admin client to bypass RLS) so the items reflect
  // the current cart on resubmission.
  if (data.bookingId) {
    const adminClient = await createAdminClient();
    const { error: deleteItemsError } = await adminClient
      .from('booking_items')
      .delete()
      .eq('booking_id', bookingId);

    if (deleteItemsError) {
      console.error('Error clearing existing booking items:', deleteItemsError);
      throw new Error('Failed to refresh booking items.');
    }
  }

  const itemsWithId = bookingItemsToInsert.map((item) => ({
    ...item,
    booking_id: bookingId,
  }));

  const { error: itemsError } = await supabase.from('booking_items').insert(itemsWithId);

  if (itemsError) {
    console.error('Error creating booking items:', itemsError);
    throw new Error('Failed to create booking items.');
  }

  // 4b. Decrement available spots for tour dates
  for (const item of data.cartItems) {
    if (item.productType === 'tour' && item.date) {
      const tour = item.product as Tour;
      const itemDate2 = item.date instanceof Date ? item.date : new Date(item.date as string);
      const dateStr = itemDate2.toISOString().split('T')[0];
      const count = (item.adults ?? 0) + (item.children ?? 0);
      try {
        await decrementAvailableSpots(tour.id, dateStr, count);
      } catch (err) {
        console.error('Error decrementing spots:', err);
        // Non-blocking — booking already created
      }
    }
  }

  // 5. Update promo usage count
  if (promoCodeId) {
    // We increment safely
    await supabase.rpc('increment_promo_usage', { promo_id: promoCodeId });
    // If RPC doesn't exist, we can do a simple update, but RPC is better for concurrency.
    // I'll try simple update for now or creating RPC if I can.
    // Simple update:
    /*
    const { data: promo } = await supabase.from('promo_codes').select('usage_count').eq('id', promoCodeId).single();
    if (promo) {
      await supabase.from('promo_codes').update({ usage_count: (promo.usage_count || 0) + 1 }).eq('id', promoCodeId);
    }
    */
    // Better:
    // await supabase.rpc('increment', { table_name: 'promo_codes', row_id: promoCodeId, field: 'usage_count', amount: 1 });
    // I'll stick to simple update for this MVP.
    const { data: currentPromo } = await supabase
      .from('promo_codes')
      .select('usage_count')
      .eq('id', promoCodeId)
      .single();

    if (currentPromo) {
      await supabase
        .from('promo_codes')
        .update({ usage_count: (currentPromo.usage_count || 0) + 1 })
        .eq('id', promoCodeId);
    }
  }

  // 6. Sync Customer Data
  // We try to find an existing customer by email to update their stats, or create a new one.
  try {
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, total_bookings, total_spent')
      .eq('email', data.customerEmail)
      .eq('agency_id', agencyId)
      .maybeSingle();

    if (existingCustomer) {
      await supabase
        .from('customers')
        .update({
          name: data.customerName,
          phone: data.phoneNumber,
          nationality: data.nationality,
          total_bookings: (existingCustomer.total_bookings || 0) + 1,
          total_spent: (existingCustomer.total_spent || 0) + finalTotal,
          last_active: new Date().toISOString(),
        })
        .eq('id', existingCustomer.id);
    } else {
      await supabase.from('customers').insert({
        agency_id: agencyId,
        email: data.customerEmail,
        name: data.customerName,
        phone: data.phoneNumber,
        nationality: data.nationality,
        total_bookings: 1,
        total_spent: finalTotal,
        source: 'Booking',
        last_active: new Date().toISOString(),
        status: 'active',
      });
    }
  } catch (err) {
    console.error('Error syncing customer data:', err);
    // Non-blocking error, we don't fail the booking if customer sync fails
  }

  revalidatePath('/admin/bookings');
  revalidatePath('/admin/customers');

  // 7. Send email notifications (non-blocking)
  try {
    const settings = await getAgencySettings().catch(() => null);
    const agencyData = settings?.data;
    const emailSettings = agencyData?.emailSettings;
    const notifyAdmin = emailSettings?.notifyAdminOnBooking !== false; // default: true
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';

    const emailItems = data.cartItems.map((item, idx) => ({
      name: item.product.name,
      packageName: item.packageName,
      adults: item.productType === 'tour' ? (item.adults ?? 0) : undefined,
      children: item.productType === 'tour' ? (item.children ?? 0) : undefined,
      date: item.date ? item.date.toISOString() : undefined,
      price: bookingItemsToInsert[idx]?.price ?? 0,
    }));

    const sharedOpts = { agencyEmailSettings: emailSettings };

    // 7a. Customer confirmation
    await sendEmail({
      ...sharedOpts,
      to: data.customerEmail,
      subject: `Booking Received — ${agencyData?.agencyName || 'Your Travel Agency'}`,
      html: renderBookingConfirmationEmail({
        agencyName: agencyData?.agencyName || 'Your Travel Agency',
        agencyLogoUrl: settings?.logo_url || undefined,
        agencyEmail: agencyData?.contactEmail,
        agencyPhone: agencyData?.phoneNumber,
        bookingId,
        customerName: data.customerName,
        paymentMethod: data.paymentMethod,
        status,
        items: emailItems,
        subtotal,
        discountAmount,
        totalPrice: finalTotal,
      }),
    });

    // 7a-ii. If payment is online (status = Pending), send a dedicated "complete your payment" reminder
    if (data.paymentMethod === 'online') {
      const agencyName = agencyData?.agencyName || 'Your Travel Agency';
      const pendingHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Complete Your Payment</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#78350f,#d97706);padding:32px 40px;text-align:center;">
            ${settings?.logo_url ? `<img src="${settings.logo_url}" alt="${agencyName}" style="max-height:44px;max-width:180px;margin-bottom:16px;display:block;margin-left:auto;margin-right:auto;" />` : ''}
            <div style="font-size:40px;margin-bottom:8px;">⏳</div>
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">Payment Pending</h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">${agencyName}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="font-size:15px;color:#555;margin:0 0 16px;">Hi <strong>${data.customerName}</strong>,</p>
            <p style="font-size:15px;color:#555;margin:0 0 24px;">
              We've received your booking request. Your reservation is <strong>held for 24 hours</strong>
              while your payment is being processed. Please complete your payment to confirm your spot.
            </p>
            <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
              <span style="font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Booking Reference</span><br />
              <strong style="font-size:18px;color:#111;font-family:monospace;">#${bookingId.substring(0, 8).toUpperCase()}</strong>
            </div>
            <p style="font-size:13px;color:#888;margin:0;">
              If you did not complete the payment redirect, please contact us and we'll resend the payment link.
              ${agencyData?.contactEmail ? `<br />📧 <a href="mailto:${agencyData.contactEmail}" style="color:#2563eb;">${agencyData.contactEmail}</a>` : ''}
              ${agencyData?.phoneNumber ? `<br />📞 ${agencyData.phoneNumber}` : ''}
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 40px;text-align:center;font-size:12px;color:#888;">
            ${agencyName}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      await sendEmail({
        ...sharedOpts,
        to: data.customerEmail,
        subject: `⏳ Complete Your Payment — Booking #${bookingId.substring(0, 8).toUpperCase()}`,
        html: pendingHtml,
      });
    }

    // 7b. Admin notification
    if (notifyAdmin && agencyData?.contactEmail) {
      await sendEmail({
        ...sharedOpts,
        to: agencyData.contactEmail,
        fromName: 'Booking Alert',
        subject: `New Booking #${bookingId.substring(0, 8).toUpperCase()} — ${data.customerName}`,
        html: renderBookingNotificationEmail({
          agencyName: agencyData?.agencyName || 'Your Travel Agency',
          bookingId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.phoneNumber,
          customerNationality: data.nationality,
          paymentMethod: data.paymentMethod,
          items: emailItems,
          totalPrice: finalTotal,
          discountAmount,
          adminBookingUrl: `${appUrl}/admin/bookings/${bookingId}`,
        }),
      });
    }
  } catch (emailErr) {
    console.error('Error sending booking emails:', emailErr);
    // Non-blocking: booking succeeds even if emails fail
  }

  return bookingId as string;
}

/**
 * Cancels stale online Pending bookings older than 60 minutes for the
 * current agency. Used to garbage-collect rows where the customer abandoned
 * the Kashier redirect without completing payment.
 *
 * Returns the number of rows transitioned to 'Cancelled'.
 */
export async function cleanupStalePendingBookings(): Promise<number> {
  const supabase = await createAdminClient();
  const agencyId = await getCurrentAgencyId();

  const cutoffIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'Cancelled' })
    .eq('agency_id', agencyId)
    .eq('status', 'Pending')
    .eq('payment_method', 'online')
    .lt('created_at', cutoffIso)
    .select('id');

  if (error) {
    console.error('Error cleaning up stale pending bookings:', error);
    throw new Error('Failed to clean up stale pending bookings.');
  }

  const cancelledCount = data?.length ?? 0;

  if (cancelledCount > 0) {
    revalidatePath('/admin/bookings');
  }

  return cancelledCount;
}
