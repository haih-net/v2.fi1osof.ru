import { Meta, type MetaDescriptor } from 'react-router'

import type { SchemaGraph, SchemaNode } from '../JsonLd/types'
import { author, canonicalUrl, site } from '../site'

export interface SeoHeadersProps {
  title: string
  description: string
  page?: number
  language?: string
  path?: string
  noindex?: boolean
  image?: { src: string; alt: string; width: number; height: number }
  breadcrumbs?: { name: string; path: string }[]
  collection?: {
    name: string
    items: { name: string; path: string; description: string }[]
  }
  blog?: {
    posts: { title: string; path: string; description: string; date: string }[]
  }
  article?: {
    headline: string
    published: string
    modified?: string
    version: string
    commitUrl: string
  }
}

export interface SeoHandle {
  seo: SeoHeadersProps
}

const notFound: SeoHeadersProps = {
  title: 'Страница недоступна — Fi1osof',
  description: 'Не удалось открыть запрошенную страницу.',
  noindex: true,
}

// React Router owns active-match selection, including errors and SPA fallback.
export function SeoHeaders() {
  return <Meta />
}

export function unavailableSeoMeta(): MetaDescriptor[] {
  return createSeoMeta(notFound)
}

export function createSeoMeta({
  title,
  description,
  path,
  page = 1,
  language = site.language,
  noindex = false,
  image,
  breadcrumbs = [],
  collection,
  blog,
  article,
}: SeoHeadersProps): MetaDescriptor[] {
  title = /fi1osof/i.test(title) ? title : `${title} — Fi1osof`
  const canonical =
    path === undefined || noindex
      ? undefined
      : `${canonicalUrl(path)}${page > 1 ? `?page=${page}` : ''}`
  image = noindex ? undefined : image
  const imageUrl = image ? new URL(image.src, site.origin).href : undefined
  const websiteId = `${site.origin}/#website`
  const blogId = `${site.origin}/blog#blog`
  const graph: SchemaNode[] = canonical
    ? [
        {
          '@type': 'WebSite',
          '@id': websiteId,
          name: site.name,
          description: site.description,
          url: `${site.origin}/`,
          inLanguage: language,
        },
        {
          '@type': collection || blog ? 'CollectionPage' : 'WebPage',
          '@id': `${canonical}#webpage`,
          url: canonical,
          name: title,
          description,
          inLanguage: language,
          isPartOf: { '@id': websiteId },
          ...(breadcrumbs.length
            ? { breadcrumb: { '@id': `${canonical}#breadcrumbs` } }
            : {}),
          ...(imageUrl
            ? { primaryImageOfPage: { '@id': `${canonical}#primaryimage` } }
            : {}),
          ...(blog
            ? {
                mainEntity: { '@id': blogId },
                hasPart: { '@id': `${canonical}#items` },
              }
            : {}),
          ...(collection
            ? { mainEntity: { '@id': `${canonical}#items` } }
            : {}),
          ...(article ? { mainEntity: { '@id': `${canonical}#article` } } : {}),
        },
      ]
    : []
  if (canonical && imageUrl && image) {
    graph.push({
      '@type': 'ImageObject',
      '@id': `${canonical}#primaryimage`,
      url: imageUrl,
      contentUrl: imageUrl,
      caption: image.alt,
      width: image.width,
      height: image.height,
    })
  }
  if (canonical && (blog || article)) {
    graph.push({
      '@type': 'Blog',
      '@id': blogId,
      url: `${site.origin}/blog`,
      name: 'HAIH Blog',
      description:
        'Observations, questions and conclusions from building HAIH, recorded against specific project revisions.',
      inLanguage: language,
      isPartOf: { '@id': websiteId },
      ...(blog
        ? {
            blogPost: blog.posts.map((post) => ({
              '@id': `${canonicalUrl(post.path)}#article`,
            })),
          }
        : {}),
    })
  }
  if (canonical && blog) {
    graph.push(
      ...blog.posts.map((post) => ({
        '@type': 'BlogPosting',
        '@id': `${canonicalUrl(post.path)}#article`,
        url: canonicalUrl(post.path),
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        inLanguage: language,
        isPartOf: { '@id': blogId },
      })),
    )
  }
  const items =
    blog?.posts.map((post) => ({
      name: post.title,
      path: post.path,
      description: post.description,
    })) ?? collection?.items
  if (canonical && items) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${canonical}#items`,
      name: collection?.name ?? 'HAIH blog posts',
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
        // Section fragments identify real visible entries; do not strip them like canonicals.
        url: new URL(item.path, site.origin).href,
        ...(blog
          ? { item: { '@id': `${canonicalUrl(item.path)}#article` } }
          : {}),
      })),
    })
  }
  if (canonical && breadcrumbs.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${canonical}#breadcrumbs`,
      itemListElement: breadcrumbs.map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: crumb.name,
        item: canonicalUrl(crumb.path),
      })),
    })
  }
  if (canonical && article) {
    graph.push(author, {
      '@type': 'BlogPosting',
      '@id': `${canonical}#article`,
      url: canonical,
      headline: article.headline,
      description,
      inLanguage: language,
      mainEntityOfPage: { '@id': `${canonical}#webpage` },
      isPartOf: { '@id': blogId },
      author: {
        '@id': author['@id'],
        '@type': 'Person',
        name: author.name,
        url: author.url,
      },
      datePublished: article.published,
      ...(article.modified ? { dateModified: article.modified } : {}),
      ...(imageUrl
        ? {
            image: {
              '@type': 'ImageObject',
              url: imageUrl,
              width: image?.width,
              height: image?.height,
            },
          }
        : {}),
      citation: article.commitUrl,
      about: {
        '@type': 'SoftwareSourceCode',
        name: 'HAIH Site',
        codeRepository: 'https://github.com/haih-net/haih.site',
        version: article.version,
        url: article.commitUrl,
      },
    })
  }
  const data: SchemaGraph = {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
  const tags: MetaDescriptor[] = [
    { title },
    { name: 'description', content: description },
    {
      name: 'robots',
      content: noindex
        ? 'noindex, follow'
        : 'index, follow, max-image-preview:large',
    },
    { property: 'og:site_name', content: site.name },
    {
      property: 'og:locale',
      content:
        language === 'ru' ? 'ru_RU' : language === 'vi' ? 'vi_VN' : 'en_US',
    },
    { property: 'og:type', content: article ? 'article' : 'website' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    {
      name: 'twitter:card',
      content: imageUrl ? 'summary_large_image' : 'summary',
    },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ]
  if (canonical) {
    tags.push(
      { tagName: 'link', rel: 'canonical', href: canonical },
      { property: 'og:url', content: canonical },
    )
  }
  if (imageUrl && image) {
    tags.push(
      { property: 'og:image', content: imageUrl },
      { property: 'og:image:alt', content: image.alt },
      { property: 'og:image:width', content: String(image.width) },
      { property: 'og:image:height', content: String(image.height) },
      { name: 'twitter:image', content: imageUrl },
      { name: 'twitter:image:alt', content: image.alt },
    )
  }
  if (article) {
    tags.push(
      { name: 'author', content: author.name },
      { tagName: 'link', rel: 'author', href: author.url },
      { property: 'article:author', content: author.url },
      { property: 'article:published_time', content: article.published },
    )
    if (article.modified) {
      tags.push({
        property: 'article:modified_time',
        content: article.modified,
      })
    }
  }
  // The router serializes and escapes script:ld+json while rendering Meta.
  if (graph.length) {
    tags.push({ 'script:ld+json': data })
  }
  return tags
}
