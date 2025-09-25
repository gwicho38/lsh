interface TrendData {
    date: string;
    totalBuilds: number;
    successRate: number;
    avgDuration: number;
    failureRate: number;
}
interface AnalyticsReport {
    period: 'daily' | 'weekly' | 'monthly';
    startDate: string;
    endDate: string;
    trends: TrendData[];
    insights: Insight[];
    anomalies: Anomaly[];
    predictions: Prediction[];
    costAnalysis: CostAnalysis;
}
interface Insight {
    type: 'improvement' | 'degradation' | 'pattern';
    title: string;
    description: string;
    metric: string;
    change: number;
    impact: 'low' | 'medium' | 'high';
}
interface Anomaly {
    timestamp: string;
    type: 'duration' | 'failure_rate' | 'frequency';
    severity: 'warning' | 'critical';
    description: string;
    value: number;
    expectedRange: {
        min: number;
        max: number;
    };
}
interface Prediction {
    metric: string;
    nextPeriod: string;
    predictedValue: number;
    confidence: number;
    trend: 'improving' | 'stable' | 'degrading';
}
interface CostAnalysis {
    totalCost: number;
    costPerBuild: number;
    costByPlatform: Record<string, number>;
    savingsOpportunities: string[];
}
export declare function generateTrendAnalysis(days?: number): Promise<TrendData[]>;
export declare function detectBuildAnomalies(trends: TrendData[]): Promise<Anomaly[]>;
export declare function generateInsights(trends: TrendData[]): Promise<Insight[]>;
export declare function predictNextPeriod(trends: TrendData[]): Promise<Prediction[]>;
export declare function calculateCostAnalysis(trends: TrendData[]): Promise<CostAnalysis>;
export declare function generateAnalyticsReport(period?: 'daily' | 'weekly' | 'monthly'): Promise<AnalyticsReport>;
export declare function detectBottlenecks(): Promise<Array<{
    stage: string;
    avgDuration: number;
    impact: string;
}>>;
export {};
