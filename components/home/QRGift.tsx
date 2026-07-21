'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

export function QRGift() {
  return (
    <section className="py-24 md:py-32 bg-primary text-primary-foreground relative overflow-hidden">
      <div className="w-full max-w-screen-xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row-reverse items-center gap-16">
        
        <motion.div 
          className="flex-1 space-y-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="text-[10px] tracking-[0.3em] uppercase opacity-70">
            Exclusive Service
          </span>
          <h2 className="text-4xl md:text-6xl font-serif leading-tight">
            The Interactive <br/>Gift Experience
          </h2>
          <p className="text-sm md:text-base font-sans tracking-wide leading-relaxed max-w-md opacity-90">
            Elevate your gifting. Record a personal video message that will be permanently linked to a beautifully engraved QR code inside the jewelry box. A memory that lasts forever.
          </p>
          <div className="pt-4">
            <button className="border border-primary-foreground px-8 py-3 text-[11px] tracking-[0.2em] uppercase font-medium hover:bg-primary-foreground hover:text-primary transition-colors duration-500">
              Learn More
            </button>
          </div>
        </motion.div>

        <motion.div 
          className="flex-1 relative aspect-[4/3] w-full max-w-md bg-black/10 flex items-center justify-center p-12"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Mockup graphic of a QR code on a luxury card */}
          <div className="w-full max-w-xs aspect-square bg-white shadow-2xl p-4 flex flex-col items-center justify-center space-y-4 rotate-3">
             <div className="w-3/4 aspect-square bg-black/90"></div>
             <p className="text-[9px] uppercase tracking-widest text-black font-serif">Scan for your message</p>
          </div>
        </motion.div>
        
      </div>
    </section>
  );
}
