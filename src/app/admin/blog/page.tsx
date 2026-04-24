import { getPosts } from '@/lib/supabase/blog';
import { columns } from './columns';
import { DataTable } from './data-table';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default async function BlogPage() {
  const posts = await getPosts({ skipTranslation: true });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Blog Management</h2>
          <p className="text-muted-foreground">Create, edit, and manage your blog posts here.</p>
        </div>
        <Button asChild>
          <Link href="/admin/blog/new/edit">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Post
          </Link>
        </Button>
      </div>
      <DataTable columns={columns} data={posts} />
    </div>
  );
}
