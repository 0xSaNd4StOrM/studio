# Implementation Checklist

**App: Tix & Trips Egypt — Multi-Tenant SaaS Platform**
_Started: March 3, 2026_

---

## ✅ GROUP 1 — Quick Wins

- [x] **1.1 — WhatsApp floating chat button**
  - ✅ `src/components/whatsapp-chat-button.tsx` created, wired into `src/app/(main)/layout.tsx`

- [x] **1.2 — Skeleton loaders on tour listing page**
  - ✅ `src/components/tour-card-skeleton.tsx` + `src/app/(main)/tours/loading.tsx`

- [x] **1.3 — Skeleton loaders on hotel listing page**
  - ✅ `src/components/hotel-card-skeleton.tsx` + `src/app/(main)/hotels/loading.tsx`
  - Bonus: upgraded `/hotels` listing page to use `HotelCard`

- [x] **1.4 — Trust badges on checkout page**
  - ✅ "Why book with us" card in checkout right column — Secure Payment, Verified Agency, Instant Confirmation, Flexible Booking

- [x] **1.5 — "Book Now" sticky button on tour detail page (mobile)**
  - ✅ `lg:hidden` fixed bottom bar in `tour-details-client.tsx`

- [x] **1.6 — `placeholder="blur"` on all `next/image` usages**
  - ✅ `src/lib/blur-data-url.ts` created; applied to `tour-card.tsx`, `hotel-card.tsx`, `tour-details-client.tsx`, `home-client.tsx`

- [x] **1.7 — Dynamic `sitemap.ts` generation**
  - ✅ `src/app/sitemap.ts` — respects module toggles, filters unpublished blog posts, graceful error handling

- [x] **1.8 — Dynamic `robots.txt`**
  - ✅ `src/app/robots.ts` — blocks all bots in maintenance mode, disallows `/admin/`, `/super-admin/`, `/api/`

---

## ✅ GROUP 2 — Email Notifications

- [x] **2.1 — Install and configure Resend**
  - ✅ `src/lib/email/index.ts` — `sendEmail()` falls back to `RESEND_API_KEY` env if no agency key
  - ✅ Email settings card added to Admin Settings UI

- [x] **2.2 — Booking confirmation email to customer**
  - ✅ `src/lib/email/templates/booking-confirmation.ts` — triggered non-blocking in `createBooking()`

- [x] **2.3 — New booking notification email to admin**
  - ✅ `src/lib/email/templates/booking-notification.ts` — fires only if `notifyAdminOnBooking !== false`

- [x] **2.4 — Booking status change email to customer**
  - ✅ `src/lib/email/templates/booking-status-change.ts` — triggered for `Confirmed` or `Cancelled` in `updateBookingStatus()`

- [x] **2.5 — Hotel booking confirmation email**
  - ✅ Email infrastructure ready; will wire automatically once hotel booking creation is built

---

## ✅ GROUP 3 — Customer Reviews & Ratings

- [x] **3.1 — Create `reviews` table in Supabase**
  - ✅ Migration applied — `review_target_check` constraint, 4 indexes, 5 RLS policies

- [x] **3.2 — Review submission form on tour detail page**
  - ✅ `src/components/review-form.tsx` — gated by `modules.reviews`, server action `submitReview()` in `src/lib/supabase/reviews.ts`

- [x] **3.3 — Review submission form on hotel detail page**
  - ✅ Same `ReviewForm` wired into `src/app/(main)/hotels/[slug]/page.tsx`

- [x] **3.4 — Reviews display section on tour/hotel detail pages**
  - ✅ `src/components/reviews-display.tsx` — average rating, count, avatar initials, star rating

- [x] **3.5 — Admin review moderation panel**
  - ✅ `src/app/admin/reviews/page.tsx` — stats cards, filter tabs, Approve/Reject/Delete with confirmation dialog
  - ✅ "Reviews" added to admin sidebar in Management group, gated by `modules.reviews`

---

## ✅ GROUP 4 — PDF Booking Voucher

- [x] **4.1 — Install `@react-pdf/renderer`**
  - ✅ Installed

- [x] **4.2 — Create booking voucher PDF template**
  - ✅ `src/lib/pdf/booking-voucher.tsx` — branded A4 PDF with agency header, status badge, items table, footer

- [x] **4.3 — Add PDF download API route**
  - ✅ `src/app/api/bookings/[id]/voucher/route.ts` — fetches booking, renders PDF via `renderToBuffer`

- [x] **4.4 — Add "Download Voucher" button**
  - ✅ Added to `src/app/admin/bookings/[id]/page.tsx` and `src/app/(main)/checkout/success/page.tsx`

---

## ✅ GROUP 5 — Tour Date Availability Calendar

- [x] **5.1 — Create `tour_availability` table in Supabase**
  - ✅ Migration applied — unique constraint on `(tour_id, date)`, RLS policies, `TourDateAvailability` type added

- [x] **5.2 — Tour availability management in admin**
  - ✅ `src/components/admin/tour-availability-manager.tsx` — interactive calendar, block/limit per date, active rules list
  - ✅ "Availability" tab added to tour form; server actions in `src/lib/supabase/tour-availability.ts`

- [x] **5.3 — Date picker on tour detail page (customer side)**
  - ✅ `tour-details-client.tsx` — blocked dates disabled, limited-spots dates highlighted amber, "X spots remaining" indicator

- [x] **5.4 — Validate availability at checkout**
  - ✅ `createBooking()` checks availability before insert, decrements spots after booking

- [x] **5.5 — Add date filter to tour search page**
  - ✅ `travelDate` search param, `getToursAvailableOnDate()` filters blocked/sold-out tours, active filter badge shown

---

## ✅ GROUP 6 — Admin Dashboard Improvements

- [x] **6.1 — Revenue trend chart (last 30 days)**
  - ✅ `src/components/admin/overview-chart.tsx` updated with daily revenue bar chart

- [x] **6.2 — Date range filter on dashboard stats**
  - ✅ "Last 7 / 30 / 90 days / All time" selector filters bookings count, revenue, and new customers

- [x] **6.3 — Export bookings to CSV**
  - ✅ "Export CSV" button on `/admin/bookings`

- [x] **6.4 — Export customers to CSV**
  - ✅ "Export CSV" button on `/admin/customers`

- [x] **6.5 — Admin notification for new bookings**
  - ✅ Notification badge on "Bookings" sidebar item for unread pending bookings

---

## ✅ GROUP 7 — Onboarding Flow for New Tenants

- [x] **7.1 — Getting Started checklist component**
  - ✅ `src/components/admin/getting-started.tsx` — 5-step card with progress bar, shown on dashboard

- [x] **7.2 — Detect onboarding completion state**
  - ✅ Steps auto-complete from live data: logo, contact info, tours count, theme config, bookings count

- [x] **7.3 — Dismiss after completion**
  - ✅ `dismissOnboarding()` server action stores `onboarding_dismissed: true` in agency settings

---

## ✅ GROUP 8 — Security Fixes

