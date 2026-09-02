import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "../components/Dashboard";
import Directory from "../components/Directory";
import AnnouncementCenter from "../components/AnnouncementCenter";
import Schedule from "../components/Schedule";
import AdminAttendance from "../components/AdminAttendance";
import AcademicCalendar from "../components/AcademicCalendar";
export default function AppRoutes({
  data,
  add,
  remove,
  toggleActive,
  editStudent,
  editTeacherSubjects,
}) {
  return (
    <Routes>
      <Route path="/" element={<Dashboard data={data} />} />
      <Route path="/announcements" element={<AnnouncementCenter role="admin" canPublish author="Administrator Nissar" />} />
      <Route path="/schedule" element={<Schedule role="admin" teachers={data.teachers} canManage />} />
      <Route path="/attendance" element={<AdminAttendance teachers={data.teachers} students={data.students} />} />
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
