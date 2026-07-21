'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

const REVIEWS = [
  { text: "The craftsmanship is unparalleled. It truly feels like a bespoke piece of art.", author: "Sarah M.", location: "Dubai" },
  { text: "Minimalist, elegant, and perfectly weighted. My new favorite daily wear.", author: "Elena R.", location: "London" },
  { text: "The QR Gift feature made this the most memorable anniversary present ever.", author: "James T.", location: "New York" }
];

export function Reviews() {
  return (
    <section className="py-24 md:py-32 bg-background relative overflow-hidden border-t border-border">
      <div className="w-full max-w-screen-xl mx-auto px-6 lg:px-12 flex flex-col items-center text-center">
        
        <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-16">
          Client Testimonials
        </span>

        <div className="flex flex-col gap-y-24 items-center">
          {REVIEWS.map((review, idx) => (
            <motion.div 
              key={idx}
              className="max-w-3xl flex flex-col items-center"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="text-4xl text-primary/30 font-serif mb-4 leading-none">&ldquo;</span>
              <p className="text-xl md:text-3xl font-serif text-foreground leading-snug md:leading-snug mb-8 tracking-wide text-balance">
                {review.text}
              </p>
              <div className="flex flex-col items-center gap-1">
                <span className="w-6 h-[1px] bg-primary/40 mb-3"></span>
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">{review.author}</span>
                <span className="text-[9px] text-muted-foreground uppercase tracking-[0.3em]">{review.location}</span>
              </div>
            </motion.div>
          ))}
        </div>
        
      </div>
    </section>
  );
}
