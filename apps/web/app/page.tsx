// LeadForge Dashboard — Main page
'use client';

import { useState } from 'react';

export default function Dashboard() {
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [searching, setSearching] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const handleSearch = async () => {
    if (!niche || !city) return;
    setSearching(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, city }),
      });
      const data = await res.json();

      // Poll for results
      if (data.searchId) {
        const poll = setInterval(async () => {
          const statusRes = await fetch(`/api/search/${data.searchId}/leads`);
          const statusData = await statusRes.json();

          if (statusData.leads?.length > 0) {
            setLeads(statusData.leads);
            setSearching(false);
            clearInterval(poll);
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-orange-500">🔥 LeadForge</div>
            <span className="text-sm text-gray-500">Signal-powered lead intelligence</span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#" className="text-orange-400 font-medium">Dashboard</a>
            <a href="#" className="text-gray-400 hover:text-white">Leads</a>
            <a href="#" className="text-gray-400 hover:text-white">Sequences</a>
            <a href="#" className="text-gray-400 hover:text-white">Signals</a>
            <a href="#" className="text-gray-400 hover:text-white">CRM</a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Find Hot Leads</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Niche / Industry</label>
              <input
                type="text"
                placeholder="e.g. Plumber, Dentist, Restaurant"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">City / Location</label>
              <input
                type="text"
                placeholder="e.g. Dallas, TX"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={searching || !niche || !city}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed px-8 py-3 rounded-lg font-semibold text-white transition-colors"
              >
                {searching ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing...
                  </span>
                ) : '🔍 Search'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        {leads.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total Leads"
              value={leads.length}
              icon="📊"
            />
            <StatCard
              label="Hot Leads (70+)"
              value={leads.filter(l => l.overallScore >= 70).length}
              icon="🔥"
              accent
            />
            <StatCard
              label="Avg Score"
              value={Math.round(leads.reduce((s, l) => s + l.overallScore, 0) / leads.length)}
              icon="📈"
            />
            <StatCard
              label="With Signals"
              value={leads.filter(l => l.signalScore > 0).length}
              icon="⚡"
            />
          </div>
        )}

        {/* Lead Board */}
        {leads.length > 0 && (
          <div className="grid grid-cols-12 gap-6">
            {/* Lead List */}
            <div className="col-span-5">
              <h3 className="text-lg font-semibold mb-4">Leads</h3>
              <div className="space-y-3">
                {leads
                  .sort((a, b) => b.overallScore - a.overallScore)
                  .map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      selected={selectedLead?.id === lead.id}
                      onClick={() => setSelectedLead(lead)}
                    />
                  ))}
              </div>
            </div>

            {/* Lead Detail */}
            <div className="col-span-7">
              {selectedLead ? (
                <LeadDetail lead={selectedLead} />
              ) : (
                <div className="bg-gray-900 rounded-2xl p-12 text-center text-gray-500">
                  <div className="text-4xl mb-4">👈</div>
                  <p>Select a lead to see details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {leads.length === 0 && !searching && (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">🎯</div>
            <h2 className="text-2xl font-bold mb-3">Find Your Next Client</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              Enter a business niche and city to find leads. Our AI scores each business
              and detects signals that indicate they need help right now.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Components ─────────────────────────────────────────────

function StatCard({ label, value, icon, accent }: {
  label: string;
  value: number;
  icon: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 ${accent ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-gray-900'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-3xl font-bold ${accent ? 'text-orange-400' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}

function LeadCard({ lead, selected, onClick }: {
  lead: any;
  selected: boolean;
  onClick: () => void;
}) {
  const scoreColor = lead.overallScore >= 70 ? 'text-red-400' :
                     lead.overallScore >= 50 ? 'text-orange-400' :
                     lead.overallScore >= 30 ? 'text-yellow-400' : 'text-gray-400';

  const stageColors: Record<string, string> = {
    NEW: 'bg-blue-500/20 text-blue-400',
    CONTACTED: 'bg-yellow-500/20 text-yellow-400',
    REPLIED: 'bg-green-500/20 text-green-400',
    WON: 'bg-emerald-500/20 text-emerald-400',
    LOST: 'bg-red-500/20 text-red-400',
  };

  return (
    <div
      onClick={onClick}
      className={`bg-gray-900 rounded-xl p-4 cursor-pointer transition-all ${
        selected ? 'ring-2 ring-orange-500 bg-gray-800' : 'hover:bg-gray-800'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-white">{lead.businessName}</h4>
          {lead.website && (
            <a
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-gray-300"
              onClick={(e) => e.stopPropagation()}
            >
              {new URL(lead.website).hostname}
            </a>
          )}
        </div>
        <div className={`text-2xl font-bold ${scoreColor}`}>
          {lead.overallScore}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
        {lead.googleRating && (
          <span className="flex items-center gap-1">
            ⭐ {lead.googleRating} ({lead.googleReviewCount})
          </span>
        )}
        {lead.phone && <span>📞</span>}
        {lead.cms && <span className="bg-gray-800 px-2 py-0.5 rounded">{lead.cms}</span>}
      </div>

      {/* Score breakdown mini */}
      <div className="grid grid-cols-5 gap-1">
        <ScoreMini label="Web" value={lead.websiteScore} />
        <ScoreMini label="SEO" value={lead.seoScore} />
        <ScoreMini label="Social" value={lead.socialScore} />
        <ScoreMini label="Reviews" value={lead.reviewScore} />
        <ScoreMini label="Signals" value={lead.signalScore} highlight />
      </div>

      {/* Pipeline stage */}
      <div className="mt-3">
        <span className={`text-xs px-2 py-1 rounded-full ${stageColors[lead.pipelineStage] || 'bg-gray-800 text-gray-400'}`}>
          {lead.pipelineStage}
        </span>
      </div>
    </div>
  );
}

function ScoreMini({ label, value, highlight }: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  const color = value >= 70 ? 'bg-red-500' :
                value >= 50 ? 'bg-orange-500' :
                value >= 30 ? 'bg-yellow-500' : 'bg-gray-700';

  return (
    <div className="text-center">
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-1">
        <div
          className={`h-full rounded-full ${highlight && value > 0 ? 'bg-orange-500' : color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}

function LeadDetail({ lead }: { lead: any }) {
  const issues = (lead.websiteIssues || []) as any[];
  const signals = (lead.signalData || []) as any[];

  return (
    <div className="bg-gray-900 rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold">{lead.businessName}</h3>
          <p className="text-gray-400">{lead.niche} · {lead.city}, {lead.state}</p>
          {lead.website && (
            <a
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:underline text-sm"
            >
              {lead.website}
            </a>
          )}
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-orange-400">{lead.overallScore}</div>
          <div className="text-sm text-gray-500">/ 100</div>
        </div>
      </div>

      {/* Score Grid */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        <ScoreCard label="Website" value={lead.websiteScore} />
        <ScoreCard label="SEO" value={lead.seoScore} />
        <ScoreCard label="Social" value={lead.socialScore} />
        <ScoreCard label="Reviews" value={lead.reviewScore} />
        <ScoreCard label="Signals" value={lead.signalScore} highlight />
        <ScoreCard label="Overall" value={lead.overallScore} />
      </div>

      {/* Signals */}
      {signals.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-orange-400 mb-3">⚡ Active Signals</h4>
          <div className="space-y-2">
            {signals.map((signal: any, i: number) => (
              <div key={i} className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{signal.title}</span>
                  <span className="text-xs text-orange-400">{signal.severity}/100</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{signal.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {issues.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-red-400 mb-3">🚨 Issues Found</h4>
          <div className="space-y-2">
            {issues.slice(0, 8).map((issue: any, i: number) => (
              <div key={i} className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{issue.title}</span>
                  <SeverityBadge severity={issue.severity} />
                </div>
                <p className="text-xs text-gray-400">{issue.impact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Info */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-sm font-semibold text-gray-400 mb-3">Contact Info</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {lead.phone && <div>📞 {lead.phone}</div>}
          {lead.email && <div>📧 {lead.email}</div>}
          {lead.address && <div>📍 {lead.address}</div>}
          {lead.googleRating && <div>⭐ {lead.googleRating} ({lead.googleReviewCount} reviews)</div>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button className="flex-1 bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg font-medium transition-colors">
          Generate Pitch Email
        </button>
        <button className="flex-1 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors">
          Save to CRM
        </button>
        <button className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors">
          PDF Report
        </button>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, highlight }: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  const color = value >= 70 ? 'text-red-400' :
                value >= 50 ? 'text-orange-400' :
                value >= 30 ? 'text-yellow-400' : 'text-gray-400';

  return (
    <div className={`text-center p-3 rounded-lg ${highlight ? 'bg-orange-500/10' : 'bg-gray-800'}`}>
      <div className={`text-xl font-bold ${highlight ? 'text-orange-400' : color}`}>{value}</div>
      <div className="text-[10px] text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-gray-700 text-gray-400',
  };

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors[severity] || colors.low}`}>
      {severity}
    </span>
  );
}
