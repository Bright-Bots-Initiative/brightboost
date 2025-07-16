import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SettingsSidebar from '../components/settings/SettingsSidebar';
import ProfileView from '../components/settings/ProfileView';
import EditProfile from '../components/settings/EditProfile';

const Settings: React.FC = () => {
  return (
    <div className="flex h-full min-h-screen">
      <SettingsSidebar />
      <div className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/settings/profile" replace />} />
          <Route path="/profile" element={<ProfileView />} />
          <Route path="/profile/edit" element={<EditProfile />} />
        </Routes>
      </div>
    </div>
  );
};

export default Settings;