import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Layers,
  ShieldCheck,
  FileSpreadsheet,
  Compass,
  HelpCircle,
  Download,
  CheckCircle2,
  Building2,
  Truck,
  ShieldAlert,
} from 'lucide-react';
import { useGeoBridgeStore } from '../../store/useGeoBridgeStore';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const DocumentationView: React.FC = () => {
  const { setAppMode } = useGeoBridgeStore();
  const [activeSection, setActiveSection] = useState<'overview' | 'quickstart' | 'checklist' | 'playbooks' | 'glossary' | 'privacy' | 'gis-studio'>('overview');

  const navItems = [
    { id: 'overview', label: 'What is GeoBridge?', icon: Sparkles },
    { id: 'quickstart', label: '60-Second Quick Start', icon: Zap },
    { id: 'checklist', label: 'Spreadsheet Checklist', icon: FileSpreadsheet },
    { id: 'playbooks', label: 'Department Playbooks', icon: Compass },
    { id: 'glossary', label: 'Plain-English Glossary', icon: HelpCircle },
    { id: 'privacy', label: 'Data Privacy & Security', icon: ShieldCheck },
    { id: 'gis-studio', label: 'GIS Specialist Guide', icon: Layers },
  ] as const;

  return (
    <div className="space-y-6 pb-16">
      
      {/* Doc Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-surface-border">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-normal">
              GeoBridge Business User Guide
            </h1>
            <Badge variant="neutral" size="sm">
              Plain-English Playbook
            </Badge>
          </div>
          <p className="text-sm text-slate-600 font-normal mt-1 leading-relaxed">
            Learn how to enrich spreadsheets with sales territories, nearest warehouse distances, and hazard zones in under 60 seconds.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setAppMode('consumer')}
            leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
          >
            Open Spreadsheet Matcher
          </Button>
        </div>
      </div>

      {/* Main Documentation Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Navigation Sidebar */}
        <div className="lg:col-span-3 sticky top-24 space-y-1 bg-surface-card p-3.5 rounded-xl border border-surface-border shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-1.5 block">
            User Playbook
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'bg-surface-subtle text-accent-700 shadow-2xs border border-surface-border'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-surface-subtle'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-surface-border px-3">
            <span className="text-[11px] font-medium text-slate-500 block mb-1.5">Need sample test data?</span>
            <a
              href="/demo_customer_leads.xlsx"
              download="demo_customer_leads.xlsx"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-accent-700 hover:text-accent-900"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample .xlsx</span>
            </a>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-9 bg-surface-card p-6 sm:p-8 rounded-xl border border-surface-border shadow-2xs space-y-8">
          
          {/* SECTION 1: WHAT IS GEOBRIDGE */}
          {activeSection === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-accent-600" />
                  <span>What is GeoBridge? (The 30-Second Overview)</span>
                </h2>
                <p className="text-slate-500 text-xs leading-relaxed font-normal">
                  GeoBridge is an automated geographic matching tool designed specifically for non-technical business professionals.
                </p>
              </div>

              {/* The Everyday Business Problem */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-900">
                  The Problem: Waiting Weeks for GIS & Engineering Backlogs
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  If you work in Sales Operations, Logistics, Underwriting, or Marketing, you frequently manage spreadsheets with customer addresses, coordinates, or ZIP codes. But to answer essential business questions like:
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700">
                  <li className="flex items-start space-x-2 bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-600 mt-1.5 shrink-0" />
                    <span>Which sales territory does each lead or account belong to?</span>
                  </li>
                  <li className="flex items-start space-x-2 bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-600 mt-1.5 shrink-0" />
                    <span>Who is the assigned account director and support tier?</span>
                  </li>
                  <li className="flex items-start space-x-2 bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-600 mt-1.5 shrink-0" />
                    <span>How many miles is each customer from our closest distribution center?</span>
                  </li>
                  <li className="flex items-start space-x-2 bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-600 mt-1.5 shrink-0" />
                    <span>Are any of our properties located in designated flood or hazard corridors?</span>
                  </li>
                </ul>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Normally, you must submit a ticket to a GIS analyst or data engineering team and wait days or weeks for a custom database query.
                </p>
              </div>

              {/* The Solution */}
              <div className="p-4 bg-accent-50/50 rounded-xl border border-accent-200 space-y-2">
                <h3 className="text-xs font-bold text-accent-950 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-accent-600" />
                  <span>The Solution: An Automated In-Browser Geographic VLOOKUP</span>
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed font-normal">
                  Think of GeoBridge as an intelligent <strong>geographic VLOOKUP</strong>. You drop in your existing Excel file, choose what information you want to add, and GeoBridge matches each row to official geographic boundaries in seconds — 100% inside your web browser with zero data leaving your computer.
                </p>
              </div>

              {/* Before vs After Matrix */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900">
                  Spreadsheet Transformation: Before vs After GeoBridge
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100 font-semibold text-slate-700">
                        <th className="py-2.5 px-3">Before GeoBridge (Your File)</th>
                        <th className="py-2.5 px-3 bg-accent-50 text-accent-900 border-l border-accent-200">
                          After GeoBridge (New Columns Added)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      <tr>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          Account: Apex Logistics (Seattle, WA, 47.60, -122.33)
                        </td>
                        <td className="py-2.5 px-3 bg-accent-50/40 text-accent-950 font-medium border-l border-accent-200">
                          + Territory: Western Region | + Director: Sarah Lin | + Hub: Seattle Air Cargo (4.2 mi)
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          Account: Lone Star Oil (Houston, TX, 29.76, -95.36)
                        </td>
                        <td className="py-2.5 px-3 bg-accent-50/40 text-accent-950 font-medium border-l border-accent-200">
                          + Territory: Southern Region | + Director: Marcus Vance | + Hub: DFW Regional (238.5 mi)
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          Property: Tampa Coastal Warehouse (ZIP: 33602)
                        </td>
                        <td className="py-2.5 px-3 bg-accent-50/40 text-accent-950 font-medium border-l border-accent-200">
                          + Hazard: Gulf Storm Inundation Zone | + Risk: Critical | + Surcharge: 18.5%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-500 font-normal">
                  Your original columns are never overwritten or altered. All enriched attributes are appended cleanly on the right.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 2: 60-SECOND QUICK START */}
          {activeSection === 'quickstart' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-accent-600" />
                  <span>60-Second Quick Start Guide</span>
                </h2>
                <p className="text-slate-500 text-xs leading-relaxed font-normal">
                  Follow these three simple steps to enrich any spreadsheet with location attributes.
                </p>
              </div>

              {/* Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-surface-subtle rounded-xl border border-surface-border space-y-2">
                  <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs">Choose Your Goal</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Select a business goal from the visual cards: <em>Assign Sales Territories</em>, <em>Find Closest Warehouse</em>, <em>Screen Hazard Risk</em>, or <em>Combined Rule</em>.
                  </p>
                </div>

                <div className="p-4 bg-surface-subtle rounded-xl border border-surface-border space-y-2">
                  <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs">Drop Your Spreadsheet</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Drag and drop your Excel (<code>.xlsx</code>, <code>.xls</code>) or CSV file. Latitude/Longitude or US ZIP code columns are detected automatically.
                  </p>
                </div>

                <div className="p-4 bg-surface-subtle rounded-xl border border-surface-border space-y-2">
                  <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs">Click Add & Download</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Click <strong>Add Boundary Data to Spreadsheet</strong>. Review the enriched table and click <strong>Export Enriched Excel (.xlsx)</strong>.
                  </p>
                </div>
              </div>

              {/* 1-Click Interactive CTA Banner */}
              <div className="p-5 bg-slate-900 text-white rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    Want to test it right now without uploading your own file?
                  </h4>
                  <p className="text-xs text-slate-300 font-normal">
                    Open the Spreadsheet Matcher and run the 1-click test drive on 20 realistic customer accounts.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setAppMode('consumer')}
                  leftIcon={<Sparkles className="w-4 h-4 text-accent-600" />}
                  className="bg-white text-slate-900 hover:bg-slate-100 font-semibold shrink-0"
                >
                  Test Drive Sample Data
                </Button>
              </div>
            </div>
          )}

          {/* SECTION 3: SPREADSHEET PREPARATION CHECKLIST */}
          {activeSection === 'checklist' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-accent-600" />
                  <span>Spreadsheet Preparation Checklist</span>
                </h2>
                <p className="text-slate-500 text-xs leading-relaxed font-normal">
                  Make sure your Excel or CSV file contains one of the supported location formats.
                </p>
              </div>

              <div className="space-y-4">
                {/* Column Requirements */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900">
                    What location columns do I need in my spreadsheet?
                  </h3>
                  <p className="text-xs text-slate-600 font-normal">
                    You only need <strong>one</strong> of the two following options:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-1.5">
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Option A (Highest Accuracy)
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">Latitude & Longitude Columns</h4>
                      <p className="text-xs text-slate-500 font-normal leading-relaxed">
                        Standard GPS coordinates in decimal degrees (e.g. Latitude: <code>37.7749</code>, Longitude: <code>-122.4194</code>).
                      </p>
                    </div>

                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-1.5">
                      <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                        Option B (No Coordinates Required)
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">US Postal / ZIP Code Column</h4>
                      <p className="text-xs text-slate-500 font-normal leading-relaxed">
                        Standard 5-digit US ZIP code (e.g. <code>94107</code>) or ZIP+4 (e.g. <code>94107-1234</code>). GeoBridge resolves the exact geographic center automatically.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Automatic Sanitation Protections */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900">
                    Common Excel Traps GeoBridge Solves Automatically
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-2.5">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-900">Excel Dropping Leading Zeros in ZIP Codes</span>
                      </div>
                      <p className="text-xs text-slate-600 font-normal pl-5.5 leading-relaxed">
                        In states like Massachusetts and New Jersey, ZIP codes start with zero (e.g. <code>02138</code>). Excel often strips the zero and turns it into <code>2138</code>. GeoBridge automatically detects 4-digit numbers and restores the leading zero.
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-900">European Decimal Commas</span>
                      </div>
                      <p className="text-xs text-slate-600 font-normal pl-5.5 leading-relaxed">
                        If your coordinates use commas instead of periods (e.g. <code>37,7749</code> and <code>-122,4194</code>), GeoBridge parses and cleans them automatically.
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-900">Swapped Coordinates (Points in the Ocean)</span>
                      </div>
                      <p className="text-xs text-slate-600 font-normal pl-5.5 leading-relaxed">
                        If your spreadsheet header swapped Latitude and Longitude, your points will appear in Antarctica or the Indian Ocean. Simply click the <strong>Swap Lat/Lon</strong> button in Step 3 to invert them with 1 click.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: DEPARTMENT PLAYBOOKS */}
          {activeSection === 'playbooks' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
                  <Compass className="w-5 h-5 text-accent-600" />
                  <span>Department Playbooks (Real-World Scenarios)</span>
                </h2>
                <p className="text-slate-500 text-xs leading-relaxed font-normal">
                  Explore how business teams use GeoBridge to automate daily spreadsheet workflows.
                </p>
              </div>

              <div className="space-y-4">
                {/* Playbook 1 */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-accent-600" />
                      <h3 className="text-xs font-bold text-slate-900">
                        1. Sales Operations & Inbound Lead Routing
                      </h3>
                    </div>
                    <Badge variant="neutral" size="sm">Sales Ops</Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    <strong>The Scenario:</strong> You receive a batch of 5,000 inbound website leads. You need to assign each lead to the appropriate regional sales director (Western, Midwest, Southern, or Northeast) and set response SLA hours.
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    <strong>How to Run:</strong> Select the <strong>Assign Sales Territories</strong> goal, drop in your leads spreadsheet, and click Add Boundary Data.
                  </p>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700">
                    Appended Columns: <code>+Assigned_Territory</code>, <code>+Regional_Director</code>, <code>+Support_Tier</code>, <code>+Response_SLA_Hours</code>
                  </div>
                </div>

                {/* Playbook 2 */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Truck className="w-4 h-4 text-accent-600" />
                      <h3 className="text-xs font-bold text-slate-900">
                        2. Supply Chain Logistics & Warehouse Mileage
                      </h3>
                    </div>
                    <Badge variant="neutral" size="sm">Logistics</Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    <strong>The Scenario:</strong> You have 1,200 retail stores and need to determine which regional distribution center should fulfill orders for each store, along with the exact delivery mileage for freight rate estimation.
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    <strong>How to Run:</strong> Select the <strong>Find Closest Warehouse & Driving Distance</strong> goal, drop in your store coordinates, and click Add Boundary Data.
                  </p>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700">
                    Appended Columns: <code>+Closest_Distribution_Hub</code>, <code>+Routing_Code</code>, <code>+Dispatch_Mode</code>, <code>+Distance_Miles</code>
                  </div>
                </div>

                {/* Playbook 3 */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShieldAlert className="w-4 h-4 text-accent-600" />
                      <h3 className="text-xs font-bold text-slate-900">
                        3. Commercial Insurance & Risk Underwriting
                      </h3>
                    </div>
                    <Badge variant="neutral" size="sm">Risk & Underwriting</Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    <strong>The Scenario:</strong> You are underwriting a portfolio of commercial real estate buildings and must screen for assets situated inside hurricane storm surge corridors or high-hazard earthquake fault zones.
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    <strong>How to Run:</strong> Select the <strong>Screen Properties for Flood & Hurricane Risk</strong> goal, drop in your property list, and click Add Boundary Data.
                  </p>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs font-mono text-slate-700">
                    Appended Columns: <code>+Hazard_Zone_Name</code>, <code>+Risk_Level_Tier</code>, <code>+Surcharge_Percent</code>, <code>+Mitigation_Requirements</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: PLAIN-ENGLISH GLOSSARY */}
          {activeSection === 'glossary' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-accent-600" />
                  <span>Plain-English Translation Glossary</span>
                </h2>
                <p className="text-slate-500 text-xs leading-relaxed font-normal">
                  GIS professionals use specialized academic terminology. Here is what every technical term means in everyday business language.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 font-semibold text-slate-700">
                      <th className="py-2.5 px-3">GIS Technical Term</th>
                      <th className="py-2.5 px-3">Plain-English Translation</th>
                      <th className="py-2.5 px-3">Excel Equivalent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Spatial Recipe</td>
                      <td className="py-2.5 px-3 text-slate-600">A predefined matching rule published by GIS analysts</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">A matching formula template</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Point in Polygon (PIP)</td>
                      <td className="py-2.5 px-3 text-slate-600">Checking whether an address falls inside a region outline</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">Geographic VLOOKUP</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Nearest Neighbor</td>
                      <td className="py-2.5 px-3 text-slate-600">Finding the closest warehouse pin and calculating mileage</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">MIN(Distance) across facilities</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Reference Layer</td>
                      <td className="py-2.5 px-3 text-slate-600">The official map boundary file (GeoJSON)</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">The Lookup Table</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Centroid</td>
                      <td className="py-2.5 px-3 text-slate-600">The exact geographic center point of a ZIP code area</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">ZIP code center coordinates</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">Exceptions / Unmatched</td>
                      <td className="py-2.5 px-3 text-slate-600">Rows whose addresses fall outside any defined boundary</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">Unmatched / #N/A rows</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">CRS (EPSG:4326)</td>
                      <td className="py-2.5 px-3 text-slate-600">Standard GPS coordinates (decimal degrees)</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">Normal Google Maps Lat/Lon</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 6: DATA PRIVACY & SECURITY */}
          {activeSection === 'privacy' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-accent-600" />
                  <span>Data Privacy & Security Guarantee</span>
                </h2>
                <p className="text-slate-500 text-xs leading-relaxed font-normal">
                  GeoBridge was engineered from day one for organizations with strict compliance, NDA, and customer privacy requirements.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-900">Zero Server Data Egress</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    When you upload an Excel spreadsheet, the file is read strictly within your browser's local memory using WebAssembly. No customer names, phone numbers, revenues, or coordinates are ever uploaded or transmitted to any remote cloud server.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <CheckCircle2 className="w-5 h-5 text-accent-600" />
                  <h3 className="text-xs font-bold text-slate-900">Zero Cloud Database Storage</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    There are no remote databases, analytics trackers, or server-side logs. Your custom boundary files are stored securely in your browser's local IndexedDB sandbox and are never accessible to third parties.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-900">
                  Compliance Certification
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Because no data leaves your workstation, GeoBridge complies with enterprise security guidelines, GDPR, HIPAA, and proprietary customer non-disclosure agreements without requiring lengthy Data Processing Agreements (DPA) or cloud vendor assessments.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 7: GIS SPECIALIST GUIDE */}
          {activeSection === 'gis-studio' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-accent-600" />
                  <span>GIS Specialist Guide (Authoring & Distributing Templates)</span>
                </h2>
                <p className="text-slate-500 text-xs leading-relaxed font-normal">
                  How GIS teams author authoritative spatial matching templates and distribute them to non-technical business colleagues.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-md bg-slate-900 text-white inline-flex items-center justify-center text-xs font-bold">1</span>
                    <span>Export Reference Boundaries from ArcGIS or QGIS</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Export your official territory polygons, hub pins, or hazard corridors as GeoJSON FeatureCollections using standard WGS84 (EPSG:4326) coordinates with clean property names (e.g. <code>territory_name</code>, <code>director</code>).
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-md bg-slate-900 text-white inline-flex items-center justify-center text-xs font-bold">2</span>
                    <span>Build the Matching Rule in Template Builder</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Open the <strong>Template Builder (GIS)</strong> tab, upload your GeoJSON file, map GeoJSON attributes to target spreadsheet columns, configure fallback values for outside coordinates, and test the rule.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-md bg-slate-900 text-white inline-flex items-center justify-center text-xs font-bold">3</span>
                    <span>Package as a .georecipe Bundle File</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Click <strong>Export Package (.georecipe)</strong> to generate a portable bundle containing your rule schema and all embedded boundary geometries. Hand this file to your business users—they can drag it into the portal and start matching immediately.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