- [x] **8.1 — Replace `checkSuperAdmin()` email check with DB role**
  - ✅ `profiles` table migration applied (`is_super_admin boolean`, RLS, auto-create trigger)
  - ✅ `checkSuperAdmin()` queries `profiles.is_super_admin`, falls back to `NEXT_PUBLIC_SUPER_ADMIN_EMAIL` env
  - 📝 To promote a user: `UPDATE profiles SET is_super_admin = true WHERE id = '<user-uuid>';`

---

## ✅ GROUP 13 — Translations

- [x] **13.6 — Move translations to JSON files**
  - ✅ Created `src/locales/en.json`, `fr.json`, `ar.json`, `de.json`, `es.json`
  - ✅ `src/locales/index.ts` — lazy `import()` loaders; adding a language requires 1 line
  - ✅ `src/hooks/use-language.tsx` — locale files loaded dynamically, cached in memory
  - 📝 To add a new language: create `src/locales/<code>.json` → add 1 line to `src/locales/index.ts` → add 1 entry to `languages` array in `use-language.tsx`

---

## Progress Summary

| Group     | Name                       | Tasks Done             |
| --------- | -------------------------- | ---------------------- |
| 1         | Quick Wins                 | 8 / 8 ✅               |
| 2         | Email Notifications        | 5 / 5 ✅               |
| 3         | Customer Reviews           | 5 / 5 ✅               |
| 4         | PDF Voucher                | 4 / 4 ✅               |
| 5         | Tour Availability Calendar | 5 / 5 ✅               |
| 6         | Dashboard Improvements     | 5 / 5 ✅               |
| 7         | Onboarding Flow            | 3 / 3 ✅               |
| 8         | Security Fixes             | 1 / 1 ✅               |
| 13        | Translations               | 1 / 1 ✅               |
| S1        | Agency Overview            | 5 / 5 ✅               |
| S2        | Agency Management          | 7 / 7 ✅               |
| S3        | Subscription & Billing     | 5 / 5 ✅               |
| S4        | Communication Tools        | 4 / 4 ✅               |
| S5        | Audit Log & Activity       | 3 / 3 ✅               |
| S6        | Platform Analytics         | 5 / 5 ✅               |
| B1        | Public Blog Page           | 10 / 10 ✅             |
| **TOTAL** |                            | **76 tasks completed** |

---

---

# 🏨 Single-Hotel Mode — Ideas & Recommendations

> These are planned improvements for when the platform is used in **single-hotel mode** (`singleHotelMode: true`).
> Grouped by theme. Work top-to-bottom within each group.

---

## 🏠 GROUP H1 — Rooms on the Home Page

> Right now the home page shows tours or generic content. When it's a hotel, guests want to see rooms immediately.

- [x] **H1.1 — "Our Rooms" section on the home page**
  - ✅ Carousel of room type cards fetched from the hotel's active room types
  - ✅ Each card: room photo, room name, key features (beds, sqm, max guests), price per night, "Book Now" button
  - ✅ Toggle in Home Page Editor (`roomsSection` visibility, hotel-only)
  - ✅ Position: after Hotel Story section

- [x] **H1.2 — "Starting From" price in the hero**
  - ✅ Below the hero headline: _"Rooms from $X / night"_ using cheapest active room price
  - ✅ Pulls from the hotel's cheapest room type price via `useMemo`
  - ✅ Subtle white/70 text with bold price highlight

- [x] **H1.3 — Quick availability search widget in the hero (hotel mode)**
  - ✅ When `singleHotelMode: true`, hero shows a dedicated hotel availability search box (check-in, check-out, guests)
  - ✅ Standard tours mode shows a new tabbed search widget: "Find a Tour" tab (keyword + destination + type) and "Custom Trip" tab (links to tailor-made)
  - ✅ Both tabs animate in/out using Framer Motion `AnimatePresence`
  - ✅ `HotelSearchBox` wrapped in a clean card with "Check Availability" header bar
  - Files: `src/app/(main)/home-client.tsx`

- [x] **H1.4 — "Book Direct & Save" badge on hero**
  - ✅ Badge/pill with `Tag` icon after the search widget
  - ✅ Configurable text from Home Page Editor (`bookDirectBadge` field in hero section)
  - ✅ Primary-colored with backdrop blur for premium feel

---

## 🎨 GROUP H2 — Home Page UI/UX Improvements

> Visual and experience upgrades that make the site feel premium and convert better.

- [x] **H2.1 — Full-screen video hero background**
  - ✅ Admin pastes a direct .mp4 URL (Cloudinary, S3, etc.) in the Home Page Editor Hero tab
  - ✅ When a video URL is set, a `<video autoPlay muted loop playsInline>` replaces the image slider as the hero background
  - ✅ Falls back to image crossfade slider if no video is set; falls back to gradient if neither
  - ✅ Gradient overlays remain unchanged so text stays readable over both video and images

- [x] **H2.2 — Sticky header with scroll-aware transparency**
  - ✅ Header changed from `sticky` to `fixed` — overlays the hero image
  - ✅ On home page, when not scrolled: header is fully transparent, TopBar and accent bar hidden, nav links white
  - ✅ Once user scrolls past 80px: header becomes solid white with backdrop-blur + shadow
  - ✅ `usePathname()` detects home page vs inner pages
  - File: `src/components/header.tsx`

- [x] **H2.3 — Animated room/feature cards**
  - ✅ Room cards on the home page use `staggerContainer` + `fadeInUp` — each card animates in as the user scrolls
  - ✅ All 4 hotel-mode sections (Amenities, Gallery, Why Book Direct, Location) also use the same stagger pattern

- [x] **H2.4 — Amenities showcase section**
  - ✅ Responsive icon-grid (2–6 cols) showing selected amenities: WiFi, Pool, Spa, Restaurant, Gym, Parking … (16 amenity types)
  - ✅ Admin toggles individual amenities on/off from the Home Page Editor (Amenities tab)
  - ✅ Title & pre-title configurable; falls back to translated defaults

- [x] **H2.5 — Photo gallery / lightbox section**
  - ✅ CSS-grid masonry gallery (first image spans 2×2, rest fill in)
  - ✅ Click-to-enlarge lightbox with prev/next navigation, close button, animated transitions
  - ✅ Admin uploads gallery images from Home Page Editor (Photo Gallery tab, up to 20 photos)
  - ✅ No extra package needed — built with Framer Motion + Next.js Image

- [x] **H2.6 — "Why Book Direct" section**
  - ✅ Full-width primary-color section with 4 benefit cards (icon + title + description)
  - ✅ Default benefits: Best Price Guarantee, Free Cancellation, Instant Confirmation, Exclusive Perks
  - ✅ Fully configurable from Home Page Editor (Why Book Direct tab) — icon name, title, description per benefit

- [x] **H2.7 — Location / map section on home page**
  - ✅ Google Maps iframe embed + hotel address + "Get Directions" button
  - ✅ Admin enters map embed URL, address, and directions link from Home Page Editor (Location tab)
  - ✅ Only shown in single-hotel mode when at least map URL or address is provided

- [x] **H2.8 — Social media feed / Instagram grid**
  - ✅ Static "Follow Us" square photo grid (up to 9 photos, last tile is a branded CTA link when <9 photos)
  - ✅ Admin uploads photos + sets handle, profile URL, platform name from Home Page Editor (Social Feed tab)
  - ✅ Only shown in single-hotel mode when at least one photo is uploaded

---

