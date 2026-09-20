import { runSnapshotCron } from "@/lib/cronHelper";
import { collectFacebookSnapshot } from "@/lib/metaSnapshot";


export async function GET(request: Request) {
    return runSnapshotCron(request, "facebook", collectFacebookSnapshot);
}