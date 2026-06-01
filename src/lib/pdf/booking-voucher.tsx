import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// ─── Types ─────────────────────────────────────────────────────────────────
export interface VoucherItem {
  name: string;
  packageName?: string;
  date?: string;
  adults: number;
  children: number;
  price: number;
}

export interface VoucherData {
  // Agency
  agencyName: string;
  agencyLogoUrl?: string;
  agencyEmail?: string;
  agencyPhone?: string;
  agencyAddress?: string;

  // Booking
  bookingId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  nationality?: string;
  bookingDate: string;
  totalPrice: number;
  status: string;
  paymentMethod?: string;
  paymentStatus?: 'unpaid' | 'deposit_paid' | 'paid_in_full';
  amountPaid?: number;
  balanceDue?: number;
  items: VoucherItem[];
}

// ─── Styles ────────────────────────────────────────────────────────────────
const colors = {
  primary: '#2563eb',
  primaryLight: '#eff6ff',
  dark: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  white: '#ffffff',
  green: '#16a34a',
  greenBg: '#f0fdf4',
  red: '#dc2626',
  redBg: '#fef2f2',
  yellow: '#ca8a04',
  yellowBg: '#fefce8',
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.dark,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  agencyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
  },
  voucherTitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },

  // Status badge
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 6,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },

  // Section
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 120,
    fontFamily: 'Helvetica-Bold',
    color: colors.muted,
    fontSize: 9,
  },
  value: {
    flex: 1,
    fontSize: 10,
  },

  // Items table
  table: {
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colName: { flex: 3, fontSize: 9 },
  colPackage: { flex: 2, fontSize: 9 },
  colDate: { flex: 2, fontSize: 9 },
  colPeople: { flex: 1.5, fontSize: 9, textAlign: 'center' as const },
  colPrice: { flex: 1.5, fontSize: 9, textAlign: 'right' as const },
  tableHeaderText: {
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    fontSize: 9,
  },

  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginTop: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: 4,
  },
  totalLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: colors.dark,
    marginRight: 16,
  },
  totalValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: colors.primary,
  },

  // Deposit payment summary
  depositRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  depositLabel: {
    fontSize: 9,
    color: colors.muted,
    marginRight: 16,
  },
  depositValue: {
    fontSize: 9,
    color: colors.muted,
  },
  balanceLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.dark,
    marginRight: 16,
  },
  balanceValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.dark,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  footerText: {
    fontSize: 8,
    color: colors.muted,
  },
  footerNote: {
    fontSize: 8,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
  },

  // Booking ID watermark
  bookingIdBox: {
    padding: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: 4,
    marginBottom: 16,
    alignItems: 'center',
  },
  bookingIdLabel: {
    fontSize: 8,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bookingIdValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    marginTop: 2,
    letterSpacing: 0.5,
  },

  // Paid stamp
  paidStamp: {
    position: 'absolute',
    top: 120,
    right: 50,
    borderWidth: 3,
    borderColor: colors.green,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    transform: 'rotate(-22deg)',
    opacity: 0.55,
  },
  paidStampText: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: colors.green,
    letterSpacing: 4,
  },
});

// ─── Helper ────────────────────────────────────────────────────────────────
function getStatusStyle(status: string) {
  const s = status.toLowerCase();
  if (s === 'confirmed') return { bg: colors.greenBg, color: colors.green };
  if (s === 'cancelled') return { bg: colors.redBg, color: colors.red };
  return { bg: colors.yellowBg, color: colors.yellow };
}

function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// ─── PDF Document ──────────────────────────────────────────────────────────
export function BookingVoucherDocument({ data }: { data: VoucherData }) {
  const statusStyle = getStatusStyle(data.status);
  const showPaidStamp =
    data.status.toLowerCase() === 'confirmed' && data.paymentMethod === 'online';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Paid stamp — absolute overlay, only for confirmed online payments */}
        {showPaidStamp && (
          <View style={styles.paidStamp}>
            <Text style={styles.paidStampText}>PAID</Text>
          </View>
        )}
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {data.agencyLogoUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={data.agencyLogoUrl} style={styles.logo} />
            )}
            <View>
              <Text style={styles.agencyName}>{data.agencyName}</Text>
              <Text style={styles.voucherTitle}>Booking Voucher</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.color }]}>
                {data.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Booking ID */}
        <View style={styles.bookingIdBox}>
          <Text style={styles.bookingIdLabel}>Booking Reference</Text>
          <Text style={styles.bookingIdValue}>{data.bookingId}</Text>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{data.customerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{data.customerEmail}</Text>
          </View>
          {data.customerPhone && (
            <View style={styles.row}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{data.customerPhone}</Text>
            </View>
          )}
          {data.nationality && (
            <View style={styles.row}>
              <Text style={styles.label}>Nationality</Text>
              <Text style={styles.value}>{data.nationality}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Booking Date</Text>
            <Text style={styles.value}>{formatDate(data.bookingDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.value}>
              {data.paymentMethod === 'cash'
                ? 'Cash on Arrival'
                : data.paymentMethod === 'online'
                  ? 'Online Payment'
                  : '—'}
            </Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Booking Items</Text>
          <View style={styles.table}>
            {/* Table header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.colName, styles.tableHeaderText]}>Item</Text>
              <Text style={[styles.colPackage, styles.tableHeaderText]}>Package</Text>
              <Text style={[styles.colDate, styles.tableHeaderText]}>Date</Text>
              <Text style={[styles.colPeople, styles.tableHeaderText]}>People</Text>
              <Text style={[styles.colPrice, styles.tableHeaderText]}>Price</Text>
            </View>
            {/* Table rows */}
            {data.items.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.colName}>{item.name}</Text>
                <Text style={styles.colPackage}>{item.packageName || '—'}</Text>
                <Text style={styles.colDate}>{item.date ? formatDate(item.date) : '—'}</Text>
                <Text style={styles.colPeople}>
                  {item.adults}A {item.children > 0 ? `+ ${item.children}C` : ''}
                </Text>
                <Text style={styles.colPrice}>{formatCurrency(item.price)}</Text>
              </View>
            ))}
          </View>
          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatCurrency(data.totalPrice)}</Text>
          </View>
          {/* Deposit payment summary — only shown for deposit bookings */}
          {data.paymentStatus === 'deposit_paid' && (
            <>
              <View style={styles.depositRow}>
                <Text style={styles.depositLabel}>Paid (deposit):</Text>
                <Text style={styles.depositValue}>
                  {formatCurrency(data.amountPaid ?? 0)}
                </Text>
              </View>
              <View style={styles.depositRow}>
                <Text style={styles.balanceLabel}>Balance due on arrival:</Text>
                <Text style={styles.balanceValue}>
                  {formatCurrency(data.balanceDue ?? 0)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerRow}>
            {data.agencyEmail && <Text style={styles.footerText}>{data.agencyEmail}</Text>}
            {data.agencyPhone && <Text style={styles.footerText}>{data.agencyPhone}</Text>}
            {data.agencyAddress && <Text style={styles.footerText}>{data.agencyAddress}</Text>}
          </View>
          <Text style={styles.footerNote}>
            This voucher serves as proof of booking. Please present it upon arrival. Thank you for
            booking with {data.agencyName}!
          </Text>
        </View>
      </Page>
    </Document>
  );
}
