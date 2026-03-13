import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, FileText, Trash2, Calendar, Link as LinkIcon } from 'lucide-react-native';
import { useUser } from '@/contexts/UserContext';
import { RECORDS_URL } from '@/constants/Api';
import { useTranslation } from '@/hooks/use-translation';
import { useTheme } from '@/contexts/SettingsContext';

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
                headers: {
                    'Authorization': `Bearer ${token || ''}`,
                }
            });
            const json = await response.json();
            if (json.success) {
                setRecords(json.records);
            }
        } catch (e) {
            console.error("Fetch Records Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            t.profile.healthRecords.deleteConfirmTitle,
            t.profile.healthRecords.deleteConfirmDesc,
            [
                { text: t.common.cancel, style: 'cancel' },
                {
                    text: t.common.edit, // Using 'edit' or just 'delete' if available, but I'll use common ones or specific ones
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await ensureAccessToken();
                            const response = await fetch(`${RECORDS_URL}/${id}`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token || ''}`,
                                }
                            });
                            const json = await response.json();
                            if (json.success) {
                                setRecords(prev => prev.filter(r => r._id !== id));
                            }
                        } catch (e) {
                            Alert.alert(t.profile.editScreen.errorTitle, t.profile.healthRecords.errorDelete);
                        }
                    }
                }
            ]
        );
    };

    const handleUploadSimulated = () => {
        Alert.alert(
            t.profile.healthRecords.uploadDialogTitle,
            t.profile.healthRecords.uploadDialogDesc,
            [
                { text: t.profile.healthRecords.camera, onPress: () => simulateUpload('Lab_Report_Jan.pdf') },
                { text: t.profile.healthRecords.files, onPress: () => simulateUpload('Prescription_New.pdf') },
                { text: t.common.cancel, style: 'cancel' }
            ]
        );
    };

    const simulateUpload = async (name: string) => {
        setLoading(true);
        try {
            const token = await ensureAccessToken();

            const payload = {
                recordName: name,
                recordType: name.includes('Prescription') ? 'Prescription' : 'Report',
                fileUrl: 'https://example.com/mock-file.pdf',
                notes: 'Uploaded via SweetTrack'
            };

            const response = await fetch(RECORDS_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token || ''}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const json = await response.json();
            if (json.success) {
                setRecords(prev => [json.record, ...prev]);
                Alert.alert(t.profile.editScreen.profileSaved, t.profile.healthRecords.successUpload);
            }
        } catch (e) {
            Alert.alert(t.profile.editScreen.errorTitle, t.profile.healthRecords.errorUpload);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const themed = useMemo(() => ({
        container: { backgroundColor: colors.backgroundSecondary },
        header: { backgroundColor: colors.background, borderBottomColor: colors.border },
        headerTitle: { color: colors.text, fontSize: scale(18) },
        card: { backgroundColor: colors.card, shadowColor: colors.cardShadow },
        text: { color: colors.text },
        textSecondary: { color: colors.textSecondary },
        emptyTitle: { color: colors.text, fontSize: scale(20) },
        emptySubtitle: { color: colors.textSecondary, fontSize: scale(14) },
    }), [colors, scale]);

    const renderItem = ({ item }: { item: HealthRecord }) => {
        const translatedType = item.recordType === 'Prescription'
            ? t.profile.healthRecords.recordTypePrescription
            : t.profile.healthRecords.recordTypeReport;

        return (
            <View style={[styles.recordCard, themed.card]}>
                <View style={[styles.recordIcon, { backgroundColor: colors.primary + '15' }]}>
                    <FileText size={24} color={colors.primary} />
                </View>
                <View style={styles.recordInfo}>
                    <Text style={[styles.recordName, themed.text]}>{item.recordName}</Text>
                    <View style={styles.recordMeta}>
                        <Calendar size={14} color={colors.textSecondary} />
                        <Text style={[styles.recordDate, themed.textSecondary]}>
                            {new Date(item.date).toLocaleDateString()}
                        </Text>
                        <LinkIcon size={14} color={colors.primary} style={{ marginLeft: 8 }} />
                        <Text style={[styles.recordDate, { color: colors.primary }]}>{translatedType}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.deleteButton}>
                    <Trash2 size={20} color={colors.error} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, themed.container, { paddingTop: insets.top }]}>
            <View style={[styles.header, themed.header]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, themed.headerTitle]}>{t.profile.healthRecords.header}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading && records.length === 0 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={records}
                    renderItem={renderItem}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <FileText size={64} color={colors.border} strokeWidth={1} />
                            <Text style={[styles.emptyTitle, themed.emptyTitle]}>{t.profile.healthRecords.noRecords}</Text>
                            <Text style={[styles.emptySubtitle, themed.emptySubtitle]}>
                                {t.profile.healthRecords.noRecordsDesc}
                            </Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20, backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={handleUploadSimulated}>
                <Plus size={30} color="#FFF" />
            </TouchableOpacity>
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
    headerTitle: {
        fontWeight: '700',
    },
    backButton: {
        padding: 8,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    recordCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    recordIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordInfo: {
        flex: 1,
        marginLeft: 16,
    },
    recordName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    recordMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recordDate: {
        fontSize: 12,
        marginLeft: 4,
    },
    deleteButton: {
        padding: 8,
    },
    fab: {
        position: 'absolute',
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontWeight: '700',
        marginTop: 16,
    },
    emptySubtitle: {
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    }
});
