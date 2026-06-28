'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'

interface RecentIncident {
  id: string
  type_of_incident: string
  location_text: string // Changed from 'location' to 'location_text'
  incident_date_time: string
  status: 'Submitted' | 'Resolved' | 'Dispatched'
  latitude?: number
  longitude?: number
}

interface LocationSuggestion {
  display_name: string
  lat: string
  lon: string
  class: string
  type: string
}

export default function CitizenReportForm() {
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [fullName, setFullName] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [locationText, setLocationText] = useState('') // Changed from 'location'
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [dateTime, setDateTime] = useState('')
  const [incidentType, setIncidentType] = useState('')
  const [priority, setPriority] = useState('Low')
  const [description, setDescription] = useState('')
  const [witnesses, setWitnesses] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [fileName, setFileName] = useState('No file chosen')

  // Location autocomplete states
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null)
  const suggestionRef = useRef<HTMLDivElement>(null)

  const [recentIncidents, setRecentIncidents] = useState<RecentIncident[]>([])
  const [incidentsLoading, setIncidentsLoading] = useState(true)
  const [incidentsError, setIncidentsError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchRecentIncidents = useCallback(async () => {
    setIncidentsLoading(true)
    setIncidentsError(null)
    try {
      const res = await fetch('/api/citizenreportform')
      const data = await res.json()
      if (!res.ok) {
        setIncidentsError(data.error || 'Failed to load incidents')
        return
      }
      setRecentIncidents(data.reports || [])
    } catch {
      setIncidentsError('Network error — could not load incidents')
    } finally {
      setIncidentsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecentIncidents()
  }, [fetchRecentIncidents])

  // Set default date time when component mounts
  useEffect(() => {
    if (!dateTime) {
      const now = new Date()
      const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      setDateTime(localDateTime.toISOString().slice(0, 16))
    }
  }, [dateTime])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced location search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (locationText.length >= 3 && !selectedLocation) {
        fetchLocationSuggestions(locationText)
      } else if (locationText.length < 3) {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [locationText, selectedLocation])

  const fetchLocationSuggestions = async (query: string) => {
    setIsLoadingSuggestions(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=za`,
        {
          headers: {
            'User-Agent': 'CrimeAlert/1.0'
          }
        }
      )
      
      if (!response.ok) throw new Error('Failed to fetch suggestions')
      
      const data = await response.json()
      setSuggestions(data)
      setShowSuggestions(data.length > 0)
    } catch (error) {
      console.error('Error fetching location suggestions:', error)
      setSuggestions([])
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setLocationText(suggestion.display_name)
    setSelectedLocation(suggestion)
    setLatitude(parseFloat(suggestion.lat))
    setLongitude(parseFloat(suggestion.lon))
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationText(e.target.value)
    setSelectedLocation(null)
    setLatitude(null)
    setLongitude(null)
    if (e.target.value.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  // Get current location using browser geolocation
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            {
              headers: { 'User-Agent': 'CrimeAlert/1.0' }
            }
          )
          const data = await response.json()
          
          if (data.display_name) {
            setLocationText(data.display_name)
            setLatitude(latitude)
            setLongitude(longitude)
            setSelectedLocation({
              display_name: data.display_name,
              lat: latitude.toString(),
              lon: longitude.toString(),
              class: 'place',
              type: 'amenity'
            })
          }
        } catch (error) {
          console.error('Error reverse geocoding:', error)
          // Fallback: just use coordinates
          setLocationText(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
          setLatitude(latitude)
          setLongitude(longitude)
        }
      },
      (error) => {
        alert(`Error getting location: ${error.message}`)
      }
    )
  }

  const formatDate = (isoString: string) => {
    const d = new Date(isoString)
    return d.toLocaleString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name)
    }
  }

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!locationText) {
      alert('Please enter a location.')
      return
    }
    if (latitude === null || longitude === null) {
      alert('Please select a valid location from the suggestions. Type at least 3 characters to search.')
      return
    }
    if (!incidentType) {
      alert('Please select a type of incident.')
      return
    }
    if (!description) {
      alert('Please provide a description.')
      return
    }
    if (!dateTime) {
      alert('Please select a date and time.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        is_anonymous: isAnonymous,
        full_name: fullName || null,
        contact_info: contactInfo || null,
        location_text: locationText, // Changed from 'location' to 'location_text'
        latitude: latitude,
        longitude: longitude,
        incident_date_time: dateTime,
        type_of_incident: incidentType,
        priority: priority,
        description: description,
        witnesses: witnesses || null,
        additional_information: additionalInfo || null,
        evidence_url: null,
      }

      console.log('Sending payload:', payload)

      const response = await fetch('/api/citizenreportform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Server returned non-JSON:', text)
        alert(`Server error (${response.status})`)
        setIsSubmitting(false)
        return
      }

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to submit report')
        setIsSubmitting(false)
        return
      }

      alert('✅ Report submitted successfully!')

      // Reset form
      setFullName('')
      setContactInfo('')
      setLocationText('')
      setSelectedLocation(null)
      setLatitude(null)
      setLongitude(null)
      setIncidentType('')
      setPriority('Low')
      setDescription('')
      setWitnesses('')
      setAdditionalInfo('')
      setFileName('No file chosen')
      
      // Reset date to current time
      const now = new Date()
      const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      setDateTime(localDateTime.toISOString().slice(0, 16))

      // Refresh the sidebar list after a successful submission
      await fetchRecentIncidents()

    } catch (error) {
      console.error('Submit error:', error)
      alert(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1527] text-white flex flex-col">

      {/* HEADER */}
      <header className="bg-[#0a0f1d]/60 border-b border-slate-800/60 px-6 py-4 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="text-xl">🛡️</div>
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

        {/* BACK NAVIGATION */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors text-slate-300"
          >
            ← Back
          </button>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Crime Report Form</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT: FORM */}
          <form onSubmit={handleSubmitReport} className="lg:col-span-8 bg-[#0a0f1d]/40 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-6 backdrop-blur-md">

            <h3 className="text-base font-bold tracking-wide text-slate-200 border-b border-slate-800 pb-2">
              Report an Incident
            </h3>

            {/* Reporter Information */}
            <div className="space-y-4 bg-slate-900/20 border border-slate-800/60 p-4 rounded-xl">
              <div className="text-xs font-bold text-sky-400 uppercase tracking-wide flex items-center gap-2">👤 Reporter Information</div>

              <label className="flex items-center gap-3 bg-blue-950/20 border border-blue-900/30 p-3 rounded-lg cursor-pointer hover:bg-blue-950/30 transition-colors">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500/50"
                />
                <span className="text-xs font-medium text-slate-300 select-none">Submit as Anonymous Report</span>
              </label>

              {!isAnonymous && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase">Full Name</label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase">Contact Information</label>
                    <input
                      type="text"
                      placeholder="Phone number or email"
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Incident Details */}
            <div className="space-y-4 bg-slate-900/20 border border-slate-800/60 p-4 rounded-xl">
              <div className="text-xs font-bold text-sky-400 uppercase tracking-wide flex items-center gap-2">📍 Incident Details</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 relative" ref={suggestionRef}>
                  <div className="flex justify-between items-center">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase">Location</label>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                    >
                      📍 Use my location
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Start typing to search for a location..."
                    value={locationText}
                    onChange={handleLocationChange}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true)
                    }}
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  />
                  
                  {/* Show selected coordinates if available */}
                  {selectedLocation && latitude !== null && longitude !== null && (
                    <div className="text-[10px] text-emerald-400 mt-1">
                      📍 Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </div>
                  )}
                  
                  {/* Location Suggestions Dropdown */}
                  {showSuggestions && (
                    <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                      {isLoadingSuggestions ? (
                        <div className="px-4 py-3 text-sm text-slate-400">
                          <span className="animate-pulse">Searching...</span>
                        </div>
                      ) : suggestions.length > 0 ? (
                        suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSelectSuggestion(suggestion)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0"
                          >
                            <div className="text-sm text-slate-200">{suggestion.display_name}</div>
                            <div className="text-[10px] text-slate-500 capitalize">
                              {suggestion.class} · {suggestion.type}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-slate-400">
                          No locations found. Try a different search.
                        </div>
                      )}
                    </div>
                  )}
                  
                  <span className="text-[10px] text-slate-500 block">
                    {selectedLocation 
                      ? '📍 Location selected with coordinates' 
                      : 'Start typing to search for a location (e.g., "Cape Town")'}
                  </span>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase">Type of Incident</label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Type</option>
                    <option>Theft</option>
                    <option>Assault</option>
                    <option>Burglary</option>
                    <option>Vandalism</option>
                    <option>Fraud</option>
                    <option>Suspicious Activity</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase">Description</label>
                <textarea
                  rows={4}
                  placeholder="Provide a detailed description of the incident..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Witnesses & Additional Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase">Witnesses (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Names and contact information of witnesses, if any"
                  value={witnesses}
                  onChange={(e) => setWitnesses(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase">Additional Information (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Any other relevant details..."
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* Evidence Upload */}
            <div className="space-y-3 bg-slate-900/20 border border-slate-800/60 p-4 rounded-xl">
              <div className="text-xs font-bold text-sky-400 uppercase tracking-wide flex items-center gap-2">📎 Evidence Upload</div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase">Upload Evidence (Photos, Videos, Documents)</label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-900 border border-slate-700/60 p-3 rounded-xl">
                <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors border border-slate-700/60 shrink-0">
                  Choose Files
                  <input type="file" className="hidden" onChange={handleFileChange} />
                </label>
                <span className="text-xs text-slate-400 truncate w-full">{fileName}</span>
              </div>
              <span className="text-[10px] text-slate-500 block">Max 10MB per file. Allowed: JPG, PNG, GIF, MP4, AVI, MOV, PDF, DOC, DOCX, TXT</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all text-sm uppercase tracking-wider"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>

          </form>

          {/* RIGHT: SIDEBAR */}
          <aside className="lg:col-span-4 space-y-6">

            <div className="bg-[#0a0f1d]/40 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
              <h3 className="text-xs font-bold tracking-wider uppercase text-amber-500 flex items-center gap-2 mb-3">⚠️ Safety Alerts</h3>
              <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl text-center">
                <span className="text-xs font-semibold text-amber-400 block">⚠️ System Notice</span>
                <span className="text-[11px] text-slate-400 block mt-1">No alerts available</span>
              </div>
            </div>

            <div className="bg-[#0a0f1d]/40 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
              <h3 className="text-xs font-bold tracking-wider uppercase text-slate-400 flex items-center gap-2 mb-4">📋 Recent Incidents</h3>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">

                {incidentsLoading && (
                  <div className="text-center py-6">
                    <span className="text-xs text-slate-500 animate-pulse">Loading incidents...</span>
                  </div>
                )}

                {incidentsError && !incidentsLoading && (
                  <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl text-center space-y-2">
                    <span className="text-xs text-red-400 block">{incidentsError}</span>
                    <button
                      onClick={fetchRecentIncidents}
                      className="text-[11px] text-blue-400 hover:text-blue-300 underline"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!incidentsLoading && !incidentsError && recentIncidents.length === 0 && (
                  <div className="bg-slate-900/40 border border-slate-800/60 p-4 rounded-xl text-center">
                    <span className="text-xs text-slate-500">No incidents reported yet.</span>
                  </div>
                )}

                {!incidentsLoading && !incidentsError && recentIncidents.map((i) => (
                  <div key={i.id} className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl space-y-2 hover:border-slate-700/50 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold capitalize text-slate-200">{i.type_of_incident}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        i.status === 'Submitted'  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        i.status === 'Resolved'   ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {i.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{i.location_text}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500">{formatDate(i.incident_date_time)}</span>
                      {i.latitude && i.longitude && (
                        <span className="text-[9px] text-emerald-500/70">
                          📍 {i.latitude.toFixed(4)}, {i.longitude.toFixed(4)}
                        </span>
                      )}
                    </div>
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