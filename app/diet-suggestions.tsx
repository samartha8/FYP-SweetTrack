// import { useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,

//   Alert,
// } from 'react-native';
// import { Stack, useRouter } from 'expo-router';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import {
//   X,
//   Apple,
//   Heart,
//   Activity,
//   Target,
//   Leaf,
//   ChevronRight,
//   CheckCircle2,
//   Flame,
//   UtensilsCrossed,
// } from 'lucide-react-native';

// import Colors from '@/constants/colors';
// import { DIET_PLANS, DietPlan } from '@/constants/foodData';
// import { useMealTracking } from '@/contexts/MealTrackingContext';



// const dietIcons = {
//   apple: Apple,
//   target: Target,
//   heart: Heart,
//   activity: Activity,
//   dumbbell: Activity,
//   leaf: Leaf,
// };

// export default function DietSuggestionsScreen() {
//   const insets = useSafeAreaInsets();
//   const router = useRouter();
//   const { selectedDietPlan, setSelectedDietPlan } = useMealTracking();
//   const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

//   const handleSelectPlan = (planId: string) => {
//     setSelectedDietPlan(planId);
//     Alert.alert(
//       'Diet Plan Selected',
//       'Your diet plan has been updated. Meal recommendations will be based on this plan.',
//       [{ text: 'OK' }]
//     );
//   };

//   const toggleExpand = (planId: string) => {
//     setExpandedPlan(expandedPlan === planId ? null : planId);
//   };

//   const renderDietPlan = (plan: DietPlan) => {
//     const isSelected = selectedDietPlan === plan.id;
//     const isExpanded = expandedPlan === plan.id;
//     const IconComponent = dietIcons[plan.icon as keyof typeof dietIcons] || Activity;

//     return (
//       <View key={plan.id} style={styles.planCard}>
//         <TouchableOpacity
//           style={[styles.planHeader, isSelected && styles.planHeaderSelected]}
//           onPress={() => toggleExpand(plan.id)}
//           activeOpacity={0.8}
//         >
//           <View style={[styles.planIconContainer, { backgroundColor: plan.color + '20' }]}>
//             <IconComponent size={28} color={plan.color} strokeWidth={2} />
//           </View>

//           <View style={styles.planHeaderText}>
//             <View style={styles.planTitleRow}>
//               <Text style={styles.planName}>{plan.name}</Text>
//               {isSelected && (
//                 <View style={[styles.selectedBadge, { backgroundColor: plan.color }]}>
//                   <CheckCircle2 size={14} color={Colors.textWhite} strokeWidth={2.5} />
//                   <Text style={styles.selectedBadgeText}>Active</Text>
//                 </View>
//               )}
//             </View>
//             <Text style={styles.planDescription} numberOfLines={2}>
//               {plan.description}
//             </Text>
//           </View>

//           <ChevronRight
//             size={24}
//             color={Colors.textSecondary}
//             strokeWidth={2}
//             style={[
//               styles.expandIcon,
//               isExpanded && { transform: [{ rotate: '90deg' }] },
//             ]}
//           />
//         </TouchableOpacity>

//         {isExpanded && (
//           <View style={styles.planDetails}>
//             <View style={styles.detailSection}>
//               <Text style={styles.detailSectionTitle}>Target Conditions</Text>
//               <View style={styles.tagContainer}>
//                 {plan.targetCondition.map((condition, idx) => (
//                   <View key={idx} style={[styles.tag, { borderColor: plan.color }]}>
//                     <Text style={[styles.tagText, { color: plan.color }]}>{condition}</Text>
//                   </View>
//                 ))}
//               </View>
//             </View>

//             <View style={styles.detailSection}>
//               <Text style={styles.detailSectionTitle}>Daily Calorie Target</Text>
//               <View style={styles.calorieCard}>
//                 <Flame size={20} color={Colors.warning} strokeWidth={2} />
//                 <Text style={styles.calorieText}>{plan.dailyCalorieTarget} kcal/day</Text>
//               </View>
//             </View>

