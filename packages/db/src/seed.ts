import { db, users, posts } from './index';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create sample user
    const [user] = await db
      .insert(users)
      .values({
        email: 'author@example.com',
        name: 'Example Author',
        passwordHash: 'hashed_password_here', // In production, use actual hash
        bio: 'A passionate blogger',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=author',
      })
      .returning();

    console.log('✅ Created user:', user.email);

    // Create sample posts
    const samplePosts = [
      {
        title: 'Getting Started with BlogHub',
        slug: 'getting-started-with-bloghub',
        contentHtml:
          '<p>Welcome to BlogHub! This is a sample blog post. BlogHub is a full-stack blog application built with Next.js, React, Expo, and Drizzle ORM.</p>',
        excerpt: 'Learn how to get started with BlogHub',
        authorId: user.id,
        published: true,
        publishedAt: new Date(),
        tags: ['bloghub', 'getting-started'],
      },
      {
        title: 'Building a Blog with Next.js 16',
        slug: 'building-blog-with-nextjs-16',
        contentHtml:
          '<p>Next.js 16 brings powerful features for building modern web applications. With the App Router and React Server Components, you can build performant and scalable applications.</p>',
        excerpt: 'Explore Next.js 16 features for blog building',
        authorId: user.id,
        published: true,
        publishedAt: new Date(),
        tags: ['nextjs', 'web-development'],
      },
      {
        title: 'The Power of Full-Stack Applications',
        slug: 'power-of-fullstack-apps',
        contentHtml:
          '<p>Full-stack applications allow you to share code, types, and logic between your web and mobile applications. This approach reduces duplication and improves maintainability.</p>',
        excerpt: 'Understand the benefits of full-stack development',
        authorId: user.id,
        published: false,
        tags: ['fullstack', 'architecture'],
      },
    ];

    for (const post of samplePosts) {
      const [createdPost] = await db.insert(posts).values(post).returning();
      console.log('✅ Created post:', createdPost.title);
    }

    console.log('✨ Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

seed();
