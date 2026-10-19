import type { AuditLogRepository } from "../repositories/interfaces.js";
import type { AuditActorType, AuditLogEntry } from "../types/domain.js";

export interface AuditContext {
  actorId: string;
  actorType: AuditActorType;
  ip?: string;
  userAgent?: string;
}

export interface RecordAuditInput {
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Service central de journal d'audit. Tous les autres services l'utilisent
 * pour tracer chaque mutation sensible (création/annulation de souscription,
 * rédemption de code promo, autorisation de dépassement, approbation d'une
 * souscription personnalisée, etc.) avec l'auteur, l'état avant/après et le
 * contexte réseau. Le journal est append-only : jamais de update/delete.
 */
export class AuditService {
  constructor(private readonly repo: AuditLogRepository) {}

  async record(ctx: AuditContext, input: RecordAuditInput): Promise<AuditLogEntry> {
    const entry: Omit<AuditLogEntry, "id"> = {
      actorId: ctx.actorId,
      actorType: ctx.actorType,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before,
      after: input.after,
      metadata: JSON.stringify(input.metadata),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      createdAt: (new Date()).toISOString()
    };
    return this.repo.append(entry);
  }

  /**
   * Enveloppe une opération métier : exécute `fn`, puis journalise le résultat
   * même en cas d'erreur (avec l'erreur en métadonnée), pour garantir qu'aucune
   * tentative de mutation sensible ne passe sous le radar.
   */
  async wrap<T>(
    ctx: AuditContext,
    input: Omit<RecordAuditInput, "after"> & { before?: unknown },
    fn: () => Promise<T>,
  ): Promise<T> {
    try {
      const result = await fn();
      await this.record(ctx, { ...input, after: result });
      return result;
    } catch (error) {
      if (process.env.DEBUG_AUDIT === "1") {
        console.error("[audit.wrap]", input.action, error);
      }
      await this.record(ctx, {
        ...input,
        after: undefined,
        metadata: { ...input.metadata, error: error instanceof Error ? error.message : String(error), failed: true },
      });
      throw error;
    }
  }

  async historyForEntity(entityType: string, entityId: string) {
    return this.repo.listForEntity(entityType, entityId);
  }

  async historyForActor(actorId: string) {
    return this.repo.listForActor(actorId);
  }

  async query(filter: { action?: string; entityType?: string; from?: Date; to?: Date }) {
    return this.repo.query(filter);
  }
}
