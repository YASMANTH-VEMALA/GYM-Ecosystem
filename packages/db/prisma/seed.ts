import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed exercises (common gym exercises)
  const exercises = [
    // Chest
    { name: 'Flat Barbell Bench Press', nameHi: 'फ्लैट बारबेल बेंच प्रेस', muscleGroup: 'chest', equipment: 'barbell' },
    { name: 'Incline Dumbbell Press', nameHi: 'इंक्लाइन डम्बल प्रेस', muscleGroup: 'chest', equipment: 'dumbbell' },
    { name: 'Decline Bench Press', nameHi: 'डिक्लाइन बेंच प्रेस', muscleGroup: 'chest', equipment: 'barbell' },
    { name: 'Dumbbell Flyes', nameHi: 'डम्बल फ्लाय', muscleGroup: 'chest', equipment: 'dumbbell' },
    { name: 'Cable Crossover', nameHi: 'केबल क्रॉसओवर', muscleGroup: 'chest', equipment: 'cable' },
    { name: 'Push-ups', nameHi: 'पुश-अप्स', muscleGroup: 'chest', equipment: 'bodyweight' },
    { name: 'Chest Dips', nameHi: 'चेस्ट डिप्स', muscleGroup: 'chest', equipment: 'bodyweight' },
    { name: 'Pec Deck Machine', nameHi: 'पेक डेक मशीन', muscleGroup: 'chest', equipment: 'machine' },

    // Back
    { name: 'Deadlift', nameHi: 'डेडलिफ्ट', muscleGroup: 'back', equipment: 'barbell' },
    { name: 'Barbell Row', nameHi: 'बारबेल रो', muscleGroup: 'back', equipment: 'barbell' },
    { name: 'Pull-ups', nameHi: 'पुल-अप्स', muscleGroup: 'back', equipment: 'bodyweight' },
    { name: 'Lat Pulldown', nameHi: 'लैट पुलडाउन', muscleGroup: 'back', equipment: 'machine' },
    { name: 'Seated Cable Row', nameHi: 'सीटेड केबल रो', muscleGroup: 'back', equipment: 'cable' },
    { name: 'Dumbbell Row', nameHi: 'डम्बल रो', muscleGroup: 'back', equipment: 'dumbbell' },
    { name: 'T-Bar Row', nameHi: 'टी-बार रो', muscleGroup: 'back', equipment: 'barbell' },
    { name: 'Face Pulls', nameHi: 'फेस पुल्स', muscleGroup: 'back', equipment: 'cable' },

    // Legs
    { name: 'Barbell Squat', nameHi: 'बारबेल स्क्वैट', muscleGroup: 'legs', equipment: 'barbell' },
    { name: 'Leg Press', nameHi: 'लेग प्रेस', muscleGroup: 'legs', equipment: 'machine' },
    { name: 'Romanian Deadlift', nameHi: 'रोमानियन डेडलिफ्ट', muscleGroup: 'legs', equipment: 'barbell' },
    { name: 'Leg Extension', nameHi: 'लेग एक्सटेंशन', muscleGroup: 'legs', equipment: 'machine' },
    { name: 'Leg Curl', nameHi: 'लेग कर्ल', muscleGroup: 'legs', equipment: 'machine' },
    { name: 'Walking Lunges', nameHi: 'वॉकिंग लंजेस', muscleGroup: 'legs', equipment: 'dumbbell' },
    { name: 'Calf Raises', nameHi: 'काफ रेज़', muscleGroup: 'legs', equipment: 'machine' },
    { name: 'Bulgarian Split Squat', nameHi: 'बल्गेरियन स्प्लिट स्क्वैट', muscleGroup: 'legs', equipment: 'dumbbell' },

    // Shoulders
    { name: 'Overhead Press', nameHi: 'ओवरहेड प्रेस', muscleGroup: 'shoulders', equipment: 'barbell' },
    { name: 'Dumbbell Shoulder Press', nameHi: 'डम्बल शोल्डर प्रेस', muscleGroup: 'shoulders', equipment: 'dumbbell' },
    { name: 'Lateral Raises', nameHi: 'लेटरल रेज़', muscleGroup: 'shoulders', equipment: 'dumbbell' },
    { name: 'Front Raises', nameHi: 'फ्रंट रेज़', muscleGroup: 'shoulders', equipment: 'dumbbell' },
    { name: 'Rear Delt Flyes', nameHi: 'रियर डेल्ट फ्लाय', muscleGroup: 'shoulders', equipment: 'dumbbell' },
    { name: 'Arnold Press', nameHi: 'अर्नाल्ड प्रेस', muscleGroup: 'shoulders', equipment: 'dumbbell' },
    { name: 'Upright Row', nameHi: 'अपराइट रो', muscleGroup: 'shoulders', equipment: 'barbell' },
    { name: 'Shrugs', nameHi: 'श्रग्स', muscleGroup: 'shoulders', equipment: 'dumbbell' },

    // Arms
    { name: 'Barbell Bicep Curl', nameHi: 'बारबेल बाइसेप कर्ल', muscleGroup: 'arms', equipment: 'barbell' },
    { name: 'Dumbbell Bicep Curl', nameHi: 'डम्बल बाइसेप कर्ल', muscleGroup: 'arms', equipment: 'dumbbell' },
    { name: 'Hammer Curl', nameHi: 'हैमर कर्ल', muscleGroup: 'arms', equipment: 'dumbbell' },
    { name: 'Preacher Curl', nameHi: 'प्रीचर कर्ल', muscleGroup: 'arms', equipment: 'barbell' },
    { name: 'Tricep Pushdown', nameHi: 'ट्राइसेप पुशडाउन', muscleGroup: 'arms', equipment: 'cable' },
    { name: 'Skull Crushers', nameHi: 'स्कल क्रशर्स', muscleGroup: 'arms', equipment: 'barbell' },
    { name: 'Overhead Tricep Extension', nameHi: 'ओवरहेड ट्राइसेप एक्सटेंशन', muscleGroup: 'arms', equipment: 'dumbbell' },
    { name: 'Close-grip Bench Press', nameHi: 'क्लोज़-ग्रिप बेंच प्रेस', muscleGroup: 'arms', equipment: 'barbell' },

    // Core
    { name: 'Plank', nameHi: 'प्लैंक', muscleGroup: 'core', equipment: 'bodyweight' },
    { name: 'Crunches', nameHi: 'क्रंचेज़', muscleGroup: 'core', equipment: 'bodyweight' },
    { name: 'Hanging Leg Raise', nameHi: 'हैंगिंग लेग रेज़', muscleGroup: 'core', equipment: 'bodyweight' },
    { name: 'Cable Woodchop', nameHi: 'केबल वुडचॉप', muscleGroup: 'core', equipment: 'cable' },
    { name: 'Russian Twist', nameHi: 'रशियन ट्विस्ट', muscleGroup: 'core', equipment: 'bodyweight' },
    { name: 'Ab Wheel Rollout', nameHi: 'एब व्हील रोलआउट', muscleGroup: 'core', equipment: 'bodyweight' },

    // Cardio
    { name: 'Treadmill Running', nameHi: 'ट्रेडमिल रनिंग', muscleGroup: 'cardio', equipment: 'machine' },
    { name: 'Cycling (Stationary)', nameHi: 'साइक्लिंग (स्टेशनरी)', muscleGroup: 'cardio', equipment: 'machine' },
    { name: 'Elliptical', nameHi: 'एलिप्टिकल', muscleGroup: 'cardio', equipment: 'machine' },
    { name: 'Rowing Machine', nameHi: 'रोइंग मशीन', muscleGroup: 'cardio', equipment: 'machine' },
    { name: 'Jump Rope', nameHi: 'रस्सी कूद', muscleGroup: 'cardio', equipment: 'bodyweight' },
    { name: 'Battle Ropes', nameHi: 'बैटल रोप्स', muscleGroup: 'cardio', equipment: 'bodyweight' },
  ];

  for (const ex of exercises) {
    await prisma.exercise.upsert({
      where: { name_muscleGroup: { name: ex.name, muscleGroup: ex.muscleGroup } },
      update: { nameHi: ex.nameHi, equipment: ex.equipment },
      create: {
        name: ex.name,
        nameHi: ex.nameHi,
        muscleGroup: ex.muscleGroup,
        equipment: ex.equipment,
      },
    });
  }

  console.log(`Seeded ${exercises.length} exercises`);

  // Seed SaaS plans
  const saasPlans = [
    { name: 'Starter', priceMonthly: 799, maxMembers: 100, maxStaff: 3, features: { kiosk: true, whatsapp: false, memberApp: false, analytics: 'basic' } },
    { name: 'Pro', priceMonthly: 1499, maxMembers: 500, maxStaff: 10, features: { kiosk: true, whatsapp: true, memberApp: true, analytics: 'full' } },
    { name: 'Enterprise', priceMonthly: 2499, maxMembers: null, maxStaff: null, features: { kiosk: true, whatsapp: true, memberApp: true, analytics: 'full', api: true, multiBranch: true } },
  ];

  for (const plan of saasPlans) {
    await prisma.saasPlan.upsert({
      where: { name: plan.name },
      update: {
        priceMonthly: plan.priceMonthly,
        maxMembers: plan.maxMembers,
        maxStaff: plan.maxStaff,
        features: plan.features,
      },
      create: {
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        maxMembers: plan.maxMembers,
        maxStaff: plan.maxStaff,
        features: plan.features,
      },
    });
  }

  console.log(`Seeded ${saasPlans.length} SaaS plans`);
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
