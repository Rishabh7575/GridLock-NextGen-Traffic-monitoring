import { useEffect, useState } from "react";
import { AlertTriangle, Activity } from "lucide-react";
import { getHomeCommandData } from "../../api/commandCenter";
import { homeMock, trafficIntelligenceMock } from "../../data/commandCenterData";
import { InsightCard, MetricStrip, Panel, PanelTitle, SectionHeader } from "./DashboardPrimitives";
import TrafficMapPanel from "./TrafficMapPanel";

export default function CommandCenterHome() {
  const [data, setData] = useState(homeMock);

  useEffect(() => {
    getHomeCommandData().then(setData);
  }, []);

  return (
    <div className="min-h-full bg-background p-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <SectionHeader
          eyebrow="GridSense Command Center"
          title="Bengaluru Traffic Operations"
          actions={<div className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">Live command posture</div>}
        />

        <MetricStrip
          metrics={[
            { label: "Active Incidents", value: data.activeIncidents, tone: "red" },
            { label: "High Risk Corridors", value: data.highRiskCorridors, tone: "amber" },
            { label: "Critical Roads", value: data.criticalRoads, tone: "green" },
            { label: "Intelligence Alerts", value: data.alerts.length, tone: "sky" },
          ]}
        />

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <TrafficMapPanel
            title="City Risk Map"
            stressRows={trafficIntelligenceMock.roadStress}
            shockwave={trafficIntelligenceMock.shockwave}
            showArrows
          />

          <div className="grid gap-6">
            <Panel>
              <PanelTitle icon={AlertTriangle} title="Traffic Intelligence Alerts" />
              <div className="grid gap-3 p-4">
                {data.alerts.map((alert) => (
                  <InsightCard
                    key={alert.title}
                    title={alert.corridor}
                    body={alert.title}
                    tone={alert.severity === "high" ? "amber" : "sky"}
                  />
                ))}
              </div>
            </Panel>

            <Panel>
              <PanelTitle icon={Activity} title="Active Incident Queue" />
              <div className="divide-y divide-border">
                {data.incidents.map((incident) => (
                  <div key={incident.id} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold">{incident.corridor}</div>
                      <div className="text-xs text-muted-foreground">{incident.id} · {incident.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-sky-200">{incident.priority}</div>
                      <div className="text-xs text-muted-foreground">{incident.eta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <InsightCard title="Operational AI" body="High-priority incident model is stable on current incident labels." tone="green" />
          <InsightCard title="Traffic Intelligence" body="ORR East 2 and Mysore Road are leading stress corridors in the current profile." tone="amber" />
          <InsightCard title="Deployment View" body="Station load and corridor spillover should drive pre-positioning decisions." tone="sky" />
        </div>
      </div>
    </div>
  );
}
