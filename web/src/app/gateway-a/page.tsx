'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTriagePrediction, useForecast } from '@/hooks/api/useGridSense';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const IncidentMap = dynamic(() => import('@/components/IncidentMap'), { ssr: false });

function ConfidenceBadge({ probability }: { probability: number }) {
  if (probability >= 0.75) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-400 border border-green-800">High Confidence</span>;
  }
  if (probability >= 0.4) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-400 border border-yellow-800">Medium Confidence</span>;
  }
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-400 border border-red-800">Low Confidence</span>;
}

export default function GatewayA() {
  const [incidentText, setIncidentText] = useState('');
  const [cause, setCause] = useState('accident');
  const [showTriageDetails, setShowTriageDetails] = useState(true);
  
  const triage = useTriagePrediction();
  const forecast = useForecast();

  const handleAnalyze = () => {
    if (!incidentText) return;
    triage.mutate({ description: incidentText, event_cause: cause });
  };

  const handleIncidentSelect = (incident: any) => {
    const desc = `${incident.event_cause} at ${incident.corridor}. Priority: ${incident.priority}`;
    setIncidentText(desc);
    setCause(incident.event_cause);
    triage.mutate({ description: desc, event_cause: incident.event_cause });
  };

  // Recommended Action Logic
  let recommendedAction = "No Action";
  let actionColor = "text-zinc-400";
  if (triage.data) {
    const isHighPriority = triage.data.predicted_priority === 'High';
    const isClosure = triage.data.closure_flag === 1;
    if (isHighPriority && isClosure) {
      recommendedAction = "Dispatch Immediately";
      actionColor = "text-red-500 font-bold";
    } else if (isHighPriority || isClosure) {
      recommendedAction = "Dispatch & Monitor";
      actionColor = "text-orange-500 font-bold";
    } else {
      recommendedAction = "Monitor";
      actionColor = "text-yellow-500";
    }
  }

  // Forecast Data Processing
  const riskCounts = forecast.data?.reduce((acc: any, curr: any) => {
    acc[curr.risk_level] = (acc[curr.risk_level] || 0) + 1;
    return acc;
  }, { high: 0, medium: 0, low: 0 });

  const riskPieData = [
    { name: 'High', value: riskCounts?.high || 0, color: '#ef4444' },
    { name: 'Medium', value: riskCounts?.medium || 0, color: '#f97316' },
    { name: 'Low', value: riskCounts?.low || 0, color: '#22c55e' }
  ].filter(d => d.value > 0);

  const barData = forecast.data?.map((c: any) => ({
    name: c.corridor,
    incidents: c.next_24h_predicted_incidents,
    hour: c.peak_hour
  })) || [];

  return (
    <div className="h-screen w-full flex overflow-hidden bg-black text-zinc-100 font-sans">
      
      {/* LEFT: MAP (60%) */}
      <div className="w-[60%] h-full relative border-r border-zinc-800">
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md bg-black/40 p-2 rounded backdrop-blur-sm">POLICE COMMAND CENTER</h1>
          <p className="text-zinc-300 font-medium px-2 drop-shadow-md">Operational Intelligence / Live Triage Map</p>
        </div>
        <div className="absolute top-4 right-4 z-10 pointer-events-auto">
          <Link href="/">
            <Button variant="outline" className="bg-black/60 border-zinc-700 text-zinc-100 hover:bg-zinc-800 backdrop-blur-sm">
              Exit Command
            </Button>
          </Link>
        </div>
        <IncidentMap onIncidentSelect={handleIncidentSelect} />
      </div>

      {/* RIGHT: INTELLIGENCE PANEL (40%) */}
      <div className="w-[40%] h-full flex flex-col bg-zinc-950 overflow-y-auto">
        <div className="p-6 space-y-6">

          {/* INPUT FORM */}
          <Card className="bg-zinc-900 border-zinc-800 shadow-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-zinc-100">Incident Command Input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Incident Description</Label>
                <Input 
                  value={incidentText} 
                  onChange={(e) => setIncidentText(e.target.value)} 
                  placeholder="Click map marker or type description..."
                  className="bg-black border-zinc-800 text-zinc-100 placeholder:text-zinc-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Event Cause</Label>
                <Input 
                  value={cause} 
                  onChange={(e) => setCause(e.target.value)} 
                  className="bg-black border-zinc-800 text-zinc-100"
                />
              </div>
              <Button 
                onClick={handleAnalyze} 
                disabled={triage.isPending || !incidentText}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {triage.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Execute Triage Analysis
              </Button>
              {triage.isError && (
                <div className="text-red-500 text-sm mt-2 font-medium bg-red-950/30 p-2 rounded border border-red-900/50">
                  System Error: {triage.error?.message}
                </div>
              )}
            </CardContent>
          </Card>

          {/* RECOMMENDED ACTION */}
          {triage.data && (
            <Card className="bg-zinc-900 border-zinc-800 shadow-xl border-l-4 border-l-blue-500">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <div className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-1">Recommended Action</div>
                  <div className={`text-2xl ${actionColor}`}>{recommendedAction}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500 mb-1">Inference Time</div>
                  <div className="text-sm font-mono text-zinc-300">{triage.data.inference_ms}ms</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* DETAILED TRIAGE RESULTS ACCORDION */}
          {triage.data && (
            <div className="border border-zinc-800 rounded-lg bg-zinc-900 overflow-hidden shadow-xl">
              <button 
                onClick={() => setShowTriageDetails(!showTriageDetails)}
                className="w-full flex justify-between items-center p-4 bg-zinc-900 hover:bg-zinc-800 transition-colors"
              >
                <span className="font-semibold text-zinc-100">Detailed Triage Assessment</span>
                {showTriageDetails ? <ChevronUp className="h-5 w-5 text-zinc-400" /> : <ChevronDown className="h-5 w-5 text-zinc-400" />}
              </button>
              
              {showTriageDetails && (
                <div className="p-4 pt-0 grid grid-cols-1 gap-4 border-t border-zinc-800">
                  <div className="bg-black/50 p-4 rounded border border-zinc-800">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-zinc-400 text-sm font-semibold uppercase">Priority Prediction</div>
                      <ConfidenceBadge probability={triage.data.priority_probability} />
                    </div>
                    <div className="text-3xl font-bold text-red-500 mb-1">{triage.data.predicted_priority}</div>
                    <div className="text-xs text-zinc-500 mb-2">Probability: {(triage.data.priority_probability * 100).toFixed(1)}%</div>
                    <div className="text-sm text-zinc-300 bg-zinc-900/50 p-2 rounded">{triage.data.disagreement_reason || `Priority is ${triage.data.predicted_priority}.`}</div>
                  </div>

                  <div className="bg-black/50 p-4 rounded border border-zinc-800 flex justify-between items-center">
                    <div>
                      <div className="text-zinc-400 text-sm font-semibold uppercase mb-1">Closure Risk</div>
                      <div className="text-2xl font-bold text-orange-500">{triage.data.closure_flag ? 'WILL CLOSE' : 'NO CLOSURE'}</div>
                      <div className="text-xs text-zinc-500 mt-1">Prob: {(triage.data.closure_probability * 100).toFixed(1)}%</div>
                    </div>
                    <ConfidenceBadge probability={triage.data.closure_probability} />
                  </div>

                  <div className="bg-black/50 p-4 rounded border border-zinc-800">
                    <div className="text-zinc-400 text-sm font-semibold uppercase mb-1">Duration Estimate</div>
                    <div className="text-2xl font-bold text-blue-400 mb-2">{Math.round(triage.data.predicted_duration_mins)} mins</div>
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>P25: {Math.round(triage.data.duration_p25 ?? triage.data.predicted_duration_mins * 0.5)}m</span>
                      <span>P75: {Math.round(triage.data.duration_p75 ?? triage.data.predicted_duration_mins * 1.5)}m</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FORECAST ANALYTICS */}
          <div className="space-y-6 pt-4 border-t border-zinc-800 mt-8">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center">
              <span className="w-2 h-6 bg-blue-600 rounded-sm mr-3"></span>
              Corridor Forecast Analytics
            </h2>

            {forecast.isLoading ? (
              <div className="flex justify-center p-8 text-zinc-500"><Loader2 className="animate-spin mr-2" /> Loading Analytics...</div>
            ) : forecast.isError ? (
              <div className="text-red-500">Error loading forecast</div>
            ) : forecast.data ? (
              <div className="space-y-6">
                
                {/* Analytics Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Chart 1: Risk Level Distribution */}
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="p-4 pb-0">
                      <CardTitle className="text-xs text-zinc-400 uppercase text-center">Risk Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={riskPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={50} stroke="none">
                            {riskPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff'}} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Chart 2: Peak Hour Comparison */}
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="p-4 pb-0">
                      <CardTitle className="text-xs text-zinc-400 uppercase text-center">Peak Hour Map</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData.slice(0, 6)} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="name" stroke="#71717a" fontSize={8} tickFormatter={(val) => val.split(' ')[0]} />
                          <YAxis stroke="#71717a" fontSize={10} domain={[0, 24]} />
                          <Tooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff'}} />
                          <Bar dataKey="hour" fill="#3b82f6" radius={[2,2,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Chart 3: Predicted Incidents Bar Chart */}
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="p-4 pb-0">
                    <CardTitle className="text-xs text-zinc-400 uppercase">Predicted Incidents (Next 24h)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="name" stroke="#71717a" fontSize={10} angle={-45} textAnchor="end" interval={0} />
                        <YAxis stroke="#71717a" fontSize={10} />
                        <Tooltip contentStyle={{backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff'}} cursor={{fill: '#27272a'}} />
                        <Bar dataKey="incidents" fill="#8b5cf6" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Forecast Table */}
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left text-zinc-300">
                        <thead className="text-[10px] text-zinc-400 uppercase bg-black border-b border-zinc-800">
                          <tr>
                            <th className="px-3 py-2">Corridor</th>
                            <th className="px-3 py-2 text-right">Incidents</th>
                            <th className="px-3 py-2 text-right">Peak</th>
                            <th className="px-3 py-2">Risk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {forecast.data.map((row: any, idx: number) => (
                            <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-800/80">
                              <td className="px-3 py-2 font-medium">{row.corridor}</td>
                              <td className="px-3 py-2 text-right">{row.next_24h_predicted_incidents?.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right">{row.peak_hour}:00</td>
                              <td className="px-3 py-2">
                                <span className={`px-1.5 py-0.5 rounded uppercase font-bold ${
                                  row.risk_level === 'high' ? 'text-red-400 bg-red-900/30' :
                                  row.risk_level === 'medium' ? 'text-orange-400 bg-orange-900/30' :
                                  'text-green-400 bg-green-900/30'
                                }`}>
                                  {row.risk_level}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

              </div>
            ) : null}

          </div>

        </div>
      </div>
    </div>
  );
}
