'use client';

import { useState } from 'react';
import type { UpsellItem } from "@/types";
import { columns } from "./columns";
import { DataTable } from "./data-table";

interface UpsellItemsClientProps {
  initialUpsellItems: UpsellItem[];
  onDelete: (id: string) => Promise<void>;
}

export function UpsellItemsClient({ initialUpsellItems, onDelete }: UpsellItemsClientProps) {
  // In a real app, you might manage state here for client-side filtering/sorting
  // For now, we just pass the initial data.
  return (
    <DataTable 
      columns={columns({ onDelete })} 
      data={initialUpsellItems} 
    />
  );
}
