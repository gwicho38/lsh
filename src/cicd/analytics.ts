import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ?
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const redis = new Redis(REDIS_URL);

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
  expectedRange: { min: number; max: number };
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

// Calculate moving average for trend smoothing
function movingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const subset = data.slice(start, i + 1);
    const avg = subset.reduce((a, b) => a + b, 0) / subset.length;
    result.push(avg);
  }
  return result;
}

// Detect anomalies using Z-score
function detectAnomalies(data: number[], threshold: number = 2.5): number[] {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);

  return data.map((value, index) => {
    const zScore = Math.abs((value - mean) / stdDev);
    return zScore > threshold ? index : -1;
  }).filter(index => index !== -1);
}

// Linear regression for predictions
function linearRegression(data: number[]): { slope: number; intercept: number } {
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = data.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * data[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export async function generateTrendAnalysis(days: number = 30): Promise<TrendData[]> {
  const trends: TrendData[] = [];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const key = `metrics:${dateStr}`;

    const metrics = await redis.hgetall(key);
    const durations = await redis.lrange(`durations:${dateStr}`, 0, -1);

    const totalBuilds = parseInt(metrics.total_builds || '0');
    const successfulBuilds = parseInt(metrics.successful_builds || '0');
    const failedBuilds = parseInt(metrics.failed_builds || '0');

    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + parseInt(d), 0) / durations.length
      : 0;

    trends.push({
      date: dateStr,
      totalBuilds,
      successRate: totalBuilds > 0 ? (successfulBuilds / totalBuilds) * 100 : 0,
      avgDuration: avgDuration / 1000 / 60, // Convert to minutes
      failureRate: totalBuilds > 0 ? (failedBuilds / totalBuilds) * 100 : 0
    });
  }

  return trends;
}

export async function detectBuildAnomalies(trends: TrendData[]): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];

  // Extract metrics
  const durations = trends.map(t => t.avgDuration);
  const failureRates = trends.map(t => t.failureRate);
  const buildCounts = trends.map(t => t.totalBuilds);

  // Detect duration anomalies
  const durationAnomalies = detectAnomalies(durations);
  durationAnomalies.forEach(index => {
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const stdDev = Math.sqrt(durations.reduce((sum, val) =>
      sum + Math.pow(val - mean, 2), 0) / durations.length);

    anomalies.push({
      timestamp: trends[index].date,
      type: 'duration',
      severity: durations[index] > mean + 3 * stdDev ? 'critical' : 'warning',
      description: `Build duration significantly higher than average`,
      value: durations[index],
      expectedRange: {
        min: Math.max(0, mean - 2 * stdDev),
        max: mean + 2 * stdDev
      }
    });
  });

  // Detect failure rate anomalies
  const failureAnomalies = detectAnomalies(failureRates, 2);
  failureAnomalies.forEach(index => {
    if (failureRates[index] > 20) { // Only flag if failure rate > 20%
      anomalies.push({
        timestamp: trends[index].date,
        type: 'failure_rate',
        severity: failureRates[index] > 50 ? 'critical' : 'warning',
        description: `High failure rate detected`,
        value: failureRates[index],
        expectedRange: { min: 0, max: 20 }
      });
    }
  });

  return anomalies;
}

export async function generateInsights(trends: TrendData[]): Promise<Insight[]> {
  const insights: Insight[] = [];

  if (trends.length < 7) return insights;

  // Compare last 7 days with previous 7 days
  const recentWeek = trends.slice(-7);
  const previousWeek = trends.slice(-14, -7);

  const recentAvgSuccess = recentWeek.reduce((sum, t) => sum + t.successRate, 0) / 7;
  const prevAvgSuccess = previousWeek.reduce((sum, t) => sum + t.successRate, 0) / 7;
  const successChange = recentAvgSuccess - prevAvgSuccess;

  if (Math.abs(successChange) > 5) {
    insights.push({
      type: successChange > 0 ? 'improvement' : 'degradation',
      title: `Success Rate ${successChange > 0 ? 'Improved' : 'Degraded'}`,
      description: `Success rate changed by ${Math.abs(successChange).toFixed(1)}% compared to previous week`,
      metric: 'success_rate',
      change: successChange,
      impact: Math.abs(successChange) > 15 ? 'high' : Math.abs(successChange) > 10 ? 'medium' : 'low'
    });
  }

  // Analyze build duration trends
  const recentAvgDuration = recentWeek.reduce((sum, t) => sum + t.avgDuration, 0) / 7;
  const prevAvgDuration = previousWeek.reduce((sum, t) => sum + t.avgDuration, 0) / 7;
  const durationChange = ((recentAvgDuration - prevAvgDuration) / prevAvgDuration) * 100;

  if (Math.abs(durationChange) > 10) {
    insights.push({
      type: durationChange < 0 ? 'improvement' : 'degradation',
      title: `Build Duration ${durationChange < 0 ? 'Improved' : 'Increased'}`,
      description: `Average build duration changed by ${Math.abs(durationChange).toFixed(1)}%`,
      metric: 'duration',
      change: durationChange,
      impact: Math.abs(durationChange) > 30 ? 'high' : Math.abs(durationChange) > 20 ? 'medium' : 'low'
    });
  }

  // Identify patterns
  const dailyBuilds = trends.map(t => t.totalBuilds);
  const weekdays = trends.map(t => new Date(t.date).getDay());
  const weekdayAvg = Array(7).fill(0).map((_, day) => {
    const dayBuilds = dailyBuilds.filter((_, i) => weekdays[i] === day);
    return dayBuilds.reduce((a, b) => a + b, 0) / dayBuilds.length;
  });

  const peakDay = weekdayAvg.indexOf(Math.max(...weekdayAvg));
  const lowDay = weekdayAvg.indexOf(Math.min(...weekdayAvg));
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  insights.push({
    type: 'pattern',
    title: 'Weekly Build Pattern Detected',
    description: `Most builds occur on ${dayNames[peakDay]}, least on ${dayNames[lowDay]}`,
    metric: 'frequency',
    change: 0,
    impact: 'low'
  });

  return insights;
}

