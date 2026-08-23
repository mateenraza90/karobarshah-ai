import { Star } from "lucide-react";

import { EmptyState } from "@/features/dashboard/empty-state";

export default function ReviewsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Reviews</h1>
        <p className="mt-1 text-sm text-ink-muted">Post-visit sentiment and public review requests.</p>
      </div>

      <EmptyState
        icon={Star}
        title="Coming in Milestone 6"
        description="Once the AI Review Employee is live, post-visit feedback and sentiment will show up here."
      />
    </div>
  );
}
