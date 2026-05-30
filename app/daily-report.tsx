import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, FileText, Activity, Flame, Moon, Droplet, Zap, ShieldCheck, AlertCircle, Info, TrendingDown, Sparkles, Download } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useHealth } from '../contexts/HealthContext';
import { useMealTracking } from '../contexts/MealTrackingContext';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/use-translation';
import { secureFetch } from '../lib/apiClient';
import { DIABETES_URL } from '../constants/Api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function DailyReportScreen() {
  const router = useRouter();
  const { user, ensureAccessToken } = useAuth();
  const { 
    healthMetrics, dailyGoals, riskStatus: contextRiskStatus, 
    isGoogleFitConnected, connectGoogleFit 
  } = useHealth();
  const { todayNutrition, mealLogs } = useMealTracking();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const [predictionData, setPredictionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchLatestPrediction = useCallback(async (retryLimit = 1) => {
    try {
      const response = await secureFetch(`${DIABETES_URL}/latest`);
      
      if (response.status === 401 && retryLimit > 0) {
        await ensureAccessToken(true);
        return fetchLatestPrediction(retryLimit - 1);
      }

      const json = await response.json();
      if (json.success) {
        setPredictionData(json);
      }
    } catch (e) {
      console.error("Report Fetch Prediction Error:", e);
    } finally {
      setLoading(false);
    }
  }, [ensureAccessToken]);

  useEffect(() => {
    fetchLatestPrediction();
  }, [fetchLatestPrediction]);

  // --- Metabolic Synergy Algorithm (Ported from progress-impact.tsx) ---
  const synergyData = useMemo(() => {
    const steps = healthMetrics.steps || 0;
    let stepImpact = 0;
    let stepStatus = 'Below Target';
    
    if (steps >= 8000) {
        stepImpact = 10.0;
        stepStatus = 'Optimal';
    } else if (steps >= 5000) {
        stepImpact = 4.0; 
        stepStatus = 'Improving';
    } else if (steps < 2000) {
        stepImpact = -8.0; 
        stepStatus = 'Critically Low';
    } else if (steps < 5000) {
        stepImpact = -2.0;
        stepStatus = 'Insufficient';
    }

    const todayStr = new Date().toDateString();
    const recentLogs = mealLogs.filter(log => new Date(log.date).toDateString() === todayStr);
    const healthyMeals = recentLogs.filter(log => (log.nutritionalInfo?.sugar || 0) < 15).length;
    const unhealthyMeals = recentLogs.filter(log => (log.nutritionalInfo?.sugar || 0) >= 25).length;
    const highCalorieMeals = recentLogs.filter(log => (log.nutritionalInfo?.calories || 0) >= 600).length;
    const totalCalories = recentLogs.reduce((sum, log) => sum + (log.nutritionalInfo?.calories || 0), 0);
    const calorieLoadPenalty = totalCalories >= 2500 ? -6.0 : totalCalories >= 2000 ? -3.0 : 0;
    const frequentEatingPenalty = recentLogs.length >= 5 ? -4.0 : 0;
    const rawMealImpact = (healthyMeals * 3.0) - (unhealthyMeals * 7.0) - (highCalorieMeals * 4.0) + calorieLoadPenalty + frequentEatingPenalty; 
    let mealImpact = Math.min(rawMealImpact, 15); 
    let totalImpactNumber = stepImpact + mealImpact;
    const isDownwardSpiral = steps < 2000 && (unhealthyMeals > 0 || highCalorieMeals > 0 || totalCalories >= 2000 || recentLogs.length >= 5);
    
    if (isDownwardSpiral) {
        const before = totalImpactNumber;
        if (totalImpactNumber > 0) {
            totalImpactNumber = -totalImpactNumber;
        }
        totalImpactNumber = totalImpactNumber * 1.5;
    }
    
    const totalImpact = parseFloat(totalImpactNumber.toFixed(1));
    return {
        totalImpact,
        stepImpact,
        stepStatus,
        mealImpact,
        isDownwardSpiral,
        isCritical: totalImpact <= -18
    };
  }, [healthMetrics.steps, mealLogs]);

  const dateStr = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  const riskStatus = predictionData?.prediction === 1 ? 'Positive' : 'Negative';
  const riskProbability = predictionData?.riskScore !== undefined ? (predictionData.riskScore / 100) : (predictionData?.probability || 0);

  const exportToPDF = async () => {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #1e293b; background: #fff; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: 900; color: #10b981; }
              .report-id { text-align: right; color: #64748b; font-size: 12px; }
              .section { margin-bottom: 30px; }
              .section-title { font-size: 18px; font-weight: 800; color: #1e293b; border-left: 4px solid #10b981; padding-left: 12px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; }
              .risk-card { background: ${riskStatus === 'Positive' ? '#fff1f2' : '#f0fdf4'}; border-radius: 16px; padding: 24px; border: 1px solid ${riskStatus === 'Positive' ? '#fecdd3' : '#bbf7d0'}; }
              .risk-value { font-size: 32px; font-weight: 900; color: ${getStatusColor(riskStatus)}; }
              .risk-label { font-size: 14px; font-weight: 700; color: #64748b; margin-top: 4px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
              .metric-card { background: #f8fafc; border-radius: 12px; padding: 15px; border: 1px solid #e2e8f0; }
              .metric-label { font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 4px; }
              .metric-value { font-size: 18px; font-weight: 800; color: #1e293b; }
              .synergy-box { background: ${synergyData.isCritical ? '#7f1d1d' : '#1e293b'}; color: #fff; border-radius: 16px; padding: 20px; margin-bottom: 20px; }
              .synergy-value { font-size: 28px; font-weight: 900; }
              .footer { margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="logo">SweetTrack Bio-Report</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 4px;">Patient: ${user?.name || 'Anonymous User'}</div>
              </div>
              <div class="report-id">
                DATE: ${dateStr.toUpperCase()}<br/>
                REPORT ID: ST-${Math.floor(Math.random() * 90000) + 10000}
              </div>
            </div>

            <div class="section">
              <div class="section-title">Metabolic Risk Assessment</div>
              <div class="risk-card">
                <div class="risk-value">${(riskProbability * 100).toFixed(1)}% Probability</div>
                <div class="risk-label">Clinical Risk Status: ${riskStatus.toUpperCase()}</div>
                <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-top: 12px;">
                  Analysis based on real-time biometric sync and metabolic load tracking. 
                  Current status indicates <strong>${riskStatus === 'Positive' ? 'Elevated' : 'Controlled'}</strong> insulin resistance risk.
                </p>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Metabolic Synergy Impact</div>
              <div class="synergy-box">
                <div style="font-size: 12px; font-weight: 800; opacity: 0.8; margin-bottom: 8px;">SYNERGY SCORE</div>
                <div class="synergy-value">${synergyData.totalImpact}%</div>
                <div style="font-size: 13px; opacity: 0.9; margin-top: 8px;">
                  Mitigation factors derived from ${healthMetrics.steps} steps and today's glycemic load.
                </div>
              </div>
              <div class="grid">
                <div class="metric-card">
                  <div class="metric-label">ACTIVITY IMPACT</div>
                  <div class="metric-value">${synergyData.stepImpact > 0 ? '+' : ''}${synergyData.stepImpact}%</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">DIETARY SYNERGY</div>
                  <div class="metric-value">${synergyData.mealImpact > 0 ? '+' : ''}${synergyData.mealImpact}%</div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Vital Bio-Metrics</div>
              <div class="grid">
                <div class="metric-card">
                  <div class="metric-label">STEPS</div>
                  <div class="metric-value">${healthMetrics.steps.toLocaleString()}</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">CALORIC LOAD</div>
                  <div class="metric-value">${todayNutrition.calories} kcal</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">GLYCEMIC LOAD (SUGAR)</div>
                  <div class="metric-value">${todayNutrition.sugar}g</div>
                </div>
                <div class="metric-card">
                  <div class="metric-label">HYDRATION</div>
                  <div class="metric-value">${healthMetrics.water || 0} Glasses (${(healthMetrics.water || 0) * 250} ml)</div>
                </div>
              </div>
            </div>

            <div class="footer">
              This report is AI-generated for informational purposes and should not replace professional medical advice.<br/>
              © 2026 SweetTrack Metabolic Systems
            </div>
          </body>
        </html>
      `;

      const result = await Print.printToFileAsync({ html: htmlContent });
      
      if (Platform.OS === 'web') {
        await Print.printAsync({ html: htmlContent });
      } else if (result && result.uri) {
        await Sharing.shareAsync(result.uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        throw new Error("Failed to generate PDF URI");
      }
    } catch (error) {
      console.error("PDF Export Error:", error);
      Alert.alert("Export Failed", "Could not generate the PDF report.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Positive': return '#F43F5E';
      case 'Negative': return '#10B981';
      default: return '#64748B';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ marginTop: 12, color: '#64748B' }}>Generating Report...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { paddingTop: insets.top + 16, paddingBottom: 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clinical Bio-Report</Text>
        <TouchableOpacity onPress={exportToPDF} style={styles.downloadButton}>
          <Download size={24} color="#10B981" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.patientProfile}>
          <View style={styles.profileHeader}>
            <View>
              <Text style={styles.profileLabel}>PATIENT PROFILE</Text>
              <Text style={styles.profileName}>{user?.name || 'Anonymous User'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.profileLabel}>REPORT ID</Text>
              <Text style={styles.reportId}>ST-{Math.floor(Math.random() * 90000) + 10000}</Text>
            </View>
          </View>
          <View style={styles.profileDivider} />
          <View style={styles.dateRow}>
            <FileText size={18} color="#94A3B8" />
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
        </View>

        <View style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <AlertCircle size={20} color="#FFF" />
            <Text style={styles.riskTitle}>{synergyData.totalImpact < 0 ? 'CRITICAL METABOLIC LOAD' : 'DAILY METABOLIC SYNERGY'}</Text>
          </View>
          <Text style={styles.riskPercentage}>{isGoogleFitConnected ? `${synergyData.totalImpact}%` : '--%'}</Text>
          <Text style={styles.riskDescription}>
            {isGoogleFitConnected 
              ? (synergyData.totalImpact < 0 
                ? "Your current physical inactivity combined with glycemic load is increasing metabolic pressure. Action is advised."
                : "Your lifestyle choices today are successfully neutralizing metabolic risk factors. Keep it up!")
              : "Connect Google Fit to activate real-time metabolic risk assessment and corrective insights."}
          </Text>
          {!isGoogleFitConnected && (
            <TouchableOpacity 
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 8, borderRadius: 10, marginTop: 12, alignItems: 'center' }}
              onPress={connectGoogleFit}
            >
              <Text style={{ color: '#FFF', fontWeight: '800' }}>Activate Risk Analysis</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EXECUTIVE SUMMARY</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              {isGoogleFitConnected ? (
                <>
                  Comprehensive clinical analysis indicates a 
                  <Text style={{ color: getStatusColor(riskStatus), fontWeight: 'bold' }}> {riskStatus} </Text> 
                  metabolic state today. Physical activity is below target; increasing step count is advised to manage glycemic load. No nutritional data recorded for accurate metabolic load assessment.
                </>
              ) : (
                "Your daily clinical summary is currently locked. We require active physical data from Google Fit to synthesize your metabolic state and risk probability."
              )}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={styles.sectionTitle}>METABOLIC BIOMARKERS</Text>
            {!isGoogleFitConnected && (
              <TouchableOpacity onPress={connectGoogleFit}>
                <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '800' }}>CONNECT</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={[styles.biomarkerGrid, !isGoogleFitConnected && { opacity: 0.5 }]}>
            <View style={styles.biomarkerCard}>
              <View style={styles.biomarkerHeader}>
                <Activity size={20} color="#3B82F6" />
                <Text style={styles.biomarkerLabel}>Activity</Text>
              </View>
              <Text style={styles.biomarkerValue}>{isGoogleFitConnected ? healthMetrics.steps : '--'}</Text>
              <Text style={styles.biomarkerUnit}>Steps</Text>
              <View style={styles.biomarkerLine} />
            </View>

            <View style={styles.biomarkerCard}>
              <View style={styles.biomarkerHeader}>
                <Flame size={20} color="#F59E0B" />
                <Text style={styles.biomarkerLabel}>Metabolism</Text>
              </View>
              <Text style={styles.biomarkerValue}>{todayNutrition.calories}</Text>
              <Text style={styles.biomarkerUnit}>kcal</Text>
              <View style={styles.biomarkerLine} />
            </View>

            <View style={styles.biomarkerCard}>
              <View style={styles.biomarkerHeader}>
                <Moon size={20} color="#8B5CF6" />
                <Text style={styles.biomarkerLabel}>Restoration</Text>
              </View>
              <Text style={styles.biomarkerValue}>{isGoogleFitConnected ? healthMetrics.sleep : '--'}</Text>
              <Text style={styles.biomarkerUnit}>Hours</Text>
              <View style={styles.biomarkerLine} />
            </View>

            <View style={styles.biomarkerCard}>
              <View style={styles.biomarkerHeader}>
                <Droplet size={20} color="#0EA5E9" />
                <Text style={styles.biomarkerLabel}>Hydration</Text>
              </View>
              <Text style={styles.biomarkerValue}>{healthMetrics.water || 0}</Text>
              <Text style={styles.biomarkerUnit}>Glasses ({ (healthMetrics.water || 0) * 250 } ml)</Text>
              <View style={styles.biomarkerLine} />
            </View>
          </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>METABOLIC MACRO-DISTRIBUTION</Text>
          <View style={styles.macroCard}>
             <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                   <Text style={styles.macroLabel}>PROTEIN</Text>
                   <Text style={styles.macroValue}>{todayNutrition.protein}g</Text>
                </View>
                <View style={styles.macroItem}>
                   <Text style={styles.macroLabel}>CARBS</Text>
                   <Text style={styles.macroValue}>{todayNutrition.carbs}g</Text>
                </View>
                <View style={styles.macroItem}>
                   <Text style={styles.macroLabel}>FATS</Text>
                   <Text style={styles.macroValue}>{todayNutrition.fat}g</Text>
                </View>
             </View>
             <View style={styles.macroDivider} />
             <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                   <Text style={styles.macroLabel}>SUGAR</Text>
                   <Text style={[styles.macroValue, todayNutrition.sugar > 40 && { color: '#EF4444' }]}>{todayNutrition.sugar}g</Text>
                </View>
                <View style={styles.macroItem}>
                   <Text style={styles.macroLabel}>FIBER</Text>
                   <Text style={styles.macroValue}>{todayNutrition.fiber}g</Text>
                </View>
             </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>METABOLIC CORRECTIVE ACTIONS</Text>
          <View style={styles.recommendationList}>
             {synergyData.totalImpact < 0 && (
               <View style={styles.recItem}>
                 <Zap size={18} color="#EF4444" />
                 <Text style={styles.recText}>Increase physical activity immediately to neutralize today's glycemic load.</Text>
               </View>
             )}
             {healthMetrics.water < 6 && (
               <View style={styles.recItem}>
                 <Droplet size={18} color="#3B82F6" />
                 <Text style={styles.recText}>Increase water intake to improve metabolic waste clearance.</Text>
               </View>
             )}
             {todayNutrition.sugar > 30 && (
               <View style={styles.recItem}>
                 <AlertCircle size={18} color="#F59E0B" />
                 <Text style={styles.recText}>High sugar intake detected. Prioritize lean protein for your next meal to stabilize insulin.</Text>
               </View>
             )}
             <View style={styles.recItem}>
               <ShieldCheck size={18} color="#10B981" />
               <Text style={styles.recText}>Maintain consistent tracking to improve AI prediction accuracy.</Text>
             </View>
          </View>
        </View>
          
          {!isGoogleFitConnected && (
            <View style={{ position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center', zIndex: 10 }}>
              <View style={{ backgroundColor: '#FFF', padding: 15, borderRadius: 20, elevation: 10, shadowOpacity: 0.1, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}>
                 <Sparkles size={32} color="#3B82F6" style={{ marginBottom: 10 }} />
                 <Text style={{ fontWeight: '800', color: '#1E293B' }}>Metrics Locked</Text>
                 <Text style={{ fontSize: 11, color: '#64748B', textAlign: 'center', marginVertical: 4 }}>Connect Google Fit to reveal</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footerInfo}>
          <Info size={16} color="#94A3B8" />
          <Text style={styles.footerText}>
            This report uses AI models to analyze lifestyle synergy. It is not a clinical diagnosis.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  downloadButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  patientProfile: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  reportId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
  },
  profileDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#64748B',
  },
  riskCard: {
    backgroundColor: '#C23A3A',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  riskTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  riskPercentage: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  riskDescription: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 16,
    letterSpacing: 1,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
  biomarkerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  biomarkerCard: {
    width: (width - 56) / 2,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
  },
  biomarkerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  biomarkerLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  biomarkerValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  biomarkerUnit: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
  },
  biomarkerLine: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    width: '100%',
  },
  macroCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  macroDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  recommendationList: {
    gap: 12,
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  recText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    fontWeight: '500',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 40,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    color: '#94A3B8',
  },
});
