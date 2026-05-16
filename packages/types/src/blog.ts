export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  authorId: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  tags: string[];
}

export interface Author {
  id: string;
  name: string;
  email: string;
  bio?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

export interface CreatePostInput {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  tags?: string[];
}

export interface UpdatePostInput {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  tags?: string[];
  published?: boolean;
}
