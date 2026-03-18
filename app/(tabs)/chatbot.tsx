import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Bot, User as UserIcon } from 'lucide-react-native';
import Constants from 'expo-constants';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/SettingsContext';
import { useTranslation } from '@/hooks/use-translation';

// Get API base URL for dynamic platform detection
const getApiBaseUrl = () => {
  // Highest priority: explicit env override
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, '').replace(/\/api$/, '') + '/api';

  // Web: use localhost
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }

  // ✅ ANDROID EMULATOR: Must use 10.0.2.2
  if (Platform.OS === 'android') {
    // Check if running on emulator vs physical device
    const isEmulator = Constants.deviceName?.includes('sdk') ||
      Constants.deviceName?.includes('emulator') ||
      !Constants.deviceName; // null deviceName often means emulator

    if (isEmulator) {
      console.log('🤖 Android Emulator detected - Using 10.0.2.2');
      return 'http://10.0.2.2:5000/api';
    }

    // Physical Android device - use network IP from app.json
    const appJsonIP = Constants.expoConfig?.extra?.apiHost;
    if (appJsonIP && appJsonIP !== 'auto-detect') {
      console.log('📱 Android Physical Device - Using:', appJsonIP);
      return `http://${appJsonIP}:5000/api`;
    }
  }

  // iOS Simulator: use localhost
  if (Platform.OS === 'ios') {
    console.log('🍎 iOS Simulator - Using localhost');
    return 'http://localhost:5000/api';
  }

  // Fallback for physical devices
  const appJsonIP = Constants.expoConfig?.extra?.apiHost || '192.168.1.76';
  console.log('📱 Physical Device Fallback - Using:', appJsonIP);
  return `http://${appJsonIP}:5000/api`;
};

const API_BASE_URL = getApiBaseUrl();

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
};

const getQuickReplies = (t: any) => [
  t.chatbot.dietTips,
  t.chatbot.sleepAdvice,
  t.chatbot.exercisePlans,
  t.chatbot.stressManagement,
  t.chatbot.whatToEat,
];

