// src/app/manager-users/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ============ TYPES ============
interface User {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  badgeNumber: string | null;
  department: string | null;
  role: 'law-enforcement' | 'citizen' | 'admin';
  registrationDate: string;
}

// ============ ADMIN LAYOUT COMPONENT ============
function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        
        if (data.success && data.role === 'admin') {
          setIsAuthorized(true);
        } else {
          router.push('/login?error=unauthorized');
        }
      } catch (error) {
        router.push('/login?error=unauthorized');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1e293b] border-b border-[#3b82f6]/30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Crime Alert Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-[#cbd5e1]">Admin</span>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="pt-20">
        {children}
      </main>
    </div>
  );
}

// ============ BUTTON COMPONENT ============
function Button({ 
  children, 
  variant = 'primary', 
  size = 'default',
  className = '',
  onClick,
  disabled = false,
  type = 'button'
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-300 font-sans cursor-pointer';
  
  const variantStyles = {
    primary: 'bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white border border-[#3b82f6] hover:from-[#2563eb] hover:to-[#1e40af] hover:shadow-lg hover:shadow-[#3b82f6]/40 hover:-translate-y-0.5',
    secondary: 'bg-[#1e40af]/20 text-[#60a5fa] border border-[#60a5fa]/30 hover:bg-[#1e40af]/30 hover:border-[#60a5fa]',
    danger: 'bg-[#1e40af]/20 text-[#60a5fa] border border-[#60a5fa]/30 hover:bg-[#1e40af]/30 hover:border-[#60a5fa] hover:-translate-y-0.5',
  };
  
  const sizeStyles = {
    default: 'px-5 py-2.5',
    sm: 'px-3 py-2 text-sm',
    lg: 'px-6 py-3 text-lg',
  };

  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      type={type}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// ============ INPUT COMPONENT ============
function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  onKeyPress,
  className = '',
}: {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyPress={onKeyPress}
      className={className}
    />
  );
}

