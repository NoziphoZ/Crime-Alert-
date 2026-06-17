'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface RecentIncident {
  id: string
  type_of_incident: string
  location: string
  incident_date_time: string
  status: 'Submitted' | 'Resolved' | 'Dispatched'
}

export default function CitizenReportForm() {

  const [isAnonymous, setIsAnonymous] = useState(false)
  const [fullName, setFullName] = useState('')
  const [contactInfo, setContactInfo] = useState('')
  const [location, setLocation] = useState('')
  const [dateTime, setDateTime] = useState('2026-06-12T15:43')
  const [incidentType, setIncidentType] = useState('')
  const [priority, setPriority] = useState('Low')
  const [description, setDescription] = useState('')
  const [witnesses, setWitnesses] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [fileName, setFileName] = useState('No file chosen')

  const [recentIncidents, setRecentIncidents] = useState<RecentIncident[]>([])
  const [incidentsLoading, setIncidentsLoading] = useState(true)
  const [incidentsError, setIncidentsError] = useState<string | null>(null)

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
      setRecentIncidents(data.reports)
    } catch {
      setIncidentsError('Network error — could not load incidents')
    } finally {
      setIncidentsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecentIncidents()
  }, [fetchRecentIncidents])

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

    try {
      const response = await fetch('/api/citizenreportform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_anonymous: isAnonymous,
          full_name: fullName,
          contact_info: contactInfo,
          location,
          incident_date_time: dateTime,
          type_of_incident: incidentType,
          priority,
          description,
          witnesses,
          additional_information: additionalInfo,
          evidence_url: null,
        }),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Server returned:', text)
        alert('API route not found or server error')
        return
      }

      const data = await response.json()
      if (!response.ok) {
        alert(data.error || 'Failed to submit report')
        return
      }

      alert('Report submitted successfully!')

      setFullName('')
      setContactInfo('')
      setLocation('')
      setIncidentType('')
      setPriority('Low')
      setDescription('')
      setWitnesses('')
      setAdditionalInfo('')
      setFileName('No file chosen')

      // Refresh the sidebar list after a successful submission
      fetchRecentIncidents()

    } catch (error) {
      console.error(error)
      alert('Something went wrong')
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
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase">Location</label>
                  <input
                    type="text"
                    placeholder="Street, landmark, or area"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 block">e.g., 45 Harrow Rd, Beacon Bay South, East London, 5241</span>
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
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all text-sm uppercase tracking-wider"
            >
              Submit Report
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
                    <p className="text-[11px] text-slate-400 leading-tight">{i.location}</p>
                    <span className="text-[10px] text-slate-500 block">{formatDate(i.incident_date_time)}</span>
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