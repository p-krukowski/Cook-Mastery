/**
 * CookbookEntryCard - Compact card for single cookbook entry in list view
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { CookbookEntryListItemVM } from "./cookbook.types";

interface CookbookEntryCardProps {
  entry: CookbookEntryListItemVM;
}

export default function CookbookEntryCard({ entry }: CookbookEntryCardProps) {
  return (
    <li>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <a
              href={`/cookbook/${entry.id}`}
              className="flex-1 text-lg font-semibold leading-tight tracking-tight hover:underline"
            >
              {entry.title}
            </a>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* External URL */}
          <div className="flex items-center gap-2 text-sm">
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
                <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
              </svg>
              {entry.urlLabel}
            </a>
          </div>

          {/* Notes preview */}
          {entry.notesPreview && <p className="text-sm text-muted-foreground line-clamp-2">{entry.notesPreview}</p>}

          {/* Created date */}
          <p className="text-xs text-muted-foreground">Added {entry.createdAtLabel}</p>
        </CardContent>
      </Card>
    </li>
  );
}
