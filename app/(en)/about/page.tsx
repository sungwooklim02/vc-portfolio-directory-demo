import { AboutView, aboutMeta } from "@/components/views/AboutView";

export const metadata = aboutMeta("en");

export default function Page() {
  return <AboutView locale="en" />;
}
