export interface ClockParts {
  hours: number;
  minutes: number;
}

export const padTwoDigits = (value: number): string =>
  String(value).padStart(2, '0');

// Local fields, so the text follows the device clock across DST
export const toDateText = (date: Date): string =>
  `${date.getFullYear()}-${padTwoDigits(date.getMonth() + 1)}-${padTwoDigits(date.getDate())}`;

export const toClockText = (date: Date): string =>
  `${padTwoDigits(date.getHours())}:${padTwoDigits(date.getMinutes())}`;

// Local midnight of a `YYYY-MM-DD` text
export const parseDateText = (text: string): Date => {
  const [year = 0, month = 1, day = 1] = text.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const parseClockText = (text: string): ClockParts => {
  const [hours = 0, minutes = 0] = text.split(':').map(Number);
  return { hours, minutes };
};
