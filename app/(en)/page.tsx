import { HomeView, homeMeta } from "@/components/views/HomeView";

export const metadata = homeMeta("en");

export default function Page() {
  return <HomeView locale="en" />;
}
