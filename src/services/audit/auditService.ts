// Audit Logging Service
export type AuditAction = 
  | 'registration.created'
  | 'registration.updated'
  | 'payment.initiated'
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.refunded'
  | 'waiver.signed'
  | 'discount.applied';

export interface AuditEntry {
  id: string;
  actorType: 'user' | 'system' | 'guardian';
  actorId?: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, any>;
  createdAt: Date;
}

export const auditService = {
  log: async (entry: Omit<AuditEntry, 'id' | 'createdAt'>) => {
    // Sanitize PII from meta data
    const sanitizedMeta = sanitizePII(entry.meta || {});

    const response = await fetch('/api/audit/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...entry,
        meta: sanitizedMeta,
      }),
    });

    return response.json();
  },

  query: async (filters: {
    actorType?: string;
    actorId?: string;
    action?: AuditAction;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
  }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });

    const response = await fetch(`/api/audit/logs?${params.toString()}`);
    return response.json();
  },
};

function sanitizePII(data: Record<string, any>): Record<string, any> {
  const piiFields = ['email', 'phone', 'ssn', 'address', 'creditCard'];
  const sanitized = { ...data };

  Object.keys(sanitized).forEach(key => {
    if (piiFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}