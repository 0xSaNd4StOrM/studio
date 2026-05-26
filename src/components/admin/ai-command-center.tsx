'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  generateAdvancedTailorMadePlanAction,
  generateBlogDraftForAdminAction,
  generateTourDraftForAdminAction,
} from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Sparkles, Clipboard, ClipboardCheck, Rocket, Plug } from 'lucide-react';
import Link from 'next/link';

const BLOG_DRAFT_STORAGE_KEY = 'admin-ai-blog-draft';
const TOUR_DRAFT_STORAGE_KEY = 'admin-ai-tour-draft';

type BlogDraftResult = NonNullable<
  Awaited<ReturnType<typeof generateBlogDraftForAdminAction>>['data']
>;
type TourDraftResult = NonNullable<
  Awaited<ReturnType<typeof generateTourDraftForAdminAction>>['data']
>;
type TailorMadePlanResult = NonNullable<
  Awaited<ReturnType<typeof generateAdvancedTailorMadePlanAction>>['data']
>;

function splitToUniqueList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  );
}

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatPlanSections(plan: TailorMadePlanResult): string {
  const itineraryLines = plan.itinerary
    .map((day) => `Day ${day.day}: ${day.title}\n${day.plan}`)
    .join('\n\n');
  const logistics = [
    `Transportation: ${plan.logistics.transportation}`,
    `Transfers: ${plan.logistics.transfers}`,
    `Accommodation: ${plan.logistics.accommodationPlan}`,
    `Support: ${plan.logistics.support}`,
  ].join('\n');

  return [
    `Tour Name: ${plan.tourName}`,
    '',
    'Executive Summary:',
    plan.executiveSummary,
    '',
    'Itinerary:',
    itineraryLines,
    '',
    'Logistics:',
    logistics,
    '',
    `Total Price Estimate: ${plan.totalPriceEstimate}`,
  ].join('\n');
}

