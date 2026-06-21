import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";
import { MapPinned } from "lucide-react";
import { bengaluruCenter } from "../../data/commandCenterData";
import { Panel, PanelTitle } from "./DashboardPrimitives";

const stressColor = (score) => {
  if (score >= 81) return "#ef4444";
  if (score >= 61) return "#f59e0b";
  if (score >= 31) return "#38bdf8";
  return "#22c55e";
};

const linePositions = (source, target) => {
  if (!source || !target) return [];
  return [
    [source.lat, source.lng],
    [target.lat, target.lng],
  ];
};

function AnimatedArrow({ source, target, index }) {
  const positions = linePositions(source, target);
  if (!positions.length) return null;
  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{
          color: "#38bdf8",
          weight: 2,
          opacity: 0.38,
          dashArray: "8 10",
          className: "shockwave-flow",
        }}
      />
      <CircleMarker
        center={[target.lat, target.lng]}
        radius={6 + index}
        pathOptions={{
          color: "#38bdf8",
          fillColor: "#38bdf8",
          fillOpacity: 0.22,
          opacity: 0.6,
        }}
      />
    </>
  );
}

export default function TrafficMapPanel({ title = "Traffic Map", stressRows = [], shockwave, showArrows = false }) {
  const source = stressRows.find((row) => row.corridor === shockwave?.source) || stressRows[0];

  return (
    <Panel className="overflow-hidden">
      <PanelTitle icon={MapPinned} title={title} />
      <div className="h-[520px]">
        <MapContainer center={bengaluruCenter} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap &copy; CARTO'
          />
          {stressRows.map((road) => (
            <CircleMarker
              key={road.corridor}
              center={[road.lat, road.lng]}
              radius={8 + Math.min(16, road.stress / 5)}
              pathOptions={{
                color: stressColor(road.stress),
                fillColor: stressColor(road.stress),
                fillOpacity: 0.28,
                weight: 2,
              }}
            >
              <Popup>
                <div className="space-y-1">
                  <div className="font-semibold">{road.corridor}</div>
                  <div>Stress {road.stress}/100</div>
                  <div>{road.level}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
          {showArrows && shockwave?.forecast?.map((target, index) => (
            <AnimatedArrow key={target.corridor} source={source} target={target} index={index} />
          ))}
        </MapContainer>
      </div>
    </Panel>
  );
}
