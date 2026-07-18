import { CompanyView, companyMeta, companyStaticParams } from "@/components/views/CompanyView";

export const dynamicParams = false;

export function generateStaticParams() {
  return companyStaticParams();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return companyMeta("ko", (await params).slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <CompanyView locale="ko" slug={(await params).slug} />;
}
