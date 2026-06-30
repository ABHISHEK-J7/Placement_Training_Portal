import { Suspense } from "react";
import { PublicFeedbackForm } from "@/components/feedback/PublicFeedbackForm";

export const metadata = {
  title: "Trainer Feedback",
  description: "Share anonymous feedback about your trainer.",
};

export default function FeedbackFormPage() {
  return (
    <Suspense fallback={null}>
      <PublicFeedbackForm />
    </Suspense>
  );
}
