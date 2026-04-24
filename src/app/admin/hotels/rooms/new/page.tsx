import Link from 'next/link';
import { addRoomType, getHotels } from '@/lib/supabase/hotels';
import { Button } from '@/components/ui/button';
import { RoomTypeForm } from '../room-type-form';

export default async function NewRoomTypePage() {
  const hotels = await getHotels({ skipTranslation: true });
  const activeHotel = hotels[0] || null;

  const createRoomType = async (formData: FormData) => {
    'use server';

    if (!activeHotel) {
      throw new Error('Hotel profile is missing for this account.');
    }

    const getStr = (key: string) => String(formData.get(key) || '').trim();
    const getNum = (key: string) => {
      const raw = getStr(key);
      if (!raw) return null;
      const val = Number(raw);
      return Number.isFinite(val) ? val : null;
    };

    const name = String(formData.get('name') || '').trim();
    const slug = String(formData.get('slug') || '').trim();
    const description = getStr('description');
    const maxAdults = Number(getStr('maxAdults') || 0);
    const maxChildren = Number(getStr('maxChildren') || 0);
    const isActive = formData.get('isActive') === 'on';

    if (!name) {
      throw new Error('Room name is required.');
    }

    const bedsJson = getStr('bedsJson') || '{}';
    let beds: Record<string, unknown> = {};
    try {
      beds = JSON.parse(bedsJson) as Record<string, unknown>;
    } catch {
      beds = {};
    }

    const amenities = formData
      .getAll('amenities')
      .map(String)
      .map((v) => v.trim())
      .filter(Boolean);

    const services = formData
      .getAll('services')
      .map(String)
      .map((v) => v.trim())
      .filter(Boolean);

    const highlights = formData
      .getAll('highlights')
      .map(String)
      .map((v) => v.trim())
      .filter(Boolean);

    const imageUrls = formData
      .getAll('imageUrls')
      .map(String)
      .map((v) => v.trim())
      .filter(Boolean);

    const images = formData
      .getAll('images')
      .filter((v): v is File => typeof v === 'object' && 'name' in v && 'size' in v)
      .filter((f) => f.size > 0);

    await addRoomType({
      hotelId: activeHotel.id,
      name,
      slug: slug || undefined,
      description: description || undefined,
      maxAdults: Number.isFinite(maxAdults) ? maxAdults : 0,
      maxChildren: Number.isFinite(maxChildren) ? maxChildren : 0,
      sizeSqm: getNum('sizeSqm'),
      view: getStr('view') || null,
      bathrooms: getNum('bathrooms'),
      floor: getNum('floor'),
      basePricePerNight: getNum('basePricePerNight'),
      currency: getStr('currency') || null,
      defaultUnits: getNum('defaultUnits'),
      smokingAllowed: formData.get('smokingAllowed') === 'on',
      refundable: formData.get('refundable') === 'on',
      breakfastIncluded: formData.get('breakfastIncluded') === 'on',
      petsAllowed: formData.get('petsAllowed') === 'on',
      extraBedAllowed: formData.get('extraBedAllowed') === 'on',
      extraBedFee: getNum('extraBedFee'),
      cancellationPolicy: getStr('cancellationPolicy') || undefined,
      beds,
      amenities,
      services,
      highlights,
      images: [...imageUrls, ...images],
      isFeatured: formData.get('isFeatured') === 'on',
      isActive,
    });
  };

  return !activeHotel ? (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>This account has no hotel profile yet, so rooms can’t be created.</span>
          <Button asChild size="sm">
            <Link href="/admin/hotels/setup">Create hotel profile</Link>
          </Button>
        </div>
      </div>
    </div>
  ) : (
    <RoomTypeForm mode="create" backHref="/admin/hotels/rooms" action={createRoomType} />
  );
}