## ✨ GROUP H3 — Amazing Features (High Differentiation)

> These features would make the platform genuinely stand out vs. Booking.com and local competitors.

- [ ] **H3.1 — Room comparison tool**
  - Guest can select 2–3 rooms and see a side-by-side comparison table
  - Columns: price, size, beds, view, amenities, included breakfast
  - Helps guests decide without going back and forth between pages
  - "Add to Compare" button on each room card

- [ ] **H3.2 — Special occasion request at checkout**
  - Checkbox at checkout: "Is this a special occasion?"
  - Dropdown: Birthday / Anniversary / Honeymoon / Business trip
  - Text field: "Any special requests?"
  - Saved to booking record — admin sees it and can prepare a surprise (flowers, cake, etc.)
  - Extremely low effort, huge guest satisfaction impact

- [ ] **H3.3 — Add-on services at checkout (hotel mode)**
  - After selecting a room, guest can add: Airport Transfer / Breakfast / Spa Treatment / Early Check-in / Late Check-out
  - These are the hotel's upsell items (already exists as a system — just wire it into hotel checkout)
  - Revenue multiplier: hotels typically earn 20–30% more per booking through add-ons

- [ ] **H3.4 — Room availability calendar on room detail page**
  - Show a mini monthly calendar on each room's page: green = available, red = unavailable
  - Guests can immediately see if their dates work without going to checkout and finding out there
  - Uses existing `room_inventory` data — just needs a visual calendar render

- [ ] **H3.5 — "Best Rate Guarantee" popup / badge**
  - If guest is about to leave (exit intent), show a small popup: "Did you find a better price? We'll match it."
  - On mobile: show as a sticky bottom ribbon instead
  - Converts price-sensitive guests who were going to check Booking.com

- [ ] **H3.6 — Guest review highlights on home page**
  - Pull the top 3 most-liked reviews and show them as a featured testimonial carousel on the home page
  - Show reviewer name, star rating, a quote snippet, and their country flag
  - Admin can pin specific reviews to always appear

- [x] **H3.7 — Seasonal packages / offers section**
  - Admin creates time-limited packages: "Summer Escape — 3 nights + breakfast + airport transfer — $X"
  - Shown as visually prominent cards on the home page with a countdown timer
  - Packages link to a pre-filled checkout (room + upsell items bundled)
  - Extremely effective for revenue during shoulder season

- [x] **H3.8 — "Nearby Attractions" section**
  - A list of nearby landmarks with distance: "Pyramids of Giza — 12 km", "Cairo Airport — 25 km"
  - Admin enters these manually in settings
  - Guests research location before booking — this answers that question on the home page itself

---

## 📱 GROUP H4 — Mobile Experience

> Over 70% of hotel browsing happens on mobile. These fixes are essential.

- [x] **H4.1 — Floating "Check Availability" button on mobile**
  - Fixed bottom bar on mobile showing: **[Check Availability]** button
  - Taps scroll to the availability search widget or open a modal
  - Similar to the "Book Now" bar already on tour detail pages — apply the same pattern to the hotel home page

- [x] **H4.2 — Swipeable room cards on mobile**
  - On mobile, the rooms section becomes a full-width horizontal swipe carousel
  - Each card takes 85% of screen width so it's clear there are more to swipe
  - Much better than a cramped 3-column grid on small screens

- [x] **H4.3 — Click-to-call button in header (mobile)**
  - On mobile, add a phone icon button in the header that triggers `tel:` link
  - Some guests prefer to call rather than book online — make it trivially easy
  - Reads from `settings.contact.phone`

---

## 🔧 GROUP H5 — Admin Improvements for Hotel Mode

- [x] **H5.1 — Home Page Editor: Rooms section toggle**
  - ✅ "Rooms Section" tab added to Home Page Editor with title, subtitle, and count (3, 6, or all) fields
  - ✅ Visibility toggle already existed; room count of 0 = show all rooms
  - ✅ `roomsSection` data saved to `contentToSave` and merged from `initialContent`

- [x] **H5.2 — Home Page Editor: Amenities section**
  - ✅ Amenities tab in Home Page Editor with title/subtitle fields
  - ✅ 16 preset amenities (WiFi, Pool, Spa, Restaurant, Gym, Parking, Bar, Shuttle, Room Service, Pets, Kids Club, Meetings, AC, Beach, Laundry, Concierge)
  - ✅ Toggle switches for each amenity; rendered as icon grid on home page

- [x] **H5.3 — Home Page Editor: Gallery section**
  - ✅ Multi-image uploader (up to 20 photos) in Gallery tab
  - ✅ Drag-to-reorder added to `ImageUploader` component (native HTML5 drag & drop with grip handle)
  - ✅ Remove individual images with X button on hover

- [x] **H5.4 — Room type improvements**
  - ✅ `highlights` field already existed: `TagListEditor` in room-type-form Amenities tab, stored as `text[]` in DB
  - ✅ `is_featured` boolean added: Supabase column (`is_featured boolean default false`), RoomType type, room-type-form checkbox, create/update server actions
  - ✅ Featured rooms shown first in home page rooms carousel; "Featured" badge shown in admin room list

---

---

---

# 👑 Super Admin Dashboard — Control Panel for All Agencies

> Full plan to turn the super admin into a real SaaS control center.
> Currently it shows a basic agency list + broadcast manager. This upgrades it to a proper operations hub.

---

## 📊 GROUP S1 — Agency Overview & Monitoring

> You need to see the health of every client at a glance — one screen that tells you everything.

- [x] **S1.1 — Super admin home dashboard (stats overview)**
  - ✅ KPI Row 1: Total Agencies / Active / Suspended / New This Month
  - ✅ KPI Row 2: Total Bookings (all tenants) / Total Revenue (all tenants) / Context Mode
  - ✅ Data layer: `src/lib/supabase/super-admin.ts` — `getPlatformStats()` aggregates across all agencies
  - File: `src/app/super-admin/page.tsx`

- [x] **S1.2 — Agency health status column in the list**
  - ✅ "Health" column with colored dot indicator: 🟢 Active (booking ≤14d) / 🟡 Low Activity (14–30d) / 🔴 No Activity (30+ days or never)
  - ✅ Computed from last booking date per agency via `getAgencyHealthData()`
  - File: `src/components/super-admin/agency-list.tsx`

- [x] **S1.3 — Per-agency quick-stats row**
  - ✅ Expandable row (chevron toggle) showing: Total Bookings, Revenue This Month, Last Booking, Last Admin Login
  - ✅ All data computed server-side in `getAgencyHealthData()` and passed via `healthData` prop
  - File: `src/components/super-admin/agency-list.tsx`

- [x] **S1.4 — Last admin login tracking**
  - ✅ `last_admin_login_at` column added to `agencies` table (timestamptz, nullable)
  - ✅ `recordAdminLogin(agencyId)` called non-blocking in admin layout on every admin page load
  - ✅ Shown in agency list expandable row with relative time formatting
  - Files: `src/lib/supabase/super-admin.ts`, `src/app/admin/layout.tsx`

