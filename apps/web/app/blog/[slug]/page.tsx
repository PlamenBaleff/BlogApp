import { BlogPostView } from './BlogPostView';

// The page itself stays in the App Router but renders a client-side view that
// (a) attaches the JWT for drafts/comments, and (b) lets the author edit/delete.
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <BlogPostView slug={slug} />;
}
