// src/components/TeacherDashboard/Sidebar.tsx

const Sidebar = () => (
  <aside className="bg-gray-900 text-white w-full md:w-64 flex-shrink-0 py-8 px-6 fixed md:static top-0 left-0 h-20 md:h-screen z-10 shadow-lg md:shadow-none">
    <div className="font-bold text-2xl mb-10 hidden md:block">Teacher Admin</div>
    <nav>
      <ul className="flex md:flex-col gap-2">
        <li>
          <a href="#" className="block px-4 py-2 rounded-lg bg-blue-700 text-white font-semibold">
            Lessons
          </a>
        </li>
        <li>
          <a href="#" className="block px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            Students
          </a>
        </li>
        <li>
          <a href="#" className="block px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            Settings
          </a>
        </li>
      </ul>
    </nav>
  </aside>
);

export default Sidebar;
