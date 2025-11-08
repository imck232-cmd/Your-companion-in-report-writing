import { Criterion } from './types';

export const INITIAL_TEACHERS: string[] = [
  "وجدان العزي", "محمد الدريهم", "عبد الرؤوف الوصابي", "فهمي الجرافي", "آية فاتق",
  "عاصم المنعي", "عبد الرزاق صبيح", "جمال الرديني", "إيمان قطيش", "وفاء الصلوي",
  "إيمان النصيف", "عبد السلام المعدني", "علي عامر", "محمد المشرع", "إيمان العبسي",
  "رانيا العزي", "هدى الصغير", "أشواق المخلافي", "عائشة العريقي", "ألطاف جار الله",
  "هناء الحيجنة", "رحاب العيفري", "ضحى القباطي", "خلود صلاح", "هند الحبابي", "ناديا الورد"
];

export const INITIAL_REPORT_CRITERIA: Criterion[] = [
    { id: 'c1', label: 'حضور اللقاء التطويري', type: 'rating' },
    { id: 'c2', label: 'السير في المنهج', type: 'select', options: ['متقدم', 'مطابق', 'متأخر'] },
    { id: 'c3', label: 'عنوان آخر درس', type: 'text' },
    { id: 'c4', label: 'تسليم الأسئلة الأسبوعية', type: 'rating' },
    { id: 'c5', label: 'اختبار الطلاب', type: 'rating' },
    { id: 'c6', label: 'تنفيذ البرامج الخاصة بالمادة', type: 'rating' },
    { id: 'c7', label: 'تنفيذ الاستراتيجيات', type: 'rating' },
    { id: 'c8', label: 'استخدام وسائل تعليمية', type: 'rating' },
];

export const RATING_TO_PERCENTAGE: { [key: number]: number } = {
  1: 25,
  2: 50,
  3: 75,
  4: 100,
};

export const RATING_COLORS: { [key: number]: string } = {
  1: 'bg-red-200 text-red-800',
  2: 'bg-yellow-200 text-yellow-800',
  3: 'bg-orange-300 text-orange-800', // Note: Tailwind doesn't have orange-200, so using 300
  4: 'bg-green-200 text-green-800',
};

export const PROGRESS_TO_PERCENTAGE: { [key: string]: number } = {
    'متقدم': 100,
    'مطابق': 75,
    'متأخر': 25,
    'Advanced': 100,
    'On Track': 75,
    'Delayed': 25,
};
