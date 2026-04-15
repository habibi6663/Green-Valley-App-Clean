import { Student } from '../types';

export type RollNumberMode = 'manual' | 'auto';

export interface RollNumberScope {
  classValue: string;
  section: string;
  admissionYear?: string | number;
}

export interface RollNumberRecord {
  rollNumber: string;
  rollNumberKey: string;
  rollNumberSequence: number;
  rollNumberMode: RollNumberMode;
  admissionYear: string;
}

export interface RollNumberSource {
  id?: string;
  rollNumber?: string | null;
  rollNumberKey?: string | null;
  rollNumberSequence?: number | null;
  class?: string | null;
  section?: string | null;
  admissionYear?: string | number | null;
}

const FALLBACK_YEAR = new Date().getFullYear().toString();

function padSequence(value: number | string) {
  const digits = String(value).replace(/\D/g, '');
  const parsed = Math.max(0, Number.parseInt(digits || '0', 10));
  return String(parsed).padStart(3, '0');
}

export function normalizeClassCode(classValue: string) {
  const compact = String(classValue || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!compact) return 'CLASS';
  return compact.startsWith('CLASS') ? compact : `CLASS${compact}`;
}

export function normalizeSectionCode(section: string) {
  const compact = String(section || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return compact || 'A';
}

export function normalizeAdmissionYear(admissionYear?: string | number) {
  const raw = String(admissionYear ?? '').trim();
  const match = raw.match(/\d{4}/);
  return match ? match[0] : FALLBACK_YEAR;
}

export function normalizeRollNumberInput(value: string) {
  const trimmed = String(value || '').trim().toUpperCase();
  if (!trimmed) return '';

  const compact = trimmed.replace(/\s+/g, '');
  const classicMatch = compact.match(/^CLASS([A-Z0-9]+)-([A-Z0-9]+)-(?:(\d{4})-)?(\d+)$/);
  if (classicMatch) {
    const [, classCode, section, year, sequence] = classicMatch;
    return `CLASS${classCode}-${section}-${year ? `${year}-` : ''}${padSequence(sequence)}`;
  }

  return compact.replace(/[^A-Z0-9-]/g, '');
}

function extractSequence(value: string) {
  const match = value.match(/(\d{1,6})$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

export function buildRollNumberRecord({
  classValue,
  section,
  admissionYear,
  sequence,
  mode,
}: RollNumberScope & { sequence: number; mode: RollNumberMode }): RollNumberRecord {
  const classCode = normalizeClassCode(classValue);
  const sectionCode = normalizeSectionCode(section);
  const year = normalizeAdmissionYear(admissionYear);
  const formattedSequence = padSequence(sequence);
  return {
    rollNumber: `${classCode}-${sectionCode}-${formattedSequence}`,
    rollNumberKey: `${classCode}|${sectionCode}|${year}|${formattedSequence}`,
    rollNumberSequence: sequence,
    rollNumberMode: mode,
    admissionYear: year,
  };
}

export function parseRollNumberSource(record: RollNumberSource) {
  const rollNumber = normalizeRollNumberInput(record.rollNumber || '');
  const classCode = normalizeClassCode(record.class || '');
  const sectionCode = normalizeSectionCode(record.section || '');
  const year = normalizeAdmissionYear(record.admissionYear);

  const keyFromValue = rollNumber.match(/^CLASS([A-Z0-9]+)-([A-Z0-9]+)-(?:(\d{4})-)?(\d{3})$/);
  if (keyFromValue) {
    const [, parsedClass, parsedSection, parsedYear, parsedSequence] = keyFromValue;
    return {
      rollNumber: `CLASS${parsedClass}-${parsedSection}-${parsedYear ? `${parsedYear}-` : ''}${parsedSequence}`,
      rollNumberKey: `CLASS${parsedClass}|${parsedSection}|${parsedYear || year}|${parsedSequence}`,
      rollNumberSequence: Number.parseInt(parsedSequence, 10),
      admissionYear: parsedYear || year,
    };
  }

  const sequence = record.rollNumberSequence ?? extractSequence(rollNumber) ?? null;
  if (sequence === null) {
    return {
      rollNumber: rollNumber || '',
      rollNumberKey: `${classCode}|${sectionCode}|${year}|000`,
      rollNumberSequence: 0,
      admissionYear: year,
    };
  }

  return {
    rollNumber: `${classCode}-${sectionCode}-${padSequence(sequence)}`,
    rollNumberKey: `${classCode}|${sectionCode}|${year}|${padSequence(sequence)}`,
    rollNumberSequence: sequence,
    admissionYear: year,
  };
}

export function getDisplayRollNumber(record: RollNumberSource | Student | any) {
  const candidate = record?.rollNumber || '';
  const parsed = parseRollNumberSource(record);
  const normalizedCandidate = normalizeRollNumberInput(candidate);

  if (!normalizedCandidate) {
    return parsed.rollNumber || 'Not assigned';
  }

  if (normalizedCandidate.startsWith('CLASS')) {
    return normalizedCandidate;
  }

  if (/^\d+$/.test(normalizedCandidate) && parsed.rollNumber?.startsWith('CLASS')) {
    return parsed.rollNumber;
  }

  return parsed.rollNumber || normalizedCandidate || 'Not assigned';
}

export function isRollNumberDuplicate(
  users: RollNumberSource[],
  candidate: RollNumberRecord,
  excludeId?: string,
) {
  return users.some((user) => {
    if (excludeId && user.id === excludeId) return false;
    const parsed = parseRollNumberSource(user);
    return (
      parsed.rollNumberKey === candidate.rollNumberKey ||
      normalizeRollNumberInput(user.rollNumber || '') === candidate.rollNumber
    );
  });
}

export function getNextRollNumberRecord(
  users: RollNumberSource[],
  scope: RollNumberScope,
): RollNumberRecord {
  const classCode = normalizeClassCode(scope.classValue);
  const sectionCode = normalizeSectionCode(scope.section);
  const year = normalizeAdmissionYear(scope.admissionYear);

  const nextSequence = users
    .filter((user) => {
      const parsed = parseRollNumberSource(user);
      const userClass = normalizeClassCode(user.class || '');
      const userSection = normalizeSectionCode(user.section || '');
      const userYear = normalizeAdmissionYear(user.admissionYear || parsed.admissionYear);
      return userClass === classCode && userSection === sectionCode && userYear === year;
    })
    .reduce((max, user) => {
      const parsed = parseRollNumberSource(user);
      return Math.max(max, parsed.rollNumberSequence || 0);
    }, 0) + 1;

  return buildRollNumberRecord({ ...scope, sequence: nextSequence, mode: 'auto' });
}

export function resolveRollNumberRecord(
  users: RollNumberSource[],
  scope: RollNumberScope,
  input: string,
  mode: RollNumberMode,
  excludeId?: string,
) {
  if (mode === 'auto') {
    const candidate = getNextRollNumberRecord(users, scope);
    return { candidate, error: null };
  }

  const cleanInput = normalizeRollNumberInput(input);
  const digits = cleanInput.match(/(\d{1,6})$/);
  const parsedSequence = digits ? Number.parseInt(digits[1], 10) : null;

  if (!cleanInput) {
    return { candidate: null, error: 'Please enter a roll number.' };
  }

  if (parsedSequence === null) {
    return {
      candidate: null,
      error: 'Roll number must end with a numeric sequence, like 023.',
    };
  }

  const candidate = buildRollNumberRecord({
    ...scope,
    sequence: parsedSequence,
    mode,
  });

  if (isRollNumberDuplicate(users, candidate, excludeId)) {
    return {
      candidate: null,
      error: `Roll number ${candidate.rollNumber} already exists for this class/section.`,
    };
  }

  return { candidate, error: null };
}

export function formatRollNumberError(message: string) {
  return `Roll Number: ${message}`;
}
