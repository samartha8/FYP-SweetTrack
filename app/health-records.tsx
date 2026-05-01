import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { ChevronLeft, Plus, FileText, Trash2, Calendar, Link as LinkIcon, ArrowLeft, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, Layout, ZoomIn } from 'react-native-reanimated';
import { useUser } from '@/contexts/UserContext';
import { RECORDS_URL } from '@/constants/Api';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/contexts/SettingsContext';

const { width } = Dimensions.get('window');

type HealthRecord = {
    _id: string;
    recordName: string;
    recordType: string;
    fileUrl: string;
    date: string;
    notes?: string;
};

export default function HealthRecordsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { ensureAccessToken } = useUser();
    const { colors, scale } = useTheme();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<HealthRecord[]>([]);

    const fetchRecords = async () => {
        try {
            const token = await ensureAccessToken();
            const response = await fetch(RECORDS_URL, {
                headers: { 'Authorization': `Bearer ${token || ''}` }
            });
            const json = await response.json();
            if (json.success) setRecords(json.records);
        } catch (e) {
            console.error("Fetch Records Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        const confirmMsg = t.profile.healthRecords.deleteConfirmDesc;
        const deleteAction = async () => {
            try {
                const token = await ensureAccessToken();
                const response = await fetch(`${RECORDS_URL}/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token || ''}` }
                });
                const json = await response.json();
                if (json.success) setRecords(prev => prev.filter(r => r._id !== id));
            } catch (e) {
                console.error(e);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(confirmMsg)) deleteAction();
            return;
        }

        Alert.alert(
            t.profile.healthRecords.deleteConfirmTitle,
            confirmMsg,
            [
                { text: t.common.cancel, style: 'cancel' },
                { text: t.common.edit, style: 'destructive', onPress: deleteAction }
            ]
        );
    };

    const handleUploadSimulated = () => {
        const title = t.profile.healthRecords.uploadDialogTitle;
        const desc = t.profile.healthRecords.uploadDialogDesc;
        if (Platform.OS === 'web') {
            simulateUpload('Lab_Report_Jan.pdf');
            return;
        }
        Alert.alert(title, desc, [
            { text: t.profile.healthRecords.camera, onPress: () => simulateUpload('Lab_Report_Jan.pdf') },
            { text: t.profile.healthRecords.files, onPress: () => simulateUpload('Prescription_New.pdf') },
            { text: t.common.cancel, style: 'cancel' }
        ]);
    };

    const simulateUpload = async (name: string) => {
        setLoading(true);
        try {
            const token = await ensureAccessToken();
            const payload = { recordName: name, recordType: name.includes('Prescription') ? 'Prescription' : 'Report', fileUrl: 'https://example.com/mock.pdf', notes: 'Uploaded' };
            const res = await fetch(RECORDS_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token || ''}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.success) setRecords(prev => [json.record, ...prev]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRecords(); }, []);

    const themed = useMemo(() => ({
        headerTitle: { color: colors.text, fontSize: scale(24), fontWeight: '900' as const, letterSpacing: -1 },
        card: { backgroundColor: '#FFF', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)', elevation: 5, shadowOpacity: 0.08, shadowRadius: 20, shadowColor: '#000' },
        recordName: { color: colors.text, fontSize: 16, fontWeight: '900' as const, letterSpacing: -0.3 },
    }), [colors, scale]);

    const renderItem = ({ item, index }: { item: HealthRecord, index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 100)} style={[styles.recordCard, themed.card]}>
            <View style={[styles.recordIcon, { backgroundColor: colors.primary + '10' }]}>
                <FileText size={24} color={colors.primary} strokeWidth={2.5} />
            </View>
            <View style={styles.recordInfo}>
                <Text style={themed.recordName}>{item.recordName}</Text>
                <View style={styles.recordMeta}>
                    <Calendar size={14} color={colors.textSecondary} />
                    <Text style={styles.recordDate}>{new Date(item.date).toLocaleDateString()}</Text>
                </View>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.deleteButton}>
                <Trash2 size={20} color={colors.error} strokeWidth={2.5} />
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <LinearGradient colors={['#F0FDF4', '#F0F9FF']} style={StyleSheet.absoluteFill} />
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={28} color={colors.text} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={themed.headerTitle}>{t.profile.healthRecords.header}</Text>
                <View style={{ width: 44 }} />
            </View>
            {loading && records.length === 0 ? (
                <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
                <FlatList
                    data={records}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<View style={styles.emptyContainer}><Text style={{ color: colors.textSecondary }}>{t.profile.healthRecords.noRecords}</Text></View>}
                />
            )}
            <TouchableOpacity activeOpacity={0.9} style={[styles.fab, { bottom: insets.bottom + 24 }]} onPress={handleUploadSimulated}>
                <LinearGradient colors={['#00B4D8', '#0077B6']} style={StyleSheet.absoluteFill} />
                <Plus size={32} color="#FFF" strokeWidth={3} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 20 },
    backButton: { width: 44, height: 44, justifyContent: 'center' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 24, paddingBottom: 120 },
    recordCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 16 },
    recordIcon: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    recordInfo: { flex: 1, marginLeft: 16 },
    recordMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    recordDate: { fontSize: 12, marginLeft: 4, color: '#64748B' },
    deleteButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    fab: { position: 'absolute', right: 24, width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', elevation: 8, shadowOpacity: 0.3, shadowRadius: 12, shadowColor: '#00B4D8' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
});