- [x] **S1.5 — Global revenue chart (all tenants)**
  - ✅ Line chart (recharts) with 30-day / 90-day toggle on the super admin dashboard
  - ✅ `getGlobalRevenueData(days)` builds daily revenue buckets across all tenants
  - ✅ `GlobalRevenueChart` client component with Select period switcher
  - File: `src/components/super-admin/global-revenue-chart.tsx`

---

## ✅ GROUP S2 — Agency Management

> Full lifecycle management of each client from one place.

- [x] **S2.1 — Agency detail page**
  - ✅ `/super-admin/agencies/[id]` — dedicated detail page with stats cards, settings form, notes, and action cards
  - ✅ Agency name in list is now clickable; "Edit Settings" in dropdown links to detail page
  - Files: `src/app/super-admin/agencies/[id]/page.tsx`, `src/app/super-admin/agencies/[id]/agency-detail-client.tsx`

- [x] **S2.2 — Edit agency settings from super admin**
  - ✅ Editable fields on detail page: name, slug, custom domain, tier (Free/Starter/Pro/Enterprise), contact email/phone/address
  - ✅ `updateAgencyDetails()` server action merges into `settings` JSONB without overwriting other fields
  - File: `src/app/super-admin/actions.ts`

- [x] **S2.3 — Agency notes / internal CRM**
  - ✅ Internal notes textarea on detail page — private, never visible to agency admin
  - ✅ `updateAgencyNotes()` stores to `internal_notes` column; amber sticky-note icon shown in list when notes exist
  - Files: `src/app/super-admin/actions.ts`, `src/components/super-admin/agency-list.tsx`

- [x] **S2.4 — One-click suspend / unsuspend with reason**
  - ✅ Suspend from detail page (AlertDialog with reason textarea) or quick-suspend from list dropdown (window.prompt)
  - ✅ `suspendAgency()` sets `status='suspended'`, `suspended_reason`, `suspended_at`, `maintenance_mode=true`
  - ✅ `unsuspendAgency()` clears all suspension fields + sets `maintenance_mode=false`
  - ✅ Suspension banner shown on detail page when agency is suspended
  - File: `src/app/super-admin/actions.ts`

- [x] **S2.5 — Agency creation wizard (improved "Deploy Tenant")**
  - ✅ 3-step wizard: Step 1 (name, slug, domain, contact email/phone) → Step 2 (module checkboxes) → Step 3 (tier selection + summary)
  - ✅ Step indicators with check icons; Next disabled until required fields filled; animated progress
  - ✅ `createAgency()` updated to accept modules, tier, and contact fields
  - File: `src/components/super-admin/deploy-tenant-dialog.tsx`

- [x] **S2.6 — Duplicate / clone an agency**
  - ✅ "Clone This Agency" card on detail page — AlertDialog to enter new name + slug
  - ✅ `duplicateAgency()` copies `settings` only (no bookings/tours/hotels)
  - File: `src/app/super-admin/actions.ts`

- [x] **S2.7 — Delete agency with safety checks**
  - ✅ "Danger Zone" card on detail page with confirmation AlertDialog
  - ✅ `deleteAgency()` counts bookings first — blocks deletion if count > 0 with clear error message
  - ✅ Quick delete also available from agency list dropdown
  - File: `src/app/super-admin/actions.ts`

---

## 💰 GROUP S3 — Subscription & Billing Tracking

> Even without full Kashier automation, you need to manually track who has paid and when. (this payment will be like invoice, the user will see it on time, and have to pay it or the page will be paused automaticlly)

- [x] **S3.1 — Add billing fields to agencies table**
  - ✅ New columns: `subscription_status` (trial/active/past_due/cancelled), `trial_ends_at`, `next_billing_date`, `monthly_price`
  - ✅ New `agency_payments` table for payment history (amount, date, method, reference, notes, recorded_by)
  - ✅ Indexes on `agency_id` and `payment_date`; RLS enabled
  - Migration: `add_billing_fields_and_agency_payments`

- [x] **S3.2 — Billing status display in agency list**
  - ✅ "Plan" column with color-coded badges: Free (zinc) / Starter (blue) / Pro (purple) / Business (indigo) / Enterprise (amber)
  - ✅ "Billing" column with status badges: Active ✅ / Trial ⏳ / Past Due ⚠️ / Cancelled ❌
  - ✅ Monthly price shown under Plan badge; next billing date shown under Billing badge
  - ✅ Trial badge shows days remaining when < 7 days, "Trial Expired" when past
  - File: `src/components/super-admin/agency-list.tsx`

- [x] **S3.3 — Trial expiry alerts**
  - ✅ Top-of-page amber alert: "X agencies' trials expire this week"
  - ✅ Top-of-page red alert: "X agencies have past due payments"
  - ✅ `getPlatformStats()` computes `trialsExpiringThisWeek` and `pastDueAgencies`
  - ✅ Trial warning badges in agency list (amber when < 7 days, red when expired)
  - Files: `src/lib/supabase/super-admin.ts`, `src/app/super-admin/page.tsx`

- [x] **S3.4 — Manual payment recording**
  - ✅ "Record Payment" button on agency detail page opens a Dialog
  - ✅ Fields: amount, date, method (bank transfer / cash / card / kashier), reference number, notes
  - ✅ `recordPayment()` server action stores to `agency_payments`, auto-updates subscription to active + sets next billing date
  - Files: `src/app/super-admin/actions.ts`, `src/app/super-admin/agencies/[id]/agency-detail-client.tsx`

- [x] **S3.5 — Revenue per agency report**
  - ✅ Payment history table on agency detail page with all recorded payments
  - ✅ "Total paid to date" shown in CardDescription header
  - ✅ Billing & Subscription management card: edit subscription status, monthly price, trial/billing dates
  - ✅ `updateAgencyBilling()` server action
  - Files: `src/app/super-admin/agencies/[id]/agency-detail-client.tsx`, `src/app/super-admin/agencies/[id]/page.tsx`

> You need to be able to reach clients without leaving the super admin.

- [x] **S4.1 — Send email to a specific agency owner** ✅
  - "Send Email" card on the agency detail page right column
  - Opens a compose dialog: subject + body
  - Sends via Resend to the agency's contact email
  - Logs the email in `agency_emails` table
  - `sendAgencyEmail()` server action in `src/app/super-admin/actions.ts`
  - Files: `src/app/super-admin/agencies/[id]/agency-detail-client.tsx`

- [x] **S4.2 — Broadcast email to all agencies (or filtered group)** ✅
  - "Email All Agencies" button on the super admin dashboard header
  - Filter target: All / Active only / Trial expiring / Free / Starter / Professional / Enterprise tier
  - `sendBroadcastEmail()` server action iterates filtered agencies & sends via Resend
  - `BroadcastEmailDialog` client component with filter, subject, body
  - Files: `src/components/super-admin/broadcast-email-dialog.tsx`, `src/app/super-admin/page.tsx`

- [x] **S4.3 — Broadcast banner improvements** ✅
  - Target banner by tier (`target_tier`) and status (`target_status`) columns added to `system_broadcasts`
  - Set an expiry date (`expires_at`) for auto-dismiss
  - `BroadcastManager` form updated with tier/status/expiry fields, uses `createBroadcastWithTargeting()`
  - `BroadcastBanner` filters broadcasts by agency tier/status and skips expired
  - Broadcast list shows targeting badges (tier, status, expiry date)
  - DB migration: `add_agency_emails_and_notifications`
  - Files: `src/lib/supabase/broadcasts.ts`, `src/components/super-admin/broadcast-manager.tsx`, `src/components/admin/broadcast-banner.tsx`

