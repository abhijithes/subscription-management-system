import Link from "next/link";

type Props = {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  noun: string;
  /** Other query parameters (filters, search) to keep on the Previous and Next links. */
  query?: Record<string, string | undefined>;
};

export function Pagination({ basePath, page, pageSize, total, noun, query = {} }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
    params.set("page", String(target));
    return `${basePath}?${params}`;
  };
  return (
    <div className="flex items-center justify-between text-sm text-zinc-400">
      <span>
        Page {page} of {pages} ({total} {noun})
      </span>
      <span className="space-x-4">
        {page > 1 && <Link href={hrefFor(page - 1)} className="underline">Previous</Link>}
        {page < pages && <Link href={hrefFor(page + 1)} className="underline">Next</Link>}
      </span>
    </div>
  );
}
