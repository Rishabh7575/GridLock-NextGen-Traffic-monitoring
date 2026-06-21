import { useSurgeStore } from '../../store/useSurgeStore';
import { CloudLightning, AlertTriangle, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

export default function SurgeDashboard() {
  const { vulnerability } = useSurgeStore();

  if (!vulnerability) return null;

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <CloudLightning className="w-5 h-5 text-amber-500" />
          Live Weather Vulnerability
        </h2>
        <span className="text-xs text-muted-foreground">
          {new Date(vulnerability.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="p-6 space-y-6">
        
        {/* Trigger Card */}
        <div className={clsx(
          "p-4 rounded-xl border flex gap-4 items-start",
          vulnerability.overall_surge_risk === 'critical' ? "bg-destructive/10 border-destructive/30" : "bg-amber-500/10 border-amber-500/30"
        )}>
          {vulnerability.overall_surge_risk === 'critical' ? (
            <ShieldAlert className="w-8 h-8 text-destructive shrink-0 mt-1" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0 mt-1" />
          )}
          
          <div>
            <h3 className={clsx(
              "font-bold text-lg mb-1 uppercase tracking-wider",
              vulnerability.overall_surge_risk === 'critical' ? "text-destructive" : "text-amber-500"
            )}>
              {vulnerability.overall_surge_risk} SURGE RISK DETECTED
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed">
              Current weather conditions match historical patterns for mass incidents. 
              Top vulnerable corridor: <span className="font-bold text-foreground">{vulnerability.top_vulnerable_corridor}</span>. 
              System recommends immediate execution of city-wide pre-deployment plan.
            </p>
          </div>
        </div>

        {/* Vulnerable Corridors Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Corridor Vulnerability Index</h3>
          <div className="border border-border rounded-lg overflow-hidden bg-muted/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="p-3 font-medium">Corridor</th>
                  <th className="p-3 font-medium">Risk Cause</th>
                  <th className="p-3 font-medium">Multiplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vulnerability.corridors.map((c) => (
                  <tr key={c.corridor}>
                    <td className="p-3 font-medium">{c.corridor}</td>
                    <td className="p-3 capitalize text-muted-foreground">{c.primary_risk_cause.replace('_', ' ')}</td>
                    <td className="p-3">
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-xs font-bold",
                        c.vulnerability_multiplier >= 4 ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-500"
                      )}>
                        {c.vulnerability_multiplier}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
