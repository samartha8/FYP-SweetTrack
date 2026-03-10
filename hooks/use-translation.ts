import { useMemo } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { translations, Language } from '@/constants/Translations';

export function useTranslation() {
    const { settings } = useSettings();
    const language = (settings.language as Language) || 'en';

    const t = useMemo(() => {
        return translations[language] || translations.en;
    }, [language]);

    return { t, language };
}
