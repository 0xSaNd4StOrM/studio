
'use client';

import React, { useState, useEffect } from 'react';

export function CountdownTimer() {
  const calculateTimeLeft = () => {
    const difference = +new Date("2025-01-01") - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  });

  const timerComponents: JSX.Element[] = [];

  Object.keys(timeLeft).forEach((interval) => {
    if (!timeLeft[interval as keyof typeof timeLeft]) {
      return;
    }

    timerComponents.push(
      <div key={interval} className="text-center">
        <span className="text-4xl font-bold">{String(timeLeft[interval as keyof typeof timeLeft]).padStart(2, '0')}</span>
        <span className="block text-sm uppercase text-white/70">{interval}</span>
      </div>
    );
  });

  return (
    <div className="grid grid-cols-4 gap-4 mt-6">
      {timerComponents.length ? timerComponents : <span>Time's up!</span>}
    </div>
  );
}
