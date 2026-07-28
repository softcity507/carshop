'use client';

import React from 'react';
import { Loader } from '@/components/common/Loader';

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader />
    </div>
  );
}
