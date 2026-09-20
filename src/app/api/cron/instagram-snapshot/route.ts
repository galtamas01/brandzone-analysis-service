import { runSnapshotCron } from "@/lib/cronHelper";
import { collectInstagramSnapshot } from "@/lib/metaSnapshot";

export async function GET(request: Request) {
    return runSnapshotCron(request, "instagram", collectInstagramSnapshot);
}