// The hero ad carousel is the page's real banner now — this just labels
// what the location picker below it is for, so it stays a lightweight
// placeholder rather than a second competing banner.
export function HomeBanner({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-2 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
