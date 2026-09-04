import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "../components/admin/Dashboard";
import Directory from "../components/admin/Directory";
import AnnouncementCenter from "../components/features/AnnouncementCenter";
import Schedule from "../components/features/Schedule";
import AdminAttendance from "../components/admin/AdminAttendance";
import AcademicCalendar from "../components/features/AcademicCalendar";
import AdminSubjects from "../components/admin/AdminSubjects";
export default function AppRoutes({
  data,
  add,
  remove,
  toggleActive,
  editStudent,
  editTeacherSubjects,
  updateStudentAttendance,
}) {
  return (
    <Routes>
      <Route path="/" element={<Dashboard data={data} />} />
      <Route path="/announcements" element={<AnnouncementCenter role="admin" canPublish author="Administrator Nissar" />} />
      <Route path="/schedule" element={<Schedule role="admin" teachers={data.teachers} canManage />} />
      <Route path="/attendance" element={<AdminAttendance teachers={data.teachers} students={data.students} onAttendanceSaved={updateStudentAttendance} />} />
      <Route path="/subjects" element={<AdminSubjects />} />
      <Route path="/calendar" element={<AcademicCalendar role="admin" />} />
      <Route
        path="/teachers"
        element={
          <Directory
            type="teachers"
            rows={data.teachers}
            add={add}
            remove={remove}
            toggleActive={toggleActive}
            editTeacherSubjects={editTeacherSubjects}
          />
        }
      />
      <Route
        path="/students"
        element={
          <Directory
            type="students"
            rows={data.students}
            add={add}
            remove={remove}
            toggleActive={toggleActive}
            editStudent={editStudent}
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
