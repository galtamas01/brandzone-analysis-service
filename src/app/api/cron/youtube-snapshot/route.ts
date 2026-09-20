import { runSnapshotCron } from "@/lib/cronHelper";
import { collectYoutubeSnapshot } from "@/lib/youtubeSnapshot";

export async function GET(request: Request) {
    return runSnapshotCron(request, "youtube", collectYoutubeSnapshot);
}