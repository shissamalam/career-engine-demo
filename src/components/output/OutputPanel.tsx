'use client'

import { useState } from 'react'
import RoleFitPanel from './RoleFitPanel'
import TalkingPointsPanel from './TalkingPointsPanel'
import SalaryPanel from './SalaryPanel'
import DownloadsPanel from './DownloadsPanel'
import { DEMO_OUTPUT } from '@/lib/demoContent'

type TabId = 'rolefit' | 'talking' | 'salary' | 'downloads'

const TABS: { id: TabId; label: string }[] = [
  { id: 'rolefit', label: 'Role Fit' },
  { id: 'talking', label: 'Talking Points' },
  { id: 'salary', label: 'Salary' },
  { id: 'downloads', label: 'Downloads' },
]

interface OutputPanelProps {
  data: typeof DEMO_OUTPUT
  isLiveMode?: boolean
  liveToken?: string
  resumeData?: object
  coverLetterData?: object
  companyName?: string
  jobPosting?: string
}

export default function OutputPanel({
  data,
  isLiveMode,
  liveToken,
  resumeData,
  coverLetterData,
  companyName,
  jobPosting,
}: OutputPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('rolefit')

  return (
    <div>
      {/* Tab bar */}
      <div style={{
        position: 'sticky',
        top: '0',
        background: '#0F0F0F',
        zIndex: 40,
        borderBottom: '1px solid rgba(240,237,232,0.07)',
        display: 'flex',
        gap: '0',
        marginBottom: '40px',
        paddingTop: '8px',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              fontSize: '13px',
              fontFamily: 'IBM Plex Mono, monospace',
              letterSpacing: '0.04em',
              color: activeTab === tab.id ? '#C8843A' : '#4A4846',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #C8843A' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'rolefit' && <RoleFitPanel data={data.roleFit} />}
      {activeTab === 'talking' && <TalkingPointsPanel points={data.talkingPoints} />}
      {activeTab === 'salary' && <SalaryPanel data={data.salaryBrief} />}
      {activeTab === 'downloads' && (
        <DownloadsPanel
          isLiveMode={isLiveMode}
          liveToken={liveToken}
          resumeData={resumeData}
          coverLetterData={coverLetterData}
          companyName={companyName}
          jobPosting={jobPosting}
          roleFit={data.roleFit}
          talkingPoints={data.talkingPoints}
          salaryBrief={data.salaryBrief}
        />
      )}
    </div>
  )
}
