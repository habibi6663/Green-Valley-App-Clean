export interface TeacherAssignment {
  class: string;
  section?: string;
}

function normalizeClassValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function getTeacherAssignments(user: any): TeacherAssignment[] {
  const assignments: TeacherAssignment[] = [];

  if (Array.isArray(user?.assignedClasses)) {
    user.assignedClasses.forEach((entry: any) => {
      const className = normalizeClassValue(entry?.class);
      if (!className) return;

      const section = normalizeClassValue(entry?.section) || undefined;
      assignments.push({ class: className, section });
    });
  }

  if (Array.isArray(user?.classes)) {
    user.classes.forEach((entry: unknown) => {
      if (typeof entry === 'string') {
        const className = normalizeClassValue(entry);
        if (className) {
          assignments.push({ class: className });
        }
        return;
      }

      const className = normalizeClassValue((entry as any)?.class);
      if (!className) return;

      const section = normalizeClassValue((entry as any)?.section) || undefined;
      assignments.push({ class: className, section });
    });
  }

  const uniqueAssignments = new Map<string, TeacherAssignment>();
  assignments.forEach((assignment) => {
    const key = `${assignment.class}::${assignment.section || ''}`;
    uniqueAssignments.set(key, assignment);
  });

  return Array.from(uniqueAssignments.values());
}

export function getTeacherClassList(user: any): string[] {
  return Array.from(
    new Set(
      getTeacherAssignments(user)
        .map((assignment) => assignment.class)
        .filter(Boolean)
    )
  );
}
