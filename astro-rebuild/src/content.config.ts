import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    publication: z.string(),
    publicationDate: z.coerce.date(),
    language: z.enum(['English','Italian']),
    type: z.enum(['Review','Interview','Feature','Live report','Politics / feature','Blog','Commissioned feature','Other']),
    description: z.string().optional(),
    originalUrl: z.string().url().optional(),
    magazineIssue: z.string().optional(),
    printedPages: z.string().optional(),
    cover: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  })
});

export const collections = { writing };
