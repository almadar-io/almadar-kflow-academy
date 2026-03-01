import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { AppLayoutTemplate } from './AppLayoutTemplate';
import { 
  Home, 
  BookOpen, 
  GraduationCap, 
  Settings, 
  BarChart3, 
  Users, 
  Brain,
  LayoutDashboard,
  Bell,
  Search,
  FileText,
  Network,
  Award,
  Sun,
  Moon
} from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { Badge } from '../../atoms/Badge';
import { useState } from 'react';
import { ThemeProvider } from '../../../contexts/ThemeContext';

const meta: Meta<typeof AppLayoutTemplate> = {
  title: 'Templates/AppLayoutTemplate',
  component: AppLayoutTemplate,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AppLayoutTemplate>;

// Sample navigation items
const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true, onClick: () => console.log('Dashboard') },
  { id: 'learn', label: 'Learn', icon: Brain, onClick: () => console.log('Learn') },
  { id: 'courses', label: 'Courses', icon: BookOpen, badge: 3, onClick: () => console.log('Courses') },
  { id: 'progress', label: 'Progress', icon: BarChart3, onClick: () => console.log('Progress') },
  { id: 'notifications', label: 'Notifications', icon: Bell, badge: 5, onClick: () => console.log('Notifications') },
  { id: 'settings', label: 'Settings', icon: Settings, onClick: () => console.log('Settings') },
];

const minimalNavItems = [
  { id: 'home', label: 'Home', icon: Home, active: true, onClick: () => console.log('Home') },
  { id: 'courses', label: 'Courses', icon: BookOpen, onClick: () => console.log('Courses') },
];

// Sample user data
const sampleUser = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: 'https://i.pravatar.cc/150?img=12',
};

const sampleUserNoAvatar = {
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
};

// Sample content component
const SampleContent = () => (
  <div className="space-y-6">
    <div>
      <Typography variant="h2" className="mb-2">Welcome to AppLayoutTemplate</Typography>
      <Typography variant="body" color="secondary">
        This is a shared layout template that provides consistent sidebar, mobile header, and content area structure.
      </Typography>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <Typography variant="h6" className="mb-2">Card 1</Typography>
        <Typography variant="body" color="secondary">
          Sample card content to demonstrate the layout.
        </Typography>
      </Card>
      <Card>
        <Typography variant="h6" className="mb-2">Card 2</Typography>
        <Typography variant="body" color="secondary">
          Cards are responsive and adapt to the container width.
        </Typography>
      </Card>
      <Card>
        <Typography variant="h6" className="mb-2">Card 3</Typography>
        <Typography variant="body" color="secondary">
          The layout provides consistent spacing and padding.
        </Typography>
      </Card>
    </div>
  </div>
);

