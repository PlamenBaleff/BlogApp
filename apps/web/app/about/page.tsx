import Link from 'next/link';

export const metadata = {
  title: 'About — BlogHub',
  description:
    'BlogHub is a full-stack capstone project: Next.js API + Web client and an Expo mobile client, backed by Neon Postgres and Drizzle ORM.',
};

export default function AboutPage() {
  return (
    <article className="prose dark:prose-invert max-w-3xl mx-auto py-8 space-y-8">
      <header>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          About BlogHub
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
          A full-stack blogging platform built with Next.js, Expo and Neon Postgres.
        </p>
      </header>

      <section className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
        <p>
          BlogHub is a capstone project that demonstrates a complete multi-platform
          application: a Next.js back-end API serving both a React web client and an
          Expo mobile client. Data lives in serverless Postgres on Neon, accessed
          through Drizzle ORM with code-first migrations checked into the repo.
        </p>
        <p>
          Anyone can browse published posts and read comments. Signed-in users can
          publish their own posts, comment on others, and manage their own drafts.
          Administrators have access to a server-side-guarded admin panel for
          moderating user accounts.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Architecture
        </h2>
        <ul className="grid sm:grid-cols-2 gap-4 not-prose">
          {[
            ['Backend', 'Next.js Route Handlers running on the Node.js runtime, JWT auth, Drizzle ORM.'],
            ['Database', 'Neon serverless Postgres with checked-in Drizzle migrations and B-tree indexes for paged feeds.'],
            ['Web client', 'Next.js + React + Tailwind; server-rendered blog feed with offset pagination.'],
            ['Mobile client', 'Expo Router + React Native. Talks to the same REST API via a configurable base URL.'],
          ].map(([title, body]) => (
            <div
              key={title}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{body}</p>
            </div>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Demo credentials
        </h2>
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4 text-sm font-mono space-y-1 text-gray-700 dark:text-gray-300">
          <div>admin@example.com · Admin123!</div>
          <div>demo@example.com  · demo1234</div>
          <div>user1@example.com … user50@example.com · Password123!</div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Use the admin account to access the admin panel.
        </p>
      </section>

      <div className="pt-4">
        <Link
          href="/blog"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-lg transition"
        >
          Read the blog →
        </Link>
      </div>
    </article>
  );
}
