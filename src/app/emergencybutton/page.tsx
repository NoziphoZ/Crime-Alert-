'use client'

import React, { useState, useEffect } from 'react'

type GPSStatus = 'idle' | 'acquiring' | 'acquired' | 'denied' | 'unavailable'

export default function EmergencyButton() {
  const [isBroadcasting, setIsBroadcasting]     = useState<boolean>(false)
  const [broadcastSuccess, setBroadcastSuccess] = useState<boolean>(false)
  const [gpsStatus, setGpsStatus]               = useState<GPSStatus>('idle')
  const [coords, setCoords]                     = useState<{ lat: number; lng: number } | null>(null)
  const [locationLabel, setLocationLabel]       = useState<string>('Detecting location...')
  const [locationError, setLocationError]       = useState<string | null>(null)

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable')
      setLocationError('GPS unavailable on this device')
      setLocationLabel('GPS unavailable on this device')
      return
    }

    setGpsStatus('acquiring')
    setLocationLabel('Acquiring GPS signal...')
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ lat: latitude, lng: longitude })
        setGpsStatus('acquired')
        setLocationLabel(`${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E`)
        setLocationError(null)
      },
      (err) => {
        if (err.code === 1) {
          setGpsStatus('denied')
          setLocationError('Location permission denied. Please allow location access in your browser settings.')
          setLocationLabel('Location access denied — SOS disabled')
        } else if (err.code === 2) {
          setGpsStatus('unavailable')
          setLocationError('Unable to determine location. Please try again or check device location settings.')
          setLocationLabel('Location unavailable — SOS disabled')
        } else if (err.code === 3) {
          setGpsStatus('denied')
          setLocationError('Location request timed out. Please try again.')
          setLocationLabel('Location timed out — SOS disabled')
        } else {
          setGpsStatus('denied')
          setLocationError('Location access denied or unavailable.')
          setLocationLabel('Location access denied — SOS disabled')
        }
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  useEffect(() => {
    requestLocation()
  }, [])

  /* ── SOS trigger ── */
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable')
      setLocationLabel('GPS unavailable on this device')
      return
    }

    setGpsStatus('acquiring')
    setLocationLabel('Acquiring GPS signal...')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ lat: latitude, lng: longitude })
        setGpsStatus('acquired')
        setLocationLabel(`${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E`)
      },
      () => {
        setGpsStatus('denied')
        setLocationLabel('Location access denied — SOS disabled')  // ← updated message
      },
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }, [])

  /* ── SOS trigger ── */
  const handleTriggerSOS = async () => {
    // 🔒 Hard block — no GPS, no submission
    if (gpsStatus !== 'acquired' || !coords) {
      if (navigator.permissions) {
        requestLocation()
      }
      alert(
        '🚫 SOS Blocked: GPS location is required to dispatch an emergency alert.\n\n' +
        (locationError ?? 'Please enable location access in your browser settings and try again.')
      )
      return
    }

    const confirmed = window.confirm(
      '⚠️ WARNING: You are about to broadcast an Emergency SOS Signal.\nDo you wish to dispatch emergency services?'
    )
    if (!confirmed) return

    setIsBroadcasting(true)
    setBroadcastSuccess(false)

    await sendSOSPayload(coords.lat, coords.lng)  // ← never null, coords guaranteed above
  }

  const sendSOSPayload = async (lat: number, lng: number) => {  // ← types are number, not number | null
    try {
      const response = await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'SOS Broadcast network transaction failed')
      }

      setBroadcastSuccess(true)
      alert('🚨 EMERGENCY SOS BROADCAST SUCCESSFUL.\nFirst responders have been notified with your tracking location.')
    } catch (err: any) {
      console.error('SOS error:', err)
      alert('❌ Broadcast Failed: ' + (err?.message ?? 'Connection error. Please call emergency services immediately.'))
    } finally {
      setIsBroadcasting(false)
    }
  }

  /* ── GPS is usable only when acquired ── */
  const gpsReady = gpsStatus === 'acquired' && coords !== null

  /* ── GPS badge colour ── */
  const gpsBadgeClass =
    gpsStatus === 'acquired'    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' :
    gpsStatus === 'denied' ||
    gpsStatus === 'unavailable' ? 'text-red-400 border-red-500/30 bg-red-500/5' :
                                  'text-amber-400 border-amber-500/30 bg-amber-500/5'

  const gpsDot =
    gpsStatus === 'acquired'    ? 'bg-emerald-500' :
    gpsStatus === 'denied' ||
    gpsStatus === 'unavailable' ? 'bg-red-500' :
                                  'bg-amber-500 animate-ping'

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

      {/* MAIN */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* BACK + TITLE */}
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

            {/* Title */}
            <div className="text-center space-y-1 w-full">
              <h3 className="text-sm font-bold text-red-500 uppercase tracking-widest flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                Panic Control Module
              </h3>
              <p className="text-slate-400 text-xs">
                Press the button below to immediately broadcast an Emergency SOS with your GPS location.
              </p>
            </div>

            {/* GPS DENIED WARNING BANNER — only shown when blocked */}
            {(gpsStatus === 'denied' || gpsStatus === 'unavailable') && (
              <div className="w-full bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-center space-y-1">
                <p className="text-red-400 text-xs font-bold uppercase tracking-wide">🚫 SOS Unavailable</p>
                <p className="text-red-300/80 text-[11px] leading-relaxed">
                  GPS location is required to send an emergency alert.<br />
                  Enable location access in your browser settings to continue.
                </p>
              </div>
            )}

            {/* BIG BUTTON */}
            <button
              onClick={handleTriggerSOS}
              disabled={isBroadcasting || !gpsReady}  // 🔒 disabled when no GPS
              className={`relative w-56 h-56 rounded-full font-black text-lg uppercase tracking-widest transition-all duration-300 border-4 shadow-2xl flex flex-col justify-center items-center gap-3 select-none group
                ${isBroadcasting
                  ? 'bg-amber-600 border-amber-500 text-white animate-pulse cursor-not-allowed'
                  : broadcastSuccess
                  ? 'bg-emerald-700 border-emerald-500 text-white shadow-emerald-900/30'
                  : !gpsReady
                  ? 'bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed opacity-50'  // ← greyed out
                  : 'bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 border-red-500 text-white shadow-red-900/50 active:scale-95'
                }
              `}
            >
              {/* Outer pulse rings — only when GPS ready and idle */}
              {!isBroadcasting && !broadcastSuccess && gpsReady && (
                <>
                  <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping pointer-events-none" />
                  <span className="absolute -inset-3 rounded-full border border-red-500/20 animate-ping pointer-events-none" />
                </>
              )}

              <span className="text-5xl drop-shadow">
                {isBroadcasting ? '📡' : broadcastSuccess ? '✅' : !gpsReady ? '🔒' : '🚨'}
              </span>
              <span className="text-sm font-black tracking-wider leading-tight text-center px-2">
                {isBroadcasting
                  ? 'Broadcasting...'
                  : broadcastSuccess
                  ? 'Dispatched'
                  : !gpsReady
                  ? 'GPS\nREQUIRED'      // ← lock state label
                  : 'EMERGENCY\nSOS'}
              </span>
            </button>

            {/* Status line */}
            <div className="text-[11px] font-semibold transition-colors text-center">
              {isBroadcasting ? (
                <span className="text-amber-400 animate-pulse">⚡ Ping-locking active GPS satellite nodes...</span>
              ) : broadcastSuccess ? (
                <span className="text-emerald-400">✓ Active Distress Broadcast Streaming Live</span>
              ) : !gpsReady ? (
                <span className="text-red-400">⛔ SOS locked — GPS signal required</span>  // ← lock message
              ) : (
                <span className="text-slate-500">System Ready • Secured by NextAuth</span>
              )}
            </div>

            {/* GPS Location Display */}
            <div className={`w-full border rounded-xl p-4 space-y-2 ${gpsBadgeClass}`}>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
                <span className={`w-2 h-2 rounded-full shrink-0 ${gpsDot}`} />
                GPS Location Tracking
              </div>
              <p className="text-xs font-mono break-all">
                {locationLabel}
              </p>
              {coords && (
                <a
                  href={`https://maps.google.com/?q=${coords.lat},${coords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] underline opacity-70 hover:opacity-100 block"
                >
                  Open in Google Maps ↗
                </a>
              )}
              {locationError && (
                <button
                  type="button"
                  onClick={requestLocation}
                  className="mt-2 inline-block text-[10px] text-sky-300 underline hover:text-sky-100"
                >
                  Retry GPS access
                </button>
              )}
            </div>

          </div>

          {/* RIGHT — INFO SIDEBAR */}
          <aside className="lg:col-span-5 space-y-5">

            {/* Warning notice */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wide flex items-center gap-2">
                🚨 Emergency Use Only
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                This button dispatches an emergency alert to the nearest law enforcement unit with your real-time GPS coordinates. Only press in genuine emergencies. False alarms may result in penalties.
              </p>
            </div>

            {/* What happens */}
            <div className="bg-[#0a0f1d]/40 border border-slate-800/80 rounded-2xl p-4 space-y-3 backdrop-blur-md">
              <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wide">📋 What Happens When You Press SOS</h4>
              <ol className="space-y-2">
                {[
                  'Your GPS coordinates are captured instantly.',
                  'An emergency alert is logged in the system.',
                  'The nearest law enforcement unit is notified in real time.',
                  'You will receive a confirmation of successful dispatch.',
                  'Track your alert status from the Emergency Status page.',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                    <span className="text-sky-500 font-bold shrink-0">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Emergency contacts */}
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