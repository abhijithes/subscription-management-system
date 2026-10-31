import Link from "next/link";

type Props = { basePath: string; page: number; pageSize: number; total: number; noun: string };

export function Pagination({ basePath, page, pageSize, total, noun }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between text-sm text-zinc-400">
      <span>
        Page {page} of {pages} ({total} {noun})
      </span>
      <span className="space-x-4">
        {page > 1 && <Link href={`${basePath}?page=${page - 1}`} className="underline">Previous</Link>}
        {page < pages && <Link href={`${basePath}?page=${page + 1}`} className="underline">Next</Link>}
      </span>
    </div>
  );
}