// Theme toggle component for stories
const ThemeToggleStory = () => {
  const [isDark, setIsDark] = useState(false);
  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export const Default: Story = {
  args: {
    navigationItems,
    user: sampleUser,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    children: <SampleContent />,
  },
};

export const WithCustomLogo: Story = {
  args: {
    navigationItems,
    user: sampleUser,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    logo: (
      <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-lg">K</span>
      </div>
    ),
    children: <SampleContent />,
  },
};

export const WithoutUser: Story = {
  args: {
    navigationItems,
    brandName: 'KFlow',
    children: <SampleContent />,
  },
};

export const UserWithoutLogout: Story = {
  args: {
    navigationItems,
    user: sampleUser,
    brandName: 'KFlow',
    children: <SampleContent />,
  },
};

export const UserWithoutAvatar: Story = {
  args: {
    navigationItems,
    user: sampleUserNoAvatar,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    children: <SampleContent />,
  },
};

export const CollapsedSidebar: Story = {
  args: {
    navigationItems,
    user: sampleUser,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    defaultSidebarCollapsed: true,
    children: <SampleContent />,
  },
};

export const MinimalNavigation: Story = {
  args: {
    navigationItems: minimalNavItems,
    user: sampleUser,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    children: <SampleContent />,
  },
};

export const WithPageHeader: Story = {
  args: {
    navigationItems,
    user: sampleUser,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    pageHeader: (
      <div className="flex items-center justify-between w-full">
        <div>
          <Typography variant="h4">Page Title</Typography>
          <Typography variant="body" color="secondary" className="text-sm">
            Page subtitle or description
          </Typography>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">Action</Button>
          <Button variant="primary" size="sm">Primary Action</Button>
        </div>
      </div>
    ),
    children: <SampleContent />,
  },
};

export const CustomMobileHeaderActions: Story = {
  args: {
    navigationItems,
    user: sampleUser,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    mobileHeaderActions: (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" icon={Search} aria-label="Search" />
        <Button variant="ghost" size="sm" icon={Bell} aria-label="Notifications">
          <Badge variant="primary" size="sm" className="ml-1">3</Badge>
        </Button>
        <ThemeToggleStory />
      </div>
    ),
    children: <SampleContent />,
  },
};

export const CustomSidebarFooter: Story = {
  args: {
    navigationItems,
    user: sampleUser,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    sidebarFooterContent: (
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <Typography variant="small" color="secondary" className="text-center">
          Version 1.0.0
        </Typography>
      </div>
    ),
    children: <SampleContent />,
  },
};

export const CustomSidebarUserSection: Story = {
  args: {
    navigationItems,
    user: sampleUser,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    sidebarUserSection: (
      <div className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">
          JD
        </div>
        <div className="flex-1 min-w-0">
          <Typography variant="small" weight="medium" className="truncate">
            {sampleUser.name}
          </Typography>
          <Typography variant="small" color="secondary" className="text-xs truncate">
            Premium Member
          </Typography>
        </div>
      </div>
    ),
    children: <SampleContent />,
  },
};

export const NoContentPadding: Story = {
  args: {
    navigationItems,
    user: sampleUser,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    contentPadding: false,
    children: (
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-8">
        <Typography variant="h2" className="text-white mb-4">
          Full-width Content
        </Typography>
        <Typography variant="body" className="text-white/90">
          This content has no padding and spans the full width of the container.
        </Typography>
      </div>
    ),
  },
};

export const CustomContentClassName: Story = {
  args: {
    navigationItems,
    user: sampleUser,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    contentClassName: 'bg-gray-100 dark:bg-gray-800',
    children: <SampleContent />,
  },
};

export const HideSidebar: Story = {
  args: {
    navigationItems,
    user: sampleUser,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    hideSidebar: true,
    children: <SampleContent />,
  },
};

export const HideMobileHeader: Story = {
  args: {
    navigationItems,
    user: sampleUser,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    hideMobileHeader: true,
    children: <SampleContent />,
  },
};

export const ComplexContent: Story = {
  args: {
    navigationItems,
    user: sampleUser,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    children: (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <Typography variant="h6" className="mb-2">Stat {i}</Typography>
              <Typography variant="h3" className="mb-1">1,234</Typography>
              <Typography variant="small" color="secondary">
                +12% from last month
              </Typography>
            </Card>
          ))}
        </div>
        
        <Card>
          <Typography variant="h4" className="mb-4">Recent Activity</Typography>
          <div className="space-y-3">
            {[
              { title: 'Completed lesson', time: '2 hours ago' },
              { title: 'Started new course', time: '5 hours ago' },
              { title: 'Earned achievement', time: '1 day ago' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Typography variant="body">{activity.title}</Typography>
                <Typography variant="small" color="secondary">{activity.time}</Typography>
              </div>
            ))}
          </div>
        </Card>
      </div>
    ),
  },
};

export const Mobile: Story = {
  args: {
    navigationItems,
    user: sampleUser,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    children: <SampleContent />,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

export const Tablet: Story = {
  args: {
    navigationItems,
    user: sampleUser,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    children: <SampleContent />,
  },
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
};

export const Desktop: Story = {
  args: {
    navigationItems,
    user: sampleUser,
    onLogout: () => console.log('Logout clicked'),
    brandName: 'KFlow',
    children: <SampleContent />,
  },
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
};
