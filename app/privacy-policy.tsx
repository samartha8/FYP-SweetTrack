import Colors from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, FileText, Heart, Lock, Shield } from 'lucide-react-native';
import { ColorValue, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <LinearGradient
            colors={Colors.gradient.primary as any}
            style={styles.logoContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Shield size={40} color={Colors.textWhite} strokeWidth={2} />
          </LinearGradient>
          <Text style={styles.appName}>SweetTrack</Text>
          <Text style={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString()}</Text>
        </View>

        <View style={styles.content}>
          <Section
            icon={<FileText size={24} color={Colors.primary} />}
            title="Introduction"
            content="Welcome to SweetTrack. We are committed to protecting your privacy and ensuring the security of your personal health information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application."
          />

          <Section
            icon={<Eye size={24} color={Colors.primary} />}
            title="Information We Collect"
            content="We collect information that you provide directly to us and information collected through your use of our services:"
            items={[
              "Personal Information: Name, email address, age, gender, and other profile information you provide during registration",
              "Health Data: Health metrics including steps, calories, sleep, heart rate, blood glucose, blood pressure, and other health indicators",
              "Google Fit Data: When you connect Google Fit, we access your fitness data including steps, calories burned, sleep duration, and heart rate",
              "Usage Data: Information about how you use the app, including features accessed and interactions with the app"
            ]}
          />

          <Section
            icon={<Lock size={24} color={Colors.primary} />}
            title="How We Use Your Information"
            content="We use the information we collect to:"
            items={[
              "Provide and maintain our health tracking services",
              "Calculate and display your health risk scores and metrics",
              "Sync health data from Google Fit and other connected services",
              "Send you notifications about your health goals and achievements",
              "Improve our services and develop new features",
              "Respond to your inquiries and provide customer support"
            ]}
          />

          <Section
            icon={<Shield size={24} color={Colors.primary} />}
            title="Data Security"
            content="We implement appropriate technical and organizational security measures to protect your personal information:"
            items={[
              "All data is encrypted in transit using secure protocols",
              "Access to your data is restricted to authorized personnel only",
              "We use secure authentication methods to protect your account",
              "Regular security audits and updates to maintain data protection"
            ]}
          />

          <Section
            icon={<Heart size={24} color={Colors.primary} />}
            title="Google Fit Integration"
            content="When you connect Google Fit to SweetTrack:"
            items={[
              "We request access to your fitness data (steps, calories, sleep, heart rate) with your explicit consent",
              "Data is synced securely and stored on our servers",
              "You can disconnect Google Fit at any time through the app settings",
              "Disconnecting will stop data synchronization but previously synced data may remain in our system"
            ]}
          />

          <Section
            title="Data Sharing"
            content="We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:"
            items={[
              "With your explicit consent",
              "To comply with legal obligations or respond to lawful requests",
              "To protect our rights, privacy, safety, or property",
              "In connection with a business transfer or merger"
            ]}
          />

          <Section
            title="Your Rights"
            content="You have the right to:"
            items={[
              "Access your personal information stored in our system",
              "Correct inaccurate or incomplete information",
              "Request deletion of your personal information",
              "Disconnect third-party integrations (like Google Fit)",
              "Opt out of certain data collection practices",
              "Request a copy of your data"
            ]}
          />

          <Section
            title="Data Retention"
            content="We retain your personal information for as long as necessary to provide our services and comply with legal obligations. You can request deletion of your account and associated data at any time through the app settings."
          />

          <Section
            title="Children's Privacy"
            content="SweetTrack is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately."
          />

          <Section
            title="Changes to This Policy"
            content="We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the 'Last Updated' date. You are advised to review this Privacy Policy periodically for any changes."
          />

          <Section
            title="Contact Us"
            content="If you have any questions about this Privacy Policy or our data practices, please contact us at:"
            items={[
              "Email: support@sweettrack.app",
              "Or through the app's support section"
            ]}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ 
  icon, 
  title, 
  content, 
  items 
}: { 
  icon?: React.ReactNode; 
  title: string; 
  content: string; 
  items?: string[] 
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionContent}>{content}</Text>
      {items && items.length > 0 && (
        <View style={styles.itemsContainer}>
          {items.map((item, index) => (
            <View key={index} style={styles.item}>
              <View style={styles.bullet} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: Colors.backgroundSecondary,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  itemsContainer: {
    marginTop: 8,
  },
  item: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 8,
    marginRight: 12,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
});