// ============ SELECT COMPONENT ============
function Select({
  value,
  onValueChange,
  options,
  className = '',
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={className}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// ============ ACTION BAR COMPONENT ============
function ActionBar({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  onSearch,
  showDepartmentFilter,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
  onSearch: () => void;
  showDepartmentFilter: boolean;
}) {
  const departments = [
    { value: '', label: 'All Departments' },
    { value: 'Metro', label: 'Metro Police' },
    { value: 'Investigation', label: 'Criminal Investigation' },
    { value: 'Cybercrime', label: 'Cybercrime' },
    { value: 'Traffic', label: 'Traffic' },
    { value: 'Special', label: 'Special Operations' },
  ];

  const roles = [
    { value: '', label: 'All Users' },
    { value: 'law-enforcement', label: 'Law Enforcement' },
    { value: 'citizen', label: 'Citizens' },
  ];

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="bg-[#1e3a8a]/50 backdrop-blur-[10px] rounded-2xl p-5 mb-5 border border-[#3b82f6]/20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center bg-[#0f172a]/50 rounded-xl px-4 py-2.5 border border-[#3b82f6]/30 flex-1 max-w-md w-full">
          <span className="text-[#cbd5e1]">🔍</span>
          <Input
            type="text"
            placeholder="Search by name, email, or badge number..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyPress={handleKeyPress}
            className="bg-transparent border-none text-[#f1f5f9] placeholder:text-[#94a3b8] outline-none w-full ml-2.5 font-sans"
          />
        </div>
        
        <div className="flex gap-2.5 items-center flex-wrap">
          <Select
            value={roleFilter}
            onValueChange={onRoleFilterChange}
            options={roles}
            className="bg-[#0f172a]/50 border border-[#3b82f6]/30 rounded-xl px-4 py-2.5 text-[#f1f5f9] outline-none cursor-pointer font-sans min-w-[160px]"
          />
          
          {showDepartmentFilter && (
            <Select
              value={departmentFilter}
              onValueChange={onDepartmentFilterChange}
              options={departments}
              className="bg-[#0f172a]/50 border border-[#3b82f6]/30 rounded-xl px-4 py-2.5 text-[#f1f5f9] outline-none cursor-pointer font-sans min-w-[160px]"
            />
          )}
          
          <Button variant="primary" onClick={onSearch}>
            🔍 Search
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ USER TABLE COMPONENT ============
function UserTable({ 
  users, 
  onDeleteUser 
}: { 
  users: User[]; 
  onDeleteUser: (userId: string, firstName: string, lastName: string, role: string) => void;
}) {
  const getInitials = (firstName: string, lastName: string) => {
    const initials = 
      (firstName?.charAt(0) || '') + 
      (lastName?.charAt(0) || '');
    return initials.toUpperCase() || '??';
  };

  const getAvatarClass = (role: string) => {
    return role === 'law-enforcement' ? 'avatar-officer' : 'avatar-citizen';
  };

  const getRoleBadgeClass = (role: string) => {
    return role === 'law-enforcement' ? 'role-officer' : 'role-citizen';
  };

  const formatRole = (role: string) => {
    return role === 'law-enforcement' ? 'Law Enforcement' : 'Citizen';
  };

  if (users.length === 0) {
    return (
      <div className="bg-[#1e3a8a]/50 backdrop-blur-[10px] rounded-2xl border border-[#3b82f6]/20 text-center py-16 px-5">
        <div className="text-6xl mb-5">👤</div>
        <h3 className="text-[#f1f5f9] text-2xl mb-2.5">No users found</h3>
        <p className="text-[#cbd5e1]">Try adjusting your search or filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1e3a8a]/50 backdrop-blur-[10px] rounded-2xl border border-[#3b82f6]/20 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-[#0f172a]/50">
            <tr>
              <th className="px-5 py-4 text-left font-semibold text-[#cbd5e1] text-sm uppercase tracking-[0.5px]">
                User Details
              </th>
              <th className="px-5 py-4 text-left font-semibold text-[#cbd5e1] text-sm uppercase tracking-[0.5px]">
                Role
              </th>
              <th className="px-5 py-4 text-left font-semibold text-[#cbd5e1] text-sm uppercase tracking-[0.5px]">
                Badge Number
              </th>
              <th className="px-5 py-4 text-left font-semibold text-[#cbd5e1] text-sm uppercase tracking-[0.5px]">
                Department
              </th>
              <th className="px-5 py-4 text-left font-semibold text-[#cbd5e1] text-sm uppercase tracking-[0.5px]">
                Phone
              </th>
              <th className="px-5 py-4 text-left font-semibold text-[#cbd5e1] text-sm uppercase tracking-[0.5px]">
                Registration Date
              </th>
              <th className="px-5 py-4 text-left font-semibold text-[#cbd5e1] text-sm uppercase tracking-[0.5px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr 
                key={user.userId} 
                className="border-t border-[#3b82f6]/20 hover:bg-[#3b82f6]/10 transition-colors"
              >
                <td className="px-5 py-5">
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 border-2 border-[#60a5fa]/30
                      ${getAvatarClass(user.role)}
                    `}>
                      {getInitials(user.firstName, user.lastName)}
                    </div>
                    <div>
                      <h4 className="text-[#f1f5f9] text-base mb-0.5">
                        {user.firstName} {user.lastName}
                      </h4>
                      <span className="text-[#94a3b8] text-sm">{user.email}</span>
                      <div className={`
                        inline-block px-2 py-1 rounded-md text-xs font-semibold uppercase mt-1
                        ${getRoleBadgeClass(user.role)}
                      `}>
                        {formatRole(user.role)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-5 text-[#e2e8f0]">{formatRole(user.role)}</td>
                <td className="px-5 py-5 text-[#e2e8f0]">{user.badgeNumber || 'N/A'}</td>
                <td className="px-5 py-5 text-[#e2e8f0]">{user.department || 'N/A'}</td>
                <td className="px-5 py-5 text-[#e2e8f0]">{user.phone || 'N/A'}</td>
                <td className="px-5 py-5 text-[#e2e8f0]">
                  {user.registrationDate ? new Date(user.registrationDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) : 'N/A'}
                </td>
                <td className="px-5 py-5">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDeleteUser(
                      user.userId, 
                      user.firstName, 
                      user.lastName, 
                      user.role
                    )}
                  >
                    🗑️ Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============ PAGINATION COMPONENT ============
function Pagination({ 
  totalItems, 
  currentPage, 
  itemsPerPage, 
  onPageChange 
}: { 
  totalItems: number; 
  currentPage: number; 
  itemsPerPage: number; 
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="bg-[#1e3a8a]/50 backdrop-blur-[10px] rounded-2xl p-5 mt-5 border border-[#3b82f6]/20 flex justify-between items-center flex-wrap gap-4">
      <div className="text-[#cbd5e1]">
        Showing <span className="text-[#f1f5f9] font-semibold">{startItem}-{endItem}</span> of <span className="text-[#f1f5f9] font-semibold">{totalItems}</span> users
      </div>
      
      <div className="flex gap-2.5 flex-wrap">
        <Button
          variant="secondary"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          « Previous
        </Button>
        
        {getPageNumbers().map((page, index) => (
          typeof page === 'number' ? (
            <Button
              key={index}
              variant={currentPage === page ? 'primary' : 'secondary'}
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          ) : (
            <span key={index} className="text-[#cbd5e1] px-2.5 py-2.5">
              {page}
            </span>
          )
        ))}
        
        <Button
          variant="secondary"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next »
        </Button>
      </div>
    </div>
  );
}

// ============ NOTIFICATION TOAST COMPONENT ============
function NotificationToast({ 
  message, 
  type, 
  onClose, 
  autoHideDuration = 5000 
}: { 
  message: string; 
  type: 'success' | 'error' | 'warning'; 
  onClose: () => void; 
  autoHideDuration?: number;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 500);
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [autoHideDuration, onClose]);

  if (!visible) return null;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
  };

  const colors = {
    success: 'border-[#60a5fa]',
    error: 'border-[#3b82f6]',
    warning: 'border-[#60a5fa]',
  };

  return (
    <div className={`
      fixed top-[100px] right-5 bg-[#1e3a8a]/95 text-white p-5 rounded-xl 
      shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-[10000] flex items-center gap-4 
      max-w-md animate-slideIn border-2 ${colors[type]}
    `}>
      <span className="text-2xl">{icons[type]}</span>
      <span className="text-[#f1f5f9] flex-1">{message}</span>
    </div>
  );
}

// ============ MAIN PAGE COMPONENT ============
export default function ManagerUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [showDepartmentFilter, setShowDepartmentFilter] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Load users from database
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);
      if (departmentFilter) params.append('department', departmentFilter);

      const response = await fetch(`/api/users?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.data || []);
        setFilteredUsers(data.data || []);
      } else {
        setNotification({ message: data.error || 'Failed to load users', type: 'error' });
      }
    } catch (error) {
      setNotification({ 
        message: 'Error loading users: ' + (error instanceof Error ? error.message : 'Unknown error'), 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, departmentFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Handle role filter change
  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setShowDepartmentFilter(value === 'law-enforcement');
    if (value !== 'law-enforcement') {
      setDepartmentFilter('');
    }
    setCurrentPage(1);
  };

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1);
    loadUsers();
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string, firstName: string, lastName: string, role: string) => {
    const userType = role === 'law-enforcement' ? 'officer' : 'citizen';
    const confirmMessage = `Are you sure you want to remove ${firstName} ${lastName} (${userType}) from the system? This action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/users?userId=${userId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        const roleDisplay = role === 'law-enforcement' ? 'Officer' : 'Citizen';
        setNotification({ 
          message: `${roleDisplay} ${firstName} ${lastName} removed from the system successfully!`, 
          type: 'success' 
        });
        loadUsers(); // Reload the list
      } else {
        setNotification({ 
          message: data.error || 'Failed to remove user', 
          type: 'error' 
        });
      }
    } catch (error) {
      setNotification({ 
        message: 'Error removing user: ' + (error instanceof Error ? error.message : 'Unknown error'), 
        type: 'error' 
      });
    }
  };

  // Pagination
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Update display count when filtered users change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  return (
    <AdminLayout>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Back Button */}
        <Link 
          href="/admin/dashboard" 
          className="inline-flex items-center gap-2 bg-[#1e40af]/20 text-[#60a5fa] border border-[#60a5fa]/30 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 hover:bg-[#1e40af]/30 hover:border-[#60a5fa] hover:-translate-x-1.5 mb-5"
        >
          ← Back to Dashboard
        </Link>

        {/* Page Header */}
        <div className="bg-[#1e3a8a]/50 backdrop-blur-[10px] rounded-2xl p-6 md:p-8 mb-6 md:mb-8 border border-[#3b82f6]/30">
          <h1 className="text-2xl md:text-4xl text-[#f1f5f9] mb-2.5">👥 Manage Users</h1>
          <p className="text-[#cbd5e1] text-sm md:text-base">
            View and manage all registered users in the system (Law Enforcement Officers &amp; Citizens)
          </p>
        </div>

        {/* Action Bar */}
        <ActionBar
          search={search}
          onSearchChange={setSearch}
          roleFilter={roleFilter}
          onRoleFilterChange={handleRoleFilterChange}
          departmentFilter={departmentFilter}
          onDepartmentFilterChange={setDepartmentFilter}
          onSearch={handleSearch}
          showDepartmentFilter={showDepartmentFilter}
        />

        {/* Loading State */}
        {loading ? (
          <div className="bg-[#1e3a8a]/50 backdrop-blur-[10px] rounded-2xl border border-[#3b82f6]/20 text-center py-16 px-5">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-[#cbd5e1]">Loading users...</p>
          </div>
        ) : (
          <>
            {/* Users Table */}
            <UserTable 
              users={paginatedUsers} 
              onDeleteUser={handleDeleteUser}
            />

            {/* Pagination */}
            <Pagination
              totalItems={totalItems}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}

        {/* Notification Toast */}
        {notification && (
          <NotificationToast
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}