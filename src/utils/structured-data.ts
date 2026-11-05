export interface ProjectSchemaInput {
  url: string;
  name: string;
  description: string;
  dateCreated: Date;
  language: 'en' | 'id';
  links: { href: string }[];
  keywords: string[];
  authorId: string;
}

// Project pages describe a piece of work rather than an article, so they get a
// CreativeWork node. sameAs ties the page to the live site and repository.
export function projectSchema(input: ProjectSchemaInput): Record<string, unknown> {
  return {
    '@type': 'CreativeWork',
    '@id': `${input.url}#project`,
    name: input.name,
    description: input.description,
    url: input.url,
    dateCreated: input.dateCreated.toISOString(),
    inLanguage: input.language === 'id' ? 'id-ID' : 'en-US',
    keywords: input.keywords.join(', '),
    author: { '@id': input.authorId },
    ...(input.links.length > 0 ? { sameAs: input.links.map((link) => link.href) } : {}),
  };
}
