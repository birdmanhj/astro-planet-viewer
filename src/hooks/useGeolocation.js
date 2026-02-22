import { useState, useEffect } from 'react';

const DEFAULT_LOCATION = {
  latitude: 39.9042,
  longitude: 116.4074,
  elevation: 50,
  name: '北京',
};

export function useGeolocation() {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'denied' | 'error'

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          elevation: pos.coords.altitude || 50,
          name: `${pos.coords.latitude.toFixed(2)}°N, ${pos.coords.longitude.toFixed(2)}°E`,
        });
        setStatus('success');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
        } else {
          setStatus('error');
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  return { location, status, requestLocation, setLocation };
}