export async function predictNextPeriod(trends: TrendData[]): Promise<Prediction[]> {
  const predictions: Prediction[] = [];

  if (trends.length < 14) return predictions;

  // Predict success rate
  const successRates = trends.map(t => t.successRate);
  const successRegression = linearRegression(successRates.slice(-14));
  const predictedSuccess = successRegression.slope * successRates.length + successRegression.intercept;

  predictions.push({
    metric: 'success_rate',
    nextPeriod: 'next_7_days',
    predictedValue: Math.max(0, Math.min(100, predictedSuccess)),
    confidence: 0.75,
    trend: successRegression.slope > 1 ? 'improving' :
           successRegression.slope < -1 ? 'degrading' : 'stable'
  });

  // Predict build volume
  const buildCounts = trends.map(t => t.totalBuilds);
  const volumeRegression = linearRegression(buildCounts.slice(-14));
  const predictedVolume = volumeRegression.slope * buildCounts.length + volumeRegression.intercept;

  predictions.push({
    metric: 'build_volume',
    nextPeriod: 'next_day',
    predictedValue: Math.max(0, Math.round(predictedVolume)),
    confidence: 0.7,
    trend: volumeRegression.slope > 5 ? 'improving' :
           volumeRegression.slope < -5 ? 'degrading' : 'stable'
  });

  return predictions;
}

export async function calculateCostAnalysis(trends: TrendData[]): Promise<CostAnalysis> {
  // Estimate costs based on build minutes (GitHub Actions pricing model)
  const COST_PER_MINUTE = 0.008; // $0.008 per minute for Linux runners

  const totalMinutes = trends.reduce((sum, t) =>
    sum + (t.totalBuilds * t.avgDuration), 0);
  const totalCost = totalMinutes * COST_PER_MINUTE;
  const totalBuilds = trends.reduce((sum, t) => sum + t.totalBuilds, 0);

  const savingsOpportunities: string[] = [];

  // Identify savings opportunities
  const avgDuration = totalMinutes / totalBuilds;
  if (avgDuration > 10) {
    savingsOpportunities.push('Consider optimizing long-running builds (>10 minutes average)');
  }

  const avgFailureRate = trends.reduce((sum, t) => sum + t.failureRate, 0) / trends.length;
  if (avgFailureRate > 15) {
    const wastedCost = (totalCost * avgFailureRate / 100);
    savingsOpportunities.push(`Reduce failure rate to save ~$${wastedCost.toFixed(2)}/month`);
  }

  // Check for off-peak opportunities
  const peakHourBuilds = trends.filter(t => {
    const hour = new Date(t.date).getHours();
    return hour >= 9 && hour <= 17;
  });

  if (peakHourBuilds.length > trends.length * 0.7) {
    savingsOpportunities.push('Schedule non-critical builds during off-peak hours');
  }

  return {
    totalCost,
    costPerBuild: totalBuilds > 0 ? totalCost / totalBuilds : 0,
    costByPlatform: {
      github: totalCost * 0.6, // Estimate based on usage
      gitlab: totalCost * 0.25,
      jenkins: totalCost * 0.15
    },
    savingsOpportunities
  };
}

export async function generateAnalyticsReport(
  period: 'daily' | 'weekly' | 'monthly' = 'weekly'
): Promise<AnalyticsReport> {
  const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
  const trends = await generateTrendAnalysis(days);

  const [insights, anomalies, predictions, costAnalysis] = await Promise.all([
    generateInsights(trends),
    detectBuildAnomalies(trends),
    predictNextPeriod(trends),
    calculateCostAnalysis(trends)
  ]);

  return {
    period,
    startDate: trends[0]?.date || new Date().toISOString(),
    endDate: trends[trends.length - 1]?.date || new Date().toISOString(),
    trends,
    insights,
    anomalies,
    predictions,
    costAnalysis
  };
}

// Export functions for bottleneck detection
export async function detectBottlenecks(): Promise<any> {
  // Analyze stage durations to find slowest parts
  const stageData = await redis.hgetall('stage_durations');
  const bottlenecks = Object.entries(stageData)
    .map(([stage, duration]) => ({
      stage,
      avgDuration: parseInt(duration),
      impact: 'high'
    }))
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, 5);

  return bottlenecks;
}