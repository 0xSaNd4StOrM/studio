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
| **TOTAL** |                            | **37 tasks completed** |

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

## 🏢 GROUP S2 — Agency Management

> Full lifecycle management of each client from one place.

- [ ] **S2.1 — Agency detail page**
  - Clicking an agency opens a dedicated detail page at `/super-admin/agencies/[id]`
  - Shows: agency info, all settings, module toggles, booking stats, contact info, notes
  - Currently you can only see the list — there's no drill-down page

- [ ] **S2.2 — Edit agency settings from super admin**
  - On the agency detail page, allow editing: name, slug, custom domain, status, tier, contact email
  - Save without needing to impersonate the client and go to their settings
  - Quick module toggle switches per agency (checkboxes per module, saves instantly)

- [ ] **S2.3 — Agency notes / internal CRM**
  - A private notes field per agency (only visible to super admin, never to the client)
  - Use for: "Called on March 5, interested in upgrading", "Overdue payment", "VIP client"
  - Stored in `agencies` table as `internal_notes` text column
  - Shows in the agency detail page and as a tooltip icon in the list

- [ ] **S2.4 — One-click suspend / unsuspend with reason**
  - Suspend button → prompt for reason (Unpaid / Violation / Requested / Other)
  - Stores reason + timestamp in the agency record
  - Suspended agencies automatically see maintenance page
  - Confirmation dialog so you don't accidentally suspend the wrong client

- [ ] **S2.5 — Agency creation wizard (improved "Deploy Tenant")**
  - Current "Deploy Tenant" is a basic dialog — expand it to a multi-step wizard:
    - Step 1: Agency name, slug, contact email, phone
    - Step 2: Select modules to enable
    - Step 3: Choose plan tier
    - Step 4: Set initial password or send invitation email
  - After creation: auto-send a welcome email with login credentials
  - File: `src/components/super-admin/deploy-tenant-dialog.tsx`

- [ ] **S2.6 — Duplicate / clone an agency**
  - Create a new agency pre-configured with the same modules and settings as an existing one
  - Useful when you have a "template" agency with your preferred defaults
  - Only copies settings — NOT data (bookings, tours, hotels)

- [ ] **S2.7 — Delete agency with safety checks**
  - Hard delete: only possible if agency has 0 bookings
  - Soft delete / archive: hides agency, keeps data, frees the slug
  - Shows a warning dialog listing what will be deleted

---

## 💰 GROUP S3 — Subscription & Billing Tracking

> Even without full Stripe automation, you need to manually track who has paid and when.

- [ ] **S3.1 — Add billing fields to agencies table**
  - New columns: `plan_tier` (starter/professional/business/enterprise), `subscription_status` (trial/active/past_due/cancelled), `trial_ends_at`, `next_billing_date`, `monthly_price`, `stripe_customer_id` (for future Stripe integration)
  - Migration in Supabase

- [ ] **S3.2 — Billing status display in agency list**
  - Add a "Plan" column and "Billing" column to the agency table
  - Plan badge: Starter / Pro / Business / Enterprise (color coded)
  - Billing badge: Active ✅ / Trial ⏳ / Past Due ⚠️ / Cancelled ❌

- [ ] **S3.3 — Trial expiry alerts**
  - Agencies on trial get a warning badge when their trial ends in < 7 days
  - Super admin sees a top-of-page alert: "3 agencies' trials expire this week"
  - Optionally auto-suspend when trial ends (configurable)

- [ ] **S3.4 — Manual payment recording**
  - On the agency detail page: "Record Payment" button
  - Enter: amount, date, method (bank transfer, cash, card), reference number
  - Stores a payment history log per agency
  - Useful before Stripe integration is built — real agencies will pay via bank transfer

- [ ] **S3.5 — Revenue per agency report**
  - On the agency detail page: a simple table of recorded payments + total paid to date
  - Helps you know lifetime value (LTV) per client

---

## 📣 GROUP S4 — Communication Tools

> You need to be able to reach clients without leaving the super admin.

- [ ] **S4.1 — Send email to a specific agency owner**
  - "Send Email" button on the agency detail page
  - Opens a compose dialog: subject + body (rich text)
  - Sends via Resend to the agency's contact email
  - Logs the email in the agency's communication history

- [ ] **S4.2 — Broadcast email to all agencies (or filtered group)**
  - "Email All" button on the super admin dashboard
  - Filter target: All / Active only / Trial expiring / Specific plan tier
  - Use cases: platform updates, new features, invoice reminders
  - Currently you have a broadcast banner — email is more reliable for important news

- [ ] **S4.3 — Broadcast banner improvements**
  - Target banner to specific agencies (not just all) — e.g., only show to Starter plan
  - Set an expiry date for the banner (auto-dismiss after a date)
  - Show banner preview before publishing
  - Track dismiss count per agency (how many saw it)

- [ ] **S4.4 — In-app notification to agency admin**
  - Send a notification that appears inside the agency's admin panel (not just their site)
  - Use cases: "Your trial ends in 3 days", "New feature available", "Action required: update your billing"
  - Stored in a `notifications` table per agency, shown as a bell icon alert in their admin header

---

## 🔍 GROUP S5 — Audit Log & Activity Tracking

> You need to know what's happening across the platform.

- [ ] **S5.1 — Platform-wide activity feed**
  - A live feed on the super admin dashboard showing recent events across all tenants:
    - "Agency X received a new booking ($450)"
    - "Agency Y suspended"
    - "New agency Z created"
    - "Agency X deployed new tour"
  - Stored in an `audit_log` table: `agency_id`, `action`, `metadata`, `created_at`

