import type { Meta, StoryObj } from '@storybook/react';
import AvatarPicker from './AvatarPicker';

const meta: Meta<typeof AvatarPicker> = {
  title: 'Components/AvatarPicker',
  component: AvatarPicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onAvatarChange: { action: 'avatar-changed' },
    currentAvatarUrl: {
      control: 'text',
      description: 'Current avatar URL to display',
    },
    userInitials: {
      control: 'text',
      description: 'User initials to show as fallback',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    userInitials: 'JD',
    onAvatarChange: (url: string) => console.log('Avatar changed to:', url),
  },
};

export const WithExistingAvatar: Story = {
  args: {
    userInitials: 'JD',
    currentAvatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=john',
    onAvatarChange: (url: string) => console.log('Avatar changed to:', url),
  },
};

export const DifferentInitials: Story = {
  args: {
    userInitials: 'AB',
    onAvatarChange: (url: string) => console.log('Avatar changed to:', url),
  },
};

export const LongInitials: Story = {
  args: {
    userInitials: 'ABC',
    onAvatarChange: (url: string) => console.log('Avatar changed to:', url),
  },
};

export const WithCustomAvatar: Story = {
  args: {
    userInitials: 'SM',
    currentAvatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
    onAvatarChange: (url: string) => console.log('Avatar changed to:', url),
  },
};
