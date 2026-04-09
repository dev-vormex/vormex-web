import type { SVGProps } from 'react';

type TabIconProps = SVGProps<SVGSVGElement>;

function BaseTabIcon(props: TabIconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function PeopleYouKnowTabIcon(props: TabIconProps) {
  return (
    <BaseTabIcon {...props}>
      <circle cx="7" cy="6.2" r="2.2" />
      <path d="M3.5 14.6c0-2.3 1.7-4 3.5-4s3.5 1.7 3.5 4" />
      <circle cx="14.1" cy="7.1" r="2.1" />
      <path d="m15.6 8.7 2 2" />
    </BaseTabIcon>
  );
}

export function AllPeopleTabIcon(props: TabIconProps) {
  return (
    <BaseTabIcon {...props}>
      <circle cx="7" cy="6.1" r="2.2" />
      <path d="M3.4 14.7c0-2.3 1.7-4.1 3.6-4.1s3.6 1.8 3.6 4.1" />
      <circle cx="13.6" cy="5.4" r="1.8" />
      <path d="M11.9 12.6c.2-1.8 1.5-3 3.2-3 1.7 0 2.9 1.2 3.1 3" />
    </BaseTabIcon>
  );
}

export function SmartMatchesTabIcon(props: TabIconProps) {
  return (
    <BaseTabIcon {...props}>
      <path d="M11 2.3 5.7 9.4h3.6l-.9 8.3 5.8-7.7H10.7L11 2.3Z" />
    </BaseTabIcon>
  );
}

export function ForYouTabIcon(props: TabIconProps) {
  return (
    <BaseTabIcon {...props}>
      <path d="m10 2.5 1.4 4.1 4.3 1.4-4.3 1.4L10 13.5 8.6 9.4 4.3 8l4.3-1.4L10 2.5Z" />
      <path d="m15.8 12.2.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6.6-1.8Z" />
    </BaseTabIcon>
  );
}

export function SameCampusTabIcon(props: TabIconProps) {
  return (
    <BaseTabIcon {...props}>
      <path d="M10 3.1 2.8 6.8 10 10.5l7.2-3.7L10 3.1Z" />
      <path d="M5 8.4v3.2c0 .8 2.1 2.3 5 2.3s5-1.5 5-2.3V8.4" />
      <path d="M17.2 6.8v5.6" />
      <circle cx="17.2" cy="13.8" r=".6" fill="currentColor" stroke="none" />
    </BaseTabIcon>
  );
}

export function NearbyTabIcon(props: TabIconProps) {
  return (
    <BaseTabIcon {...props}>
      <path d="M10 17.4c3.1-3 4.9-5.8 4.9-8.1a4.9 4.9 0 1 0-9.8 0c0 2.3 1.8 5.1 4.9 8.1Z" />
      <circle cx="10" cy="8.8" r="1.8" />
    </BaseTabIcon>
  );
}