- [x] **S4.4 — In-app notification to agency admin** ✅
  - Send notification from agency detail page ("Send Notification" card with title, message, type)
  - `agency_notifications` table: id, agency_id, title, message, type, is_read, created_at
  - Bell icon in admin sidebar header with unread count badge
  - Popover with notification list, marks as read on open
  - `sendNotification()` and `sendBulkNotification()` server actions
  - `markNotificationsRead()` action, `getUnreadNotificationCount()`, `getNotifications()` helpers
  - Files: `src/components/admin/notification-bell.tsx`, `src/lib/supabase/notifications.ts`, `src/components/admin/admin-sidebar.tsx`, `src/components/admin/layout-shell.tsx`, `src/app/admin/layout.tsx`

---

## 🔍 GROUP S5 — Audit Log & Activity Tracking

> You need to know what's happening across the platform.

- [x] **S5.1 — Platform-wide activity feed** ✅
  - "Activity Feed" tab on super admin dashboard showing recent events across all tenants
  - `audit_log` table: `id`, `agency_id`, `actor_id`, `action`, `category`, `metadata` (jsonb), `created_at`
  - Indexed on `created_at`, `agency_id`, `category`, `actor_id` for fast queries
  - `getRecentActivity(limit)` fetches + enriches with agency names
  - `ActivityFeed` client component with category icons, relative timestamps, agency badges
  - DB migration: `add_audit_log`
  - Files: `src/lib/supabase/audit-log.ts`, `src/components/super-admin/activity-feed.tsx`, `src/app/super-admin/page.tsx`

- [x] **S5.2 — Per-agency audit log** ✅
  - "Activity Log" card on agency detail page showing all actions for that agency
  - `getAgencyAuditLog(agencyId, limit)` fetches filtered by agency
  - Reuses `ActivityFeed` component
  - Files: `src/app/super-admin/agencies/[id]/page.tsx`, `src/app/super-admin/agencies/[id]/agency-detail-client.tsx`

- [x] **S5.3 — Super admin action log** ✅
  - "My Actions" tab on super admin dashboard showing actions taken by the current super admin
  - `getSuperAdminActions(limit)` fetches logs filtered by current user's `actor_id`
  - All 14 super admin actions instrumented with `logAudit()` calls:
    - Agency: create, update details, update modules, suspend, unsuspend, clone, delete
    - Billing: update billing, record payment
    - Communication: send email, broadcast email, send notification, bulk notification
    - Broadcast: create targeted broadcast
  - Files: `src/app/super-admin/actions.ts`, `src/app/super-admin/page.tsx`

---

## 📈 GROUP S6 — Platform Analytics

> Understand your own SaaS business growth.

- [x] **S6.1 — MRR (Monthly Recurring Revenue) tracker** ✅
  - Calculate MRR from active agency subscriptions: sum of `monthly_price` for all active agencies
  - Show on super admin home: current MRR + MRR growth vs last month
  - `MRRCard` component shows current MRR with growth % vs previous month (green/red trend arrow)
  - Added `currentMRR`, `previousMRR`, `churnedThisMonth` to `PlatformStats` type
  - MRR KPI card added to KPI Row 2 on dashboard
  - Files: `src/lib/supabase/super-admin.ts`, `src/components/super-admin/platform-analytics.tsx`, `src/app/super-admin/page.tsx`

- [x] **S6.2 — Churn tracking** ✅
  - When an agency is cancelled/suspended, record churn reason
  - `churned_at` and `churn_reason` columns added to `agencies` table (DB migration: `add_churn_tracking_fields`)
  - `suspendAgency()` now sets `churned_at` + `churn_reason`; `unsuspendAgency()` clears them
  - `updateAgencyBilling()` sets churn on `cancelled` status, clears on `active`
  - `ChurnCard` component shows churn rate + table of recently churned agencies with lost MRR
  - `getChurnedAgencies()` data layer function
  - Files: `src/app/super-admin/actions.ts`, `src/components/super-admin/platform-analytics.tsx`

- [x] **S6.3 — Booking volume by agency (leaderboard)** ✅
  - A ranked table of your top agencies by bookings this month
  - `BookingLeaderboard` component with medal icons (🥇🥈🥉) for top 3, shows booking count + revenue
  - `getBookingLeaderboard()` aggregates bookings this month per agency, sorted by count
  - Files: `src/lib/supabase/super-admin.ts`, `src/components/super-admin/platform-analytics.tsx`

- [x] **S6.4 — Platform growth chart** ✅
  - `PlatformGrowthChart` component with toggle: New Agencies (bar chart) / MRR (line chart)
  - 12-month view showing new agencies per month and MRR at end of each month
  - `getPlatformGrowthData()` calculates both metrics from agency `created_at` and `monthly_price`
  - Files: `src/lib/supabase/super-admin.ts`, `src/components/super-admin/platform-analytics.tsx`

- [x] **S6.5 — Export all agency data to CSV** ✅
  - `ExportCSVButton` component generates and downloads CSV client-side
  - Columns: name, slug, domain, status, tier, subscription, monthly price, contact email, total bookings, total revenue, created date
  - `getAgencyExportData()` fetches all agencies + aggregates booking stats per agency
  - New "Analytics" tab on dashboard with Export button, Growth Chart, Leaderboard, and Churn Card
  - Files: `src/lib/supabase/super-admin.ts`, `src/components/super-admin/platform-analytics.tsx`, `src/app/super-admin/page.tsx`

# 📝 Blog — Public Page & Admin Dashboard Improvements

> The blog exists but is very basic. These upgrades turn it into a real content marketing engine — drives SEO traffic and builds trust.

---

## 🌐 GROUP B1 — Public Blog Page (Reader Experience)

> What visitors see at `/blog` and `/blog/[slug]`. Currently it's a plain list — needs to feel like a real travel magazine.

- [x] **B1.1 — Featured post hero on blog listing page** ✅
  - Full-width hero card at top of `/blog` with banner image, title, excerpt, author, date, "Read article" CTA
  - Grid of remaining posts below in 2-3 column layout
  - Admin can pin a post via `is_featured` toggle in the editor (DB: `is_featured` boolean on `posts`)
  - Fallback: picks first post with featured image if none is pinned
  - Files: `src/app/blog/page.tsx`, `src/app/admin/blog/[slug]/edit/page.tsx`

- [x] **B1.2 — Post categories / tags** ✅
  - `tags` (text array) already in posts schema — multi-select Combobox in admin editor
  - Tag chips on each post card and on post detail page (clickable → filters)
  - Filter bar on `/blog` with All + tag badges; URL-based filtering via `?tag=`
  - Files: `src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx`

- [x] **B1.3 — Estimated read time on post cards** ✅
  - `estimateReadingMinutes()` — `Math.max(1, Math.round(wordCount / 200))`
  - Shown on blog listing cards and at the top of post detail page
  - Files: `src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx`