export function AiCommandCenterConnectPrompt() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Command Center
        </CardTitle>
        <CardDescription>
          Connect your GitHub Copilot subscription to unlock blog drafts, tour bootstraps, and
          advanced tailor-made plans for this agency.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/admin/settings#copilot">
            <Plug className="mr-2 h-4 w-4" />
            Connect GitHub Copilot
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function AiCommandCenter() {
  const router = useRouter();
  const { toast } = useToast();

  const [blogForm, setBlogForm] = useState({
    topic: '7-day Egypt itinerary for first-time visitors',
    keywords: 'Egypt itinerary, Cairo, Luxor, Aswan, Nile cruise',
    tone: 'Inspiring and practical',
    audience: 'Couples and families planning a premium vacation',
    cta: 'Invite readers to request a custom quote with our travel team',
  });
  const [isGeneratingBlog, setIsGeneratingBlog] = useState(false);
  const [blogError, setBlogError] = useState<string | null>(null);
  const [blogResult, setBlogResult] = useState<BlogDraftResult | null>(null);

  const [tourForm, setTourForm] = useState({
    destination: 'Cairo and Giza',
    durationDays: '4',
    tourStyle: 'History and culture',
    audience: 'Families and small groups',
    mustInclude: 'Pyramids of Giza, Egyptian Museum, Khan El Khalili',
    budgetLevel: 'Mid-range',
  });
  const [isGeneratingTour, setIsGeneratingTour] = useState(false);
  const [tourError, setTourError] = useState<string | null>(null);
  const [tourResult, setTourResult] = useState<TourDraftResult | null>(null);

  const [tailorForm, setTailorForm] = useState({
    title: 'Egypt Signature Luxury Escape',
    travelDates: 'Dec 22, 2026 - Dec 30, 2026',
    regions: 'Cairo, Luxor, Aswan',
    participants: '4 adults',
    accommodation: '5-star hotels and Nile cruise suites',
    budget: '$3,500-$4,500 per traveler',
    interests: 'History, private experiences, gastronomy',
    pace: 'Balanced and comfortable',
    customPreferences: 'Private guide, fast-track airport assistance, sunset photo stops',
  });
  const [isGeneratingTailorPlan, setIsGeneratingTailorPlan] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [tailorResult, setTailorResult] = useState<TailorMadePlanResult | null>(null);
  const [lastCopiedTarget, setLastCopiedTarget] = useState<'json' | 'sections' | null>(null);

  const generateBlogDraft = async () => {
    setBlogError(null);
    setBlogResult(null);
    setIsGeneratingBlog(true);

    try {
      const result = await generateBlogDraftForAdminAction({
        topic: blogForm.topic,
        keywords: splitToUniqueList(blogForm.keywords),
        tone: optionalString(blogForm.tone),
        audience: optionalString(blogForm.audience),
        cta: optionalString(blogForm.cta),
      });

      if (!result.success || !result.data) {
        setBlogError(result.message ?? 'Failed to generate blog draft.');
        return;
      }

      setBlogResult(result.data);
      toast({
        title: 'Blog draft generated',
        description: 'Review the draft, then send it to the editor.',
      });
    } catch (error) {
      setBlogError(error instanceof Error ? error.message : 'Failed to generate blog draft.');
    } finally {
      setIsGeneratingBlog(false);
    }
  };

  const generateTourDraft = async () => {
    setTourError(null);
    setTourResult(null);
    setIsGeneratingTour(true);

    try {
      const parsedDuration = Number.parseInt(tourForm.durationDays, 10);

      const result = await generateTourDraftForAdminAction({
        destination: tourForm.destination,
        durationDays: Number.isFinite(parsedDuration) ? parsedDuration : 1,
        tourStyle: tourForm.tourStyle,
        audience: optionalString(tourForm.audience),
        mustInclude: splitToUniqueList(tourForm.mustInclude),
        budgetLevel: optionalString(tourForm.budgetLevel),
      });

      if (!result.success || !result.data) {
        setTourError(result.message ?? 'Failed to generate tour draft.');
        return;
      }

      setTourResult(result.data);
      toast({
        title: 'Tour draft generated',
        description: 'Tour draft is ready to push into the tour builder.',
      });
    } catch (error) {
      setTourError(error instanceof Error ? error.message : 'Failed to generate tour draft.');
    } finally {
      setIsGeneratingTour(false);
    }
  };

  const generateTailorMadePlan = async () => {
    setTailorError(null);
    setTailorResult(null);
    setLastCopiedTarget(null);
    setIsGeneratingTailorPlan(true);

    try {
      const result = await generateAdvancedTailorMadePlanAction({
        title: tailorForm.title,
        travelDates: tailorForm.travelDates,
        regions: splitToUniqueList(tailorForm.regions),
        participants: tailorForm.participants,
        accommodation: tailorForm.accommodation,
        budget: tailorForm.budget,
        interests: splitToUniqueList(tailorForm.interests),
        pace: tailorForm.pace,
        customPreferences: optionalString(tailorForm.customPreferences),
      });

      if (!result.success || !result.data) {
        setTailorError(result.message ?? 'Failed to generate advanced tailor-made plan.');
        return;
      }

      setTailorResult(result.data);
      toast({
        title: 'Advanced plan generated',
        description: 'Tailor-made plan is ready for review and sharing.',
      });
    } catch (error) {
      setTailorError(
        error instanceof Error ? error.message : 'Failed to generate advanced tailor-made plan.'
      );
    } finally {
      setIsGeneratingTailorPlan(false);
    }
  };

  const saveBlogDraftToLocalStorage = () => {
    if (!blogResult) return;

    const payload = {
      title: blogResult.title,
      excerpt: blogResult.excerpt,
      contentHtml: blogResult.contentHtml,
      seoKeywords: blogResult.seoKeywords,
      generatedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(BLOG_DRAFT_STORAGE_KEY, JSON.stringify(payload));
      toast({
        title: 'Draft saved',
        description: 'Opening blog editor with your AI draft.',
      });
      router.push('/admin/blog/new/edit');
    } catch {
      toast({
        title: 'Save failed',
        description: 'Could not save the blog draft to local storage.',
        variant: 'destructive',
      });
    }
  };

  const saveTourDraftToLocalStorage = () => {
    if (!tourResult) return;

    try {
      localStorage.setItem(TOUR_DRAFT_STORAGE_KEY, JSON.stringify(tourResult));
      toast({
        title: 'Draft saved',
        description: 'Opening tour builder with your AI draft.',
      });
      router.push('/admin/tours/new');
    } catch {
      toast({
        title: 'Save failed',
        description: 'Could not save the tour draft to local storage.',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = async (value: string, target: 'json' | 'sections') => {
    try {
      await navigator.clipboard.writeText(value);
      setLastCopiedTarget(target);
      toast({
        title: 'Copied',
        description: target === 'json' ? 'Plan JSON copied.' : 'Summary and logistics copied.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Clipboard access is unavailable in this browser context.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Admin AI Command Center
            </CardTitle>
            <CardDescription>
              Generate admin-ready drafts for blog posts, tours, and advanced tailor-made plans.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="w-fit">
            Internal Tools
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="blog" className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-0">
            <TabsTrigger value="blog" className="py-2">
              Blog Draft
            </TabsTrigger>
            <TabsTrigger value="tour" className="py-2">
              Tour Draft
            </TabsTrigger>
            <TabsTrigger value="tailor" className="py-2">
              Advanced Plan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blog" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ai-blog-topic">Blog topic</Label>
                <Input
                  id="ai-blog-topic"
                  value={blogForm.topic}
                  onChange={(event) =>
                    setBlogForm((prev) => ({
                      ...prev,
                      topic: event.target.value,
                    }))
                  }
                  placeholder="e.g., Best time to visit Egypt"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ai-blog-keywords">SEO keywords</Label>
                <Textarea
                  id="ai-blog-keywords"
                  value={blogForm.keywords}
                  onChange={(event) =>
                    setBlogForm((prev) => ({
                      ...prev,
                      keywords: event.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Comma or new-line separated keywords"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-blog-tone">Tone</Label>
                <Input
                  id="ai-blog-tone"
                  value={blogForm.tone}
                  onChange={(event) =>
                    setBlogForm((prev) => ({
                      ...prev,
                      tone: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-blog-audience">Audience</Label>
                <Input
                  id="ai-blog-audience"
                  value={blogForm.audience}
                  onChange={(event) =>
                    setBlogForm((prev) => ({
                      ...prev,
                      audience: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ai-blog-cta">Call to action focus</Label>
                <Input
                  id="ai-blog-cta"
                  value={blogForm.cta}
                  onChange={(event) =>
                    setBlogForm((prev) => ({
                      ...prev,
                      cta: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={generateBlogDraft} disabled={isGeneratingBlog}>
                {isGeneratingBlog ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Blog Draft
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={saveBlogDraftToLocalStorage}
                disabled={!blogResult || isGeneratingBlog}
              >
                Save Draft and Open Blog Editor
              </Button>
            </div>

            {blogError && (
              <Alert variant="destructive">
                <AlertDescription>{blogError}</AlertDescription>
              </Alert>
            )}

            {blogResult && (
              <div className="space-y-3 rounded-md border bg-muted/30 p-4">
                <div className="space-y-1">
                  <h3 className="font-semibold">{blogResult.title}</h3>
                  <p className="text-sm text-muted-foreground">{blogResult.excerpt}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {blogResult.seoKeywords.map((keyword) => (
                    <Badge key={keyword} variant="outline">
                      {keyword}
                    </Badge>
                  ))}
                </div>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  {stripHtml(blogResult.contentHtml).slice(0, 280)}...
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tour" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ai-tour-destination">Destination</Label>
                <Input
                  id="ai-tour-destination"
                  value={tourForm.destination}
                  onChange={(event) =>
                    setTourForm((prev) => ({
                      ...prev,
                      destination: event.target.value,
                    }))
                  }
                  placeholder="e.g., Luxor and Aswan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-tour-duration">Duration (days)</Label>
                <Input
                  id="ai-tour-duration"
                  type="number"
                  min={1}
                  max={30}
                  value={tourForm.durationDays}
                  onChange={(event) =>
                    setTourForm((prev) => ({
                      ...prev,
                      durationDays: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-tour-style">Tour style</Label>
                <Input
                  id="ai-tour-style"
                  value={tourForm.tourStyle}
                  onChange={(event) =>
                    setTourForm((prev) => ({
                      ...prev,
                      tourStyle: event.target.value,
                    }))
                  }
                  placeholder="e.g., Adventure and culture"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-tour-audience">Audience</Label>
                <Input
                  id="ai-tour-audience"
                  value={tourForm.audience}
                  onChange={(event) =>
                    setTourForm((prev) => ({
                      ...prev,
                      audience: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ai-tour-must-include">Must include</Label>
                <Textarea
                  id="ai-tour-must-include"
                  value={tourForm.mustInclude}
                  onChange={(event) =>
                    setTourForm((prev) => ({
                      ...prev,
                      mustInclude: event.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Comma or new-line separated"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ai-tour-budget">Budget level</Label>
                <Input
                  id="ai-tour-budget"
                  value={tourForm.budgetLevel}
                  onChange={(event) =>
                    setTourForm((prev) => ({
                      ...prev,
                      budgetLevel: event.target.value,
                    }))
                  }
                  placeholder="e.g., Premium"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={generateTourDraft} disabled={isGeneratingTour}>
                {isGeneratingTour ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="mr-2 h-4 w-4" />
                )}
                Generate Tour Draft
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={saveTourDraftToLocalStorage}
                disabled={!tourResult || isGeneratingTour}
              >
                Save Draft and Open Tour Builder
              </Button>
            </div>

            {tourError && (
              <Alert variant="destructive">
                <AlertDescription>{tourError}</AlertDescription>
              </Alert>
            )}

            {tourResult && (
              <div className="space-y-4 rounded-md border bg-muted/30 p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold">{tourResult.name}</h3>
                  <Badge variant="outline">{tourResult.duration} days</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{tourResult.description}</p>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Highlights
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tourResult.highlights.slice(0, 8).map((item) => (
                      <Badge key={item} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Itinerary Snapshot
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {tourResult.itinerary.slice(0, 4).map((day) => (
                      <li key={`${day.day}-${day.activity}`}>
                        Day {day.day}: {day.activity}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tailor" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ai-tailor-title">Plan title</Label>
                <Input
                  id="ai-tailor-title"
                  value={tailorForm.title}
                  onChange={(event) =>
                    setTailorForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-tailor-dates">Travel dates</Label>
                <Input
                  id="ai-tailor-dates"
                  value={tailorForm.travelDates}
                  onChange={(event) =>
                    setTailorForm((prev) => ({
                      ...prev,
                      travelDates: event.target.value,
                    }))
                  }
                  placeholder="e.g., Jan 10-18, 2027"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-tailor-regions">Regions</Label>
                <Textarea
                  id="ai-tailor-regions"
                  value={tailorForm.regions}
                  onChange={(event) =>
                    setTailorForm((prev) => ({
                      ...prev,
                      regions: event.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Comma or new-line separated"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-tailor-participants">Participants</Label>
                <Input
                  id="ai-tailor-participants"
                  value={tailorForm.participants}
                  onChange={(event) =>
                    setTailorForm((prev) => ({
                      ...prev,
                      participants: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-tailor-accommodation">Accommodation</Label>
                <Input
                  id="ai-tailor-accommodation"
                  value={tailorForm.accommodation}
                  onChange={(event) =>
                    setTailorForm((prev) => ({
                      ...prev,
                      accommodation: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-tailor-budget">Budget</Label>
                <Input
                  id="ai-tailor-budget"
                  value={tailorForm.budget}
                  onChange={(event) =>
                    setTailorForm((prev) => ({
                      ...prev,
                      budget: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-tailor-interests">Interests</Label>
                <Textarea
                  id="ai-tailor-interests"
                  value={tailorForm.interests}
                  onChange={(event) =>
                    setTailorForm((prev) => ({
                      ...prev,
                      interests: event.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Comma or new-line separated"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ai-tailor-pace">Pace</Label>
                <Input
                  id="ai-tailor-pace"
                  value={tailorForm.pace}
                  onChange={(event) =>
                    setTailorForm((prev) => ({
                      ...prev,
                      pace: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ai-tailor-preferences">Custom preferences (optional)</Label>
                <Textarea
                  id="ai-tailor-preferences"
                  value={tailorForm.customPreferences}
                  onChange={(event) =>
                    setTailorForm((prev) => ({
                      ...prev,
                      customPreferences: event.target.value,
                    }))
                  }
                  rows={2}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={generateTailorMadePlan}
                disabled={isGeneratingTailorPlan}
              >
                {isGeneratingTailorPlan ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Advanced Plan
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!tailorResult || isGeneratingTailorPlan}
                onClick={() => {
                  if (!tailorResult) return;
                  copyToClipboard(JSON.stringify(tailorResult, null, 2), 'json');
                }}
              >
                {lastCopiedTarget === 'json' ? (
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                ) : (
                  <Clipboard className="mr-2 h-4 w-4" />
                )}
                Copy JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!tailorResult || isGeneratingTailorPlan}
                onClick={() => {
                  if (!tailorResult) return;
                  copyToClipboard(formatPlanSections(tailorResult), 'sections');
                }}
              >
                {lastCopiedTarget === 'sections' ? (
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                ) : (
                  <Clipboard className="mr-2 h-4 w-4" />
                )}
                Copy Summary and Logistics
              </Button>
            </div>

            {tailorError && (
              <Alert variant="destructive">
                <AlertDescription>{tailorError}</AlertDescription>
              </Alert>
            )}

            {tailorResult && (
              <div className="space-y-4 rounded-md border bg-muted/30 p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold">{tailorResult.tourName}</h3>
                  <Badge variant="outline">{tailorResult.totalPriceEstimate}</Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Executive Summary
                  </p>
                  <p className="text-sm text-muted-foreground">{tailorResult.executiveSummary}</p>
                </div>

                <Separator />

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Itinerary
                    </p>
                    <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                      {tailorResult.itinerary.map((day) => (
                        <div
                          key={`${day.day}-${day.title}`}
                          className="rounded-md border bg-background p-3"
                        >
                          <p className="text-sm font-medium">
                            Day {day.day}: {day.title}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">{day.plan}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Activities: {day.activities.join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Logistics
                      </p>
                      <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
                        <p>
                          <span className="font-medium text-foreground">Transportation:</span>{' '}
                          {tailorResult.logistics.transportation}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Transfers:</span>{' '}
                          {tailorResult.logistics.transfers}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Accommodation:</span>{' '}
                          {tailorResult.logistics.accommodationPlan}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Support:</span>{' '}
                          {tailorResult.logistics.support}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Upsell Ideas
                      </p>
                      <div className="space-y-2">
                        {tailorResult.upsellIdeas.map((item) => (
                          <div
                            key={`${item.title}-${item.estimatedPrice}`}
                            className="rounded-md border bg-background p-3"
                          >
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.reason}</p>
                            <p className="mt-1 text-xs font-medium text-foreground">
                              {item.estimatedPrice}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Risk Notes
                      </p>
                      <div className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
                        {tailorResult.riskNotes.map((note) => (
                          <p key={note}>- {note}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
