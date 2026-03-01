import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Header } from './Header';
import { useState } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  Brain,
  Bell,
  Sun
} from 'lucide-react';

const meta: Meta<typeof Header> = {
  title: 'Organisms/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="min-h-[200px] bg-gray-100 dark:bg-gray-900">
        <Story />
        <div className="p-4">
          <p className="text-gray-500">Content below header</p>
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Header>;

export const Default: Story = {
  args: {
    brandName: 'KFlow',
    onMenuToggle: () => alert('Menu toggle clicked'),
    userName: 'John Doe',
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
    onMenuToggle: () => alert('Menu toggle clicked'),
    userAvatar: {
      initials: 'JD',
    },
  },
};

export const MenuOpen: Story = {
  args: {
    brandName: 'KFlow',
    isMenuOpen: true,
    onMenuToggle: () => alert('Menu toggle clicked'),
    userName: 'John Doe',
  },
};

export const WithUserAvatar: Story = {
  args: {
    brandName: 'KFlow',
    onMenuToggle: () => alert('Menu toggle clicked'),
    userAvatar: {
      src: 'https://i.pravatar.cc/150?img=3',
      alt: 'John Doe',
    },
    onUserClick: () => alert('User clicked'),
  },
};

export const WithActions: Story = {
  args: {
    brandName: 'KFlow',
    onMenuToggle: () => alert('Menu toggle clicked'),
    userName: 'John',
    actions: (
      <>
        <button className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <Bell size={20} />
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <Sun size={20} />
        </button>
      </>
    ),
  },
};

export const NoMenuToggle: Story = {
  args: {
    brandName: 'KFlow',
    showMenuToggle: false,
    userName: 'John Doe',
  },
};

export const DesktopVariant: Story = {
  args: {
    brandName: 'KFlow',
    variant: 'desktop',
    showMenuToggle: false,
    navigationItems: [
      { label: 'Dashboard', icon: LayoutDashboard, active: true },
      { label: 'Learn', icon: Brain },
      { label: 'Mentor', icon: GraduationCap },
      { label: 'Courses', icon: BookOpen, badge: 3 },
    ],
    userName: 'John Doe',
    onUserClick: () => alert('User clicked'),
  },
};

export const WithSearch: Story = {
  args: {
    brandName: 'KFlow',
    variant: 'desktop',
    showMenuToggle: false,
    showSearch: true,
    searchPlaceholder: 'Search concepts...',
    onSearch: (value) => console.log('Search:', value),
    userName: 'John Doe',
  },
};

export const NotSticky: Story = {
  args: {
    brandName: 'KFlow',
    sticky: false,
    onMenuToggle: () => alert('Menu toggle clicked'),
    userName: 'John Doe',
  },
};

// Interactive controlled story
const InteractiveHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');

  return (
    <div>
      <Header
        brandName="KFlow"
        logo={
          <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">K</span>
          </div>
        }
        isMenuOpen={isMenuOpen}
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
        userAvatar={{ initials: 'JD' }}
        onUserClick={() => alert('Open user menu')}
        onLogoClick={() => alert('Navigate home')}
      />
      <div className="p-4 bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-400">
          Menu is {isMenuOpen ? 'open' : 'closed'}
        </p>
      </div>
    </div>
  );
};

export const Interactive: Story = {
  render: () => <InteractiveHeader />,
};

// Full mobile header example
export const MobileComplete: Story = {
  args: {
    brandName: 'KFlow',
    logo: (
      <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold">K</span>
      </div>
    ),
    onMenuToggle: () => console.log('Toggle menu'),
    userAvatar: {
      initials: 'JD',
    },
    onUserClick: () => console.log('User clicked'),
    onLogoClick: () => console.log('Logo clicked'),
    actions: (
      <button className="p-2 text-gray-500 hover:text-gray-700 relative">
        <Bell size={20} />
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      </button>
    ),
  },
};