- [x] **B1.4 — Author bio section on post detail page** ✅
  - `AuthorBio` component below post content: avatar initial, name, agency name, social links
  - Reads from agency settings (`socialMedia`, `contactEmail`, `agencyName`)
  - Social link icons for Twitter/X, Facebook, Instagram, Email
  - File: `src/components/blog/blog-components.tsx`

- [x] **B1.5 — Related posts section at bottom of each post** ✅
  - "You might also like" — 3 posts scored by shared tags, fallback to recent
  - `getRelatedPosts(slug, tags, limit)` in data layer — fetches 20 posts, scores by tag overlap
  - `RelatedPosts` component with image cards, tags, excerpt, date, read time
  - Files: `src/lib/supabase/blog.ts`, `src/components/blog/blog-components.tsx`

- [x] **B1.6 — Social share buttons on post detail page** ✅
  - `SocialShareButtons` component: Facebook, X (Twitter), WhatsApp, Copy Link
  - WhatsApp pre-fills `wa.me/?text=` with title + URL
  - Copy button shows green checkmark on success, auto-resolves full URL on client
  - Shown at top (under author/date) and bottom of post
  - File: `src/components/blog/blog-components.tsx`

- [x] **B1.7 — Table of contents for long posts** ✅
  - `TableOfContents` component auto-generates TOC from `<h2>` and `<h3>` headings
  - Desktop: sticky sidebar (240px, `top-24`, scrollable)
  - Mobile: collapsible accordion at top with ▲/▼ toggle
  - `injectHeadingIds()` adds `id` attributes to headings for anchor scrolling
  - Only renders when ≥3 headings found
  - Files: `src/components/blog/blog-components.tsx`, `src/app/blog/[slug]/page.tsx`

- [x] **B1.8 — Newsletter / email capture widget** ✅
  - `NewsletterForm` component: inline CTA with email input + Subscribe button
  - `subscribers` table (id, agency_id, email, subscribed_at) with unique constraint on (agency_id, email)
  - `subscribeToNewsletter` server action with email validation
  - `subscribeEmail()` data layer function with upsert (duplicate = success)
  - RLS: public insert, agency admin read/delete, super admin full access
  - DB migration: `add_blog_featured_and_subscribers`
  - Files: `src/components/blog/blog-components.tsx`, `src/app/actions.ts`, `src/lib/supabase/blog.ts`

- [x] **B1.9 — Post search bar on `/blog`** ✅
  - Search form at top of blog listing: text input with search icon + Search button
  - Server-side filtering via `?q=` query param — matches title, content, author
  - Works alongside tag filtering (`?tag=`)
  - File: `src/app/blog/page.tsx`

- [x] **B1.10 — "Back to top" button on long post pages** ✅
  - `BackToTopButton` component: floating button appears after scrolling 300px
  - Smooth scroll to top on click, primary color, hover scale effect
  - Added to both blog listing and post detail pages
  - File: `src/components/blog/blog-components.tsx`

---

## ✍️ GROUP B2 — Admin Blog Editor Improvements

> What the agency admin sees at `/admin/blog`. Currently a basic form — needs to be a proper CMS.

- [ ] **B2.1 — Rich text / WYSIWYG editor (replace textarea)**
  - Replace the plain HTML textarea with a proper rich text editor
  - Recommended: `@tiptap/react` (lightweight, headless, extensible)
  - Features needed: bold, italic, headings (H2/H3), bullet lists, numbered lists, blockquote, links, images inline
  - The current toolbar buttons likely insert raw HTML — WYSIWYG would be far more usable for non-technical clients

- [ ] **B2.2 — Post scheduling**
  - Add a "Publish At" date/time field
  - If set to a future time, post status is `Scheduled` — becomes `Published` automatically when the time arrives
  - Useful for planning content calendars (publish every Tuesday at 9am)
  - Requires a cron job or Supabase Edge Function triggered by a scheduled task

- [ ] **B2.3 — Post preview (live preview before publishing)**
  - "Preview" button opens the post as it would look on the public blog in a new tab
  - Passes post content via a temporary preview token/session
  - Essential — admins need to see formatting before they publish

- [ ] **B2.4 — Duplicate / clone a post**
  - "Duplicate" button on the post list — creates a draft copy with "(Copy)" in the title
  - Useful for seasonal content: clone last year's Ramadan post and update the dates

- [ ] **B2.5 — Bulk actions on post list**
  - Select multiple posts via checkbox
  - Bulk: Publish / Unpublish / Delete
  - Useful for managing large post archives

- [ ] **B2.6 — Post cover image with crop tool**
  - Current image upload just stores a URL — add an in-browser crop to ensure correct aspect ratio (16:9 for blog hero images)
  - Use `react-image-crop` package
  - Prevents distorted/off-center cover images that look unprofessional

- [ ] **B2.7 — SEO preview card in the post editor**
  - Below the SEO title/description fields in the post form: show a live preview of how the post will appear in Google search results
  - Shows the blue title link, URL slug, and meta description snippet
  - Already popular in WordPress/Ghost — clients expect this

- [ ] **B2.8 — Reading stats per post**
  - Show on the post list/detail: view count, estimated reads, avg time on page
  - Requires a simple view counter: increment a `views` column on each public page load
  - Helps admin know which content performs best

- [ ] **B2.9 — Tags management UI**
  - A separate `/admin/blog/tags` page to create, rename, merge, or delete tags
  - Currently tags would just be freeform — a management UI prevents duplicates like "egypt" vs "Egypt" vs "egypt-tours"

- [ ] **B2.10 — AI blog post improvements**
  - Currently AI generates a post from a topic prompt — extend it with:
    - "Tone" selector: Informative / Inspiring / Promotional / Casual
    - "Target keyword" input (for SEO focus — AI weaves it in naturally)
    - "Word count" selector: Short (400w) / Medium (800w) / Long (1500w)
    - Auto-suggest 5 post topic ideas based on the agency's destination list

---

## 📊 GROUP B3 — Blog Analytics & SEO

- [ ] **B3.1 — Post view counter**
  - Increment `views` on each public post page load (server-side, via a fire-and-forget API call)
  - Display view count in the admin post list: "1,234 views"
  - Use a debounce / session check to avoid counting refresh spams

- [ ] **B3.2 — Most popular posts widget on blog listing page**
  - A sidebar or section: "Most Read This Month" — 5 posts ranked by views
  - Drives traffic to popular content instead of only showing chronological order

- [ ] **B3.3 — JSON-LD structured data on blog posts**
  - Add `Article` schema to each post page: `headline`, `image`, `author`, `datePublished`, `publisher`
  - This is a direct SEO signal — Google uses it for rich results (author name, publish date shown in search)

- [ ] **B3.4 — Automatic internal linking suggestions**
  - When writing a post in the editor, detect when a tour name or destination is mentioned
  - Show a suggestion: "Link 'Cairo Pyramids Tour' to its tour page?"
  - Improves SEO (internal links) and UX (readers can book directly from a blog post)

---

## ✅ Hero Section Overhaul (Bonus — not originally in checklist)

