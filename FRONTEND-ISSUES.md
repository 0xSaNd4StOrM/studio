# Frontend Issues — Audit Report

_Date: April 2, 2026_

---

## Issue #1 — Dead Search Icon in Header

**File:** `src/components/header.tsx` ~line 322  
**Severity:** Medium — UX confusion

### Problem
The search `<Button>` in the navbar has no `onClick`, no `href`, and opens no dialog. Clicking it does absolutely nothing.

```tsx
// CURRENT — does nothing
<Button variant="ghost" size="icon" className="hidden sm:flex">
  <Search className={cn('h-5 w-5', iconClass)} />
  <span className="sr-only">Search</span>
</Button>
```

### Fix Options
**Option A — Wire it to the tours search page (recommended):**
```tsx
<Button
  variant="ghost"
  size="icon"
  className="hidden sm:flex"
  onClick={() => router.push('/tours')}
>
  <Search className={cn('h-5 w-5', iconClass)} />
  <span className="sr-only">Search</span>
</Button>
```
Requires adding `useRouter` from `next/navigation` to `Header`.

**Option B — Remove it entirely:**
Delete the entire button block if a dedicated search page is not planned.

---

## Issue #2 — Footer Newsletter Form Does Nothing

**File:** `src/components/footer.tsx` ~line 97  
**Severity:** High — trust damage; users expect a confirmation but get nothing

### Problem
The newsletter `<form>` has an email input and a "Subscribe" button, but **no `onSubmit`, no server action, no API call**. Submitting it causes a full-page reload and the input value is discarded silently.

```tsx
// CURRENT — decorative only
<form className="space-y-3">
  <Input type="email" placeholder={t('footer.emailPlaceholder')} ... />
  <Button type="submit" className="w-full rounded-lg">
    {t('footer.subscribeBtn')} <ArrowRight className="ml-2 h-4 w-4" />
  </Button>
</form>
```

### Fix
Add a controlled state + submit handler. Since there is no newsletter backend yet, the simplest honest fix is to show a toast and collect emails via the contact form, OR hook it into a real service (Resend Audiences, Mailchimp, etc.).

**Minimal fix — prevent reload + show feedback:**
```tsx
const [email, setEmail] = React.useState('');
const [subscribed, setSubscribed] = React.useState(false);

const handleSubscribe = (e: React.FormEvent) => {
  e.preventDefault();
  if (!email) return;
  // TODO: wire to actual newsletter service
  setSubscribed(true);
  setEmail('');
};

// In JSX:
<form className="space-y-3" onSubmit={handleSubscribe}>
  {subscribed ? (
    <p className="text-sm text-green-400">✓ Thanks! We'll be in touch.</p>
  ) : (
    <>
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('footer.emailPlaceholder')}
        className="bg-white text-gray-900 border-0 rounded-lg"
        required
      />
      <Button type="submit" className="w-full rounded-lg">
        {t('footer.subscribeBtn')} <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </>
  )}
</form>
```

---

## Issue #3 — Footer Legal Links Go to `href="#"`

**File:** `src/components/footer.tsx` ~line 253  
**Severity:** Medium — professionalism / potential legal exposure

### Problem
"Terms", "Privacy", and "Environmental" links in the footer bottom bar all use `href="#"`, which scrolls to the top of the page instead of navigating anywhere.

```tsx
// CURRENT — all point to "#"
<a href="#" className="hover:text-primary">{t('footer.terms')}</a>
<a href="#" className="hover:text-primary">{t('footer.privacy')}</a>
<a href="#" className="hover:text-primary">{t('footer.environmental')}</a>
```

### Fix Options
**Option A — Create real policy pages** at `/terms`, `/privacy`, `/environmental` and link to them.

**Option B — Hide until pages exist (recommended short-term):**
Remove these links entirely from the render output. They currently create false expectations and could be a liability.

```tsx
// Remove or comment out the entire block:
{/* 
  <a href="#" ...>{t('footer.terms')}</a>
  <a href="#" ...>{t('footer.privacy')}</a>
  <a href="#" ...>{t('footer.environmental')}</a>
*/}
```

---

## Issue #4 — Booking Status Poll Never Stops (Memory / DB Leak)

**File:** `src/app/(main)/checkout/success/page.tsx` ~line 75  
**Severity:** High — fires Supabase queries every 2 seconds indefinitely

### Problem
When payment status is `Confirmed` or `Cancelled`, the `checkBookingStatus` function returns early — but that only exits the function, **not the interval**. The `setInterval` keeps firing every 2 seconds for the entire time the user stays on the page.

```ts
// CURRENT — interval is never cleared on status resolution
if (booking.status === 'Confirmed') {
  setPaymentState('confirmed');
  clearCart();
  return; // ← exits the function, NOT the interval
}

if (booking.status === 'Cancelled') {
  setPaymentState('cancelled');
  return; // ← same issue
}
```

### Fix
Store the interval ID in a `ref` so it can be cleared when the status resolves:

```tsx
const intervalRef = React.useRef<number | undefined>(undefined);

useEffect(() => {
  let cancelled = false;

  async function checkBookingStatus() {
    if (!merchantOrderId) { setPaymentState('unknown'); return; }

    const booking = await getBookingById(merchantOrderId);
    if (cancelled) return;

    if (!booking) { setPaymentState('unknown'); return; }

    if (booking.status === 'Confirmed') {
      setPaymentState('confirmed');
      clearCart();
      // ✅ Stop polling — status is final
      window.clearInterval(intervalRef.current);
      return;
    }

    if (booking.status === 'Cancelled') {
      setPaymentState('cancelled');
      // ✅ Stop polling — status is final
      window.clearInterval(intervalRef.current);
      return;
    }

    setPaymentState('pending');
  }

  void checkBookingStatus();

  if (merchantOrderId) {
    intervalRef.current = window.setInterval(() => {
      void checkBookingStatus();
    }, 2000);
  }

  return () => {
    cancelled = true;
    window.clearInterval(intervalRef.current);
  };
}, [merchantOrderId, clearCart]);
```

---

## Issue #5 — Dead Hotel Search Code in Home Page

**File:** `src/app/(main)/home-client.tsx` ~line 276  
**Severity:** Low — dead code / code smell

### Problem
`_handleHotelSearch` and its associated state variables (`_setHotelLocation`, `_setCheckIn`, `_setCheckOut`) are all prefixed with `_` and referenced nowhere in the JSX. The `HotelSearchBox` component handles hotel search independently. This is leftover scaffolding that was never wired up.

```ts
// CURRENT — none of these are used
const [hotelLocation, _setHotelLocation] = React.useState('');
const [checkIn, _setCheckIn] = React.useState('');
const [checkOut, _setCheckOut] = React.useState('');
const [guests] = React.useState('2');

const _handleHotelSearch = () => { ... };
```

### Fix
Delete the 4 state variables and the `_handleHotelSearch` function entirely. Verify `HotelSearchBox` component is self-contained (it is).

---

## Issue #6 — Footer Phone Number Not Tappable on Mobile

**File:** `src/components/footer.tsx` ~line 238  
**Severity:** Low-Medium — mobile UX

### Problem
The phone number in the footer contact column is plain text inside a `<p>` tag. The header correctly uses `<a href="tel:...">`, but the footer does not — mobile users cannot tap to call.

```tsx
// CURRENT — plain text, not clickable
<div>
  <p>{phoneNumber}</p>
</div>
```

### Fix
Wrap in an anchor with `tel:` scheme:

```tsx
<div>
  <a href={`tel:${phoneNumber}`} className="hover:text-primary transition-colors">
    {phoneNumber}
  </a>
</div>
```

---

## Issue #7 — Header + Footer Both Fetch `getAgencySettings()` Independently

**File:** `src/components/header.tsx` ~line 237 and `src/components/footer.tsx` ~line 68  
**Severity:** Medium — performance; 2 extra Supabase round-trips on every page load

### Problem
Both shell components call `getAgencySettings()` inside a client-side `useEffect` independently on mount. Every page visit fires 2 parallel Supabase requests just for the shell, before user content is visible.

### Fix Options

**Option A — Create a shared `SettingsContext` (recommended):**
Create `src/components/providers/settings-provider.tsx` that fetches settings once and exposes them via context. Both `Header` and `Footer` consume the context instead of fetching independently.

```tsx
// src/components/providers/settings-provider.tsx
'use client';
const SettingsContext = React.createContext<AgencySettings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<AgencySettings | null>(null);
  React.useEffect(() => {
    getAgencySettings().then(setSettings).catch(() => {});
  }, []);
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => React.useContext(SettingsContext);
```

Wrap in `src/app/(main)/layout.tsx`:
```tsx
<SettingsProvider>
  <Header />
  {children}
  <Footer />
</SettingsProvider>
```

**Option B — Pass settings as props from the server layout:**
Fetch once in the server `layout.tsx` and pass as props to `Header` and `Footer`. Cleanest solution but requires making them accept props.

---

## Issue #8 — `/upsell-items` Page Is Orphaned (No Nav Link)

**File:** `src/app/(main)/upsell-items/` — the route exists but is unreachable  
**Severity:** Medium — discoverability; revenue loss

### Problem
The `/upsell-items` route renders all add-on items (transport, extras, etc.) but is **not linked from the header nav, footer, or any internal page**. Users can only reach it by typing the URL directly.

### Fix Options

**Option A — Add to nav under "Services":**
In `src/components/header.tsx`, add `/upsell-items` as a nav link (or merge it as a tab inside the Services page).

**Option B — Merge into the `/services` page:**
The `/services` page already filters `type === 'service'` from upsell items. Change it to show all upsell types (or add tabs), and remove the standalone `/upsell-items` route.

**Option C — Admin nav link setting:**
Let agency admins add it to their custom nav links via the home page editor settings panel.

---

## Summary Table

| # | File | Issue | Severity | Effort |
|---|------|-------|----------|--------|
| 4 | `checkout/success/page.tsx` | Polling interval never cleared | 🔴 High | 15 min |
| 2 | `footer.tsx` | Newsletter form does nothing | 🔴 High | 30 min |
| 3 | `footer.tsx` | Legal links go to `#` | 🟡 Medium | 10 min |
| 1 | `header.tsx` | Search icon is dead | 🟡 Medium | 15 min |
| 7 | `header.tsx` + `footer.tsx` | Double settings fetch | 🟡 Medium | 1–2 hr |
| 8 | `upsell-items/` route | Page is orphaned from nav | 🟡 Medium | 20 min |
| 6 | `footer.tsx` | Phone not tappable on mobile | 🟢 Low | 5 min |
| 5 | `home-client.tsx` | Dead hotel search handler | 🟢 Low | 5 min |
