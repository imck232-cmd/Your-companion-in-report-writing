import React, { useState, useMemo, useRef } from 'react';
import { Teacher, Report, Criterion } from '../types';
import { RATING_TO_PERCENTAGE } from '../constants';
import { FilePdfIcon, FileTextIcon, ExcelIcon, WhatsAppIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

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
  const { t } = useLanguage();

  const getTeacherName = (teacherId: string) => {
    return teachers.find(t => t.id === teacherId)?.name || t.dashboard.unknownTeacher;
  };

  const filteredReports = useMemo(() => {
    if (filterType === 'teacher' && selectedId) {
      return reports.filter(r => r.teacherId === selectedId);
    }
    return reports;
  }, [reports, filterType, selectedId]);

  const averagePercentage = useMemo(() => {
    if (filteredReports.length === 0) return 0;

    if (filterType === 'criterion' && selectedId) {
        let total = 0;
        let count = 0;
        const criterion = criteria.find(c => c.id === selectedId);
        if(!criterion) return 0;
        
        filteredReports.forEach(report => {
            const value = report.ratings[selectedId];
            if(criterion.type === 'rating' && typeof value === 'number') {
                total += RATING_TO_PERCENTAGE[value] || 0;
                count++;
            } else if (criterion.type === 'select' && typeof value === 'string') {
                const translatedProgress = t.reportForm.progressOptions;
                const progressMap: { [key: string]: number } = {
                    [translatedProgress[0]]: 100,
                    [translatedProgress[1]]: 75,
                    [translatedProgress[2]]: 25,
                };
                total += progressMap[value] || 0;
                count++;
            }
        });
        return count > 0 ? total/count : 0;
    }

    const total = filteredReports.reduce((sum, report) => sum + report.totalPercentage, 0);
    return total / filteredReports.length;
  }, [filteredReports, filterType, selectedId, criteria, t]);

  const getCriterionValue = (report: Report, criterionId: string): string => {
      const criterion = criteria.find(c => c.id === criterionId);
      if(!criterion) return '-';
      
      const value = report.ratings[criterionId];
      if (criterion.type === 'rating' && typeof value === 'number') return `${RATING_TO_PERCENTAGE[value] || 0}%`;
      if (criterion.type === 'select' && typeof value === 'string') {
        const translatedProgress = t.reportForm.progressOptions;
        const progressMap: { [key: string]: number } = {
            [translatedProgress[0]]: 100,
            [translatedProgress[1]]: 75,
            [translatedProgress[2]]: 25,
        };
        return `${progressMap[value] || 0}% (${value})`;
      }
      if (typeof value === 'string') return value;
      return t.exports.notRated;
  }

  const getDisplayValue = (report: Report): string | JSX.Element => {
    if (filterType === 'criterion' && selectedId) {
      return getCriterionValue(report, selectedId);
    }
    return <span className="text-teal-600">{report.totalPercentage.toFixed(1)}%</span>;
  };

  const getPlainTextDisplayValue = (report: Report): string => {
      const displayValueNode = getDisplayValue(report);
      return typeof displayValueNode === 'string' ? displayValueNode : `${report.totalPercentage.toFixed(1)}%`;
  }

  const generateTxt = (isForWhatsApp = false) => {
    let content = `${t.dashboard.title}\n`;
    if (!isForWhatsApp) {
      content += `${t.exports.exportDate}: ${new Date().toLocaleDateString()}\n\n`;
    }
    
    filteredReports.forEach(report => {
      content += `----------------------------------------\n`;
      content += `${t.exports.teacher}: ${getTeacherName(report.teacherId)}\n`;
      content += `${t.exports.date}: ${new Date(report.date).toLocaleDateString()}\n`;
      content += `${t.exports.rating}: ${getPlainTextDisplayValue(report)}\n`;
    });

    content += `\n----------------------------------------\n`;
    content += `${t.dashboard.averageTotal}: ${averagePercentage.toFixed(1)}%\n`;
    return content;
  };

  const exportToTxt = () => {
    const content = generateTxt();
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
    html2canvas(tableRef.current, { scale: 2 }).then((canvas: HTMLCanvasElement) => {
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

  const exportToXlsx = () => {
    const header = [t.exports.teacher, t.exports.date, t.dashboard.tableHeaderRating];
    const data = filteredReports.map(report => {
        return [
            getTeacherName(report.teacherId),
            new Date(report.date).toLocaleDateString(),
            getPlainTextDisplayValue(report)
        ];
    });

    data.push([]);
    data.push([t.dashboard.averageTotal, '', `${averagePercentage.toFixed(1)}%`]);

    const worksheet = XLSX.utils.aoa_to_sheet([header, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Aggregated Reports');
    XLSX.writeFile(workbook, `aggregated-reports-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  const shareViaWhatsApp = () => {
      const content = generateTxt(true);
      const encodedContent = encodeURIComponent(content);
      window.open(`https://wa.me/?text=${encodedContent}`, '_blank');
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <div className="md:flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-teal-700 mb-4 md:mb-0">{t.dashboard.title}</h2>
        <div className="flex flex-wrap gap-2">
           <button onClick={exportToTxt} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm">
                <FileTextIcon /> {t.buttons.exportTxt}
            </button>
            <button onClick={generatePdf} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm">
                <FilePdfIcon /> {t.buttons.exportPdf}
            </button>
            <button onClick={exportToXlsx} className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-800 transition-colors text-sm">
                <ExcelIcon /> {t.buttons.exportXlsx}
            </button>
            <button onClick={shareViaWhatsApp} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition-colors text-sm">
                <WhatsAppIcon /> {t.buttons.sendWhatsApp}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="filter-type" className="block text-sm font-medium text-slate-700 mb-2">{t.dashboard.filterBy}:</label>
          <select
            id="filter-type"
            value={filterType}
            onChange={(e) => {
                setFilterType(e.target.value as FilterType);
                setSelectedId('');
            }}
            className="w-full p-2 border rounded-md bg-white focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="all">{t.dashboard.filterOptions.all}</option>
            <option value="teacher">{t.dashboard.filterOptions.teacher}</option>
            <option value="criterion">{t.dashboard.filterOptions.criterion}</option>
          </select>
        </div>
        {filterType !== 'all' && (
          <div>
            <label htmlFor="filter-select" className="block text-sm font-medium text-slate-700 mb-2">
              {filterType === 'teacher' ? t.dashboard.selectTeacher : t.dashboard.selectCriterion}
            </label>
            <select
              id="filter-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full p-2 border rounded-md bg-white focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">{filterType === 'teacher' ? t.dashboard.allTeachers : t.dashboard.totalPercentage}</option>
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
              <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">{t.dashboard.tableHeaderTeacher}</th>
              <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">{t.dashboard.tableHeaderDate}</th>
              <th scope="col" className="px-6 py-3 text-start text-xs font-medium text-slate-500 uppercase tracking-wider">
                {filterType === 'criterion' && selectedId ? criteria.find(c=>c.id === selectedId)?.label : t.dashboard.tableHeaderRating}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredReports.length > 0 ? filteredReports.map(report => (
              <tr key={report.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{getTeacherName(report.teacherId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(report.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-semibold">{getDisplayValue(report)}</td>
              </tr>
            )) : (
                <tr>
                    <td colSpan={3} className="text-center py-10 text-slate-500">{t.dashboard.noReports}</td>
                </tr>
            )}
          </tbody>
          <tfoot className="bg-slate-100">
            <tr>
                <td colSpan={2} className="px-6 py-3 text-start text-sm font-bold text-slate-700">{t.dashboard.averageTotal}</td>
                <td className="px-6 py-3 text-sm font-bold text-teal-700">{averagePercentage.toFixed(1)}%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ReportsDashboard;