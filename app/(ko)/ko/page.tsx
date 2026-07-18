import { HomeView, homeMeta } from "@/components/views/HomeView";

export const metadata = homeMeta("ko");

export default function Page() {
  return <HomeView locale="ko" />;
}
