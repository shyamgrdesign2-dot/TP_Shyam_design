import React, { useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import api from '../api/services/axiosService';
import config from '../config';

// Places search now goes through our backend relay (Pm-tatva-agents
// /api/v1/places/*) so the Google Maps API key never reaches the browser.
const placesBaseUrl = { customBaseUrl: config.symptoms_collector_api_url };

const DEBOUNCE_MS = 350;
const MIN_CHARS = 3;

function newSessionToken() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseAddressComponents(components, formatted_address) {
  const result = {
    street: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    address1: '',
    address2: '',
    locality: '',
    formatted_address: formatted_address || '',
  };
  for (const component of components) {
    const type = component.types[0];
    switch (type) {
      case 'street_number':
        result.street = component.long_name + ' ' + result.street;
        break;
      case 'route':
        result.street += component.short_name;
        break;
      case 'locality':
        result.city = component.long_name;
        result.locality = component.long_name;
        break;
      case 'administrative_area_level_1':
        result.state = component.short_name;
        break;
      case 'country':
        result.country = component.long_name;
        break;
      case 'postal_code':
        result.postalCode = component.long_name;
        break;
      case 'sublocality_level_1':
        result.address2 = component.long_name;
        break;
      default:
        break;
    }
  }
  result.address1 = result.street;
  return result;
}

const GoogleMapWithAutocomplete = ({
  onPlaceSelect,
  mapWidth = '100%',
  placeholder = 'Search for a place...',
  value = '',
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [predictions, setPredictions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const sessionTokenRef = useRef(newSessionToken());
  const containerRef = useRef(null);
  const latestQueryRef = useRef('');

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Close the dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPredictions = async (query) => {
    latestQueryRef.current = query;
    setLoading(true);
    try {
      const res = await api.get(
        `/api/v1/places/autocomplete?input=${encodeURIComponent(query)}&sessiontoken=${sessionTokenRef.current}`,
        placesBaseUrl,
      );
      // Ignore stale responses from earlier keystrokes
      if (latestQueryRef.current !== query) return;
      // The shared axios service unwraps responses to the body
      setPredictions(res?.predictions || []);
      setShowDropdown(true);
    } catch (e) {
      console.error('Error fetching place suggestions:', e);
      setPredictions([]);
    } finally {
      if (latestQueryRef.current === query) setLoading(false);
    }
  };

  const handleChange = (e) => {
    const query = e.target.value;
    setInputValue(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < MIN_CHARS) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchPredictions(query.trim()), DEBOUNCE_MS);
  };

  const handleSelect = async (prediction) => {
    setShowDropdown(false);
    setInputValue(prediction.description);
    try {
      const res = await api.get(
        `/api/v1/places/details?placeId=${encodeURIComponent(prediction.placeId)}&sessiontoken=${sessionTokenRef.current}`,
        placesBaseUrl,
      );
      // A details call ends the autocomplete session; start a fresh one
      sessionTokenRef.current = newSessionToken();
      const details = res; // shared axios service unwraps responses to the body
      if (!details || !details.location) {
        message.error("No details available for input: '" + prediction.description + "'");
        return;
      }
      const { lat, lng } = details.location;
      // Same shape the Google JS SDK place object exposed, so consumers stay unchanged
      const place = {
        name: details.name,
        formatted_address: details.formattedAddress,
        address_components: details.addressComponents,
        geometry: { location: { lat, lng } },
      };
      const parsed = parseAddressComponents(details.addressComponents || [], details.formattedAddress);
      const googleMapsLink = lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : '';
      const googleLocation = {
        lat,
        lng,
        address: {
          state: parsed.state,
          city: parsed.city,
          street: parsed.address1,
          zip: parsed.postalCode,
          formatted: parsed.formatted_address,
          googleMapsLink,
        },
      };
      if (onPlaceSelect) onPlaceSelect(place, googleLocation);
    } catch (e) {
      console.error('Error fetching place details:', e);
      message.error("No details available for input: '" + prediction.description + "'");
    }
  };

  return (
    <div ref={containerRef} style={{ width: mapWidth, position: 'relative' }}>
      <input
        type="text"
        value={inputValue}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={() => {
          if (predictions.length > 0) setShowDropdown(true);
        }}
        style={{ width: '100%', padding: 14, fontSize: 16, marginBottom: 8, borderRadius: 11, border: '1px solid #ccc' }}
      />
      {showDropdown && (predictions.length > 0 || loading) && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1050,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {loading && predictions.length === 0 && (
            <li style={{ padding: '10px 14px', color: '#888', fontSize: 14 }}>Searching…</li>
          )}
          {predictions.map((p) => (
            <li
              key={p.placeId}
              onClick={() => handleSelect(p)}
              onMouseDown={(e) => e.preventDefault()}
              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f2f2f2' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f7')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
            >
              <div style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>{p.mainText || p.description}</div>
              {p.secondaryText && (
                <div style={{ fontSize: 12, color: '#888' }}>{p.secondaryText}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GoogleMapWithAutocomplete;
