
import React, { useState, useMemo, useRef } from 'react';
import { Teacher, Report, Criterion } from '../types';
import { PROGRESS_TO_PERCENTAGE, RATING_TO_PERCENTAGE } from '../constants';
import { FilePdfIcon, FileTextIcon } from './Icons';

declare const jspdf: any;
declare const html2canvas: any;

interface ReportsDashboardProps {
  teachers: Teacher[];
  reports: Report[];
  criteria: Criterion[];
}

type FilterType = 'all' | 'teacher' | 'criterion';

const ReportsDashboard: React.FC<ReportsDashboardProps> = ({ teachers, reports, criteria }) => {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedId, setSelectedId] = useState<string>('');
  const tableRef = useRef<HTMLDivElement>(null);

  const getTeacherName = (teacherId: string) => {
    return teachers.find(t => t.id === teacherId)?.name || 'غير معروف';
  };

  const filteredReports = useMemo(() => {
    if (filterType === 'teacher' && selectedId) {
      return reports.filter(r => r.teacherId === selectedId);
    }
    return reports;
  }, [reports, filterType, selectedId]);

  const averagePercentage = useMemo(() => {
    if (filteredReports.length === 0) return 0;
    const total = filteredReports.reduce((sum, report) => sum + report.totalPercentage, 0);
    return total / filteredReports.length;
  }, [filteredReports]);

  const getCriterionValue = (report: Report, criterionId: string): string => {
      const criterion = criteria.find(c => c.id === criterionId);
      if(!criterion) return '-';
      
      const value = report.ratings[criterionId];
      if (criterion.type === 'rating' && typeof value === 'number') return `${RATING_TO_PERCENTAGE[value] || 0}%`;
      if (criterion.type === 'select' && typeof value === 'string') return `${PROGRESS_TO_PERCENTAGE[value] || 0}% (${value})`;
      if (typeof value === 'string') return value;
      return 'لم يقيم';
  }

  const getDisplayValue = (report: Report) => {
    if (filterType === 'criterion' && selectedId) {
      return getCriterionValue(report, selectedId);
    }
    return <span className="text-teal-600">{report.totalPercentage.toFixed(1)}%</span>;
  };

  const generateTxt = () => {
    let content = `التقارير المجمعة\n`;
    content += `تاريخ التصدير: ${new Date().toLocaleDateString('ar-EG')}\n\n`;
    
    filteredReports.forEach(report => {
      content += `----------------------------------------\n`;
      content += `المعلم: ${getTeacherName(report.teacherId)}\n`;
      content += `التاريخ: ${new Date(report.date).toLocaleDateString('ar-EG')}\n`;
      content += `التقييم: ${filterType === 'criterion' && selectedId ? getCriterionValue(report, selectedId) : report.totalPercentage.toFixed(1) + '%'}\n`;
    });

    content += `\n----------------------------------------\n`;
    content += `متوسط النسبة الإجمالية للتقارير المعروضة: ${averagePercentage.toFixed(1)}%\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aggregated-reports-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  
  const generatePdf = () => {
    if (!tableRef.current) return;
    const { jsPDF } = jspdf;
    html2canvas(tableRef.current, { scale: 2 }).then((canvas) => {
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
        pdf.save(`aggregated-reports-${new Date().toISOString().split('T')[0]}.pdf`);
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <div className="md:flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-teal-700 mb-4 md:mb-0">التقارير المجمعة</h2>
        <div className="flex gap-2">
           <button onClick={generateTxt} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm">
                <FileTextIcon /> تصدير TXT
            </button>
            <button onClick={generatePdf} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm">
                <FilePdfIcon /> تصدير PDF
            </button>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="filter-type" className="block text-sm font-medium text-slate-700 mb-2">عرض التقارير حسب:</label>
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => {
                setFilterType(e.target.value as FilterType);
                setSelectedId('');
            }}
            className="w-full p-2 border rounded-md bg-white focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="all">جميع التقارير</option>
            <option value="teacher">المعلم</option>
            <option value="criterion">معيار محدد</option>
          </select>
        </div>
        {filterType !== 'all' && (
          <div>
            <label htmlFor="filter-select" className="block text-sm font-medium text-slate-700 mb-2">
              {filterType === 'teacher' ? 'اختر المعلم' : 'اختر المعيار'}
            </label>
            <select
              id="filter-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full p-2 border rounded-md bg-white focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">{filterType === 'teacher' ? 'كل المعلمين' : 'النسبة الإجمالية'}</option>
              {filterType === 'teacher' ? (
                teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                ))
              ) : (
                criteria.filter(c => c.type !== 'text').map(criterion => (
                  <option key={criterion.id} value={criterion.id}>{criterion.label}</option>
                ))
              )}
            </select>
          </div>
        )}
      </div>

      <div className="overflow-x-auto" ref={tableRef}>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-100">
            <tr>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">المعلم</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">التاريخ</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                {filterType === 'criterion' && selectedId ? criteria.find(c=>c.id === selectedId)?.label : 'التقييم'}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredReports.length > 0 ? filteredReports.map(report => (
              <tr key={report.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{getTeacherName(report.teacherId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(report.date).toLocaleDateString('ar-EG')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-semibold">{getDisplayValue(report)}</td>
              </tr>
            )) : (
                <tr>
                    <td colSpan={3} className="text-center py-10 text-slate-500">لا توجد تقارير لعرضها.</td>
                </tr>
            )}
          </tbody>
          <tfoot className="bg-slate-100">
            <tr>
                <td colSpan={2} className="px-6 py-3 text-right text-sm font-bold text-slate-700">المتوسط الإجمالي للتقارير المعروضة</td>
                <td className="px-6 py-3 text-sm font-bold text-teal-700">{averagePercentage.toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ReportsDashboard;