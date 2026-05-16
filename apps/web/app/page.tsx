export default function Home() {
  return (
    <div className="text-center space-y-8 py-12">
      <div className="space-y-4">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
          Welcome to BlogHub
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          A modern, full-stack blog platform built with Next.js, React, Expo, and Drizzle ORM.
          Share your thoughts and connect with readers across web and mobile.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="text-3xl mb-3">📝</div>
          <h3 className="text-lg font-semibold mb-2">Easy Publishing</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Create and publish beautiful blog posts with a simple, intuitive editor.
          </p>
        </div>

        <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="text-3xl mb-3">📱</div>
          <h3 className="text-lg font-semibold mb-2">Cross-Platform</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Access your blog on web and mobile devices seamlessly.
          </p>
        </div>

        <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="text-3xl mb-3">⚡</div>
          <h3 className="text-lg font-semibold mb-2">Fast & Reliable</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Built with modern technologies for optimal performance.
          </p>
        </div>
      </div>

      <div className="pt-8">
        <a
          href="/blog"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition"
        >
          Read Our Blog
        </a>
      </div>
    </div>
  );
}
