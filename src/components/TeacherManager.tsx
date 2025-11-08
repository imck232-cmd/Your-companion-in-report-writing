import React, { useState } from 'react';
import { Teacher, Report } from '../types';
import { PlusIcon, EditIcon, TrashIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

interface TeacherManagerProps {
  teachers: Teacher[];
  reports: Report[];
  onCreateReport: (teacher: Teacher) => void;
  onEditReport: (report: Report) => void;
  onSaveTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onDeleteReport: (reportId: string) => void;
}

const TeacherManager: React.FC<TeacherManagerProps> = ({ 
    teachers, reports, onCreateReport, onEditReport, onSaveTeacher, onDeleteTeacher, onDeleteReport 
}) => {
  const [newTeacherName, setNewTeacherName] = useState('');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const { t } = useLanguage();

  const handleAddTeacher = () => {
    if (newTeacherName.trim()) {
      onSaveTeacher({ id: crypto.randomUUID(), name: newTeacherName.trim() });
      setNewTeacherName('');
    }
  };

  const handleUpdateTeacher = () => {
    if (editingTeacher && editingTeacher.name.trim()) {
      onSaveTeacher(editingTeacher);
      setEditingTeacher(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-4 text-teal-700">{t.teacherManager.addTitle}</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTeacherName}
            onChange={(e) => setNewTeacherName(e.target.value)}
            placeholder={t.teacherManager.teacherNamePlaceholder}
            className="flex-grow p-2 border rounded-md focus:ring-teal-500 focus:border-teal-500"
          />
          <button onClick={handleAddTeacher} className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 flex items-center gap-2">
            <PlusIcon /> {t.buttons.add}
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-4 text-teal-700">{t.teacherManager.listTitle}</h2>
        <div className="space-y-4">
          {teachers.map((teacher) => {
            const teacherReports = reports.filter(r => r.teacherId === teacher.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return (
              <div key={teacher.id} className="p-4 border rounded-lg bg-slate-50">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  {editingTeacher?.id === teacher.id ? (
                     <div className="flex gap-2 w-full">
                        <input
                            type="text"
                            value={editingTeacher.name}
                            onChange={(e) => setEditingTeacher({...editingTeacher, name: e.target.value})}
                            className="flex-grow p-2 border rounded-md"
                        />
                        <button onClick={handleUpdateTeacher} className="bg-green-600 text-white px-3 rounded-md hover:bg-green-700">{t.buttons.save}</button>
                        <button onClick={() => setEditingTeacher(null)} className="bg-slate-500 text-white px-3 rounded-md hover:bg-slate-600">{t.buttons.cancel}</button>
                    </div>
                  ) : (
                    <h3 className="text-lg font-semibold text-slate-800">{teacher.name}</h3>
                  )}
                  <div className="flex gap-2">
                     <button onClick={() => setEditingTeacher(teacher)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors">
                        <EditIcon />
                    </button>
                    <button onClick={() => onDeleteTeacher(teacher.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors">
                        <TrashIcon />
                    </button>
                    <button onClick={() => onCreateReport(teacher)} className="bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 text-sm flex items-center gap-1">
                      <PlusIcon /> {t.teacherManager.newReport}
                    </button>
                  </div>
                </div>

                {teacherReports.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <h4 className="font-semibold text-sm mb-2 text-slate-600">{t.teacherManager.savedReports}:</h4>
                    <ul className="space-y-2">
                      {teacherReports.map(report => (
                        <li key={report.id} className="flex justify-between items-center bg-white p-2 rounded-md border text-sm">
                          <div className="flex items-center gap-4">
                             <span className="font-semibold">{new Date(report.date).toLocaleDateString()}</span>
                             <span>{t.teacherManager.finalPercentage}: <span className="font-bold text-teal-600">{report.totalPercentage.toFixed(1)}%</span></span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => onEditReport(report)} className="text-blue-600 hover:underline">{t.teacherManager.viewEdit}</button>
                             <button onClick={() => onDeleteReport(report.id)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors">
                                <TrashIcon />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TeacherManager;