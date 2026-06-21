import { Bell, Clock, Search } from "lucide-react";

export default function TopBar() {
  return (
    <div className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search junctions, corridors..." 
            className="w-full bg-muted/50 border border-border rounded-md pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Live Data Stream</span>
        </div>
        
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Active Incidents</span>
            <span className="text-lg font-bold text-destructive">24</span>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Critical Corridors</span>
            <span className="text-lg font-bold text-amber-500">3</span>
          </div>
        </div>

        <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border border-card" />
        </button>
      </div>
    </div>
  );
}
