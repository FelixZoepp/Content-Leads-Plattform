import { useState, useEffect } from "react";

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
  nextCallDate: Date;
}

function getNextWednesday17(): Date {
  const now = new Date();
  const result = new Date(now);
  
  // Set to 17:00 local time
  result.setHours(17, 0, 0, 0);
  
  // Get current day of week (0 = Sunday, 3 = Wednesday)
  const currentDay = now.getDay();
  const wednesday = 3;
  
  // Calculate days until next Wednesday
  let daysUntilWednesday = (wednesday - currentDay + 7) % 7;
  
  // If it's Wednesday but past 17:00, go to next Wednesday
  if (daysUntilWednesday === 0 && now >= result) {
    daysUntilWednesday = 7;
  }
  
  result.setDate(result.getDate() + daysUntilWednesday);
  return result;
}

function isCurrentlyLive(): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  // Wednesday = 3, Live window: 17:00 - 18:00
  if (dayOfWeek === 3) {
    const currentMinutes = hours * 60 + minutes;
    const startMinutes = 17 * 60; // 17:00
    const endMinutes = 18 * 60;   // 18:00
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return false;
}

export function useLiveCallCountdown(): CountdownResult {
  const [countdown, setCountdown] = useState<CountdownResult>(() => {
    const nextCall = getNextWednesday17();
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isLive: isCurrentlyLive(),
      nextCallDate: nextCall,
    };
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextCall = getNextWednesday17();
      const diff = nextCall.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdown({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isLive: isCurrentlyLive(),
          nextCallDate: nextCall,
        });
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setCountdown({
        days,
        hours,
        minutes,
        seconds,
        isLive: isCurrentlyLive(),
        nextCallDate: nextCall,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return countdown;
}
