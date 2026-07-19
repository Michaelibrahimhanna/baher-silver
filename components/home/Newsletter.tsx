'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';

export function Newsletter({ dict }: { dict: any }) {
  return (
    <section className="py-24 bg-brand-gray-soft border-t border-brand-border">
      <Container>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center space-y-6"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-[family-name:var(--font-cormorant)] text-brand-black">
            {dict.footer.newsletter_title}
          </h2>
          <p className="text-brand-black/60 text-lg">
            {dict.footer.newsletter_desc}
          </p>
          <form className="flex flex-col sm:flex-row gap-4 justify-center pt-4" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder={dict.footer.email_placeholder}
              className="w-full sm:w-96 bg-brand-white border border-brand-border px-4 py-3 text-sm outline-none focus:border-brand-black transition-colors text-brand-black"
              required
            />
            <Button variant="primary" className="whitespace-nowrap px-8 uppercase tracking-widest text-xs h-[46px]">
              {dict.footer.subscribe}
            </Button>
          </form>
        </motion.div>
      </Container>
    </section>
  );
}
