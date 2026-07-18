import { AboutView, aboutMeta } from "@/components/views/AboutView";

export const metadata = aboutMeta("ko");

export default function Page() {
  return <AboutView locale="ko" />;
}
