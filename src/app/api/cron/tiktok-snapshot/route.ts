import { runSnapshotCron } from "@/lib/cronHelper";
import { collectTiktokSnapshot } from "@/lib/tiktokSnapshot";

export async function GET(request: Request) {
    return runSnapshotCron(request, "tiktok", collectTiktokSnapshot);
}