import type { Meta, StoryObj } from '@storybook/react';
import Sidebar from './Sidebar';

const meta: Meta<typeof Sidebar> = {
  title: 'TeacherDashboard/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const Default: Story = {
  args: {
    activeView: 'Dashboard',
    setActiveView: (view: string) => console.log(`Active view changed to: ${view}`),
  },
};

export const StudentsActive: Story = {
  args: {
    activeView: 'Roster',
    setActiveView: (view: string) => console.log(`Active view changed to: ${view}`),
  },
};

export const SettingsActive: Story = {
  args: {
    activeView: 'Settings',
    setActiveView: (view: string) => console.log(`Active view changed to: ${view}`),
  },
};
