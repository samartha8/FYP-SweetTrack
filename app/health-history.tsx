import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronDown, ChevronUp, ArrowLeft, FileText } from 'lucide-react-native';
import { useTranslation } from '@/hooks/use-translation';
import { useUser } from '@/contexts/UserContext';
import { DIABETES_URL } from '@/constants/Api';
import { useTheme } from '@/contexts/SettingsContext';

export default function HealthHistoryScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { ensureAccessToken } = useUser();
    const { colors, scale } = useTheme();
    const { t } = useTranslation();

    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const AGE_GROUPS_LIST = useMemo(() => [
        { value: '1', label: '18-24' },
        { value: '2', label: '25-29' },
        { value: '3', label: '30-34' },
        { value: '4', label: '35-39' },
        { value: '5', label: '40-44' },
        { value: '6', label: '45-49' },
        { value: '7', label: '50-54' },
        { value: '8', label: '55-59' },
        { value: '9', label: '60-64' },
        { value: '10', label: '65-69' },
        { value: '11', label: '70-74' },
        { value: '12', label: '75-79' },
        { value: '13', label: '80+' },
    ], []);

    const LOCALIZED_LABELS = useMemo(() => {
        const labels: Record<string, string> = {
            highBP: t.profile.healthHistory.labels.highBP,
            highChol: t.profile.healthHistory.labels.highChol,
            cholCheck: t.profile.healthHistory.labels.cholCheck,
            bmi: t.profile.healthHistory.labels.bmi,
            smoker: t.profile.healthHistory.labels.smoker,
            stroke: t.profile.healthHistory.labels.stroke,
            heartDiseaseOrAttack: t.profile.healthHistory.labels.heartDiseaseOrAttack,
            physActivity: t.profile.healthHistory.labels.physActivity,
            fruits: t.profile.healthHistory.labels.fruits,
            veggies: t.profile.healthHistory.labels.veggies,
            hvyAlcoholConsump: t.profile.healthHistory.labels.hvyAlcoholConsump,
            anyHealthcare: t.profile.healthHistory.labels.anyHealthcare,
            noDocbcCost: t.profile.healthHistory.labels.noDocbcCost,
            genHlth: t.profile.healthHistory.labels.genHlth,
            mentHlth: t.profile.healthHistory.labels.mentHlth,
            physHlth: t.profile.healthHistory.labels.physHlth,
            diffWalk: t.profile.healthHistory.labels.diffWalk,
            sex: t.profile.healthHistory.labels.sex,
            age: t.profile.healthHistory.labels.age,
            education: t.profile.healthHistory.labels.education,
            income: t.profile.healthHistory.labels.income,
            glucose: t.profile.healthHistory.labels.glucose,
            bloodGlucoseEstimated: t.profile.healthHistory.labels.glucose,
            hba1c: t.profile.healthHistory.labels.hba1c,
            hba1cEstimated: t.profile.healthHistory.labels.hba1c,
        };
        return labels;
    }, [t]);

    const formatValueLocalized = useCallback((key: string, value: any): string => {
        if (value === undefined || value === null) return '-';

        const numVal = Number(value);

        // Boolean fields (0/1)
        if ([
            'highBP', 'highChol', 'cholCheck', 'smoker', 'stroke',
            'heartDiseaseOrAttack', 'physActivity', 'fruits', 'veggies',
            'hvyAlcoholConsump', 'anyHealthcare', 'noDocbcCost', 'diffWalk'
        ].includes(key)) {
            return numVal === 1 ? t.healthSetup.yes : t.healthSetup.no;
        }

        // Specific mappings
        if (key === 'sex') return numVal === 1 ? t.profile.male : t.profile.female;

        if (key === 'age') {
            const group = AGE_GROUPS_LIST.find(g => g.value === String(value));
            return group ? group.label : String(value);
        }

        if (key === 'genHlth') {
            const healthMap: Record<number, string> = {
                1: t.healthSetup.genHlthLevels[1],
                2: t.healthSetup.genHlthLevels[2],
                3: t.healthSetup.genHlthLevels[3],
                4: t.healthSetup.genHlthLevels[4],
                5: t.healthSetup.genHlthLevels[5]
            };
            return healthMap[numVal] || String(value);
        }

        if (key === 'education') {
            const eduMap: Record<number, string> = {
                1: t.profile.healthHistory.educationLevels[1],
                2: t.profile.healthHistory.educationLevels[2],
                3: t.profile.healthHistory.educationLevels[3],
                4: t.profile.healthHistory.educationLevels[4],
                5: t.profile.healthHistory.educationLevels[5],
                6: t.profile.healthHistory.educationLevels[6]
            };
            return eduMap[numVal] || String(value);
        }

        // Units
        if (key === 'bmi') return `${parseFloat(value).toFixed(1)}`;
        if (key.toLowerCase().includes('glucose')) return `${value} mg/dL`;
        if (key.toLowerCase().includes('hba1c')) return `${value}%`;

        return String(value);
    }, [t, AGE_GROUPS_LIST]);

    const themed = useMemo(() => ({
        container: { backgroundColor: colors.background },
        header: { backgroundColor: colors.background, borderBottomColor: colors.border },
        headerTitle: { color: colors.text, fontSize: scale(20) },
        card: { backgroundColor: colors.card, shadowColor: colors.cardShadow },
        text: { color: colors.text },
        textSecondary: { color: colors.textSecondary },
        label: { color: colors.textSecondary, fontSize: scale(12) },
        value: { color: colors.text, fontSize: scale(14), fontWeight: '500' as const },
        date: { color: colors.textSecondary, fontSize: scale(12) },
        badgeText: { fontSize: scale(12), color: colors.textWhite },
        sectionTitle: { color: colors.text, fontSize: scale(16) },
        divider: { backgroundColor: colors.border },
    }), [colors, scale]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const token = await ensureAccessToken();
            const response = await fetch(`${DIABETES_URL}/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await response.json();
            if (json.success) {
                setHistory(json.data);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchHistory();
        }, [])
    );

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getRiskLevelDisplay = (level: string) => {
        switch (level) {
            case 'High Risk': return t.profile.healthHistory.riskLevelHigh;
            case 'Medium Risk': return t.profile.healthHistory.riskLevelModerate;
            default: return t.profile.healthHistory.riskLevelLow;
        }
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'High Risk': return colors.risk.high;
            case 'Medium Risk': return colors.risk.moderate;
            default: return colors.risk.low;
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isExpanded = expandedId === item._id;
        const riskColor = getRiskColor(item.riskLevel);
        const riskDisplay = getRiskLevelDisplay(item.riskLevel);

        return (
            <TouchableOpacity
                style={[styles.card, themed.card]}
                onPress={() => toggleExpand(item._id)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.riskBadge, { backgroundColor: riskColor }]}>
                            <Text style={themed.badgeText}>{riskDisplay}</Text>
                        </View>
                        <Text style={[styles.dateText, themed.date]}>{formatDate(item.createdAt)}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={[styles.riskScore, { color: riskColor }]}>{item.riskScore}%</Text>
                        {isExpanded ? <ChevronUp size={20} color={colors.textSecondary} /> : <ChevronDown size={20} color={colors.textSecondary} />}
                    </View>
                </View>

                {isExpanded && (
                    <View style={styles.cardContent}>
                        <View style={[styles.divider, themed.divider]} />

                        <View style={styles.sectionHeader}>
                            <FileText size={16} color={colors.primary} />
                            <Text style={[styles.sectionTitle, themed.sectionTitle]}>{t.profile.healthHistory.sectionTitle}</Text>
                        </View>

                        <View style={styles.grid}>
                            {Object.entries(item.inputData || {})
                                .filter(([key]) => !['_id', 'user', 'createdAt', 'updatedAt', '__v'].includes(key) && LOCALIZED_LABELS[key])
                                .map(([key, value]) => {
                                    const label = LOCALIZED_LABELS[key] || key.replace(/([A-Z])/g, ' $1').trim();
                                    const formattedValue = formatValueLocalized(key, value);

                                    return (
                                        <View key={key} style={styles.gridItem}>
                                            <Text style={themed.label}>{label}</Text>
                                            <Text style={themed.value}>{formattedValue}</Text>
                                        </View>
                                    );
                                })}
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, themed.container, { paddingTop: insets.top }]}>
            <View style={[styles.header, themed.header]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, themed.headerTitle]}>{t.profile.healthHistory.header}</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={history}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={themed.textSecondary}>{t.profile.healthHistory.noHistory}</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 12,
        marginBottom: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'column',
        gap: 4,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    riskBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    dateText: {
        marginTop: 4,
    },
    riskScore: {
        fontSize: 24,
        fontWeight: '700',
    },
    cardContent: {
        marginTop: 12,
    },
    divider: {
        height: 1,
        marginVertical: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontWeight: '600',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    gridItem: {
        width: '45%',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
});
