import { supabaseAdmin } from "./supabaseAdmin";

export type MetricRow = {
    date: string;
    views: number;
    likes: number;
    followers: number;
};

export type DailyPoint = {
    date: string;
    views: number;
    likes: number;
    followers: number;
}

export type DataCoverageCode = "no_data" | "partial_baseline";

export type PlatformReportData = {
    platform: string;
    accountNames: string[];
    series: DailyPoint[];
    deltaViews: number;
    deltaLikes: number;
    deltaFollowers: number;
    endViews: number;
    endLikes: number;
    endFollowers: number;
    dataCoverageCode: DataCoverageCode | null;
};

export type ClientReportData = {
    clientName: string;
    periodStart: string;
    periodEnd: string;
    platforms: PlatformReportData[];
};

function mapRow(row: any): MetricRow {
    return {
        date: row.date,
        views: Number(row.views),
        likes: Number(row.likes),
        followers: Number(row.followers),
    };
}

async function fetchAccountMetrics(accountId: string, periodStart: string, periodEnd: string) {
    const { data: baselineRows, error: baselineError } = await supabaseAdmin
        .from("metric")
        .select("date, views, likes, followers")
        .eq("account_id", accountId)
        .lt("date", periodStart)
        .order("date", { ascending: false })
        .limit(1);
    
    if (baselineError) throw new Error(baselineError.message);

    const { data: inRangeRows, error: inRangeError } = await supabaseAdmin
        .from("metric")
        .select("date, views, likes, followers")
        .eq("account_id", accountId)
        .gte("date", periodStart)
        .lte("date", periodEnd)
        .order("date", { ascending: true });
    
    if (inRangeError) throw new Error(inRangeError.message);

    return {
        baseline: baselineRows?.[0] ? mapRow(baselineRows[0]) : null,
        inRangeRows: (inRangeRows ?? []).map(mapRow)
    };
}

type AccountSeries = {
    account: { id: string; name: string };
    baseline: MetricRow | null;
    inRangeRows: MetricRow[];
};

function buildMergedDailySeries(perAccount: AccountSeries[]): DailyPoint[] {
    const dateSet = new Set<string>();
    for (const acc of perAccount) {
        for (const row of acc.inRangeRows) {
            dateSet.add(row.date);
        }
    }

    const dates = Array.from(dateSet).sort();
    if (dates.length === 0) return [];

    const cursors = perAccount.map(() => -1);

    return dates.map((date) => {
        let views = 0, likes = 0, followers = 0;
        perAccount.forEach((acc, i) => {
            while (cursors[i] + 1 < acc.inRangeRows.length && acc.inRangeRows[cursors[i] + 1].date <= date) {
                cursors[i]++;
            }
            const currentRow = cursors[i] >= 0 ? acc.inRangeRows[cursors[i]] : acc.baseline;
            views += currentRow?.views ?? 0;
            likes += currentRow?.likes ?? 0;
            followers += currentRow?.followers ?? 0;
        });
        return { date, views, likes, followers};
    });
}

async function buildPlatformReportData(
    platform: string,
    accounts: { id: string; name: string }[],
    periodStart: string,
    periodEnd: string
): Promise<PlatformReportData> {
    const perAccount: AccountSeries[] = await Promise.all(
        accounts.map(async (acc) => ({
            account: acc,
            ...(await fetchAccountMetrics(acc.id, periodStart, periodEnd)),
        }))
    );
    const series = buildMergedDailySeries(perAccount);

    let deltaViews = 0, deltaLikes = 0, deltaFollowers = 0;
    let anyMissingBaseline = false;
    let anyDataAtAll = false;

    for (const acc of perAccount) {
        const endpoint = acc.inRangeRows.at(-1) ?? null;
        if (!endpoint) continue;

        anyDataAtAll = true;
        const baseline = acc.baseline ?? acc.inRangeRows[0] ?? null;
        if (!acc.baseline) anyMissingBaseline = true;

        deltaViews += endpoint.views - (baseline?.views ?? 0);
        deltaLikes += endpoint.likes - (baseline?.likes ?? 0);
        deltaFollowers += endpoint.followers - (baseline?.followers ?? 0);
    }

    const last = series.at(-1);

    return {
        platform,
        accountNames: accounts.map((a) => a.name),
        series,
        deltaViews,
        deltaLikes,
        deltaFollowers,
        endViews: last?.views ?? 0,
        endLikes: last?.likes ?? 0,
        endFollowers: last?.followers ?? 0,
        dataCoverageCode: !anyDataAtAll
            ? "no_data"
            : anyMissingBaseline
            ? "partial_baseline"
            : null,
    };
}

export async function buildClientReportData(clientId: string, periodStart: string, periodEnd: string): Promise<ClientReportData> {
    const { data: client, error: clientError } = await supabaseAdmin
        .from("client")
        .select("id, name")
        .eq("id", clientId)
        .maybeSingle();
    
    if (clientError) throw new Error(clientError.message);
    if (!client) throw new Error("Client not found");

    const { data: accounts, error: accountsError } = await supabaseAdmin
        .from("account")
        .select("id, platform, name")
        .eq("client_id", clientId)
    
    if (accountsError) throw new Error(accountsError.message);

    const byPlatform = new Map<string, {id: string; name: string}[]>();
    for (const acc of accounts ?? []) {
        const list = byPlatform.get(acc.platform) ?? [];
        list.push({ id: acc.id, name: acc.name });
        byPlatform.set(acc.platform, list);
    }

    const platforms = await Promise.all(
        Array.from(byPlatform.entries()).map(([platform, accs]) =>
            buildPlatformReportData(platform, accs, periodStart, periodEnd)
        )
    );

    return { clientName: client.name, periodStart, periodEnd, platforms };
}
