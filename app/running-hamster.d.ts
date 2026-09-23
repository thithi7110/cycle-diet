import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'running-hamster': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        speed?: number | string;
        'max-speed'?: number | string;
        response?: number | string;
        shadow?: string;
        paused?: boolean;
      };
    }
  }
}
