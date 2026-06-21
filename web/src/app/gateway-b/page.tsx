'use client';

import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useRoadStress, useTrafficPropagation, useDominoSimulator, useCongestionCost } from '@/hooks/api/useGridSense';
import Link from 'next/link';

// Dynamically load the map so it only runs on the client
const MapEngine = dynamic(() => import('@/components/maps/MapEngine'), { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-zinc-500">Loading map engine...</div> });

export default function GatewayB() {
  const stress = useRoadStress('C-101');
  const propagation = useTrafficPropagation();
  const domino = useDominoSimulator();
  const cost = useCongestionCost();

  return (
    <div className="h-screen p-8 max-w-[1600px] mx-auto flex flex-col">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Traffic Intelligence</h1>
          <p className="text-zinc-400">Network physics, propagation, and efficiency</p>
        </div>
        <Link href="/">
          <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-800">Back to Home</Button>
        </Link>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* LEFT PANEL */}
        <div className="w-1/3 flex flex-col gap-6 overflow-y-auto pr-2 pb-8">
          <Card className="bg-zinc-900 border-zinc-800 shrink-0">
            <CardHeader className="pb-2">
              <CardTitle>Road Stress Engine</CardTitle>
            </CardHeader>
            <CardContent>
              {stress.data ? (
                <div className="flex items-center justify-between">
                  <div className="text-4xl font-bold text-orange-500">{stress.data.stress_score}</div>
                  <div className="text-right text-sm text-zinc-400">
                    <div>Density: {stress.data.factors.density}%</div>
                    <div>Delay: {stress.data.factors.delay}%</div>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-500">Loading stress...</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 shrink-0">
            <CardHeader className="pb-2">
              <CardTitle>Propagation Engine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => propagation.mutate({})} className="w-full">Simulate Surge</Button>
              {propagation.data && (
                <div className="space-y-2 text-sm text-zinc-300">
                  <div className="flex justify-between"><span>Surge Ratio:</span> <span className="font-bold text-red-400">{propagation.data.surge_ratio}x</span></div>
                  <div className="flex justify-between"><span>ETA to spread:</span> <span>{propagation.data.eta_to_spread_mins} mins</span></div>
                  <div>Affected: {propagation.data.affected_roads.join(', ')}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 shrink-0">
            <CardHeader className="pb-2">
              <CardTitle>Domino Simulator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Accident Severity Multiplier</Label>
                <Slider defaultValue={[50]} max={100} step={1} className="py-4" />
              </div>
              <Button onClick={() => domino.mutate({})} variant="secondary" className="w-full">Run Domino Scenario</Button>
              {domino.data && (
                <div className="mt-4 p-3 bg-zinc-950 border border-zinc-800 rounded text-sm">
                  <div className="font-bold text-red-500">+{domino.data.city_congestion_increase_pct}% City Congestion</div>
                  <div className="mt-2 text-zinc-400">Action: {domino.data.intervention}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 shrink-0">
            <CardHeader className="pb-2">
              <CardTitle>Congestion Cost Engine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => cost.mutate({})} className="w-full">Compare Routes</Button>
              {cost.data && (
                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                  <div className="p-3 bg-zinc-950 rounded border border-zinc-800">
                    <div className="font-bold text-zinc-100 mb-2">Route A</div>
                    <div className="text-zinc-400">Time: {cost.data.routeA.travel_time_mins}m</div>
                    <div className="text-zinc-400">Delay: {cost.data.routeA.delay_mins}m</div>
                    <div className="text-zinc-400 mt-2">Cost: ${cost.data.routeA.fuel_cost}</div>
                  </div>
                  <div className="p-3 bg-zinc-950 rounded border border-green-900/50">
                    <div className="font-bold text-green-400 mb-2">Route B (Best)</div>
                    <div className="text-zinc-400">Time: {cost.data.routeB.travel_time_mins}m</div>
                    <div className="text-zinc-400">Delay: {cost.data.routeB.delay_mins}m</div>
                    <div className="text-zinc-400 mt-2">Cost: ${cost.data.routeB.fuel_cost}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL (MAP) */}
        <div className="w-2/3 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 relative z-0">
          <MapEngine />
        </div>
      </div>
    </div>
  );
}
