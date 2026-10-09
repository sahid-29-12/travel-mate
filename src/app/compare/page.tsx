import CompareClient from "./CompareClient";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; destination?: string }>;
}) {
  const { source, destination } = await searchParams;

  return (
    <CompareClient
      initialSource={source}
      initialDestination={destination}
    />
  );
}