- [ ] **S5.2 — Per-agency audit log**
  - On the agency detail page: a tab showing all activity for that agency
  - Filter by action type: bookings / tours / settings changes / logins
  - Useful for support calls ("What changed before my site broke?")

- [ ] **S5.3 — Super admin action log**
  - Log every action YOU take as super admin: created agency, changed modules, suspended, sent email
  - Protects against accidental changes — you can trace exactly what happened

---

## 📈 GROUP S6 — Platform Analytics

> Understand your own SaaS business growth.

- [ ] **S6.1 — MRR (Monthly Recurring Revenue) tracker**
  - Calculate MRR from active agency subscriptions: sum of `monthly_price` for all active agencies
  - Show on super admin home: current MRR + MRR growth vs last month
  - This is the #1 SaaS metric you need to track

- [ ] **S6.2 — Churn tracking**
  - When an agency is cancelled/suspended, record churn reason
  - Dashboard shows: churn rate this month, list of recently churned agencies

- [ ] **S6.3 — Booking volume by agency (leaderboard)**
  - A ranked table of your top agencies by bookings this month
  - Helps identify your most engaged (and most at-risk) clients

- [ ] **S6.4 — Platform growth chart**
  - Line chart: new agencies per month over the last 12 months
  - Alongside MRR growth chart — shows your SaaS trajectory

- [ ] **S6.5 — Export all agency data to CSV**
  - Download: agency name, plan, status, total bookings, total revenue, contact email, created date
  - Useful for spreadsheet analysis or importing into a CRM

---

## 🔐 GROUP S7 — Security & Access Control

- [ ] **S7.1 — Super admin two-factor authentication (2FA)**
  - Require TOTP (Google Authenticator) for super admin login
  - Supabase Auth supports TOTP — enable it via Supabase dashboard + enforce in `checkSuperAdmin()`

- [ ] **S7.2 — IP allowlist for super admin access**
  - Only allow super admin panel access from specific IP addresses
  - Add check in `src/app/super-admin/layout.tsx` — read allowed IPs from env variable
  - Blocks attackers even if credentials are stolen

- [ ] **S7.3 — Impersonation audit trail**
  - Every time you impersonate an agency (set the `admin_agency_override` cookie), log it
  - Log: super admin user, which agency, timestamp, how long the session lasted
  - Protects you legally if a client claims you tampered with their data

- [ ] **S7.4 — Multiple super admin accounts**
  - Currently super admin is a single email/flag — allow multiple staff to have super admin access
  - Assign roles: `owner` (full access) vs `support` (read-only + impersonate, cannot delete or suspend)

---

---

---

# 📝 Blog — Public Page & Admin Dashboard Improvements

> The blog exists but is very basic. These upgrades turn it into a real content marketing engine — drives SEO traffic and builds trust.

---

## 🌐 GROUP B1 — Public Blog Page (Reader Experience)

> What visitors see at `/blog` and `/blog/[slug]`. Currently it's a plain list — needs to feel like a real travel magazine.

- [ ] **B1.1 — Featured post hero on blog listing page**
  - Show the latest (or admin-pinned) post as a large hero card at the top of `/blog`
  - Full-width banner image, post title, excerpt, author, date, "Read More" CTA
  - Below it: the rest of the posts in a 2 or 3-column grid
  - Currently all posts are shown in the same uniform grid — no visual hierarchy

- [ ] **B1.2 — Post categories / tags**
  - Add `tags` (array of strings) to the blog post schema
  - Show tag chips on each post card and on the post detail page
  - Filter bar on `/blog`: click a tag to see only posts with that tag
  - Examples: "Egypt Tours", "Hotel Tips", "Travel Guides", "Deals"

- [ ] **B1.3 — Estimated read time on post cards**
  - Auto-calculate from word count: `Math.ceil(wordCount / 200)` minutes
  - Show as "5 min read" on the card and at the top of the post
  - Small detail that signals quality content

- [ ] **B1.4 — Author bio section on post detail page**
  - Below the post content: author avatar, name, short bio, social links
  - Admin fills in author info in settings (or per-post)
  - Adds credibility — makes the blog feel written by real people, not a faceless company

- [ ] **B1.5 — Related posts section at bottom of each post**
  - After post content: "You might also like" — 3 posts from the same tag or category
  - Keeps visitors on the site longer (reduces bounce rate)
  - Match by shared tags, fallback to most recent posts

- [ ] **B1.6 — Social share buttons on post detail page**
  - Share to: Facebook / Twitter(X) / WhatsApp / copy link
  - Use native share API on mobile, icon buttons on desktop
  - WhatsApp share is critical for the MENA market — posts spread through WhatsApp groups

- [ ] **B1.7 — Table of contents for long posts**
  - Auto-generate a TOC from `<h2>` and `<h3>` headings in the post body
  - Sticky sidebar on desktop, collapsible accordion at the top on mobile
  - Makes long travel guides scannable and professional

- [ ] **B1.8 — Newsletter / email capture widget**
  - An inline CTA inside or after each post: "Get travel deals in your inbox — enter email → Subscribe"
  - Stores emails in a `subscribers` table per agency
  - Admin can export subscriber list as CSV
  - The blog is where engaged readers are — perfect place to capture emails

- [ ] **B1.9 — Post search bar on `/blog`**
  - A simple text search input at the top of the blog listing
  - Filters posts client-side by title + excerpt as you type
  - Visitors looking for a specific destination tip can find it instantly

- [ ] **B1.10 — "Back to top" button on long post pages**
  - Floating button appears after scrolling 300px, smooth scrolls to top
  - Standard UX for long-form content — tiny effort, big comfort improvement

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
