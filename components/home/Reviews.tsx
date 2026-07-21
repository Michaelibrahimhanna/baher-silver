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

        <div className="flex overflow-x-auto w-full pb-12 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-3 gap-x-12 snap-x snap-mandatory hide-scrollbar">
          {REVIEWS.map((review, idx) => (
            <motion.div 
              key={idx}
              className="min-w-[85vw] md:min-w-0 snap-center flex flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.8, delay: idx * 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-6 opacity-30">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>
              <p className="text-lg md:text-xl font-serif text-foreground leading-relaxed mb-6">
                &quot;{review.text}&quot;
              </p>
              <div className="flex flex-col items-center">
                <span className="text-xs font-medium uppercase tracking-widest text-primary mb-1">{review.author}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{review.location}</span>
              </div>
            </motion.div>
          ))}
        </div>
        
      </div>
    </section>
  );
}
