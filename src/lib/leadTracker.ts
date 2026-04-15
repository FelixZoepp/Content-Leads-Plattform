// Lead Tracking Library for personalized landing pages
// This script tracks all user interactions and sends them to the backend

const SUPABASE_URL = 'https://dxdknkeexankgtkpeuvt.supabase.co';

interface TrackingEvent {
  slug: string;
  event_type: string;
  event_data?: Record<string, any>;
  page_url?: string;
  session_id?: string;
}

// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('lead_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('lead_session_id', sessionId);
  }
  return sessionId;
};

// Send tracking event to backend
const sendTrackingEvent = async (event: TrackingEvent): Promise<void> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/track-lead-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...event,
        page_url: event.page_url || window.location.href,
        session_id: event.session_id || getSessionId(),
      }),
    });

    if (!response.ok) {
      console.error('Failed to track event:', await response.text());
    } else {
      console.log(`Tracked event: ${event.event_type}`, event.event_data);
    }
  } catch (error) {
    console.error('Error tracking event:', error);
  }
};

// Track page view
export const trackPageView = (slug: string): void => {
  sendTrackingEvent({
    slug,
    event_type: 'page_view',
  });
};

// Track video events
export const trackVideoPlay = (slug: string): void => {
  sendTrackingEvent({
    slug,
    event_type: 'video_play',
  });
};

export const trackVideoProgress = (slug: string, progress: number): void => {
  // Only track at 25%, 50%, 75%, 100%
  const milestones = [25, 50, 75, 100];
  const nearestMilestone = milestones.find(m => progress >= m - 2 && progress <= m + 2);
  
  if (nearestMilestone) {
    const trackedMilestones = JSON.parse(sessionStorage.getItem(`video_milestones_${slug}`) || '[]');
    if (!trackedMilestones.includes(nearestMilestone)) {
      trackedMilestones.push(nearestMilestone);
      sessionStorage.setItem(`video_milestones_${slug}`, JSON.stringify(trackedMilestones));
      
      sendTrackingEvent({
        slug,
        event_type: 'video_progress',
        event_data: { progress: nearestMilestone },
      });
    }
  }
};

export const trackVideoComplete = (slug: string): void => {
  sendTrackingEvent({
    slug,
    event_type: 'video_complete',
  });
};

// Track button clicks
export const trackButtonClick = (slug: string, buttonText: string, buttonId?: string): void => {
  sendTrackingEvent({
    slug,
    event_type: 'button_click',
    event_data: { button_text: buttonText, button_id: buttonId },
  });
};

// Track CTA clicks
export const trackCTAClick = (slug: string, ctaText?: string): void => {
  sendTrackingEvent({
    slug,
    event_type: 'cta_click',
    event_data: { cta_text: ctaText },
  });
};

// Track booking link clicks
export const trackBookingClick = (slug: string, bookingUrl?: string): void => {
  sendTrackingEvent({
    slug,
    event_type: 'booking_click',
    event_data: { booking_url: bookingUrl },
  });
};

// Track scroll depth
export const trackScrollDepth = (slug: string, depth: number): void => {
  const milestones = [25, 50, 75, 100];
  const nearestMilestone = milestones.find(m => depth >= m - 2 && depth <= m + 2);
  
  if (nearestMilestone) {
    const trackedMilestones = JSON.parse(sessionStorage.getItem(`scroll_milestones_${slug}`) || '[]');
    if (!trackedMilestones.includes(nearestMilestone)) {
      trackedMilestones.push(nearestMilestone);
      sessionStorage.setItem(`scroll_milestones_${slug}`, JSON.stringify(trackedMilestones));
      
      sendTrackingEvent({
        slug,
        event_type: 'scroll_depth',
        event_data: { depth: nearestMilestone },
      });
    }
  }
};

// Track time on page
export const trackTimeOnPage = (slug: string, seconds: number): void => {
  const milestones = [30, 60, 120, 300]; // 30s, 1min, 2min, 5min
  const nearestMilestone = milestones.find(m => seconds >= m - 2 && seconds <= m + 2);
  
  if (nearestMilestone) {
    const trackedMilestones = JSON.parse(sessionStorage.getItem(`time_milestones_${slug}`) || '[]');
    if (!trackedMilestones.includes(nearestMilestone)) {
      trackedMilestones.push(nearestMilestone);
      sessionStorage.setItem(`time_milestones_${slug}`, JSON.stringify(trackedMilestones));
      
      sendTrackingEvent({
        slug,
        event_type: 'time_on_page',
        event_data: { seconds: nearestMilestone },
      });
    }
  }
};

// Track form submissions
export const trackFormSubmit = (slug: string, formId?: string): void => {
  sendTrackingEvent({
    slug,
    event_type: 'form_submit',
    event_data: { form_id: formId },
  });
};

// Initialize all automatic tracking for a page
export const initializeTracking = (slug: string): (() => void) => {
  // Track page view immediately
  trackPageView(slug);

  // Track scroll depth
  let maxScrollDepth = 0;
  const handleScroll = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);
    
    if (scrollPercent > maxScrollDepth) {
      maxScrollDepth = scrollPercent;
      trackScrollDepth(slug, scrollPercent);
    }
  };
  window.addEventListener('scroll', handleScroll);

  // Track time on page
  const startTime = Date.now();
  const timeInterval = setInterval(() => {
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    trackTimeOnPage(slug, seconds);
  }, 1000);

  // Track all button clicks
  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const button = target.closest('button, a, [role="button"]');
    
    if (button) {
      const text = button.textContent?.trim() || '';
      const id = button.id || undefined;
      
      // Check if it's a booking/calendar link
      const href = button.getAttribute('href') || '';
      if (href.includes('calendly') || href.includes('cal.com') || href.includes('booking')) {
        trackBookingClick(slug, href);
      } 
      // Check if it's a CTA (primary button or contains certain keywords)
      else if (
        button.classList.contains('cta') ||
        button.classList.contains('primary') ||
        text.toLowerCase().includes('termin') ||
        text.toLowerCase().includes('buchen') ||
        text.toLowerCase().includes('jetzt') ||
        text.toLowerCase().includes('kostenlos')
      ) {
        trackCTAClick(slug, text);
      } else {
        trackButtonClick(slug, text, id);
      }
    }
  };
  document.addEventListener('click', handleClick);

  // Cleanup function
  return () => {
    window.removeEventListener('scroll', handleScroll);
    document.removeEventListener('click', handleClick);
    clearInterval(timeInterval);
  };
};

// Video tracking helper - attach to video element
export const attachVideoTracking = (slug: string, videoElement: HTMLVideoElement): (() => void) => {
  let hasStarted = false;
  let hasCompleted = false;

  const handlePlay = () => {
    if (!hasStarted) {
      hasStarted = true;
      trackVideoPlay(slug);
    }
  };

  const handleTimeUpdate = () => {
    if (videoElement.duration) {
      const progress = (videoElement.currentTime / videoElement.duration) * 100;
      trackVideoProgress(slug, progress);
    }
  };

  const handleEnded = () => {
    if (!hasCompleted) {
      hasCompleted = true;
      trackVideoComplete(slug);
    }
  };

  videoElement.addEventListener('play', handlePlay);
  videoElement.addEventListener('timeupdate', handleTimeUpdate);
  videoElement.addEventListener('ended', handleEnded);

  return () => {
    videoElement.removeEventListener('play', handlePlay);
    videoElement.removeEventListener('timeupdate', handleTimeUpdate);
    videoElement.removeEventListener('ended', handleEnded);
  };
};
