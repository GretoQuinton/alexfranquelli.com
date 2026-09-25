import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    publication: z.string().optional(),
    publicationDate: z.string().optional(),
    displayDate: z.string().optional(),
    language: z.enum(['English','Italian']),
    type: z.enum(['Review','Interview','Feature','Live report','Politics / feature','Blog','Commissioned feature','Other']),
    description: z.string().optional(),
    byline: z.string().optional(),
    originalUrl: z.string().url().optional(),
    legacyPath: z.string().optional(),
    magazineIssue: z.string().optional(),
    printedPages: z.string().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    imageCredit: z.string().optional(),
    imageSourceUrl: z.string().url().optional(),
    cover: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  })
});

export const collections = { writing };
