import type { Meta, StoryObj } from '@storybook/react';
import QuantumDemo from './QuantumDemo';

const meta: Meta<typeof QuantumDemo> = {
  title: 'QuantumDemo',
  component: QuantumDemo,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      viewports: {
        quantumDemo: {
          name: 'Quantum Demo',
          styles: {
            width: '640px',
            height: '480px',
          },
        },
      },
      defaultViewport: 'quantumDemo',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof QuantumDemo>;

export const Default: Story = {
  parameters: {
    mockData: [
      {
        url: 'https://quantumai.google/education/thequbitgame',
        method: 'GET',
        status: 200,
        response: '<html><body><canvas>Mocked Qubit Game</canvas></body></html>',
      },
    ],
  },
  decorators: [
    (Story) => {
      const originalCreateElement = document.createElement;
      document.createElement = function(tagName: string) {
        if (tagName.toLowerCase() === 'iframe') {
          const mockIframe = originalCreateElement.call(this, 'div');
          mockIframe.style.width = '100%';
          mockIframe.style.height = '480px';
          mockIframe.style.border = '1px solid #ccc';
          mockIframe.style.display = 'flex';
          mockIframe.style.alignItems = 'center';
          mockIframe.style.justifyContent = 'center';
          mockIframe.style.backgroundColor = '#f0f0f0';
          mockIframe.innerHTML = '<div style="text-align: center; color: #666;"><h3>Mocked Qubit Game</h3><p>Canvas would appear here</p></div>';
          return mockIframe as any;
        }
        return originalCreateElement.call(this, tagName);
      };

      return <Story />;
    },
  ],
};

export const Loading: Story = {
  decorators: [
    (Story) => {
      const originalCreateElement = document.createElement;
      document.createElement = function(tagName: string) {
        if (tagName.toLowerCase() === 'iframe') {
          const mockIframe = originalCreateElement.call(this, 'div');
          mockIframe.style.width = '100%';
          mockIframe.style.height = '480px';
          mockIframe.style.border = '1px solid #ccc';
          mockIframe.style.display = 'flex';
          mockIframe.style.alignItems = 'center';
          mockIframe.style.justifyContent = 'center';
          mockIframe.style.backgroundColor = '#f0f0f0';
          mockIframe.innerHTML = '<div style="text-align: center; color: #666;"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div><p>Loading Quantum Demo...</p></div>';
          setTimeout(() => {
            if (mockIframe.onload) {
              mockIframe.onload({} as any);
            }
          }, 3000);
          return mockIframe as any;
        }
        return originalCreateElement.call(this, tagName);
      };

      return <Story />;
    },
  ],
};
