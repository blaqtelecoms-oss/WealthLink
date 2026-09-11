import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Phone, Globe2, Link2 } from 'lucide-react';

const COUNTRIES = [
  'South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Namibia', 'Botswana',
  'Zimbabwe', 'Zambia', 'Mozambique', 'Tanzania', 'Uganda', 'United Kingdom',
  'United States', 'Australia', 'Canada', 'United Arab Emirates', 'Other',
];

export default function ProfileSetupStep({ form, setForm }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ob-full-name" className="text-xs font-medium text-slate-400">Full name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="ob-full-name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="h-12 border-white/10 bg-[#0b1525] pl-10"
            placeholder="Your full name"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ob-mobile" className="text-xs font-medium text-slate-400">Mobile number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="ob-mobile"
            type="tel"
            value={form.mobile_number}
            onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
            className="h-12 border-white/10 bg-[#0b1525] pl-10"
            placeholder="+27 82 123 4567"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ob-country" className="text-xs font-medium text-slate-400">Country</Label>
        <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
          <SelectTrigger id="ob-country" className="h-12 border-white/10 bg-[#0b1525]">
            <span className="flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-slate-500" />
              <SelectValue placeholder="Select country" />
            </span>
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ob-referral" className="text-xs font-medium text-slate-400">Referral link <span className="text-slate-600">(optional)</span></Label>
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="ob-referral"
            value={form.referral_link}
            onChange={(e) => setForm({ ...form, referral_link: e.target.value })}
            className="h-12 border-white/10 bg-[#0b1525] pl-10"
            placeholder="Paste your referral link or code"
          />
        </div>
        <p className="text-xs text-slate-600">Were you invited? Paste the referral link or code from the person who introduced you.</p>
      </div>
    </div>
  );
}