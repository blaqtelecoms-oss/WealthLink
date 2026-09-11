import React from 'react';
import { Image } from '@/components/ui/image';

const LOGO_URL = 'https://media.base44.com/images/public/6a7833ae510da96c49036559/1bee6048e_Logo-removebg-preview.png';

export default function Logo({ className = 'h-10 w-10' }) {
  return <Image src={LOGO_URL} alt="WealthLink" className={className} fittingType="fit" />;
}