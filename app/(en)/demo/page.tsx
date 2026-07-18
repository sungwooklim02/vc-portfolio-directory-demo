import { DemoNotesView, demoNotesMeta } from "@/components/views/DemoNotesView";

export const metadata = demoNotesMeta("en");

export default function Page() {
  return <DemoNotesView locale="en" />;
}
