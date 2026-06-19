'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'

type GPSStatus = 'idle' | 'acquiring' | 'acquired' | 'denied' | 'unavailable' | 'ip-fallback'

interface Coords {
  lat: number
  lng: number
  accuracy?: number
  source: 'gps' | 'ip'
}

function formatCoord(value: number, posLabel: string, negLabel: string) {
  return `${Math.abs(value).toFixed(5)}° ${value >= 0 ? posLabel : negLabel}`
}

function formatLocationLabel(coords: Coords) {
  const lat = formatCoord(coords.lat, 'N', 'S')
  const lng = formatCoord(coords.lng, 'E', 'W')
  return `${lat}, ${lng}`
}

async function fetchIPLocation(): Promise<Coords | null> {
  try {
    const res = await fetch('https://ip-api.com/json/?fields=status,lat,lon', {
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.status !== 'success') return null
    return { lat: json.lat, lng: json.lon, source: 'ip' }
  } catch {
    return null
  }
}

// ── Reverse Geocoding: Convert lat/lng to address ──
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16&addressdetails=1`,
      {
        headers: { 'User-Agent': 'CrimeAlert' },
        signal: AbortSignal.timeout(5000),
      }
    )
    if (!response.ok) return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    const data = await response.json()
    if (data.display_name) {
      return data.display_name
    }
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
}

export default function EmergencyButton() {
  const [isBroadcasting, setIsBroadcasting]    = useState(false)
  const [broadcastSuccess, setBroadcastSuccess] = useState(false)
  const [gpsStatus, setGpsStatus]              = useState<GPSStatus>('idle')
  const [coords, setCoords]                    = useState<Coords | null>(null)
  const [locationLabel, setLocationLabel]      = useState('Tap SOS to detect location')
  const [locationError, setLocationError]      = useState<string | null>(null)
  const [permissionState, setPermissionState]  = useState<PermissionState | 'unknown'>('unknown')
  const [isHttpWarning, setIsHttpWarning]      = useState(false)
  const [address, setAddress]                  = useState<string | null>(null)

  const initRan = useRef(false)

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.location.protocol === 'http:' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setIsHttpWarning(true)
    }
  }, [])

  const tryIPFallback = useCallback(async () => {
    setLocationLabel('Getting approximate location via IP…')
    const ipCoords = await fetchIPLocation()
    if (ipCoords) {
      setCoords(ipCoords)
      setGpsStatus('ip-fallback')
      setLocationLabel(`~${formatLocationLabel(ipCoords)} (IP estimate)`)
      setLocationError(null)
      // Try to get address from IP coordinates
      const addr = await reverseGeocode(ipCoords.lat, ipCoords.lng)
      setAddress(addr)
    } else {
      setGpsStatus('unavailable')
      setLocationLabel('Location unavailable — please call 10111')
      setLocationError('Both GPS and IP location failed.')
    }
  }, [])

  /* ── Core GPS request ── */
  const requestLocation = useCallback((): Promise<Coords | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setGpsStatus('unavailable')
        setLocationLabel('GPS unavailable — trying IP…')
        tryIPFallback().then(() => resolve(null))
        return
      }

      setGpsStatus('acquiring')
      setLocationLabel('Acquiring GPS signal…')
      setLocationError(null)

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const c: Coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            source: 'gps',
          }
          setCoords(c)
          setGpsStatus('acquired')
          setLocationLabel(
            `${formatLocationLabel(c)}${c.accuracy ? ` ±${Math.round(c.accuracy)}m` : ''}`
          )
          setLocationError(null)
          setPermissionState('granted')
          
          // Get address from coordinates
          const addr = await reverseGeocode(c.lat, c.lng)
          setAddress(addr)
          
          resolve(c)
        },
        async (err) => {
          console.warn('Geolocation error', err.code, err.message)
          if (err.code === 1) {
            setGpsStatus('denied')
            setPermissionState('denied')
            setLocationError('Location permission denied.')
          } else {
            setGpsStatus('unavailable')
            setLocationError('GPS unavailable or timed out.')
          }
          await tryIPFallback()
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      )
    })
  }, [tryIPFallback])

  /* ── Silent background init ── */
  useEffect(() => {
    if (initRan.current) return
    initRan.current = true

    const init = async () => {
      if (!navigator.permissions || !navigator.geolocation) return

      try {
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
        setPermissionState(status.state)

        status.addEventListener('change', async () => {
          setPermissionState(status.state)
          if (status.state === 'granted') requestLocation()
          else if (status.state === 'denied') {
            setGpsStatus('denied')
            setCoords(null)
            setLocationError('Location permission denied.')
            await tryIPFallback()
          }
        })

        if (status.state === 'granted') {
          requestLocation()
        }
        if (status.state === 'denied') {
          setGpsStatus('denied')
          setLocationError('Location permission denied.')
          await tryIPFallback()
        }
      } catch {
        // Permissions API unavailable — wait for button tap
      }
    }

    init()
  }, [requestLocation, tryIPFallback])

  /* ── Button handler ── */
  const handleTriggerSOS = async () => {
    if (isBroadcasting) return

    let activeCoords = coords
    if (!activeCoords || gpsStatus === 'idle') {
      setLocationLabel('Requesting location…')
      activeCoords = await requestLocation()
    }

    if (!activeCoords) {
      alert(
        '🚫 Could not get your location.\n\n' +
        'Please:\n' +
        '1. Allow location access when your browser asks\n' +
        '2. Make sure GPS / Location Services are ON\n' +
        '3. Tap SOS again\n\n' +
        'Or call SAPS directly: 10111'
      )
      return
    }

    const sourceWarning =
      activeCoords.source === 'ip'
        ? '\n\n⚠️ Only approximate IP-based location is available (city-level accuracy). GPS was blocked.'
        : ''

    const confirmed = window.confirm(
      '⚠️ WARNING: You are about to broadcast an Emergency SOS Signal.\n' +
      'Do you wish to dispatch emergency services?' +
      sourceWarning
    )
    if (!confirmed) return

    setIsBroadcasting(true)
    setBroadcastSuccess(false)

    try {
      // Get address if we don't have it yet
      let locationAddress = address
      if (!locationAddress) {
        locationAddress = await reverseGeocode(activeCoords.lat, activeCoords.lng)
        setAddress(locationAddress)
      }

      const response = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: activeCoords.lat,
          longitude: activeCoords.lng,
          locationSource: activeCoords.source,
          location: locationAddress, // ← Send the address
          priority: 'Critical', // ← Default priority for SOS
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'SOS broadcast failed')
      }

      setBroadcastSuccess(true)
      alert('🚨 EMERGENCY SOS BROADCAST SUCCESSFUL.\nFirst responders have been notified with your tracking location.')
    } catch (err: any) {
      console.error('SOS error:', err)
      alert('❌ Broadcast Failed: ' + (err?.message ?? 'Connection error. Please call 10111 immediately.'))
    } finally {
      setIsBroadcasting(false)
    }
  }

  /* ── Derived UI ── */
  const isIPOnly    = coords?.source === 'ip'
  const isAcquiring = gpsStatus === 'acquiring' || gpsStatus === 'idle'
  const buttonDisabled = isBroadcasting

  const gpsBadgeClass =
    gpsStatus === 'acquired'    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' :
    gpsStatus === 'ip-fallback' ? 'text-amber-400  border-amber-500/30  bg-amber-500/5'  :
    gpsStatus === 'denied' || gpsStatus === 'unavailable'
                                ? 'text-red-400    border-red-500/30    bg-red-500/5'    :
                                  'text-sky-400    border-sky-500/30    bg-sky-500/5'

  const gpsDot =
    gpsStatus === 'acquired'    ? 'bg-emerald-500' :
    gpsStatus === 'ip-fallback' ? 'bg-amber-500'   :
    gpsStatus === 'denied' || gpsStatus === 'unavailable' ? 'bg-red-500' :
                                  'bg-sky-400 animate-ping'

  const buttonBg =
    isBroadcasting  ? 'bg-amber-600 border-amber-500 cursor-not-allowed animate-pulse' :
    broadcastSuccess ? 'bg-emerald-700 border-emerald-500' :
    isIPOnly         ? 'bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 border-amber-500 active:scale-95' :
    isAcquiring      ? 'bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 border-red-600 active:scale-95' :
                       'bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 border-red-500 active:scale-95'

  const buttonIcon =
    isBroadcasting  ? '📡' :
    broadcastSuccess ? '✅' :
    isIPOnly         ? '📍' : '🚨'

  const buttonLabel =
    isBroadcasting  ? 'Broadcasting…' :
    broadcastSuccess ? 'Dispatched'    :
    isAcquiring      ? 'EMERGENCY\nSOS' :
    isIPOnly         ? 'EMERGENCY\nSOS' :
                       'EMERGENCY\nSOS'

  const statusLine = isBroadcasting   ? <span className="text-amber-400 animate-pulse">⚡ Broadcasting SOS…</span>
    : broadcastSuccess                 ? <span className="text-emerald-400">✓ Distress broadcast live</span>
    : gpsStatus === 'acquiring'        ? <span className="text-amber-400 animate-pulse">⏳ Acquiring GPS signal…</span>
    : gpsStatus === 'acquired'         ? <span className="text-slate-500">System Ready • GPS locked</span>
    : gpsStatus === 'ip-fallback'      ? <span className="text-amber-400">⚠️ IP location only — limited accuracy</span>
    : gpsStatus === 'denied'           ? <span className="text-red-400">GPS blocked — tap SOS to use IP location</span>
    : gpsStatus === 'unavailable'      ? <span className="text-red-400">GPS unavailable — tap SOS to continue</span>
    :                                    <span className="text-sky-400 animate-pulse">Tap SOS to detect your location</span>

  return (
    <div className="min-h-screen bg-[#0d1527] text-white flex flex-col">

      {/* HEADER */}
      <header className="bg-[#0a0f1d]/60 border-b border-slate-800/60 px-6 py-4 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <span className="text-lg font-black tracking-wider text-sky-400 uppercase">CrimeAlert</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-400 font-medium">
          <span className="hover:text-white cursor-pointer hidden sm:inline">Home</span>
          <span className="hover:text-white cursor-pointer hidden sm:inline">Features</span>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-semibold transition-all">
            Login
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* HTTP WARNING */}
        {isHttpWarning && (
          <div className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-center space-y-1">
            <p className="text-yellow-400 text-xs font-bold uppercase tracking-wide">⚠️ Insecure Connection</p>
            <p className="text-yellow-300/80 text-[11px]">
              GPS requires HTTPS. You are on <code className="bg-yellow-900/40 px-1 rounded">http://</code> —
              only approximate IP location will work. Deploy to HTTPS or test on localhost.
            </p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors text-slate-300"
          >
            ← Back
          </button>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Emergency Alert</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT — PANIC MODULE */}
          <div className="lg:col-span-7 bg-[#0a0f1d]/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 space-y-8 backdrop-blur-md flex flex-col items-center">

            <div className="text-center space-y-1 w-full">
              <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                Panic Control Module
              </h3>
              <p className="text-slate-400 text-xs">
                Tap the button to broadcast an Emergency SOS — your location will be captured automatically.
              </p>
            </div>

            {/* IP FALLBACK NOTICE */}
            {isIPOnly && (
              <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-center space-y-1">
                <p className="text-amber-400 text-xs font-bold uppercase tracking-wide">⚠️ Approximate Location Active</p>
                <p className="text-amber-300/80 text-[11px] leading-relaxed">
                  GPS was blocked so your location is approximate (city-level via IP).
                  Enable GPS for a precise location — or tap SOS to send with current accuracy.
                </p>
                {permissionState !== 'denied' && (
                  <button
                    type="button"
                    onClick={() => requestLocation()}
                    className="mt-1 text-[11px] bg-sky-600 hover:bg-sky-500 text-white px-4 py-1.5 rounded-lg font-semibold transition-colors"
                  >
                    🔄 Try GPS again
                  </button>
                )}
              </div>
            )}

            {/* GPS HARD DENIED */}
            {gpsStatus === 'denied' && permissionState === 'denied' && !isIPOnly && (
              <div className="w-full bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-center space-y-2">
                <p className="text-red-400 text-xs font-bold uppercase tracking-wide">GPS Blocked by Browser</p>
                <div className="text-left bg-slate-900/60 border border-slate-700/40 rounded-lg px-3 py-3 space-y-1">
                  <p className="text-amber-400 text-[10px] font-bold uppercase tracking-wide mb-1">To enable precise GPS:</p>
                  {[
                    'Click the 🔒 lock icon in the address bar',
                    'Set "Location" → Allow',
                    'Refresh this page',
                  ].map((step, i) => (
                    <p key={i} className="text-[10px] text-slate-300 flex gap-1.5">
                      <span className="text-sky-400 font-bold shrink-0">{i + 1}.</span>{step}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* ── BIG BUTTON ── */}
            <button
              onClick={handleTriggerSOS}
              disabled={buttonDisabled}
              className={`relative w-56 h-56 rounded-full font-black text-lg uppercase tracking-widest transition-all duration-300 border-4 shadow-2xl flex flex-col justify-center items-center gap-3 select-none
                text-white ${buttonBg}
              `}
            >
              {!isBroadcasting && !broadcastSuccess && (
                <>
                  <span className={`absolute inset-0 rounded-full ${isIPOnly ? 'bg-amber-500/20' : 'bg-red-500/20'} animate-ping pointer-events-none`} />
                  <span className={`absolute -inset-3 rounded-full border ${isIPOnly ? 'border-amber-500/20' : 'border-red-500/20'} animate-ping pointer-events-none`} />
                </>
              )}
              <span className="text-5xl drop-shadow">{buttonIcon}</span>
              <span className="text-sm font-black tracking-wider leading-tight text-center px-2 whitespace-pre-line">
                {buttonLabel}
              </span>
            </button>

            <div className="text-[11px] font-semibold text-center">{statusLine}</div>

            {/* GPS Location Display */}
            <div className={`w-full border rounded-xl p-4 space-y-2 ${gpsBadgeClass}`}>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
                <span className={`w-2 h-2 rounded-full shrink-0 ${gpsDot}`} />
                {gpsStatus === 'ip-fallback' ? 'IP Location (Approximate)' : 'GPS Location'}
              </div>
              <p className="text-xs font-mono break-all">{locationLabel}</p>
              {address && (
                <p className="text-xs text-slate-300 break-all">
                  📍 {address}
                </p>
              )}
              {coords && (
                <a
                  href={`https://maps.google.com/?q=${coords.lat},${coords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] underline opacity-70 hover:opacity-100 block"
                >
                  Verify on Google Maps ↗
                </a>
              )}
            </div>

          </div>

          {/* RIGHT SIDEBAR */}
          <aside className="lg:col-span-5 space-y-5">

            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wide">🚨 Emergency Use Only</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                This button dispatches an emergency alert to the nearest law enforcement unit with your real-time GPS coordinates. Only press in genuine emergencies. False alarms may result in penalties.
              </p>
            </div>

            <div className="bg-[#0a0f1d]/40 border border-slate-800/80 rounded-2xl p-4 space-y-3 backdrop-blur-md">
              <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wide">📋 What Happens When You Tap SOS</h4>
              <ol className="space-y-2">
                {[
                  'Your location is detected automatically.',
                  'The address is captured from your coordinates.',
                  'You confirm the emergency dispatch.',
                  'An alert is logged with your GPS coordinates and address.',
                  'The nearest law enforcement unit is notified.',
                  'You receive confirmation of successful dispatch.',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                    <span className="text-sky-500 font-bold shrink-0">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-[#0a0f1d]/40 border border-slate-800/80 rounded-2xl p-4 space-y-3 backdrop-blur-md">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide">📞 Emergency Contacts</h4>
              <div className="space-y-2">
                {[
                  { label: 'SAPS Emergency',       number: '10111' },
                  { label: 'Ambulance / Medical',  number: '10177' },
                  { label: 'Fire Department',       number: '080 011 0000' },
                  { label: 'Crime Stop (tip-offs)', number: '0860 010 111' },
                ].map(({ label, number }) => (
                  <div key={label} className="flex justify-between items-center bg-slate-900/60 border border-slate-800/60 rounded-lg px-3 py-2">
                    <span className="text-[11px] text-slate-400">{label}</span>
                    <a href={`tel:${number.replace(/\s/g, '')}`} className="text-xs font-bold text-sky-400 hover:text-sky-300">
                      {number}
                    </a>
                  </div>
                ))}
              </div>
            </div>

          </aside>
        </div>
      </main>
    </div>
  )
}