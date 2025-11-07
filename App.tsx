
import React, { useState, useEffect } from 'react';
import { Teacher, Report, Criterion } from './types';
import { INITIAL_TEACHERS, INITIAL_REPORT_CRITERIA } from './constants';
import TeacherManager from './components/TeacherManager';
import ReportForm from './components/ReportForm';
import ReportsDashboard from './components/ReportsDashboard';
import Header from './components/Header';
import Footer from './components/Footer';
import { useLanguage } from './contexts/LanguageContext';

type View = 'teacher_manager' | 'report_form' | 'reports_dashboard';

const App: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [currentView, setCurrentView] = useState<View>('teacher_manager');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [initialSchoolInfo, setInitialSchoolInfo] = useState<Report['schoolInfo'] | undefined>(undefined);
  const { language } = useLanguage();

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    try {
      const storedTeachers = localStorage.getItem('arabic_app_teachers');
      if (storedTeachers) {
        setTeachers(JSON.parse(storedTeachers));
      } else {
        const teachersWithIds = INITIAL_TEACHERS.map(name => ({ id: crypto.randomUUID(), name }));
        setTeachers(teachersWithIds);
        localStorage.setItem('arabic_app_teachers', JSON.stringify(teachersWithIds));
      }

      const storedReports = localStorage.getItem('arabic_app_reports');
      if (storedReports) {
        setReports(JSON.parse(storedReports));
      }
      
      const storedCriteria = localStorage.getItem('arabic_app_criteria');
      if(storedCriteria) {
        setCriteria(JSON.parse(storedCriteria));
      } else {
        setCriteria(INITIAL_REPORT_CRITERIA);
        localStorage.setItem('arabic_app_criteria', JSON.stringify(INITIAL_REPORT_CRITERIA));
      }

    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);
  
  const handleSaveTeacher = (teacher: Teacher) => {
    const newTeachers = [...teachers];
    const index = newTeachers.findIndex(t => t.id === teacher.id);
    if(index > -1) {
        newTeachers[index] = teacher;
    } else {
        newTeachers.push(teacher);
    }
    setTeachers(newTeachers);
    localStorage.setItem('arabic_app_teachers', JSON.stringify(newTeachers));
  }
  
  const handleCreateReport = (teacher: Teacher) => {
    const lastReport = reports
      .filter(r => r.teacherId === teacher.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    setInitialSchoolInfo(lastReport?.schoolInfo);
    setSelectedTeacher(teacher);
    setEditingReport(null);
    setCurrentView('report_form');
  };

  const handleEditReport = (report: Report) => {
    const teacher = teachers.find(t => t.id === report.teacherId);
    if (teacher) {
        setSelectedTeacher(teacher);
        setEditingReport(report);
        setInitialSchoolInfo(undefined);
        setCurrentView('report_form');
    }
  }

  const handleSaveReport = (report: Report) => {
    const newReports = [...reports];
    const index = newReports.findIndex(r => r.id === report.id);
    if (index > -1) {
      newReports[index] = report;
    } else {
      newReports.push(report);
    }
    setReports(newReports);
    localStorage.setItem('arabic_app_reports', JSON.stringify(newReports));
    setCurrentView('teacher_manager');
    setSelectedTeacher(null);
    setEditingReport(null);
  };
  
  const handleDeleteTeacher = (teacherId: string) => {
    if(window.confirm("هل أنت متأكد من حذف هذا المعلم وجميع تقاريره؟ لا يمكن التراجع عن هذا الإجراء.")) {
        const newTeachers = teachers.filter(t => t.id !== teacherId);
        const newReports = reports.filter(r => r.teacherId !== teacherId);
        setTeachers(newTeachers);
        setReports(newReports);
        localStorage.setItem('arabic_app_teachers', JSON.stringify(newTeachers));
        localStorage.setItem('arabic_app_reports', JSON.stringify(newReports));
    }
  }

  const handleDeleteReport = (reportId: string) => {
     if(window.confirm("هل أنت متأكد من حذف هذا التقرير؟")) {
        const newReports = reports.filter(r => r.id !== reportId);
        setReports(newReports);
        localStorage.setItem('arabic_app_reports', JSON.stringify(newReports));
     }
  }
  
  const handleCriteriaChange = (newCriteria: Criterion[]) => {
      setCriteria(newCriteria);
      localStorage.setItem('arabic_app_criteria', JSON.stringify(newCriteria));
  }


  const renderView = () => {
    switch (currentView) {
      case 'report_form':
        if (selectedTeacher) {
          return (
            <ReportForm
              teacher={selectedTeacher}
              onSave={handleSaveReport}
              onCancel={() => setCurrentView('teacher_manager')}
              existingReport={editingReport}
              initialSchoolInfo={initialSchoolInfo}
              criteria={criteria}
              onCriteriaChange={handleCriteriaChange}
            />
          );
        }
        return null;
      case 'reports_dashboard':
        return <ReportsDashboard teachers={teachers} reports={reports} criteria={criteria} />;
      case 'teacher_manager':
      default:
        return (
          <TeacherManager
            teachers={teachers}
            reports={reports}
            onCreateReport={handleCreateReport}
            onEditReport={handleEditReport}
            onSaveTeacher={handleSaveTeacher}
            onDeleteTeacher={handleDeleteTeacher}
            onDeleteReport={handleDeleteReport}
          />
        );
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col text-slate-800">
      <Header />
      <main className="flex-grow container mx-auto p-4 md:p-6">
        <div className="flex justify-center md:justify-end gap-2 mb-6 border-b pb-4">
          <button
            onClick={() => setCurrentView('teacher_manager')}
            className={`px-4 py-2 rounded-lg transition-colors ${currentView === 'teacher_manager' ? 'bg-teal-600 text-white' : 'bg-white hover:bg-slate-100'}`}
          >
            إدارة المعلمين والتقارير
          </button>
          <button
            onClick={() => setCurrentView('reports_dashboard')}
            className={`px-4 py-2 rounded-lg transition-colors ${currentView === 'reports_dashboard' ? 'bg-teal-600 text-white' : 'bg-white hover:bg-slate-100'}`}
          >
            لوحة التقارير المجمعة
          </button>
        </div>
        {renderView()}
      </main>
      <Footer />
    </div>
  );
};

export default App;