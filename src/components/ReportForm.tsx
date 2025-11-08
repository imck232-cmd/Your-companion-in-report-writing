import React, { useState, useRef, useCallback } from 'react';
import { Teacher, Report, Criterion, CriterionType } from '../types';
import { RATING_TO_PERCENTAGE, RATING_COLORS } from '../constants';
import { FileTextIcon, FilePdfIcon, PlusIcon, TrashIcon, ExcelIcon, WhatsAppIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

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
  const { t } = useLanguage();

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
    const translatedProgress = t.reportForm.progressOptions;
    const progressMap: { [key: string]: number } = {
        [translatedProgress[0]]: 100, // Advanced
        [translatedProgress[1]]: 75,  // On Track
        [translatedProgress[2]]: 25,  // Delayed
    };

    criteria.forEach(criterion => {
      const value = reportData.ratings[criterion.id];
      if (criterion.type === 'rating' && typeof value === 'number' && value > 0) {
        total += RATING_TO_PERCENTAGE[value];
        count++;
      } else if (criterion.type === 'select' && typeof value === 'string' && value) {
        total += progressMap[value] || 0;
        count++;
      }
    });
    return count > 0 ? total / count : 0;
  }, [reportData.ratings, criteria, t]);
  
  const handleAddCriterion = () => {
    const label = prompt(t.confirmations.newCriterionName);
    if (!label) return;

    const type = prompt(t.confirmations.newCriterionType) as CriterionType;
    if (!['rating', 'select', 'text'].includes(type)) {
        alert(t.confirmations.invalidCriterionType);
        return;
    }

    let options: string[] | undefined;
    if (type === 'select') {
        const optionsString = prompt(t.confirmations.newCriterionOptions);
        if(optionsString) {
            options = optionsString.split(',').map(s => s.trim());
        }
    }
    
    const newCriterion: Criterion = { id: crypto.randomUUID(), label, type, options };
    onCriteriaChange([...criteria, newCriterion]);
  };

  const handleDeleteCriterion = (id: string) => {
    if (window.confirm(t.confirmations.deleteCriterion)) {
      const newCriteria = criteria.filter(c => c.id !== id);
      onCriteriaChange(newCriteria);
      setReportData(prev => {
          const newRatings = {...prev.ratings};
          delete newRatings[id];
          return {...prev, ratings: newRatings};
      });
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
  
  const generateTxtContent = (isForWhatsApp = false) => {
    let content = `${t.exports.teacherPerformanceReport}: ${teacher.name}\n`;
    content += `${t.exports.reportDate}: ${new Date(reportData.date).toLocaleDateString()}\n`;
    if (!isForWhatsApp) {
      content += `${t.reportForm.schoolName}: ${reportData.schoolInfo?.school || t.exports.notSet}\n`;
      content += `${t.reportForm.subject}: ${reportData.schoolInfo?.subject || t.exports.notSet}\n\n`;
    }
    content += `--- ${t.reportForm.evaluationCriteria} ---\n`;
    criteria.forEach(c => {
        const value = reportData.ratings[c.id];
        if (c.type === 'rating') {
            const rating = (typeof value === 'number' && RATING_TO_PERCENTAGE[value]) ? `${RATING_TO_PERCENTAGE[value]}%` : t.exports.notRated;
            content += `${c.label}: ${rating}\n`;
        } else if(c.type === 'select') {
            const rating = typeof value === 'string' ? value : t.exports.notSelected;
            content += `${c.label}: ${rating}\n`;
        } else {
             content += `${c.label}: ${value || ''}\n`;
        }
    });
    content += `\n${t.exports.totalPercentage}: ${calculateTotalPercentage().toFixed(1)}%\n`;
    if (!isForWhatsApp) {
        content += `\n--- ${t.reportForm.additionalNotes} ---\n`;
        content += `${t.reportForm.strategies}: ${reportData.strategies || t.exports.none}\n`;
        content += `${t.reportForm.aids}: ${reportData.aids || t.exports.none}\n`;
        content += `${t.reportForm.programs}: ${reportData.programs || t.exports.none}\n`;
    }
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
    html2canvas(reportContentRef.current, { scale: 2, useCORS: true }).then((canvas: HTMLCanvasElement) => {
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

  const exportToXlsx = () => {
    const data = [
      [t.exports.teacher, teacher.name],
      [t.exports.reportDate, new Date(reportData.date).toLocaleDateString()],
      [t.reportForm.schoolName, reportData.schoolInfo?.school],
      [t.reportForm.subject, reportData.schoolInfo?.subject],
      [t.reportForm.grade, reportData.schoolInfo?.grade],
      [],
      [t.exports.criterion, t.exports.rating]
    ];

    criteria.forEach(c => {
        const value = reportData.ratings[c.id] || t.exports.notRated;
        let displayValue: string | number = value;
        if(c.type === 'rating' && typeof value === 'number') displayValue = `${RATING_TO_PERCENTAGE[value]}%`;
        data.push([c.label, String(displayValue)]);
    });

    data.push([]);
    data.push([t.exports.totalPercentage, `${calculateTotalPercentage().toFixed(1)}%`]);
    data.push([]);
    data.push([t.reportForm.strategies, reportData.strategies]);
    data.push([t.reportForm.aids, reportData.aids]);
    data.push([t.reportForm.programs, reportData.programs]);

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `report-${teacher.name}-${reportData.date}.xlsx`);
  }

  const shareViaWhatsApp = () => {
    const content = generateTxtContent(true);
    const encodedContent = encodeURIComponent(content);
    window.open(`https://wa.me/?text=${encodedContent}`, '_blank');
  }

  const totalPercentage = calculateTotalPercentage();

  return (
    <div className="max-w-4xl mx-auto">
        <div ref={reportContentRef} className="bg-white p-6 md:p-8 rounded-lg shadow-lg border border-slate-200">
            <h2 className="text-2xl font-bold mb-2 text-teal-800">{t.reportForm.title}: {teacher.name}</h2>
            <p className="text-slate-500 mb-6">{t.reportForm.subtitle}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 border rounded-md bg-slate-50">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.reportForm.schoolName}</label>
                    <input type="text" name="school" value={reportData.schoolInfo?.school} onChange={handleInfoChange} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.reportForm.subject}</label>
                    <input type="text" name="subject" value={reportData.schoolInfo?.subject} onChange={handleInfoChange} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.reportForm.grade}</label>
                    <input type="text" name="grade" value={reportData.schoolInfo?.grade} onChange={handleInfoChange} className="w-full p-2 border rounded-md" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.reportForm.branch}</label>
                    <select name="branch" value={reportData.schoolInfo?.branch} onChange={handleInfoChange} className="w-full p-2 border rounded-md bg-white">
                        <option value="main">{t.reportForm.branchOptions.main}</option>
                        <option value="boys">{t.reportForm.branchOptions.boys}</option>
                        <option value="girls">{t.reportForm.branchOptions.girls}</option>
                    </select>
                </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.reportForm.reportDate}</label>
                    <input type="date" value={reportData.date} onChange={(e) => setReportData(p => ({...p, date: e.target.value}))} className="w-full p-2 border rounded-md" />
                </div>
            </div>

            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-teal-700">{t.reportForm.evaluationCriteria}</h3>
                 <button onClick={handleAddCriterion} className="bg-teal-600 text-white px-3 py-1.5 rounded-md hover:bg-teal-700 text-sm flex items-center gap-1">
                    <PlusIcon /> {t.buttons.addCriterion}
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
                            <div className="flex gap-2 justify-end">
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
                                <option value="">{t.reportForm.select}</option>
                                {t.reportForm.progressOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
                <h3 className="text-xl font-bold mb-4 text-teal-700">{t.reportForm.finalPercentage}</h3>
                <div className="bg-teal-50 p-4 rounded-lg text-center">
                    <span className="text-4xl font-bold text-teal-600">{totalPercentage.toFixed(1)}%</span>
                </div>
            </div>

            <div className="mt-6 pt-6 border-t space-y-4">
                 <h3 className="text-xl font-bold text-teal-700">{t.reportForm.additionalNotes}</h3>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.reportForm.strategies}</label>
                    <textarea value={reportData.strategies} onChange={e => setReportData(p => ({...p, strategies: e.target.value}))} rows={3} className="w-full p-2 border rounded-md"></textarea>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.reportForm.aids}</label>
                    <textarea value={reportData.aids} onChange={e => setReportData(p => ({...p, aids: e.target.value}))} rows={3} className="w-full p-2 border rounded-md"></textarea>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.reportForm.programs}</label>
                    <textarea value={reportData.programs} onChange={e => setReportData(p => ({...p, programs: e.target.value}))} rows={3} className="w-full p-2 border rounded-md"></textarea>
                </div>
            </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-3">
            <div className='flex flex-wrap gap-3'>
                <button onClick={exportToTxt} className="flex-1 text-nowrap flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                    <FileTextIcon /> {t.buttons.exportTxt}
                </button>
                <button onClick={exportToPdf} className="flex-1 text-nowrap flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors">
                    <FilePdfIcon /> {t.buttons.exportPdf}
                </button>
                <button onClick={exportToXlsx} className="flex-1 text-nowrap flex items-center justify-center gap-2 bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 transition-colors">
                    <ExcelIcon /> {t.buttons.exportXlsx}
                </button>
                <button onClick={shareViaWhatsApp} className="flex-1 text-nowrap flex items-center justify-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition-colors">
                    <WhatsAppIcon /> {t.buttons.sendWhatsApp}
                </button>
            </div>
            <div className="flex-grow"></div>
            <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 bg-slate-500 text-white px-6 py-2 rounded-md hover:bg-slate-600 transition-colors">
                    {t.buttons.cancel}
                </button>
                <button onClick={handleSaveClick} className="flex-1 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors">
                    {t.buttons.saveReport}
                </button>
            </div>
        </div>
    </div>
  );
};

export default ReportForm;