//             <View style={styles.detailSection}>
//               <Text style={styles.detailSectionTitle}>Macro Ratio</Text>
//               <View style={styles.macroGrid}>
//                 <View style={styles.macroItem}>
//                   <Text style={styles.macroValue}>{plan.macroRatio.protein}%</Text>
//                   <Text style={styles.macroLabel}>Protein</Text>
//                 </View>
//                 <View style={styles.macroItem}>
//                   <Text style={styles.macroValue}>{plan.macroRatio.carbs}%</Text>
//                   <Text style={styles.macroLabel}>Carbs</Text>
//                 </View>
//                 <View style={styles.macroItem}>
//                   <Text style={styles.macroValue}>{plan.macroRatio.fat}%</Text>
//                   <Text style={styles.macroLabel}>Fat</Text>
//                 </View>
//               </View>
//             </View>

//             <View style={styles.detailSection}>
//               <Text style={styles.detailSectionTitle}>Recommendations</Text>
//               {plan.recommendations.map((rec, idx) => (
//                 <View key={idx} style={styles.listItem}>
//                   <View style={[styles.listDot, { backgroundColor: plan.color }]} />
//                   <Text style={styles.listText}>{rec}</Text>
//                 </View>
//               ))}
//             </View>

//             <View style={styles.detailSection}>
//               <Text style={styles.detailSectionTitle}>Foods to Avoid</Text>
//               {plan.avoidFoods.map((food, idx) => (
//                 <View key={idx} style={styles.listItem}>
//                   <View style={[styles.listDot, { backgroundColor: Colors.error }]} />
//                   <Text style={styles.listText}>{food}</Text>
//                 </View>
//               ))}
//             </View>

//             {!isSelected && (
//               <TouchableOpacity
//                 style={[styles.selectButton, { backgroundColor: plan.color }]}
//                 onPress={() => handleSelectPlan(plan.id)}
//                 activeOpacity={0.8}
//               >
//                 <Text style={styles.selectButtonText}>Select This Plan</Text>
//               </TouchableOpacity>
//             )}
//           </View>
//         )}
//       </View>
//     );
//   };

//   return (
//     <View style={[styles.container, { paddingTop: insets.top }]}>
//       <Stack.Screen options={{ headerShown: false }} />

//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
//           <X size={24} color={Colors.text} strokeWidth={2} />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>Diet Suggestions</Text>
//         <View style={styles.headerButton} />
//       </View>

//       <ScrollView
//         style={styles.scrollView}
//         contentContainerStyle={styles.scrollContent}
//         showsVerticalScrollIndicator={false}
//       >
//         <View style={styles.introCard}>
//           <UtensilsCrossed size={32} color={Colors.primary} strokeWidth={2} />
//           <Text style={styles.introTitle}>AI-Powered Diet Plans</Text>
//           <Text style={styles.introText}>
//             Choose a personalized diet plan based on your health goals and conditions. 
//             All meal recommendations will be tailored to your selected plan.
//           </Text>
//         </View>

//         <View style={styles.section}>
//           <Text style={styles.sectionTitle}>Available Plans</Text>
//           <Text style={styles.sectionSubtitle}>
//             Select a plan that matches your wellness goals
//           </Text>
//         </View>

//         {DIET_PLANS.map(renderDietPlan)}

