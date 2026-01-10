import { useState, useRef, useEffect } from 'react';
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
import Colors from '@/constants/colors';
import { useUser } from '@/contexts/UserContext';

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

const QUICK_REPLIES = [
  'Diet Tips',
  'Sleep Advice',
  'Exercise Plans',
  'Stress Management',
];

const BOT_RESPONSES: Record<string, string> = {
  'Diet Tips':
    'Here are some diet tips:\n\n• Eat plenty of fruits and vegetables\n• Stay hydrated with 8 glasses of water daily\n• Include lean proteins in your meals\n• Limit processed foods and sugar\n• Practice portion control',
  'Sleep Advice':
    'For better sleep:\n\n• Maintain a consistent sleep schedule\n• Create a relaxing bedtime routine\n• Keep your bedroom cool and dark\n• Avoid screens 1 hour before bed\n• Limit caffeine after 2 PM',
  'Exercise Plans':
    'Recommended exercise routine:\n\n• 30 minutes of cardio 5 days a week\n• Strength training 2-3 times per week\n• Yoga or stretching daily\n• Take 10,000 steps daily\n• Stay active throughout the day',
  'Stress Management':
    'Manage stress effectively:\n\n• Practice deep breathing exercises\n• Try meditation for 10 minutes daily\n• Stay connected with loved ones\n• Engage in hobbies you enjoy\n• Get regular physical activity',
};

export default function ChatbotScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hello ${user?.name || 'there'}! I'm SweetTrack AI, your health assistant. How can I help you today?`,
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

  // ✅ FIXED handleSend (NO undefined message now)
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
        const res = await fetch('http://localhost:5000/api/chatbot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageText,
            riskLevel: user?.medicalHistory?.length ? 'Higher Risk' : 'General',
          }),
        });

        const data = await res.json();

        const reply =
          data?.success && data?.reply
            ? data.reply
            : BOT_RESPONSES[messageText] ||
              'I am here to support your general wellness.';

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
              'I am currently having trouble responding. Please try again later.',
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
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Bot size={28} color={Colors.primary} strokeWidth={2} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Ask SweetTrack AI</Text>
          <Text style={styles.headerSubtitle}>Your AI Health Assistant</Text>
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
                ? styles.userBubble
                : styles.botBubble,
            ]}
          >
            <View style={styles.messageHeader}>
              {message.sender === 'bot' ? (
                <Bot size={20} color={Colors.primary} strokeWidth={2} />
              ) : (
                <UserIcon size={20} color={Colors.textWhite} strokeWidth={2} />
              )}
              <Text
                style={[
                  styles.messageSender,
                  message.sender === 'user' && styles.userMessageSender,
                ]}
              >
                {message.sender === 'bot' ? 'SweetTrack' : 'You'}
              </Text>
            </View>
            <Text
              style={[
                styles.messageText,
                message.sender === 'user' && styles.userMessageText,
              ]}
            >
              {message.text}
            </Text>
            <Text
              style={[
                styles.messageTime,
                message.sender === 'user' && styles.userMessageTime,
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
          <Text style={{ marginLeft: 20, color: Colors.textLight }}>
            SweetTrack AI is typing...
          </Text>
        )}
      </ScrollView>

      <View style={styles.quickRepliesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {QUICK_REPLIES.map((reply, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickReplyButton}
              onPress={() => handleSend(reply)}
            >
              <Text style={styles.quickReplyText}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.inputContainer, { paddingBottom: insets.bottom || 10 }]}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          placeholderTextColor={Colors.textLight}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={() => handleSend()}
          disabled={!inputText.trim()}
        >
          <Send size={20} color={Colors.textWhite} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
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
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 6,
  },
  userMessageSender: {
    color: Colors.textWhite,
  },
  messageText: {
    fontSize: 15,
    color: Colors.text,
  },
  userMessageText: {
    color: Colors.textWhite,
  },
  messageTime: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 6,
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  quickRepliesContainer: {
    backgroundColor: Colors.background,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  quickReplyButton: {
    marginHorizontal: 8,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  quickReplyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
