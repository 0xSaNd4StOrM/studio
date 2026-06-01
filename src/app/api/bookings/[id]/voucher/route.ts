import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { getBookingById } from '@/lib/supabase/bookings';
import { getAgencySettings } from '@/lib/supabase/agency-content';
import { BookingVoucherDocument, type VoucherData } from '@/lib/pdf/booking-voucher';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Fetch booking + agency settings in parallel
    const [booking, settings] = await Promise.all([
      getBookingById(id),
      getAgencySettings().catch(() => null),
    ]);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const agencyData = settings?.data;

    // Build voucher data
    const voucherData: VoucherData = {
      agencyName: agencyData?.agencyName || 'Travel Agency',
      agencyLogoUrl: settings?.logo_url || undefined,
      agencyEmail: agencyData?.contactEmail,
      agencyPhone: agencyData?.phoneNumber,
      agencyAddress: agencyData?.address,
      bookingId: booking.id,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.phoneNumber,
      nationality: booking.nationality,
      bookingDate: booking.bookingDate,
      totalPrice: booking.totalPrice,
      status: booking.status,
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      amountPaid: booking.amountPaid,
      balanceDue: booking.balanceDue,
      items: (booking.bookingItems || []).map((item) => ({
        name: item.tours?.name ?? item.upsellItems?.name ?? 'Item',
        packageName: item.packageName,
        date: item.itemDate,
        adults: item.adults,
        children: item.children,
        price: item.price,
      })),
    };

    // Render the PDF to a buffer
    const pdfBuffer = await renderToBuffer(
      React.createElement(BookingVoucherDocument, { data: voucherData }) as Parameters<
        typeof renderToBuffer
      >[0]
    );

    // Return as downloadable PDF
    return new NextResponse(Buffer.from(pdfBuffer) as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="voucher-${booking.id}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating voucher PDF:', error);
    return NextResponse.json({ error: 'Failed to generate voucher' }, { status: 500 });
  }
}
