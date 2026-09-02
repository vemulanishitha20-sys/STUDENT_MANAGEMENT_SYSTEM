import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;
export const ADMIN_CREDENTIALS = {
  id: "ADMIN001",
  password: "123456789",
  name: "Nissar",
};
export const SUBJECTS = [
  {
    code: "CSE101",
    name: "Programming Fundamentals",
    department: "CSE",
    year: 1,
  },
  { code: "CSE102", name: "Discrete Structures", department: "CSE", year: 1 },
  { code: "ECE101", name: "Circuit Analysis", department: "ECE", year: 1 },
  { code: "ECE102", name: "Semiconductor Physics", department: "ECE", year: 1 },
  { code: "CSE201", name: "Data Structures", department: "CSE", year: 2 },
  { code: "CSE202", name: "Computer Organization", department: "CSE", year: 2 },
  { code: "ECE201", name: "Analog Electronics", department: "ECE", year: 2 },
  { code: "ECE202", name: "Signals and Systems", department: "ECE", year: 2 },
  { code: "CSE301", name: "Database Systems", department: "CSE", year: 3 },
  { code: "CSE302", name: "Operating Systems", department: "CSE", year: 3 },
  { code: "ECE301", name: "Digital Communication", department: "ECE", year: 3 },
  { code: "ECE302", name: "Microprocessors", department: "ECE", year: 3 },
  { code: "CSE401", name: "Cloud Computing", department: "CSE", year: 4 },
  { code: "CSE402", name: "Machine Learning", department: "CSE", year: 4 },
  { code: "ECE401", name: "VLSI Design", department: "ECE", year: 4 },
  { code: "ECE402", name: "Embedded Systems", department: "ECE", year: 4 },
  { code: "CSE103", name: "Linear Algebra", department: "CSE", year: 1 },
  { code: "ECE103", name: "Network Theory", department: "ECE", year: 1 },
  {
    code: "CSE203",
    name: "Object Oriented Programming",
    department: "CSE",
    year: 2,
  },
  {
    code: "ECE203",
    name: "Electromagnetic Fields",
    department: "ECE",
    year: 2,
  },
  { code: "CSE303", name: "Computer Networks", department: "CSE", year: 3 },
  { code: "ECE303", name: "Control Engineering", department: "ECE", year: 3 },
  { code: "CSE403", name: "Cyber Security", department: "CSE", year: 4 },
  { code: "ECE403", name: "Microwave Engineering", department: "ECE", year: 4 },
];
const DEFAULT_STUDENT_NAMES = {
  CSE: [
    ["Aarav Sharma", "Diya Patel", "Kabir Singh", "Ananya Reddy", "Vivaan Gupta"],
    ["Ishaan Verma", "Meera Nair", "Arjun Kumar", "Kavya Iyer", "Rohan Das"],
    ["Aditya Rao", "Saanvi Joshi", "Karthik Menon", "Nisha Kapoor", "Rahul Sethi"],
    ["Siddharth Jain", "Priya Malhotra", "Neel Shah", "Aditi Kulkarni", "Manav Bansal"],
  ],
  ECE: [
    ["Harsha Vardhan", "Siri Chand", "Yashwanth Sai", "Keerthana Devi", "Pranav Teja"],
    ["Rithvik Raju", "Anjali Sree", "Nikhil Reddy", "Harini Lakshmi", "Varun Krishna"],
    ["Srinivas Naidu", "Bhavya Sri", "Lokesh Kumar", "Deepika Rao", "Charan Kumar"],
    ["Vignesh Babu", "Swathi Priya", "Akshay Raj", "Madhuri Rani", "Surya Prakash"],
  ],
};
const STUDENT_PREFIXES = {
  CSE: ["26611A", "25612A", "24613A", "23614A"],
  ECE: ["26611B", "25612B", "24613B", "23614B"],
};
export const DEFAULT_STUDENTS = Object.entries(DEFAULT_STUDENT_NAMES).flatMap(
  ([department, years]) =>
    years.flatMap((names, yearIndex) =>
      names.map((name, index) => ({
        id: `${STUDENT_PREFIXES[department][yearIndex]}${String(index + 1).padStart(2, "0")}`,
        name,
        email: `${name.toLowerCase().replaceAll(" ", ".")}@example.com`,
        department,
        year: yearIndex + 1,
        is_active: true,
        attended_classes: 0,
        total_classes: 0,
      })),
    ),
);
export const seed = { teachers: [], students: DEFAULT_STUDENTS };
export const getLocal = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("campus-data") || "null");
    if (!saved) return structuredClone(seed);
    const existingIds = new Set((saved.students || []).map((student) => student.id));
    const students = [
      ...(saved.students || []),
      ...DEFAULT_STUDENTS.filter((student) => !existingIds.has(student.id)),
    ];
    const data = { teachers: saved.teachers || [], students };
    localStorage.setItem("campus-data", JSON.stringify(data));
    return data;
  } catch {
    return structuredClone(seed);
  }
};
export const saveLocal = (data) =>
  localStorage.setItem("campus-data", JSON.stringify(data));
