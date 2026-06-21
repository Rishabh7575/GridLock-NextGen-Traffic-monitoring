import { useEffect, useState } from "react";
import { BrainCircuit, Network, ShieldAlert, TimerReset } from "lucide-react";
import { getOperationalAIData } from "../../api/commandCenter";
import { operationalAIMock } from "../../data/commandCenterData";
import {
  ConfusionMatrix,
  DistributionChart,
  FeatureImportanceChart,
  InsightCard,
  MetricStrip,
  Panel,
  PanelTitle,
  RocCurve,
  SectionHeader,
} from "./DashboardPrimitives";

const percent = (value) => `${(value * 100).toFixed(1)}%`;

function ModelBlock({ model, icon: Icon, children }) {
  return (
    <Panel>
      <PanelTitle icon={Icon} title={model.title} right={<span className="text-xs text-muted-foreground">{model.bestModel}</span>} />
      <div className="grid gap-4 p-4">
        <MetricStrip
          metrics={[
            { label: "Accuracy", value: percent(model.metrics.accuracy), tone: "green" },
            { label: "Precision", value: percent(model.metrics.precision), tone: "sky" },
            { label: "Recall", value: percent(model.metrics.recall), tone: "amber" },
            { label: "F1", value: percent(model.metrics.f1), tone: "green" },
          ]}
        />
        {children}
      </div>
    </Panel>
  );
}

export default function OperationalAIDashboard() {
  const [data, setData] = useState(operationalAIMock);

  useEffect(() => {
    getOperationalAIData().then(setData);
  }, []);

  const rocData = data.highPriority.rocCurve.map((point) => ({
    ...point,
    baseline: point.fpr,
  }));

  return (
    <div className="min-h-full bg-background p-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <SectionHeader
          eyebrow="Gateway A"
          title="Operational AI"
          actions={<div className="rounded-md border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-sm text-sky-100">High metric model layer</div>}
        />

        <div className="grid gap-6 xl:grid-cols-3">
          <ModelBlock model={data.highPriority} icon={ShieldAlert}>
            <div className="grid gap-4">
              <Panel className="shadow-none">
                <PanelTitle title="Confusion Matrix" />
                <ConfusionMatrix matrix={data.highPriority.confusionMatrix.values} labels={data.highPriority.confusionMatrix.labels} />
              </Panel>
              <Panel className="shadow-none">
                <PanelTitle title="ROC Curve" />
                <RocCurve data={rocData} />
              </Panel>
            </div>
          </ModelBlock>

          <ModelBlock model={data.duration} icon={TimerReset}>
            <div className="grid gap-4">
              <Panel className="shadow-none">
                <PanelTitle title="Confusion Matrix" />
                <ConfusionMatrix matrix={data.duration.confusionMatrix.values} labels={data.duration.confusionMatrix.labels} />
              </Panel>
              <Panel className="shadow-none">
                <PanelTitle title="Duration Distribution" />
                <DistributionChart data={data.duration.distribution} />
              </Panel>
            </div>
          </ModelBlock>

          <ModelBlock model={data.corridorRisk} icon={Network}>
            <div className="grid gap-4">
              <Panel className="shadow-none">
                <PanelTitle title="Confusion Matrix" />
                <ConfusionMatrix matrix={data.corridorRisk.confusionMatrix.values} labels={data.corridorRisk.confusionMatrix.labels} />
              </Panel>
              <Panel className="shadow-none">
                <PanelTitle title="Risk Distribution" />
                <DistributionChart data={data.corridorRisk.riskDistribution} />
              </Panel>
            </div>
          </ModelBlock>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel>
            <PanelTitle icon={BrainCircuit} title="Priority Feature Importance" />
            <FeatureImportanceChart data={data.highPriority.featureImportance} />
          </Panel>
          <Panel>
            <PanelTitle icon={BrainCircuit} title="Duration Feature Importance" />
            <FeatureImportanceChart data={data.duration.featureImportance} />
          </Panel>
          <Panel>
            <PanelTitle icon={BrainCircuit} title="Corridor Risk Importance" />
            <FeatureImportanceChart data={data.corridorRisk.featureImportance} />
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <InsightCard title="Priority Model" body="Current incident labels are highly separable with corridor and station context." tone="green" />
          <InsightCard title="Duration Model" body="Duration remains noisy and should be treated as an operational estimate." tone="amber" />
          <InsightCard title="Corridor Risk" body="Risk labels are historical aggregate labels over closure, priority, frequency, and duration." tone="sky" />
        </div>
      </div>
    </div>
  );
}
