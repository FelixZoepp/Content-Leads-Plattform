import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type TimeRange = "daily" | "weekly" | "monthly" | "yearly";

interface Props {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}

export function TimeRangeSelector({ value, onChange }: Props) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as TimeRange)}>
      <TabsList className="grid w-full grid-cols-4 max-w-md">
        <TabsTrigger value="daily">Tag</TabsTrigger>
        <TabsTrigger value="weekly">Woche</TabsTrigger>
        <TabsTrigger value="monthly">Monat</TabsTrigger>
        <TabsTrigger value="yearly">Jahr</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
