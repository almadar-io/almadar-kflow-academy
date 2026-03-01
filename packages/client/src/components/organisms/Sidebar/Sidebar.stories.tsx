import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Sidebar, SidebarItem } from './Sidebar';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  Brain,
  Settings,
  HelpCircle,
  Sun,
  Moon
} from 'lucide-react';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const meta: Meta<typeof Sidebar> = {
  title: 'Organisms/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ height: '100vh', display: 'flex' }}>
          <Story />
          <div className="flex-1 bg-gray-100 dark:bg-gray-900 p-4">
            <p className="text-gray-500">Main content area</p>
          </div>
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

const defaultItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { id: 'learn', label: 'Learn', icon: Brain },
  { id: 'mentor', label: 'Mentor', icon: GraduationCap },
  { id: 'courses', label: 'Courses', icon: BookOpen },
];

const itemsWithBadges: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { id: 'learn', label: 'Learn', icon: Brain, badge: 3 },
  { id: 'mentor', label: 'Mentor', icon: GraduationCap },
  { id: 'courses', label: 'Courses', icon: BookOpen, badge: 'New' },
];

// Theme toggle component for stories
const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false);
  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

// User avatar component for stories
const UserAvatar = ({ collapsed }: { collapsed?: boolean }) => (
  collapsed ? (
    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs">
      J
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs">
        J
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-400">John Doe</span>
    </div>
  )
);

export const Default: Story = {
  args: {
    brandName: 'KFlow',
    items: defaultItems,
    footerContent: <ThemeToggle />,
    userSection: <UserAvatar />,
  },
};

export const WithLogo: Story = {
  args: {
    brandName: 'KFlow',
    logo: (
      <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold">K</span>
      </div>
    ),
    items: defaultItems,
    footerContent: <ThemeToggle />,
    userSection: <UserAvatar />,
  },
};

export const WithBadges: Story = {
  args: {
    brandName: 'KFlow',
    items: itemsWithBadges,
    footerContent: <ThemeToggle />,
    userSection: <UserAvatar />,
  },
};

export const Collapsed: Story = {
  args: {
    brandName: 'KFlow',
    items: defaultItems,
    defaultCollapsed: true,
    footerContent: <ThemeToggle />,
    userSection: <UserAvatar collapsed />,
  },
};

export const NoCollapseButton: Story = {
  args: {
    brandName: 'KFlow',
    items: defaultItems,
    hideCollapseButton: true,
    footerContent: <ThemeToggle />,
    userSection: <UserAvatar />,
  },
};

export const WithCloseButton: Story = {
  args: {
    brandName: 'KFlow',
    items: defaultItems,
    showCloseButton: true,
    onClose: () => alert('Close clicked'),
    footerContent: <ThemeToggle />,
    userSection: <UserAvatar />,
  },
};

// Interactive controlled story
const ControlledSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState('dashboard');

  const items: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: activeItem === 'dashboard', onClick: () => setActiveItem('dashboard') },
    { id: 'learn', label: 'Learn', icon: Brain, active: activeItem === 'learn', onClick: () => setActiveItem('learn') },
    { id: 'mentor', label: 'Mentor', icon: GraduationCap, active: activeItem === 'mentor', onClick: () => setActiveItem('mentor') },
    { id: 'courses', label: 'Courses', icon: BookOpen, badge: 5, active: activeItem === 'courses', onClick: () => setActiveItem('courses') },
  ];

  return (
    <Sidebar
      brandName="KFlow"
      items={items}
      collapsed={collapsed}
      onCollapseChange={setCollapsed}
      footerContent={<ThemeToggle />}
      userSection={<UserAvatar collapsed={collapsed} />}
      onLogoClick={() => alert('Logo clicked!')}
    />
  );
};

export const Interactive: Story = {
  render: () => <ControlledSidebar />,
};

// Full example with all features
export const FullExample: Story = {
  args: {
    brandName: 'KFlow',
    logo: (
      <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold">K</span>
      </div>
    ),
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
      { id: 'learn', label: 'Learn', icon: Brain, badge: 2 },
      { id: 'mentor', label: 'Mentor', icon: GraduationCap },
      { id: 'courses', label: 'Courses', icon: BookOpen },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'help', label: 'Help', icon: HelpCircle },
    ],
    footerContent: <ThemeToggle />,
    userSection: <UserAvatar />,
    onLogoClick: () => alert('Navigate to home'),
  },
};
