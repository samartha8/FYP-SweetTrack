import { secureFetch as fetch } from '@/lib/apiClient';
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
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Bot, User as UserIcon, Camera, Image as ImageIcon, X, Sparkles } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import Animated, { FadeInDown, FadeIn, Layout, ZoomIn } from 'react-native-reanimated';
import { useAuth } from '@/contexts/AuthContext';;
import { useTheme } from '@/contexts/SettingsContext';
import { useTranslation } from '@/hooks/use-translation';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

import { API_BASE_URL } from '@/constants/Api';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  imageUri?: string;
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
  const { user, ensureAccessToken } = useAuth();
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
      text: t.chatbot.initialMessage.replace('{name}', user?.name || (language === 'en' ? 'there' : 'user')),
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping, selectedImage]);

  const handleSend = (text?: string) => {
    const messageText = typeof text === 'string' && text.trim().length > 0 ? text.trim() : inputText.trim();
    if (!messageText && !selectedImage) return;

    const currentImage = selectedImage;
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date(),
      imageUri: currentImage || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setSelectedImage(null);
    setIsTyping(true);

    (async () => {
      try {
        const formData = new FormData();
        formData.append('message', messageText);
        formData.append('userName', user?.name || 'User');
        formData.append('language', language);
        const history = messages.slice(-5).map(msg => ({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text }));
        formData.append('history', JSON.stringify(history));

        if (currentImage) {
          const filename = currentImage.split('/').pop() || 'chat_image.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          if (Platform.OS === 'web') {
            const response = await fetch(currentImage);
            const blob = await response.blob();
            formData.append('image', blob, filename);
          } else {
            // @ts-ignore
            formData.append('image', { uri: currentImage, name: filename, type });
          }
        }

        const token = await ensureAccessToken();
        const res = await fetch(`${API_BASE_URL}/chatbot`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: formData,
        });
        const data = await res.json();
        const reply = data?.success && data?.reply ? data.reply : BOT_RESPONSES[messageText] || t.chatbot.fallbackReply;
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: reply, sender: 'bot', timestamp: new Date() }]);
      } catch (error) {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: t.chatbot.errorReply, sender: 'bot', timestamp: new Date() }]);
      } finally {
        setIsTyping(false);
      }
    })();
  };

  const themed = useMemo(() => ({
    headerTitle: { color: colors.text, fontSize: scale(24), fontWeight: '900' as const, letterSpacing: -1 },
    botBubble: { backgroundColor: '#FFFFFF', borderColor: 'rgba(0,0,0,0.03)', borderWidth: 1 },
    messageText: { color: colors.text, fontSize: scale(15), lineHeight: 22, fontWeight: '500' as const },
    userMessageText: { color: '#FFF', fontSize: scale(15), lineHeight: 22, fontWeight: '600' as const },
    quickReplyText: { color: colors.primary, fontSize: scale(14), fontWeight: '800' as const },
  }), [colors, scale]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F0FDF4', '#F0F9FF']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Sparkles size={scale(28)} color={colors.primary} strokeWidth={2.5} />
            </View>
            <View style={styles.headerText}>
              <Text style={themed.headerTitle}>{t.chatbot.header}</Text>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: '#34C759' }]} />
                <Text style={styles.statusText}>{t.chatbot.subtitle}</Text>
              </View>
            </View>
          </View>
        </View>

        <ScrollView ref={scrollViewRef} style={styles.messagesContainer} contentContainerStyle={styles.messagesContent} showsVerticalScrollIndicator={false}>
          {messages.map((message, index) => (
            <Animated.View key={message.id} entering={FadeInDown.delay(index * 50)} style={[styles.messageBubble, message.sender === 'user' ? styles.userBubble : styles.botBubble, message.sender === 'bot' ? themed.botBubble : null]}>
              {message.sender === 'user' && <LinearGradient colors={['#00B4D8', '#0077B6']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />}
              {message.imageUri && <Image source={{ uri: message.imageUri }} style={styles.messageImage} resizeMode="cover" />}
              <Text style={message.sender === 'user' ? themed.userMessageText : themed.messageText}>{message.text}</Text>
              <Text style={[styles.messageTime, { color: message.sender === 'user' ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </Animated.View>
          ))}
          {isTyping && <View style={styles.typingIndicator}><Text style={{ color: colors.textSecondary }}>AI is thinking...</Text></View>}
        </ScrollView>

        <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickReplies} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {QUICK_REPLIES.map((reply, i) => (
              <TouchableOpacity key={i} style={styles.quickReply} onPress={() => handleSend(reply)}>
                <Text style={themed.quickReplyText}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.inputArea}>
            <View style={styles.inputWrapper}>
              <TextInput style={styles.input} value={inputText} onChangeText={setInputText} placeholder={t.chatbot.placeholder} placeholderTextColor={colors.textSecondary} multiline />
              <TouchableOpacity style={[styles.sendButton, !inputText.trim() && !selectedImage && { opacity: 0.5 }]} onPress={() => handleSend()} disabled={!inputText.trim() && !selectedImage}>
                <LinearGradient colors={['#00B4D8', '#0077B6']} style={StyleSheet.absoluteFill} />
                <View style={{ zIndex: 1 }}>
                  <Send size={20} color="#FFF" strokeWidth={2.5} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16 },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginTop: 10 },
  headerIcon: {
    width: 60, height: 60, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    elevation: 4,
    ...Platform.select({
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' } as any,
      default: { shadowOpacity: 0.1, shadowRadius: 10, shadowColor: '#000' }
    })
  },
  headerText: { marginLeft: 16 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 24, paddingBottom: 200 },
  messageBubble: {
    maxWidth: '85%', padding: 16, borderRadius: 24, marginBottom: 16, overflow: 'hidden', elevation: 2,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } as any,
      default: { shadowOpacity: 0.05, shadowRadius: 10, shadowColor: '#000' }
    })
  },
  botBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  messageImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 8 },
  messageTime: { fontSize: 10, marginTop: 6, fontWeight: '600' },
  typingIndicator: { marginLeft: 24, marginBottom: 20 },
  bottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'transparent' },
  quickReplies: { paddingVertical: 12 },
  quickReply: { marginRight: 10, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  inputArea: { paddingHorizontal: 16, paddingBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 32, padding: 8, elevation: 10,
    ...Platform.select({
      web: { boxShadow: '0 10px 20px rgba(0,0,0,0.1)' } as any,
      default: { shadowOpacity: 0.1, shadowRadius: 20, shadowColor: '#000' }
    })
  },
  input: { flex: 1, paddingHorizontal: 16, fontSize: 16, maxHeight: 100, color: '#1E293B' },
  sendButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 8, overflow: 'hidden' },
});
