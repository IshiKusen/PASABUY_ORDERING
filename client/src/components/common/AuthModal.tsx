import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { X, Loader2, User, Navigation, Search } from 'lucide-react';
import { authApi, setToken } from '../../utils/api';
import { useGoogleLogin } from '@react-oauth/google';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { LatLngExpression } from 'leaflet';

// Fix for Leaflet marker icon in Vite/React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const defaultCenter: LatLngExpression = [14.7547, 120.9607]; // Meycauayan

// Helper Component: Map Events
const MapEvents = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Helper Component: Move Map
const ChangeView = ({ center }: { center: LatLngExpression }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  return null;
};

// React 19 Compatibility Casts
const MapContainerCast = MapContainer as any;
const TileLayerCast = TileLayer as any;

export const AuthModal: React.FC = () => {
  const { isLoginModalOpen, setLoginModalOpen, login } = useAuthStore();
  const [step, setStep] = useState<'choose' | 'profile'>('choose');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [searching, setSearching] = useState(false);
  const [authMethod, setAuthMethod] = useState<'google' | 'facebook' | 'email' | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [addressStatus, setAddressStatus] = useState('');
  const [googleData, setGoogleData] = useState<{ sub: string; name: string; email: string; picture: string } | null>(null);
  const [facebookData, setFacebookData] = useState<{ id: string; name: string; email: string; picture: string } | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    address: '',
    lat: 14.7547,
    lng: 120.9607,
  });

  const [mapCenter, setMapCenter] = useState<LatLngExpression>(defaultCenter);

  // Load Facebook SDK
  useEffect(() => {
    if (!import.meta.env.VITE_FACEBOOK_APP_ID) return;
    
    (window as any).fbAsyncInit = function() {
      (window as any).FB.init({
        appId      : import.meta.env.VITE_FACEBOOK_APP_ID,
        cookie     : true,
        xfbml      : true,
        version    : 'v21.0'
      });

      // Auto-check login status when SDK is ready
      (window as any).FB.getLoginStatus((response: any) => {
        if (response.status === 'connected') {
          console.log('User already logged into Facebook and authorized the app.');
        }
      });
    };

    const loadSdk = (d: Document, s: string, id: string) => {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s) as any; js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode?.insertBefore(js, fjs);
    };
    loadSdk(document, 'script', 'facebook-jssdk');
  }, []);

  // SEARCH: Text -> Coordinates (using Nominatim Free API)
  const handleAddressSearch = async () => {
    if (!formData.address || formData.address.length < 3) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}&limit=1`);
      const data = await res.json();
      if (data && data[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const newPos: LatLngExpression = [lat, lng];
        setMapCenter(newPos);
        setFormData(prev => ({ ...prev, lat, lng, address: data[0].display_name }));
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setSearching(false);
    }
  };

  // REVERSE: Coordinates -> Text (using Nominatim Free API)
  const reverseGeocode = async (lat: number, lng: number) => {
    setAddressStatus('Finding address...');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        setFormData(prev => ({ ...prev, lat, lng, address: data.display_name }));
      }
    } catch (err) {
      console.error('Reverse Geocode failed', err);
    } finally {
      setAddressStatus('');
    }
  };

  const onMapClick = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    reverseGeocode(lat, lng);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const newPos: LatLngExpression = [lat, lng];
      setMapCenter(newPos);
      reverseGeocode(lat, lng);
      setLocatingUser(false);
    }, () => setLocatingUser(false), { enableHighAccuracy: true });
  };

  const handleMobileChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    setFormData(prev => ({ ...prev, mobile: digits }));
    setMobileError(digits.length > 0 && digits.length < 11 ? 'Mobile must be 11 digits' : '');
  };

  const googleOAuthLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await res.json();
        
        if (isLoginMode) {
          try {
            const loginRes = await authApi.loginOnly({ 
              email: userInfo.email, 
              google_id: userInfo.sub 
            });
            setToken(loginRes.token);
            login({ ...loginRes.user, id: String(loginRes.user.id), fullName: loginRes.user.full_name, mobile: loginRes.user.phone });
            handleClose();
          } catch (err: any) {
            if (err.message && err.message.includes('not found')) {
              alert('Account not found. Please create an account.');
              setIsLoginMode(false);
            } else {
              alert(err.message || 'Login failed.');
            }
          }
        } else {
          setGoogleData({ sub: userInfo.sub, name: userInfo.name || '', email: userInfo.email || '', picture: userInfo.picture || '' });
          setEmailInput(userInfo.email || '');
          setFormData(prev => ({ ...prev, fullName: userInfo.name || '' }));
          setAuthMethod('google');
          setStep('profile');
        }
      } catch (err) {
        console.error('Google OAuth error:', err);
      } finally {
        setLoading(false);
      }
    },
  });

  const handleFacebookLogin = () => {
    if (!(window as any).FB) return;
    setLoading(true);
    (window as any).FB.login((response: any) => {
      if (response.authResponse) {
        (window as any).FB.api('/me', { fields: 'id,name,email,picture.type(large)' }, async (userInfo: any) => {
          if (isLoginMode) {
            try {
              const loginRes = await authApi.loginOnly({ 
                email: userInfo.email, 
                facebook_id: userInfo.id 
              });
              setToken(loginRes.token);
              login({ ...loginRes.user, id: String(loginRes.user.id), fullName: loginRes.user.full_name, mobile: loginRes.user.phone });
              handleClose();
            } catch (err: any) {
              if (err.message && err.message.includes('not found')) {
                alert('Account not found. Please create an account.');
                setIsLoginMode(false);
              } else {
                alert(err.message || 'Login failed.');
              }
            }
          } else {
            setFacebookData({ 
              id: userInfo.id, 
              name: userInfo.name || '', 
              email: userInfo.email || '', 
              picture: userInfo.picture?.data?.url || '' 
            });
            setEmailInput(userInfo.email || '');
            setFormData(prev => ({ ...prev, fullName: userInfo.name || '' }));
            setAuthMethod('facebook');
            setStep('profile');
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }, { config_id: '927750303584958' });
  };

  const handleEmailLogin = async () => {
    if (!emailInput) return;
    setLoading(true);
    try {
      const res = await authApi.loginOnly({ email: emailInput });
      setToken(res.token);
      login({ ...res.user, id: String(res.user.id), fullName: res.user.full_name, mobile: res.user.phone });
      handleClose();
    } catch (err: any) {
      if (err.message && err.message.includes('not found')) {
        alert('Account not found. Please create an account.');
        setIsLoginMode(false);
      } else {
        alert(err.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.mobile.length !== 11) return;
    setLoading(true);
    try {
      const signupData = {
        google_id: authMethod === 'google' ? googleData?.sub : null,
        facebook_id: authMethod === 'facebook' ? facebookData?.id : null,
        full_name: formData.fullName,
        email: emailInput,
        phone: formData.mobile,
        address: formData.address,
        lat: formData.lat,
        lng: formData.lng,
        avatar_url: (authMethod === 'google' ? googleData?.picture : (authMethod === 'facebook' ? facebookData?.picture : `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.fullName)}`))
      };

      const res = await (authMethod === 'facebook' 
        ? authApi.loginWithFacebook(signupData) 
        : authApi.loginWithGoogle(signupData));
        
      setToken(res.token);
      login({ ...res.user, id: String(res.user.id), fullName: res.user.full_name, mobile: res.user.phone });
      handleClose();
    } catch (err: any) {
      alert(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLoginModalOpen(false);
    setStep('choose');
    setAuthMethod(null);
  };

  if (!isLoginModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-dark-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b dark:border-gray-800">
          <h2 className="text-xl font-bold dark:text-white uppercase tracking-tight">Complete Your Profile</h2>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto">
          {step === 'choose' ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-100">
                  <User size={32} className="text-primary-600" />
                </div>
                <h3 className="text-lg font-bold dark:text-white">
                  {isLoginMode ? 'Welcome Back!' : 'Welcome to Pasabuy!'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {isLoginMode ? 'Please sign in to continue.' : 'Create an account to continue.'}
                </p>
              </div>

              <div className="space-y-3">
                <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="input" placeholder="Email Address" />
                <button 
                  onClick={isLoginMode ? handleEmailLogin : () => setStep('profile')} 
                  disabled={loading || !emailInput}
                  className="w-full btn-primary py-4 font-bold shadow-lg shadow-primary-500/20 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (isLoginMode ? 'Sign In' : 'Continue with Email')}
                </button>
              </div>

              <div className="flex items-center gap-4 text-gray-400 text-[10px] font-bold tracking-widest px-2">
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800"></div>
                OR QUICK LOGIN
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800"></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => googleOAuthLogin()} disabled={loading} className="flex items-center justify-center gap-2 bg-white border border-gray-200 dark:border-gray-700 dark:bg-dark-surfaceAlt p-3 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50 text-xs">
                  {loading && authMethod === 'google' ? <Loader2 size={16} className="animate-spin" /> : (
                    <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  )}
                  Google
                </button>

                <button 
                  onClick={handleFacebookLogin} 
                  disabled={loading} 
                  className="flex items-center justify-center gap-2 bg-[#1877F2] text-white p-3 rounded-xl font-bold hover:bg-[#166fe5] transition-all shadow-md disabled:opacity-50 text-xs"
                >
                  {loading && authMethod === 'facebook' ? <Loader2 size={16} className="animate-spin" /> : (
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  )}
                  Facebook
                </button>
              </div>

              <div className="text-center mt-6">
                <button 
                  onClick={() => setIsLoginMode(!isLoginMode)}
                  className="text-xs font-bold text-gray-400 hover:text-primary-600 transition-colors"
                >
                  {isLoginMode ? "Don't have an account? Create one." : "Already have an account? Sign In."}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {(authMethod === 'email' || (!emailInput && (authMethod === 'google' || authMethod === 'facebook'))) && (
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
                  <input type="email" required={authMethod === 'email'} value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="input mt-1" placeholder="your@email.com" />
                  {(authMethod === 'google' || authMethod === 'facebook') && (
                    <p className="text-[9px] text-gray-400 mt-1 italic font-medium">Optional: We'll use your social ID if email is missing.</p>
                  )}
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Full Name</label>
                <input type="text" required value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="input mt-1" placeholder="Juan Dela Cruz" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Mobile Number</label>
                <div className="relative mt-1">
                  <input 
                    type="tel" required 
                    value={formData.mobile} 
                    onChange={(e) => handleMobileChange(e.target.value)} 
                    className={`input ${mobileError ? 'border-red-400' : ''}`} 
                    placeholder="09123456789" 
                    maxLength={11} 
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">{formData.mobile.length}/11</span>
                </div>
                {mobileError && <p className="text-[10px] text-red-500 mt-1 font-medium">{mobileError}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Delivery Address (Free Map)</label>
                  {addressStatus && <span className="text-[9px] text-primary-500 font-bold flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> {addressStatus}</span>}
                </div>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text" required value={formData.address} 
                      onChange={(e) => setFormData({...formData, address: e.target.value})} 
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddressSearch())}
                      className="input" placeholder="Type and press search..." 
                    />
                  </div>
                  <button 
                    type="button" onClick={handleAddressSearch} disabled={searching}
                    className="p-3 bg-primary-100 text-primary-600 rounded-xl hover:bg-primary-200 transition-colors disabled:opacity-50"
                  >
                    {searching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                  </button>
                </div>

                <button type="button" onClick={handleUseCurrentLocation} disabled={locatingUser} className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 border-dashed border-primary-200 text-primary-600 text-xs font-bold hover:bg-primary-50 transition-all">
                  {locatingUser ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                  {locatingUser ? 'Fixing Location...' : 'Use My Current Location'}
                </button>

                <div className="h-44 w-full rounded-xl overflow-hidden border dark:border-gray-800 bg-gray-50 z-0 relative">
                  <MapContainerCast 
                    center={mapCenter} 
                    zoom={15} 
                    style={{ height: '100%', width: '100%' }} 
                    zoomControl={false}
                  >
                    <TileLayerCast 
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                      attribution='&copy; OpenStreetMap contributors' 
                    />
                    <ChangeView center={mapCenter} />
                    <MapEvents onMapClick={onMapClick} />
                    <Marker position={mapCenter as any} />
                  </MapContainerCast>
                </div>
                <p className="text-[9px] text-gray-400 italic text-center">OpenStreetMap data - No credit card required</p>
              </div>

              <div className="flex gap-3 pt-4 border-t dark:border-gray-800">
                <button type="button" onClick={() => setStep('choose')} className="btn-secondary flex-1 py-3 text-xs font-bold uppercase">Back</button>
                <button type="submit" disabled={loading} className="btn-primary flex-[2] py-3 text-xs font-bold uppercase tracking-widest shadow-xl shadow-primary-500/20">
                  {loading ? 'Completing...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
