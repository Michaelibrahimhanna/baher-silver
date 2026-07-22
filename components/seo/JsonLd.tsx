import React from 'react';

interface JsonLdProps {
  type: 'Organization' | 'Product' | 'BreadcrumbList';
  data: Record<string, unknown>;
}

export function JsonLd({ type, data }: JsonLdProps) {
  let schema = {};

  if (type === 'Organization') {
    schema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Baher Silver',
      url: 'https://bahersilver.com',
      logo: 'https://bahersilver.com/logo.png',
      sameAs: [
        'https://instagram.com/bahersilver',
        'https://facebook.com/bahersilver',
      ],
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Cairo',
        addressCountry: 'EG',
      },
      ...data,
    };
  } else if (type === 'Product') {
    schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      brand: {
        '@type': 'Brand',
        name: 'Baher Silver',
      },
      ...data,
    };
  } else if (type === 'BreadcrumbList') {
    schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      ...data,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
