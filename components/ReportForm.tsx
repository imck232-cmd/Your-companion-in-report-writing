import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Teacher, Report, Criterion, CriterionType } from '../types.ts';
import { RATING_TO_PERCENTAGE, RATING_COLORS, PROGRESS_TO_PERCENTAGE } from '../constants.ts';
import { FileTextIcon, FilePdfIcon, PlusIcon, TrashIcon } from './Icons.tsx';

declare const jspdf: any;
declare const html2canvas: any;

interface ReportFormProps {
  teacher: Teacher;
  onSave: (report: Report) => void;
  onCancel: () => void;
  existingReport?: Report | null;
  initialSchoolInfo?: Report['schoolInfo'];
  criteria: Criterion[];
  onCriteriaChange: (criteria: Criterion[]) => void;
}

const ReportForm: React.FC<ReportFormProps> = ({ 
    teacher, onSave, onCancel, existingReport, initialSchoolInfo, criteria, onCriteriaChange
}) => {

  const [reportData, setReportData] = useState<Omit<Report, 'id' | 'teacherId' | 'totalPercentage'>>(() => {
    const defaultSchoolInfo = {
        subject: teacher.subject || '',
        grade: teacher.grade || '',
        school: teacher.school || '',
        branch: teacher.branch || 'main',
    };
    const info = existingReport?.schoolInfo || initialSchoolInfo || defaultSchoolInfo;

    return {
      date: existingReport?.date || new Date().toISOString().split('T')[0],
      schoolInfo: info,
      ratings: existingReport?.ratings || {},
      strategies: existingReport?.strategies || '',
      aids: existingReport?.aids || '',
      programs: existingReport?.programs || '',
    };
  });

  const reportContentRef = useRef<HTMLDivElement>(null);

  const calculateTotalPercentage = useCallback(() => {
    let total = 0;
    let count = 0;
    criteria.forEach(criterion => {
      const value = reportData.ratings[criterion.id];
      if (criterion.type === 'rating' && typeof value === 'number' && value > 0) {
        total += RATING_TO_PERCENTAGE[value];
        count++;
      } else if (criterion.type === 'select' && typeof value === 'string' && value) {
        total += PROGRESS_TO_PERCENTAGE[value];
        count++;
      }
    });
    return count > 0 ? total / count : 0;
  }, [reportData.ratings, criteria]);
  
  const handleAddCriterion = () => {
    const label = prompt("أدخل اسم المعيار الجديد:");
    if (!label) return;

    const type = prompt("أدخل نوع المعيار (rating, select, text):") as CriterionType;
    if (!['rating', 'select', 'text'].includes(type)) {
        alert("نوع غير صالح. الأنواع المسموح بها هي: rating, select, text");
        return;
    }

    let options: string[] | undefined;
    if (type === 'select') {
        const optionsString = prompt("أدخل الخيارات مفصولة بفاصلة (مثال: خيار1,خيار2):");
        if(optionsString) {
            options = optionsString.split(',').map(s => s.trim());
        }
    }
    
    const newCriterion: Criterion = { id: crypto.randomUUID(), label, type, options };
    onCriteriaChange([...criteria, newCriterion]);
  };

  const handleDeleteCriterion = (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المعيار؟")) {
      onCriteriaChange(criteria.filter(c => c.id !== id));
    }
  };


  const handleRatingChange = (criterionId: string, value: number | string) => {
    setReportData(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [criterionId]: value,
      },
    }));
  };

  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setReportData(prev => ({
        ...prev,
        schoolInfo: {
            ...prev.schoolInfo,
            [name]: value
        }
    }))
  };

  const handleSaveClick = () => {
    const finalReport: Report = {
      id: existingReport?.id || crypto.randomUUID(),
      teacherId: teacher.id,
      ...reportData,
      totalPercentage: calculateTotalPercentage(),
    };
    onSave(finalReport);
  };
  
  const generateTxtContent = () => {
    let content = `تقرير أداء المعلم: ${teacher.name}\n`;
    content += `تاريخ التقرير: ${new Date(reportData.date).toLocaleDateString('ar-EG')}\n`;
    content += `المدرسة: ${reportData.schoolInfo?.school || 'غير محدد'}\n`;
    content += `المادة: ${reportData.schoolInfo?.subject || 'غير محدد'}\n\n`;
    content += `--- تقييم المعايير ---\n`;
    criteria.forEach(c => {
        const value = reportData.ratings[c.id];
        if (c.type === 'rating') {
            const rating = (typeof value === 'number' && RATING_TO_PERCENTAGE[value]) ? `${RATING_TO_PERCENTAGE[value]}%` : 'لم يقيم';
            content += `${c.label}: ${rating}\n`;
        } else if(c.type === 'select') {
            const rating = typeof value === 'string' ? value : 'لم يختر';
            content += `${c.label}: ${rating}\n`;
        } else {
             content += `${c.label}: ${value || ''}\n`;
        }
    });
    content += `\nالنسبة الإجمالية: ${calculateTotalPercentage().toFixed(1)}%\n\n`;
    content += `--- ملاحظات إضافية ---\n`;
    content += `أهم الاستراتيجيات المنفذة: ${reportData.strategies || 'لا يوجد'}\n`;
    content += `أهم الوسائل المستخدمة: ${reportData.aids || 'لا يوجد'}\n`;
    content += `أهم البرامج المنفذة: ${reportData.programs || 'لا يوجد'}\n`;
    return content;
  };

  const exportToTxt = () => {
    const content = generateTxtContent();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report-${teacher.name}-${reportData.date}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportToPdf = () => {
    if (!reportContentRef.current) return;
    const { jsPDF } = jspdf;
    html2canvas(reportContentRef.current, { scale: 2, useCORS: true }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 10;
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        pdf.save(`report-${teacher.name}-${reportData.date}.pdf`);
    });
  };

  const totalPercentage = calculateTotalPercentage();

  return (
    <div className="max-w-4xl mx-auto">
        <div ref={reportContentRef} className="bg-white p-6 md:p-8 rounded-lg shadow-lg border border-slate-200">
            <h2 className="text-2xl font-bold mb-2 text-teal-800">تقرير تقييم المعلم: {teacher.name}</h2>
            <p className="text-slate-500 mb-6">يرجى تعبئة الحقول التالية لإنشاء تقرير التقييم.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 border rounded-md bg-slate-50">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">اسم المدرسة</label>
                    <input type="text" name="school" value={reportData.schoolInfo?.school} onChange={handleInfoChange} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">المادة</label>
                    <input type="text" name="subject" value={reportData.schoolInfo?.subject} onChange={handleInfoChange} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الصفوف</label>
                    <input type="text" name="grade" value={reportData.schoolInfo?.grade} onChange={handleInfoChange} className="w-full p-2 border rounded-md" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">الفرع</label>
                    <select name="branch" value={reportData.schoolInfo?.branch} onChange={handleInfoChange} className="w-full p-2 border rounded-md bg-white">
                        <option value="main">رئيسي</option>
                        <option value="boys">طلاب</option>
                        <option value="girls">طالبات</option>
                    </select>
                </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ التقرير</label>
                    <input type="date" value={reportData.date} onChange={(e) => setReportData(p => ({...p, date: e.target.value}))} className="w-full p-2 border rounded-md" />
                </div>
            </div>

            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-teal-700">معايير التقييم</h3>
                 <button onClick={handleAddCriterion} className="bg-teal-600 text-white px-3 py-1.5 rounded-md hover:bg-teal-700 text-sm flex items-center gap-1">
                    <PlusIcon /> إضافة معيار
                </button>
            </div>
            <div className="space-y-4">
            {criteria.map(criterion => (
                <div key={criterion.id} className="p-3 border rounded-md grid grid-cols-1 md:grid-cols-2 gap-4 items-center group">
                    <div className="flex justify-between items-center">
                        <label className="font-semibold">{criterion.label}</label>
                        <button onClick={() => handleDeleteCriterion(criterion.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <TrashIcon />
                        </button>
                    </div>
                    <div>
                        {criterion.type === 'rating' && (
                            <div className="flex gap-2">
                                {[1, 2, 3, 4].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => handleRatingChange(criterion.id, val)}
                                        className={`w-10 h-10 rounded-md font-bold transition-all transform hover:scale-110 ${reportData.ratings[criterion.id] === val ? RATING_COLORS[val] : 'bg-slate-200 text-slate-600'}`}
                                    >{val}</button>
                                ))}
                            </div>
                        )}
                        {criterion.type === 'select' && (
                            <select value={reportData.ratings[criterion.id] as string || ''} onChange={(e) => handleRatingChange(criterion.id, e.target.value)} className="w-full p-2 border rounded-md bg-white">
                                <option value="">اختر...</option>
                                {criterion.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        )}
                        {criterion.type === 'text' && (
                            <input type="text" value={reportData.ratings[criterion.id] as string || ''} onChange={(e) => handleRatingChange(criterion.id, e.target.value)} className="w-full p-2 border rounded-md" />
                        )}
                    </div>
                </div>
            ))}
            </div>
            
            <div className="mt-6 pt-6 border-t">
                <h3 className="text-xl font-bold mb-4 text-teal-700">النسبة النهائية للتقييم</h3>
                <div className="bg-teal-50 p-4 rounded-lg text-center">
                    <span className="text-4xl font-bold text-teal-600">{totalPercentage.toFixed(1)}%</span>
                </div>
            </div>

            <div className="mt-6 pt-6 border-t space-y-4">
                 <h3 className="text-xl font-bold text-teal-700">ملاحظات إضافية</h3>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">أهم الاستراتيجيات المنفذة</label>
                    <textarea value={reportData.strategies} onChange={e => setReportData(p => ({...p, strategies: e.target.value}))} rows={3} className="w-full p-2 border rounded-md"></textarea>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">أهم الوسائل المستخدمة</label>
                    <textarea value={reportData.aids} onChange={e => setReportData(p => ({...p, aids: e.target.value}))} rows={3} className="w-full p-2 border rounded-md"></textarea>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">أهم البرامج المنفذة</label>
                    <textarea value={reportData.programs} onChange={e => setReportData(p => ({...p, programs: e.target.value}))} rows={3} className="w-full p-2 border rounded-md"></textarea>
                </div>
            </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-3">
            <div className='flex gap-3'>
                <button onClick={exportToTxt} className="flex-1 text-nowrap flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                    <FileTextIcon /> تصدير TXT
                </button>
                <button onClick={exportToPdf} className="flex-1 text-nowrap flex items-center justify-center bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors">
                    <FilePdfIcon /> تصدير PDF
                </button>
            </div>
            <div className="flex-grow"></div>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 bg-slate-500 text-white px-6 py-2 rounded-md hover:bg-slate-600 transition-colors">
                    إلغاء
                </button>
                <button onClick={handleSaveClick} className="flex-1 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors">
                    حفظ التقرير
                </button>
            </div>
        </div>
    </div>
  );
};

export default ReportForm;