export default function ChatbotScreen() {
  const insets = useSafeAreaInsets();
  const { t, language } = useTranslation();
  const { user, ensureAccessToken } = useUser();
  const { colors, scale } = useTheme();

  const QUICK_REPLIES = useMemo(() => getQuickReplies(t), [t]);

  const BOT_RESPONSES: Record<string, string> = useMemo(() => ({
    [t.chatbot.dietTips]: t.chatbot.responses.dietTips,
    [t.chatbot.sleepAdvice]: t.chatbot.responses.sleepAdvice,
    [t.chatbot.exercisePlans]: t.chatbot.responses.exercisePlans,
    [t.chatbot.stressManagement]: t.chatbot.responses.stressManagement,
  }), [t]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: t.chatbot.initialMessage.replace('{name}', user?.name || (language === 'en' ? 'there' : language === 'ja' ? 'さん' : 'मित्र')),
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  // Dynamic Styles
  const themed = useMemo(() => ({
    container: { backgroundColor: colors.backgroundSecondary },
    header: { backgroundColor: colors.background, borderBottomColor: colors.border },
    headerTitle: { color: colors.text, fontSize: scale(20) },
    headerSubtitle: { color: colors.textSecondary, fontSize: scale(14) },
    inputContainer: { backgroundColor: colors.background, borderTopColor: colors.border },
    input: { backgroundColor: colors.backgroundSecondary, color: colors.text, fontSize: scale(15) },
    botBubble: { backgroundColor: colors.card, borderColor: colors.border },
    userBubble: { backgroundColor: colors.primary },
    messageText: { color: colors.text, fontSize: scale(15) },
    userMessageText: { color: colors.textWhite, fontSize: scale(15) },
    quickRepliesContainer: { backgroundColor: colors.background, borderTopColor: colors.border },
    quickReplyButton: { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary },
    quickReplyText: { color: colors.primary, fontSize: scale(14) },
  }), [colors, scale]);

  const handleSend = (text?: string) => {
    const messageText =
      typeof text === 'string' && text.trim().length > 0
        ? text.trim()
        : inputText.trim();

    if (!messageText) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    (async () => {
      try {
        // Prepare history (last 10 messages)
        const history = messages.slice(-10).map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));

        const token = await ensureAccessToken();
        
        const res = await fetch(`${API_BASE_URL}/chatbot`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            message: messageText,
            riskLevel: user?.medicalHistory?.length ? 'Higher Risk' : 'General',
            history: history,
            userName: user?.name || 'User',
            language: language
          }),
        });

        const data = await res.json();

        const reply =
          data?.success && data?.reply
            ? data.reply
            : BOT_RESPONSES[messageText] ||
            t.chatbot.fallbackReply;

        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: reply,
          sender: 'bot',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, botMessage]);
      } catch (error) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text:
              BOT_RESPONSES[messageText] ||
              t.chatbot.errorReply,
            sender: 'bot',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    })();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, themed.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={[styles.header, themed.header]}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primary + '20' }]}>
          <Bot size={28} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, themed.headerTitle]}>{t.chatbot.header}</Text>
          <Text style={[styles.headerSubtitle, themed.headerSubtitle]}>{t.chatbot.subtitle}</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(message => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.sender === 'user'
                ? themed.userBubble
                : themed.botBubble,
            ]}
          >
            <View style={styles.messageHeader}>
              {message.sender === 'bot' ? (
                <Bot size={20} color={colors.primary} strokeWidth={2} />
              ) : (
                <UserIcon size={20} color={colors.textWhite} strokeWidth={2} />
              )}
              <Text
                style={[
                  styles.messageSender,
                  { color: message.sender === 'user' ? colors.textWhite : colors.primary }
                ]}
              >
                {message.sender === 'bot' ? t.chatbot.aiName : t.chatbot.you}
              </Text>
            </View>
            <View style={styles.messageContent}>
              <Text
                style={[
                  styles.messageText,
                  message.sender === 'user' ? themed.userMessageText : themed.messageText,
                ]}
              >
                {(() => {
                  if (message.sender === 'user') return message.text;
                  
                  // Clean up list markers (convert * to •)
                  const cleanedText = message.text.replace(/^\s*\*\s/gm, '• ');
                  
                  // Simple markdown bold parser for **text**
                  const parts = cleanedText.split(/(\*\*.*?\*\*)/g);
                  return parts.map((part, index) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return (
                        <Text 
                          key={index} 
                          style={{ fontWeight: 'bold' }}
                        >
                          {part.slice(2, -2)}
                        </Text>
                      );
                    }
                    return part;
                  });
                })()}
              </Text>
            </View>
            <Text
              style={[
                styles.messageTime,
                { color: message.sender === 'user' ? 'rgba(255,255,255,0.7)' : colors.textLight }
              ]}
            >
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        ))}

        {isTyping && (
          <Text style={{ marginLeft: 20, color: colors.textLight }}>
            {t.chatbot.typing}
          </Text>
        )}
      </ScrollView>

      <View style={[styles.quickRepliesContainer, themed.quickRepliesContainer]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {QUICK_REPLIES.map((reply, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickReplyButton, themed.quickReplyButton]}
              onPress={() => handleSend(reply)}
            >
              <Text style={[styles.quickReplyText, themed.quickReplyText]}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.inputContainer, themed.inputContainer, { paddingBottom: insets.bottom || 10 }]}>
        <TextInput
          style={[styles.input, themed.input]}
          value={inputText}
          onChangeText={setInputText}
          placeholder={t.chatbot.placeholder}
          placeholderTextColor={colors.textLight}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary },
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={() => handleSend()}
          disabled={!inputText.trim()}
        >
          <Send size={20} color={colors.textWhite} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '700',
  },
  headerSubtitle: {
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  messageContent: {
    marginTop: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 6,
  },
  quickRepliesContainer: {
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  quickReplyButton: {
    marginHorizontal: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickReplyText: {
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
