import { TabPlaceholder } from "@/components/TabPlaceholder";

// PROVISIONAL: the schedule editor remains a separate flow and is not part of
// the routine library. This route preserves Today navigation until that flow
// receives its own implementation.
export default function ScheduleRoute() {
  return (
    <TabPlaceholder
      eyebrow="Schedule"
      title="Plan your training week."
      description="Your weekly schedule is separate from the routines you build."
    />
  );
}
