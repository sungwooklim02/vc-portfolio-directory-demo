import { DemoNotesView, demoNotesMeta } from "@/components/views/DemoNotesView";

export const metadata = demoNotesMeta("ko");

export default function Page() {
  return <DemoNotesView locale="ko" />;
}
