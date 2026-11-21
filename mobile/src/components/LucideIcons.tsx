import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export interface LucideIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

type SvgNode =
  | ['path', { d: string }]
  | ['circle', { cx: string | number; cy: string | number; r: string | number }]
  | ['rect', { x: string | number; y: string | number; width: string | number; height: string | number; rx?: string | number }];

function createSvgIcon(nodes: SvgNode[]) {
  return function Icon({ size = 24, color = '#0f172a', strokeWidth = 2 }: LucideIconProps) {
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {nodes.map((node, idx) => {
          const [tag, props] = node;
          if (tag === 'path') {
            return <Path key={idx} d={props.d} />;
          }
          if (tag === 'circle') {
            return <Circle key={idx} cx={props.cx} cy={props.cy} r={props.r} />;
          }
          if (tag === 'rect') {
            return (
              <Rect
                key={idx}
                x={props.x}
                y={props.y}
                width={props.width}
                height={props.height}
                rx={props.rx}
              />
            );
          }
          return null;
        })}
      </Svg>
    );
  };
}

export const BusFront = createSvgIcon([
  ['path', { d: 'M4 6 2 7' }],
  ['path', { d: 'M10 6h4' }],
  ['path', { d: 'm22 7-2-1' }],
  ['rect', { width: '16', height: '16', x: '4', y: '3', rx: '2' }],
  ['path', { d: 'M4 11h16' }],
  ['path', { d: 'M8 15h.01' }],
  ['path', { d: 'M16 15h.01' }],
  ['path', { d: 'M6 19v2' }],
  ['path', { d: 'M18 21v-2' }],
]);

export const Home = createSvgIcon([
  ['path', { d: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8' }],
  ['path', { d: 'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }],
]);

export const Ticket = createSvgIcon([
  ['path', { d: 'M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z' }],
  ['path', { d: 'M13 5v2' }],
  ['path', { d: 'M13 17v2' }],
  ['path', { d: 'M13 11v2' }],
]);

export const User = createSvgIcon([
  ['path', { d: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' }],
  ['circle', { cx: '12', cy: '7', r: '4' }],
]);

export const Eye = createSvgIcon([
  ['path', { d: 'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0' }],
  ['circle', { cx: '12', cy: '12', r: '3' }],
]);

export const EyeOff = createSvgIcon([
  ['path', { d: 'M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49' }],
  ['path', { d: 'M14.084 14.158a3 3 0 0 1-4.242-4.242' }],
  ['path', { d: 'M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143' }],
  ['path', { d: 'm2 2 20 20' }],
]);

export const Check = createSvgIcon([
  ['path', { d: 'M20 6 9 17l-5-5' }],
]);

export const SlidersHorizontal = createSvgIcon([
  ['path', { d: 'M10 5H3' }],
  ['path', { d: 'M12 19H3' }],
  ['path', { d: 'M14 3v4' }],
  ['path', { d: 'M16 17v4' }],
  ['path', { d: 'M21 12h-9' }],
  ['path', { d: 'M21 19h-5' }],
  ['path', { d: 'M21 5h-7' }],
  ['path', { d: 'M8 10v4' }],
  ['path', { d: 'M8 12H3' }],
]);

export const MapPin = createSvgIcon([
  ['path', { d: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0' }],
  ['circle', { cx: '12', cy: '10', r: '3' }],
]);

export const Building2 = createSvgIcon([
  ['path', { d: 'M10 12h4' }],
  ['path', { d: 'M10 8h4' }],
  ['path', { d: 'M14 21v-3a2 2 0 0 0-4 0v3' }],
  ['path', { d: 'M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2' }],
  ['path', { d: 'M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16' }],
]);

export const Car = createSvgIcon([
  ['path', { d: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2' }],
  ['circle', { cx: '7', cy: '17', r: '2' }],
  ['path', { d: 'M9 17h6' }],
  ['circle', { cx: '17', cy: '17', r: '2' }],
]);

export const Calendar = createSvgIcon([
  ['path', { d: 'M8 2v3' }],
  ['path', { d: 'M16 2v3' }],
  ['rect', { x: '3', y: '3', width: '18', height: '18', rx: '2' }],
  ['path', { d: 'M3 9h18' }],
]);

export const Search = createSvgIcon([
  ['path', { d: 'm21 21-4.34-4.34' }],
  ['circle', { cx: '11', cy: '11', r: '8' }],
]);

export const Info = createSvgIcon([
  ['circle', { cx: '12', cy: '12', r: '10' }],
  ['path', { d: 'M12 16v-4' }],
  ['path', { d: 'M12 8h.01' }],
]);

export const ArrowUpDown = createSvgIcon([
  ['path', { d: 'm21 16-4 4-4-4' }],
  ['path', { d: 'M17 20V4' }],
  ['path', { d: 'm3 8 4-4 4 4' }],
  ['path', { d: 'M7 4v16' }],
]);

export const ChevronDown = createSvgIcon([
  ['path', { d: 'm6 9 6 6 6-6' }],
]);

export const ChevronRight = createSvgIcon([
  ['path', { d: 'm9 18 6-6-6-6' }],
]);

export const ChevronLeft = createSvgIcon([
  ['path', { d: 'm15 18-6-6 6-6' }],
]);

export const Phone = createSvgIcon([
  ['path', { d: 'M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384' }],
]);

export const Route = createSvgIcon([
  ['path', { d: 'M9 5h8.5a1 1 0 010 7h-11a1 1 0 000 7H15' }],
  ['circle', { cx: '18', cy: '19', r: '3' }],
  ['circle', { cx: '6', cy: '5', r: '3' }],
]);

export const Clock = createSvgIcon([
  ['circle', { cx: '12', cy: '12', r: '10' }],
  ['path', { d: 'M12 6v6l4 2' }],
]);

export const Pencil = createSvgIcon([
  ['path', { d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z' }],
  ['path', { d: 'm15 5 4 4' }],
]);

export const LogOut = createSvgIcon([
  ['path', { d: 'm16 17 5-5-5-5' }],
  ['path', { d: 'M21 12H9' }],
  ['path', { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' }],
]);

export const ShieldCheck = createSvgIcon([
  ['path', { d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' }],
  ['path', { d: 'm9 12 2 2 4-4' }],
]);

export const X = createSvgIcon([
  ['path', { d: 'M18 6 6 18' }],
  ['path', { d: 'm6 6 12 12' }],
]);

export function Star({
  size = 24,
  color = '#f59e0b',
  strokeWidth = 2,
  filled = false,
}: LucideIconProps & { filled?: boolean }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3L5.8 21 7 14.2 2 9.3l6.9-1L12 2Z" />
    </Svg>
  );
}