- [x] **Hero full-bleed layout** — hero section extends 100vw using `w-screen ml-[calc(50%-50vw)]`, visually filling the entire viewport regardless of container constraints
- [x] **Hero extends under the fixed header** — negative top margin `mt-[-84px] md:mt-[-134px]` makes the hero start at y=0
- [x] **Tabbed search widget for tours mode** — "Find a Tour" tab (keyword + destination + tour type + search) and "Custom Trip" tab (personalized trip CTA), animated with Framer Motion
- [x] **Improved hotel mode search** — dedicated card with "Check Availability" header and `HotelSearchBox`
- [x] **Hero subtitle styling improved** — clean text without heavy glassmorphism pill
- [x] **Eyebrow badge** — "Discover & Explore" / "Luxury Stays" badge above the title
- [x] **Stats bar** — 500+ Tours · 50+ Destinations · 10K+ Happy Travelers, fully translatable
- [x] **Slideshow indicator dots** — clickable dots when hero has multiple images
- [x] **Ken Burns effect on hero images** — scale 1.04 → 1 on image transition
- [x] **Added 10 new translation keys** across all 5 locale files (hero.discover, hero.findATour, hero.customTrip, hero.searchTours, hero.customTripTitle, hero.customTripDesc, hero.statTours, hero.statDestinations, hero.statTravelers, hero.checkAvailability)

---

| Priority        | Task                           | Why                                        |
| --------------- | ------------------------------ | ------------------------------------------ |
| 🔴 Do first     | B2.1 Rich text WYSIWYG editor  | Textarea is unusable for real clients      |
| 🔴 Do first     | B1.2 Post categories / tags    | Structure — everything else builds on it   |
| 🔴 Do first     | B2.3 Post preview              | Clients need to see before publishing      |
| 🟠 High value   | B1.1 Featured post hero        | Makes the blog look like a real magazine   |
| 🟠 High value   | B1.5 Related posts             | Keeps readers on site longer               |
| 🟠 High value   | B1.6 Social share buttons      | WhatsApp sharing is huge in MENA           |
| 🟠 High value   | B2.7 SEO preview card          | Non-technical clients can't visualize SEO  |
| 🟠 High value   | B2.10 AI improvements          | More control = better content quality      |
| 🟡 Nice to have | B1.8 Email capture widget      | Builds a subscriber list from blog readers |
| 🟡 Nice to have | B1.4 Author bio                | Credibility signal                         |
| 🟡 Nice to have | B3.1 View counter              | Know what performs                         |
| 🟡 Nice to have | B2.2 Post scheduling           | Content calendar planning                  |
| 🔵 Future       | B1.7 Table of contents         | Only needed for very long guides           |
| 🔵 Future       | B3.4 Internal link suggestions | Advanced SEO, complex to build             |

---

---

# 🛎️ Services Page & Upselling — Public + Admin Improvements

> The services/upsell system exists but is underused. These upgrades turn it into a real revenue engine — both on the customer-facing services page and inside the admin panel.

---

## 🌐 GROUP SV1 — Public Services Page (Customer Experience)

> Currently `/services` shows a plain list of upsell items. It should feel like a proper services catalogue that makes guests want to add extras.

- [ ] **SV1.1 — Category-based layout on services page**
  - Group services by category: Airport Transfers / Tours & Excursions / Spa & Wellness / Food & Dining / Equipment Rental / etc.
  - Each category has a heading + icon, services listed below in a card grid
  - Currently all items are dumped in a flat list — grouping makes scanning 10x easier
  - Admin assigns a category to each upsell item in the dashboard

- [ ] **SV1.2 — Service detail modal / page**
  - Clicking a service card opens a modal (or dedicated page) with:
    - Full description, multiple images, inclusions list, exclusions, duration, what-to-bring
    - Pricing breakdown (per person / per group / flat fee)
    - "Add to Cart" button directly from the modal
  - Currently there's no way to see more details about a service — just a card with a price

- [ ] **SV1.3 — "Add to Cart" directly from services page**
  - Each service card has an "Add" button that adds the item to the cart without navigating away
  - Show a quantity selector (+/−) on the card after adding — guests can increase quantity in-place
  - Currently upsell items are only added from the cart page — customers don't think to go back there

- [ ] **SV1.4 — Service availability indicator**
  - Show a badge on each card: "Available Today" / "Book in Advance" / "Sold Out"
  - Based on stock/inventory field on the upsell item
  - Creates urgency and sets expectations

- [ ] **SV1.5 — "Most Popular" / "Recommended" badges**
  - Admin can flag 1–3 items as "Most Popular" or "Staff Pick"
  - These items show a highlighted badge and appear first in their category
  - Social proof within the services catalogue drives more adds

- [ ] **SV1.6 — Bundle / package deals section**
  - A dedicated section at the top of the services page: pre-built bundles
  - Example: "Romance Package — Airport Transfer + Spa + Breakfast — Save 20%"
  - Admin creates bundles by grouping upsell items and setting a bundle price
  - Bundles added to cart as a single item

- [ ] **SV1.7 — Services page hero / intro section**
  - A short hero at the top of `/services`: headline, subtext, optional background image
  - "Enhance your stay with our curated add-on services"
  - Admin edits this text from general settings or page settings
  - Currently the page starts abruptly with cards — no context for first-time visitors

- [ ] **SV1.8 — "Frequently Bought Together" on tour/hotel detail pages**
  - Below the booking form on tour and hotel pages: "Guests also add..."
  - Shows 2–3 relevant upsell items based on destination or category targeting
  - Uses the existing `targeting` logic on upsell items — just needs a better UI placement

---

## 🔧 GROUP SV2 — Admin Upsell Item Management

> What the agency admin sees at `/admin/upsell-items`. Needs much better tools for creating, organizing, and measuring upsell performance.

- [ ] **SV2.1 — Add category field to upsell items**
  - New field in the upsell item form: Category (dropdown or free text with suggestions)
  - Pre-set options: Airport Transfer / Tours & Excursions / Spa & Wellness / Food & Dining / Equipment Rental / Other
  - Enables the category-based layout on the public services page (SV1.1)
  - Supabase: add `category` column to `upsell_items` table

- [ ] **SV2.2 — Multiple images per upsell item**
  - Currently upsell items likely have one image — allow up to 5
  - Shown as a mini carousel in the service detail modal
  - Helps customers see exactly what they're getting (e.g., photos of the spa room, the transfer vehicle)

- [ ] **SV2.3 — Rich description editor for upsell items**
  - Replace the plain textarea with the same WYSIWYG editor used for blog posts (TipTap)
  - Allows: bullet lists for inclusions/exclusions, bold highlights, embed a photo inline
  - Non-technical admins struggle with plain text for service descriptions

- [ ] **SV2.4 — Inclusions & exclusions fields**
  - Separate structured fields: "What's Included" and "What's Not Included" (list of bullet points)
  - Shown clearly in the service detail modal with ✅ / ❌ icons
  - Reduces support questions: "Does the airport transfer include luggage handling?"

- [ ] **SV2.5 — Stock / inventory tracking per upsell item**
  - Optional `stock` field: leave blank for unlimited, set a number for limited items (e.g., "Only 3 spa slots available today")
  - Stock decrements when item is added to a confirmed booking
  - Show "Only X left" badge on the services page card

- [ ] **SV2.6 — Upsell item performance stats**
  - On the upsell items list in the admin: add columns for "Times Sold" and "Revenue Generated"
  - Calculated from confirmed bookings that contain the item
  - Admins can see which services guests actually buy — invaluable for decisions on what to create more of

