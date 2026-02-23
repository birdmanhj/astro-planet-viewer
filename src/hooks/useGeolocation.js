import { useState, useEffect } from 'react';
import { reverseGeocode } from '../utils/cityDb';

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
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const fallbackName = `${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E`;
        setLocation({
          latitude: lat, longitude: lng,
          elevation: pos.coords.altitude || 50,
          name: fallbackName,
        });
        setStatus('success');
        // 异步反向地理编码，获取完整地址后更新 name
        reverseGeocode(lat, lng).then(name => {
          if (name) setLocation(prev => ({ ...prev, name }));
        });
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
