export type ReportLocale = "hu" | "ro" | "en";

export const REPORT_LOCALES: ReportLocale[] = ["hu", "ro", "en"];
export const DEFAULT_REPORT_LOCALE: ReportLocale = "hu";

export type ReportStrings = {
    numberLocale: string;
    cardViews: string;
    cardLikes: string;
    cardFollowers: string;
    deltaSuffix: string;
    chartViews: string;
    chartLikes: string;
    chartFollowers: string;
    noChartData: string
    noAccounts: string;
    coverageNoData: string;
    coveragePartialBaseline: string;
};

const DICT: Record<ReportLocale, ReportStrings> = {
    hu: {
        numberLocale: "hu-HU",
        cardViews: "Összes megtekintés",
        cardLikes: "Összes lájk",
        cardFollowers: "Összes követő",
        deltaSuffix: "az időszakban",
        chartViews: "Megtekintések",
        chartLikes: "Lájkok",
        chartFollowers: "Követők",
        noChartData: "Nincs adat",
        noAccounts: "Ehhez az ügyfélhez nincs összekötött fiók.",
        coverageNoData: "Nincs elérhető adat a kiválasztott időszakban.",
        coveragePartialBaseline:
            "Az adatgyűjtés egy vagy több fióknál később kezdődött, mint a kiválasztott időszak eleje, a növekmény ettől a naptól számított.",
    },
    ro: {
        numberLocale: "ro-RO",
        cardViews: "Vizualizări totale",
        cardLikes: "Aprecieri totale",
        cardFollowers: "Urmăritori totali",
        deltaSuffix: "în perioadă",
        chartViews: "Vizualizări",
        chartLikes: "Aprecieri",
        chartFollowers: "Urmăritori",
        noChartData: "Fără date",
        noAccounts: "Niciun cont conectat la acest client.",
        coverageNoData: "Nu există date disponibile în perioada selectată.",
        coveragePartialBaseline:
            "Pentru unul sau mai multe conturi, colectarea datelor a început mai târziu decât începutul perioadei selectate, creșterea este calculată de la acea dată.",
    },
    en: {
        numberLocale: "en-US",
        cardViews: "Total views",
        cardLikes: "Total likes",
        cardFollowers: "Total followers",
        deltaSuffix: "in period",
        chartViews: "Views",
        chartLikes: "Likes",
        chartFollowers: "Followers",
        noChartData: "No data",
        noAccounts: "No account connected to this client.",
        coverageNoData: "No data available in the selected period.",
        coveragePartialBaseline:
            "Data collection started later than the selected period for one or more accounts, growth is calculated from that date.",
    },
}

export function getReportStrings(locale: ReportLocale): ReportStrings {
    return DICT[locale];
}

export function parseReportLocale(value: string | null | undefined): ReportLocale {
    return REPORT_LOCALES.includes(value as ReportLocale)
        ? (value as ReportLocale)
        : DEFAULT_REPORT_LOCALE;
}