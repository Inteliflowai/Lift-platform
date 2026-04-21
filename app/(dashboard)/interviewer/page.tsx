import { InterviewerPrepList } from "@/components/interviewer/InterviewerPrepList";

export const dynamic = "force-dynamic";

export default function InterviewerCases() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">My Interviews</h1>
        <p className="mt-1 text-sm text-muted">
          Candidates assigned to you, with pre-interview briefings prepared.
        </p>
      </div>
      <InterviewerPrepList />
    </div>
  );
}
