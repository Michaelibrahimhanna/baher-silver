'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/store';
import { SHIPPING_ZONES } from '@/lib/services/shipping';
import { MapPin, CheckCircle2, Crosshair } from 'lucide-react';

interface AddressFormProps {
  onSave?: () => void;
  locale?: string;
}

export function AddressForm({ onSave, locale = 'en' }: AddressFormProps) {
  const { checkout, updateAddressInfo } = useStore();
  const address = checkout.shippingAddress;

  const [mapOpen, setMapOpen] = useState(false);
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number }>({
    lat: address.latitude || 30.0274,
    lng: address.longitude || 31.4914,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    updateAddressInfo({ [name]: value });
  };

  const handleSelectPin = () => {
    const mockLat = 30.0444 + (Math.random() - 0.5) * 0.05;
    const mockLng = 31.2357 + (Math.random() - 0.5) * 0.05;
    setPinLocation({ lat: mockLat, lng: mockLng });
    updateAddressInfo({ latitude: mockLat, longitude: mockLng });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-slate-800 dark:text-slate-100" aria-label="Shipping Address Form">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {locale === 'ar' ? 'الاسم بالكامل' : 'Full Name'} <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            name="fullName"
            required
            aria-required="true"
            autoComplete="name"
            placeholder={locale === 'ar' ? 'مثال: أحمد محمود' : 'e.g. Alex Vance'}
            value={address.fullName}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm transition-all"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {locale === 'ar' ? 'رقم الهاتف' : 'Mobile Phone'} <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            name="phone"
            required
            aria-required="true"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+20 101 234 5678"
            value={address.phone}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Governorate / Shipping Zone */}
        <div>
          <label htmlFor="governorate" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {locale === 'ar' ? 'المحافظة / إقليم الشحن' : 'Governorate / Zone'} <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <select
            id="governorate"
            name="governorate"
            value={address.governorate}
            onChange={handleChange}
            autoComplete="shipping address-level1"
            aria-required="true"
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm transition-all"
          >
            {SHIPPING_ZONES.flatMap(z => z.governorates).map(gov => (
              <option key={gov} value={gov}>
                {gov}
              </option>
            ))}
          </select>
        </div>

        {/* City / District */}
        <div>
          <label htmlFor="city" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {locale === 'ar' ? 'المدينة / المنطقة' : 'City / District'} <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="city"
            type="text"
            name="city"
            required
            aria-required="true"
            autoComplete="shipping address-level2"
            placeholder={locale === 'ar' ? 'مثال: التجمع الخامس' : 'e.g. New Cairo'}
            value={address.city}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm transition-all"
          />
        </div>
      </div>

      {/* Street Address Line 1 */}
      <div>
        <label htmlFor="addressLine1" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
          {locale === 'ar' ? 'عنوان الشارع / المبنى' : 'Street Address'} <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="addressLine1"
          type="text"
          name="addressLine1"
          required
          aria-required="true"
          autoComplete="shipping address-line1"
          placeholder={locale === 'ar' ? 'مثال: شارع التسعين، مبنى ٤٢' : 'Building 42, 90th Street North'}
          value={address.addressLine1}
          onChange={handleChange}
          className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Address Line 2 */}
        <div>
          <label htmlFor="addressLine2" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {locale === 'ar' ? 'الشقة / الطابق (اختياري)' : 'Apartment / Suite (Optional)'}
          </label>
          <input
            id="addressLine2"
            type="text"
            name="addressLine2"
            autoComplete="shipping address-line2"
            placeholder="Apt 4B, 3rd Floor"
            value={address.addressLine2 || ''}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm transition-all"
          />
        </div>

        {/* Postal Code */}
        <div>
          <label htmlFor="postalCode" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {locale === 'ar' ? 'الرمز البريدي' : 'Postal Code'}
          </label>
          <input
            id="postalCode"
            type="text"
            name="postalCode"
            inputMode="numeric"
            autoComplete="shipping postal-code"
            placeholder="11835"
            value={address.postalCode || ''}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm transition-all"
          />
        </div>
      </div>

      {/* Map Pin Integration Picker */}
      <div className="mt-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <MapPin className="w-4 h-4" aria-hidden="true" />
            <span className="text-xs font-medium">
              {locale === 'ar' ? 'إحداثيات الخريطة (GPS)' : 'Map Coordinates (GPS Location)'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMapOpen(!mapOpen)}
            aria-expanded={mapOpen}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 underline cursor-pointer focus:ring-2 focus:ring-amber-500 rounded"
          >
            {mapOpen ? (locale === 'ar' ? 'إخفاء الخريطة' : 'Hide Map') : (locale === 'ar' ? 'تحديد على الخريطة' : 'Pin on Map')}
          </button>
        </div>

        {mapOpen && (
          <div className="mt-3 space-y-2">
            <div className="relative h-40 w-full bg-slate-800 rounded-lg overflow-hidden border border-slate-700 flex flex-col items-center justify-center text-slate-400">
              <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />
              <MapPin className="w-8 h-8 text-amber-500 animate-bounce mb-1 z-10" aria-hidden="true" />
              <p className="text-xs text-slate-300 z-10 font-mono">
                Lat: {pinLocation.lat.toFixed(4)}, Lng: {pinLocation.lng.toFixed(4)}
              </p>
              <button
                type="button"
                onClick={handleSelectPin}
                className="mt-2 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-md flex items-center gap-1.5 z-10 transition-colors focus:ring-2 focus:ring-amber-500"
              >
                <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                {locale === 'ar' ? 'تحديد موقعي الحالي' : 'Set Pin Location'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action CTA */}
      <div className="pt-2">
        <button
          type="submit"
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md focus:ring-2 focus:ring-amber-500"
        >
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          {locale === 'ar' ? 'تأكيد وحفظ العنوان' : 'Save & Continue to Payment'}
        </button>
      </div>
    </form>
  );
}
