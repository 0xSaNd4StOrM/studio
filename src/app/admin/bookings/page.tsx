
"use client";

import React, { useState } from 'react';
import { getBookings } from "@/lib/bookings";
import type { Booking } from "@/types";
import { columns } from "./columns";
import { DataTable } from "./data-table";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>(getBookings());

  const handleUpdateStatus = (bookingId: string, status: Booking['status']) => {
    setBookings(prev => 
      prev.map(b => b.id === bookingId ? { ...b, status } : b)
    );
  };

  const handleDeleteBooking = (bookingId: string) => {
    setBookings(prev => prev.filter(b => b.id !== bookingId));
  };


  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Bookings Management</h2>
            <p className="text-muted-foreground">
                Here's a list of all tour bookings from your customers.
            </p>
        </div>
      </div>
      <DataTable 
        columns={columns({ onUpdateStatus: handleUpdateStatus, onDelete: handleDeleteBooking })} 
        data={bookings} 
      />
    </div>
  );
}