//         <View style={styles.noteCard}>
//           <Text style={styles.noteTitle}>Note</Text>
//           <Text style={styles.noteText}>
//             These diet plans are AI-generated suggestions based on general nutritional guidelines. 
//             Please consult with a healthcare professional before making significant dietary changes, 
//             especially if you have existing health conditions.
//           </Text>
//         </View>
//       </ScrollView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: Colors.backgroundSecondary,
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingHorizontal: 20,
//     paddingVertical: 16,
//     backgroundColor: Colors.background,
//     borderBottomWidth: 1,
//     borderBottomColor: Colors.border,
//   },
//   headerButton: {
//     width: 40,
//     height: 40,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: '700' as const,
//     color: Colors.text,
//   },
//   scrollView: {
//     flex: 1,
//   },
//   scrollContent: {
//     padding: 20,
//     paddingBottom: 40,
//   },
//   introCard: {
//     backgroundColor: Colors.primary + '10',
//     borderRadius: 16,
//     padding: 20,
//     alignItems: 'center',
//     marginBottom: 24,
//   },
//   introTitle: {
//     fontSize: 20,
//     fontWeight: '700' as const,
//     color: Colors.text,
//     marginTop: 12,
//     marginBottom: 8,
//   },
//   introText: {
//     fontSize: 14,
//     color: Colors.textSecondary,
//     textAlign: 'center',
//     lineHeight: 20,
//   },
//   section: {
//     marginBottom: 16,
//   },
//   sectionTitle: {
//     fontSize: 20,
//     fontWeight: '700' as const,
//     color: Colors.text,
//     marginBottom: 4,
//   },
//   sectionSubtitle: {
//     fontSize: 14,
//     color: Colors.textSecondary,
//   },
//   planCard: {
//     backgroundColor: Colors.card,
//     borderRadius: 16,
//     marginBottom: 16,
//     overflow: 'hidden',
//     shadowColor: Colors.cardShadow,
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 3,
//   },
//   planHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 16,
//   },
//   planHeaderSelected: {
//     backgroundColor: Colors.primary + '08',
//   },
//   planIconContainer: {
//     width: 56,
//     height: 56,
//     borderRadius: 28,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   planHeaderText: {
//     flex: 1,
//     marginLeft: 16,
//   },
//   planTitleRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 4,
//   },
//   planName: {
//     fontSize: 16,
//     fontWeight: '700' as const,
//     color: Colors.text,
//   },
//   selectedBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//     marginLeft: 8,
//     gap: 4,
//   },
//   selectedBadgeText: {
//     fontSize: 11,
//     fontWeight: '700' as const,
//     color: Colors.textWhite,
//   },
//   planDescription: {
//     fontSize: 13,
//     color: Colors.textSecondary,
//     lineHeight: 18,
//   },
//   expandIcon: {
//     marginLeft: 8,
//   },
//   planDetails: {
//     padding: 16,
//     paddingTop: 0,
//     borderTopWidth: 1,
//     borderTopColor: Colors.border,
//   },
//   detailSection: {
//     marginBottom: 20,
//   },
//   detailSectionTitle: {
//     fontSize: 15,
//     fontWeight: '700' as const,
//     color: Colors.text,
//     marginBottom: 12,
//   },
//   tagContainer: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//   },
//   tag: {
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 16,
//     borderWidth: 1.5,
//   },
//   tagText: {
//     fontSize: 12,
//     fontWeight: '600' as const,
//   },
//   calorieCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: Colors.warning + '10',
//     padding: 12,
//     borderRadius: 12,
//     gap: 8,
//   },
//   calorieText: {
//     fontSize: 15,
//     fontWeight: '600' as const,
//     color: Colors.text,
//   },
//   macroGrid: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     backgroundColor: Colors.backgroundSecondary,
//     padding: 16,
//     borderRadius: 12,
//   },
//   macroItem: {
//     alignItems: 'center',
//   },
//   macroValue: {
//     fontSize: 24,
//     fontWeight: '700' as const,
//     color: Colors.primary,
//     marginBottom: 4,
//   },
//   macroLabel: {
//     fontSize: 12,
//     color: Colors.textSecondary,
//   },
//   listItem: {
//     flexDirection: 'row',
//     alignItems: 'flex-start',
//     marginBottom: 10,
//   },
//   listDot: {
//     width: 6,
//     height: 6,
//     borderRadius: 3,
//     marginTop: 6,
//     marginRight: 10,
//   },
//   listText: {
//     flex: 1,
//     fontSize: 14,
//     color: Colors.text,
//     lineHeight: 20,
//   },
//   selectButton: {
//     paddingVertical: 14,
//     borderRadius: 12,
//     alignItems: 'center',
//     marginTop: 8,
//   },
//   selectButtonText: {
//     fontSize: 15,
//     fontWeight: '700' as const,
//     color: Colors.textWhite,
//   },
//   noteCard: {
//     backgroundColor: Colors.warning + '10',
//     borderRadius: 12,
//     padding: 16,
//     marginTop: 8,
//     borderLeftWidth: 4,
//     borderLeftColor: Colors.warning,
//   },
//   noteTitle: {
//     fontSize: 14,
//     fontWeight: '700' as const,
//     color: Colors.text,
//     marginBottom: 8,
//   },
//   noteText: {
//     fontSize: 13,
//     color: Colors.textSecondary,
//     lineHeight: 18,
//   },
// });
