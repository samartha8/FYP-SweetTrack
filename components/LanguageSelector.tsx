import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { Globe, Check, ChevronRight } from 'lucide-react-native';
import { useSettings, Language } from '@/contexts/SettingsContext';
import { useTranslation } from '@/hooks/use-translation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LanguageSelector() {
    const insets = useSafeAreaInsets();
    const { settings, setLanguage, colors, scale } = useSettings();
    const [modalVisible, setModalVisible] = useState(false);
    const { t } = useTranslation();

    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const languages: { code: Language; name: string; native: string; flag: string }[] = [
        { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
        { code: 'ne', name: 'Nepali', native: 'नेपाली', flag: '🇳🇵' },
        { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
    ];

    const currentLanguage = languages.find(l => l.code === settings.language) || languages[0];

    useEffect(() => {
        if (modalVisible) {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: SCREEN_HEIGHT,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [modalVisible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => setModalVisible(false));
    };

    const themed = {
        button: { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' },
        buttonText: { color: colors.text, fontSize: scale(14) },
        drawer: { backgroundColor: colors.card },
        drawerTitle: { color: colors.text, fontSize: scale(20) },
        drawerSubtitle: { color: colors.textSecondary, fontSize: scale(14) },
        option: { backgroundColor: colors.backgroundSecondary },
        optionText: { color: colors.text, fontSize: scale(16) },
        nativeText: { color: colors.textSecondary, fontSize: scale(13) },
        activeOption: { borderColor: colors.primary, backgroundColor: colors.primary + '08' },
        activeOptionText: { color: colors.primary, fontWeight: '700' as const },
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setModalVisible(true)}
            >
                <View style={[styles.glassButton, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)' }]}>
                    <Globe size={18} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                        {currentLanguage.code.toUpperCase()}
                    </Text>
                </View>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="none"
                onRequestClose={handleClose}
            >
                {modalVisible && (
                    <View style={styles.modalFull}>
                        <TouchableWithoutFeedback onPress={handleClose}>
                            <Animated.View style={[styles.backdrop, { opacity: fadeAnim, backgroundColor: 'rgba(0,0,0,0.6)' }]} />
                        </TouchableWithoutFeedback>

                        <Animated.View
                            style={[
                                styles.drawer,
                                themed.drawer,
                                { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 20 }
                            ]}
                        >
                            <View style={[styles.drawerHandle, { backgroundColor: colors.border }]} />

                            <View style={styles.drawerHeader}>
                                <Text style={[styles.drawerTitle, themed.drawerTitle]}>
                                    {t.settings.language}
                                </Text>
                                <Text style={[styles.drawerSubtitle, themed.drawerSubtitle]}>
                                    Choose your preferred language
                                </Text>
                            </View>

                            <View style={styles.optionsList}>
                                {languages.map((lang) => (
                                    <TouchableOpacity
                                        key={lang.code}
                                        activeOpacity={0.7}
                                        style={[
                                            styles.optionItem,
                                            themed.option,
                                            settings.language === lang.code && themed.activeOption,
                                            { borderColor: settings.language === lang.code ? colors.primary : colors.border + '40' }
                                        ]}
                                        onPress={() => {
                                            setLanguage(lang.code);
                                            handleClose();
                                        }}
                                    >
                                        <View style={styles.optionLeft}>
                                            <View style={styles.flagContainer}>
                                                <Text style={styles.flagText}>{lang.flag}</Text>
                                            </View>
                                            <View>
                                                <Text style={[
                                                    styles.optionText,
                                                    themed.optionText,
                                                    settings.language === lang.code && themed.activeOptionText
                                                ]}>
                                                    {lang.name}
                                                </Text>
                                                <Text style={[styles.nativeText, themed.nativeText]}>
                                                    {lang.native}
                                                </Text>
                                            </View>
                                        </View>

                                        {settings.language === lang.code ? (
                                            <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                                                <Check size={14} color="#FFF" strokeWidth={3} />
                                            </View>
                                        ) : (
                                            <ChevronRight size={18} color={colors.textLight} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Animated.View>
                    </View>
                )}
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignSelf: 'flex-end',
        zIndex: 10,
    },
    glassButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
        backdropFilter: 'blur(10px)', // For web support if enabled in config
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    modalFull: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    drawer: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 24,
        paddingTop: 12,
    },
    drawerHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 24,
    },
    drawerHeader: {
        marginBottom: 24,
    },
    drawerTitle: {
        fontWeight: '800',
        marginBottom: 4,
    },
    drawerSubtitle: {
        fontWeight: '500',
    },
    optionsList: {
        gap: 12,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1.5,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    flagContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    flagText: {
        fontSize: 24,
    },
    optionText: {
        fontWeight: '600',
        marginBottom: 2,
    },
    nativeText: {
        fontWeight: '400',
        opacity: 0.8,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