- [ ] **SV2.7 — Duplicate upsell item**
  - "Duplicate" button on each item — creates a copy with "(Copy)" in the name
  - Useful for creating seasonal variants: "Airport Transfer (Peak Season)" vs "Airport Transfer (Standard)"

- [ ] **SV2.8 — Sort / reorder upsell items**
  - Drag-to-reorder list in the admin — controls the display order on the public services page
  - Currently order is presumably by creation date — admin should control what appears first

- [ ] **SV2.9 — "Featured on Home Page" toggle**
  - Checkbox on each upsell item: "Show on home page in services spotlight"
  - Feeds a "Our Services" section on the home page (new section, see SV3.1)
  - Admin picks 3–6 top services to highlight without showing the full catalogue

- [ ] **SV2.10 — Upsell targeting improvements**
  - Currently targeting is: specific destinations or specific tour IDs
  - Extend to also target: **hotel bookings only**, **tour bookings only**, **any booking over $X**, **specific room types**
  - Example: show "Late Check-out" service only when a hotel room is in the cart

---

## 🏠 GROUP SV3 — Services on the Home Page

> Services are almost never discovered unless a guest stumbles on the /services page. Bringing them to the home page massively increases add-on revenue.

- [ ] **SV3.1 — "Our Services" spotlight section on home page**
  - A 3–6 card section on the home page (between hotels and testimonials)
  - Shows only items flagged as "Featured on Home Page" (see SV2.9)
  - Each card: icon or image, service name, one-line description, price, "Add to Cart" button
  - "View All Services →" link at the bottom
  - Admin controls this section visibility from the Home Page Editor

- [ ] **SV3.2 — Services highlight in checkout sidebar**
  - On the checkout page, in the right sidebar (below the order summary): "Enhance your booking"
  - Shows 2–3 relevant upsell items based on what's in the cart (destination/tour targeting)
  - Currently upsell is shown on the cart page — checkout is the highest intent moment, show them here too

---

## 📊 GROUP SV4 — Upsell Analytics

- [ ] **SV4.1 — Upsell revenue card on admin dashboard**
  - Add a new stat card to the admin dashboard: "Add-on Revenue This Month"
  - Sum of revenue from all upsell items in confirmed bookings for the current month
  - Shows the admin the value of their upsell catalogue at a glance

- [ ] **SV4.2 — Top-selling services widget on dashboard**
  - A small ranked list on the dashboard: Top 5 services by revenue this month
  - Name / units sold / revenue
  - Shows which services warrant more promotion or new variants

- [ ] **SV4.3 — Cart abandonment tracking for upsell items**
  - Track how often a upsell item is added to cart vs actually confirmed in a booking
  - "Add-to-cart rate" vs "conversion rate" per item
  - If an item is added often but rarely confirmed, it may have a pricing problem

---

## 💡 Services & Upsell Prioritization Guide

| Priority        | Task                                   | Why                                                       |
| --------------- | -------------------------------------- | --------------------------------------------------------- |
| 🔴 Do first     | SV2.1 Category field on items          | Unlocks all category-based UI                             |
| 🔴 Do first     | SV1.1 Category layout on services page | Makes the page actually usable                            |
| 🔴 Do first     | SV1.3 Add to Cart from services page   | Critical conversion gap — guests can't add from there now |
| 🟠 High value   | SV3.1 Services section on home page    | Most guests never visit /services — bring it to them      |
| 🟠 High value   | SV3.2 Upsell in checkout sidebar       | Highest-intent moment for add-ons                         |
| 🟠 High value   | SV2.6 Performance stats per item       | Know what sells before investing time in new items        |
| 🟠 High value   | SV1.2 Service detail modal             | Guests need details before buying                         |
| 🟠 High value   | SV2.4 Inclusions & exclusions fields   | Reduces support questions, increases trust                |
| 🟡 Nice to have | SV1.6 Bundle / package deals           | Higher average order value                                |
| 🟡 Nice to have | SV2.5 Stock tracking                   | Urgency + prevents overbooking services                   |
| 🟡 Nice to have | SV4.1 Upsell revenue dashboard card    | Visibility into add-on revenue                            |
| 🟡 Nice to have | SV2.10 Targeting improvements          | Better relevance = higher conversion                      |
| 🔵 Future       | SV4.3 Cart abandonment tracking        | Advanced analytics                                        |
| 🔵 Future       | SV1.8 Frequently bought together       | Amazon-style cross-sell                                   |

---

## 💡 Super Admin Prioritization Guide

| Priority        | Task                                  | Why                                             |
| --------------- | ------------------------------------- | ----------------------------------------------- |
| 🔴 Do first     | S1.1 Dashboard KPI cards              | You need a home screen, not just a list         |
| 🔴 Do first     | S2.1 Agency detail page               | No drill-down exists today — critical gap       |
| 🔴 Do first     | S3.1 Billing fields in DB             | Foundation for all billing features             |
| 🔴 Do first     | S3.2 Plan/billing status in list      | Which clients have paid? You can't see this now |
| 🟠 High value   | S2.3 Agency internal notes            | Basic CRM for client conversations              |
| 🟠 High value   | S3.4 Manual payment recording         | Track revenue before Stripe is built            |
| 🟠 High value   | S4.4 In-app notifications to agencies | Push important messages to clients              |
| 🟠 High value   | S1.2 Agency health status             | Spot churning clients early                     |
| 🟡 Nice to have | S5.1 Platform activity feed           | Visibility into what's happening                |
| 🟡 Nice to have | S6.1 MRR tracker                      | Know your own SaaS revenue                      |
| 🟡 Nice to have | S4.2 Broadcast email to agencies      | Better than the banner for important news       |
| 🔵 Future       | S7.1 2FA for super admin              | Security hardening                              |
| 🔵 Future       | S6.4 Platform growth chart            | After you have enough clients                   |

---

## 💡 Prioritization Guide (Single Hotel)

| Priority        | Task                           | Why                                       |
| --------------- | ------------------------------ | ----------------------------------------- |
| 🔴 Do first     | H1.1 Rooms on home page        | Core missing feature                      |
| 🔴 Do first     | H1.3 Hero availability widget  | Converts visitors instantly               |
| 🔴 Do first     | H2.2 Scroll-aware header       | Makes site feel premium, 30 min effort    |
| 🟠 High value   | H2.4 Amenities section         | Guests check this before every booking    |
| 🟠 High value   | H2.5 Photo gallery             | Visual trust — critical for hotels        |
| 🟠 High value   | H3.2 Special occasion checkout | Huge guest satisfaction, near-zero effort |
| 🟠 High value   | H3.3 Add-ons at hotel checkout | Direct revenue increase                   |
| 🟡 Nice to have | H3.1 Room comparison           | Differentiator vs competitors             |
| 🟡 Nice to have | H3.7 Seasonal packages         | Revenue in slow season                    |
| 🟡 Nice to have | H2.7 Map section               | Answers a guest's key question            |
| 🔵 Future       | H3.8 Nearby attractions        | SEO + trust content                       |
| 🔵 Future       | H2.8 Instagram grid            | Authenticity / social proof               |


//test 1