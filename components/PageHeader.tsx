import { ExternalLink } from "lucide-react";
import { SITE_URL } from "@/lib/site";

interface PageHeaderProps {
  title: string;
  /** One plain sentence: what you do on this page. */
  description?: string;
  /** Where this content appears on the public website, e.g. "Homepage › Upcoming events". */
  showsOn?: string;
  /** The page's main action(s), right-aligned on wide screens. */
  actions?: React.ReactNode;
}

/** Every page opens with what it's for and where its content shows up on the website. */
export function PageHeader({ title, description, showsOn, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
        {description && <p className="mt-1 text-base text-gray-700 dark:text-gray-300">{description}</p>}
        {showsOn && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Shows on the website:{" "}
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
            >
              {showsOn}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
