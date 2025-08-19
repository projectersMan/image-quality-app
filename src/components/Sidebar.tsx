import React from 'react';

interface SidebarProps {
  children: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-content">
        {children}
      </div>
    </div>
  );
};

export default Sidebar;
