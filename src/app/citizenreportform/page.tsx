'use client'
import React, { useState } from 'react'

interface RecentIncident {
  id: string
  type: string
  address: string
  date: string
  status: 'Submitted' | 'Resolved' | 'Dispatched'
}

export default function CrimeReportForm() {
  // Form states matching CRC labels
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false) // CRC1
  const [fullName, setFullName] = useState<string>('') // CRC2 (Name)
  const [contactInfo, setContactInfo] = useState<string>('') // CRC2 (Contact)
  const [location, setLocation] = useState<string>('') // CRC2 (Location)
  const [dateTime, setDateTime] = useState<string>('2026-06-12T15:43') // CRC4
  const [incidentType, setIncidentType] = useState<string>('') // CRC3
  const [priority, setPriority] = useState<string>('Low') // CRC8
  const [description, setDescription] = useState<string>('') // CRC9
  const [witnesses, setWitnesses] = useState<string>('') // CRC10
  const [additionalInfo, setAdditionalInfo] = useState<string>('') // CRC11
  const [fileName, setFileName] = useState<string>('No file chosen')

  // Mock data for the right sidebar matching CRC7
  const [recentIncidents] = useState<RecentIncident[]>([
    { id: '1', type: 'theft', address: '53 St Marks Rd, Southernwood, East London', date: 'Nov 12, 2025 02:47 PM', status: 'Submitted' },
    { id: '2', type: 'assault', address: '100 Oxford St, East London, Buffalo City', date: 'Nov 12, 2025 02:42 PM', status: 'Submitted' },
    { id: '3', type: 'burglary', address: 'Shop No 17 & 18, Mdantsane City Shopping Complex', date: 'Sep 10, 2025 11:10 PM', status: 'Resolved' },
    { id: '4', type: 'theft', address: '34 Moore Street, Quigney, East London', date: 'Sep 09, 2025 08:56 PM', status: 'Resolved' }
  ])

  // File picker handler (CRC5)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name)
    }
  }

  // Form Submission Handler (CRC6)
  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault()
    alert(`Report submitted successfully!\nType: ${incidentType || 'Not specified'}\nAnonymous: ${isAnonymous ? 'Yes' : 'No'}`)
  }

  return (
    <div className="min-h-screen bg-[#0d1527] text-white flex flex-col">
      
      {/* GLOBAL HEADER HEADER BAR */}
      <header className="bg-[#0a0f1d]/60 border-b border-slate-800/60 px-6 py-4 flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="text-xl">🛡️</div>
          <span className="text-lg font-black tracking-wider text-sky-400 uppercase">CrimeAlert</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-slate-400 font-medium">
          <span className="hover:text-white cursor-pointer hidden sm:inline">Home</span>
          <span className="hover:text-white cursor-pointer hidden sm:inline">Features</span>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-semibold transition-all">Login</button>
        </div>
      </header>

      {/* WORKSPACE CONTENT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* BACK NAVIGATION HEADER BAR */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.history.back()}
            className="bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors text-slate-300"
          >
            ← Back
          </button>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Crime Report Form</h2>
        </div>

        {/* SCREEN DIVISION MATRIX GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SECTION: MAIN INTERACTIVE REPORT FORM */}
          <form onSubmit={handleSubmitReport} className="lg:col-span-8 bg-[#0a0f1d]/40 border border-slate-800/80 rounded-2xl p-5 sm:p-6 space-y-6 backdrop-blur-md">
            <h3 className="text-base font-bold tracking-wide text-slate-200 border-b border-slate-800 pb-2">Report an Incident</h3>

            {/* SECTION 1: REPORTER INFORMATION */}
            <div className="space-y-4 bg-slate-900/20 border border-slate-800/60 p-4 rounded-xl">
              <div className="text-xs font-bold text-sky-400 uppercase tracking-wide flex items-center gap-2">👤 Reporter Information</div>
              
              {/* CRC1: Checkbox for Anonymous Reports */}
              <label className="flex items-center gap-3 bg-blue-950/20 border border-blue-900/30 p-3 rounded-lg cursor-pointer hover:bg-blue-950/30 transition-colors">
                <input 
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500/50"
                />
                <span className="text-xs font-medium text-slate-300 select-none">Submit as Anonymous Report</span>
              </label>

              {/* CRC2: Textboxes for User Input */}
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

            {/* SECTION 2: INCIDENT DETAILS */}
            <div className="space-y-4 bg-slate-900/20 border border-slate-800/60 p-4 rounded-xl">
              <div className="text-xs font-bold text-sky-400 uppercase tracking-wide flex items-center gap-2">📍 Incident Details</div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CRC2: Location Input */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase">Location</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Street, landmark, or area"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 block">e.g., 45 Harrow Rd, Beacon Bay South, East London, 5241</span>
                </div>

                {/* CRC4: Date Time Selector */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase">Date & Time</label>
                  <input 
                    type="datetime-local" 
                    required
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CRC3: Dropdown list for choosing type data */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase">Type of Incident</label>
                  <select 
                    value={incidentType}
                    required
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="" disabled>-- Select Type --</option>
                    <option value="Theft">Theft / Larceny</option>
                    <option value="Assault">Assault</option>
                    <option value="Burglary">Residential Burglary</option>
                    <option value="Vandalisim">Vandalism</option>
                  </select>
                </div>

                {/* CRC8: Dropdown for priority levels */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase">Priority</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High / Critical</option>
                  </select>
                </div>
              </div>

              {/* CRC9: Textbox for detailed Description */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-400 uppercase">Description</label>
                <textarea 
                  rows={4}
                  required
                  placeholder="Provide a detailed description of the incident..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            {/* SECTION 3: WITNESSES & OPTIONAL INFO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CRC10: Textbox for Witness Information */}
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

              {/* CRC11: Textbox for additional Information */}
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

            {/* SECTION 4: EVIDENCE UPLOAD */}
            <div className="space-y-3 bg-slate-900/20 border border-slate-800/60 p-4 rounded-xl">
              <div className="text-xs font-bold text-sky-400 uppercase tracking-wide flex items-center gap-2">📎 Evidence Upload</div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase">Upload Evidence (Photos, Videos, Documents)</label>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-900 border border-slate-700/60 p-3 rounded-xl">
                {/* CRC5: Button to help choose file from device storage */}
                <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors border border-slate-700/60 shrink-0">
                  Choose Files
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                </label>
                <span className="text-xs text-slate-400 truncate w-full">{fileName}</span>
              </div>
              <span className="text-[10px] text-slate-500 block">Max 10MB per file. Allowed: JPG, PNG, GIF, MP4, AVI, MOV, PDF, DOC, DOCX, TXT</span>
            </div>

            {/* CRC6: Button for submitting data */}
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all text-sm uppercase tracking-wider"
            >
              Submit Report
            </button>
          </form>

          {/* RIGHT SECTION: SIDEBAR SYSTEM WIDGETS */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* SAFETY ALERTS NOTIFICATION BOX */}
            <div className="bg-[#0a0f1d]/40 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
              <h3 className="text-xs font-bold tracking-wider uppercase text-amber-500 flex items-center gap-2 mb-3">⚠️ Safety Alerts</h3>
              <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl text-center">
                <span className="text-xs font-semibold text-amber-400 block">⚠️ System Notice</span>
                <span className="text-[11px] text-slate-400 block mt-1">Safety alerts temporarily unavailable.</span>
              </div>
            </div>

            {/* CRC7: Display list of recent crime reports */}
            <div className="bg-[#0a0f1d]/40 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
              <h3 className="text-xs font-bold tracking-wider uppercase text-slate-400 flex items-center gap-2 mb-4">📋 Recent Incidents</h3>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {recentIncidents.map((incident) => (
                  <div key={incident.id} className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl space-y-2 hover:border-slate-700/50 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold capitalize text-slate-200">{incident.type}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        incident.status === 'Submitted' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        incident.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {incident.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{incident.address}</p>
                    <span className="text-[10px] text-slate-500 block">{incident.date}</span>
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