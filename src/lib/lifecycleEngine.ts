import { Types } from 'mongoose';

import { Archive } from '@/models/Archive';
import { RetentionPolicy } from '@/models/RetentionPolicy';
import { DisposalRequest } from '@/models/DisposalRequest';
import { LifecycleNotification } from '@/models/LifecycleNotification';

function addYears(base: Date, years: number) {
  const d = new Date(base);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function toCode(input: unknown) {
  const raw = String(input ?? '').trim().toUpperCase();
  return raw || 'UNCLASSIFIED';
}

export async function runLifecycleAutomation(limit = 500) {
  const now = new Date();
  const policies = await RetentionPolicy.find({ enabled: true }).lean();
  const byCode = new Map(policies.map((p) => [toCode(p.classificationCode), p]));
  const defaultPolicy = byCode.get('*') || byCode.get('UNCLASSIFIED') || null;

  const archives = await Archive.find({
    status: 'active',
    lifecycleState: { $in: ['ACTIVE', 'INACTIVE'] }
  })
    .sort({ createdAt: 1 })
    .limit(limit);

  const summary = {
    scanned: archives.length,
    transitionedToInactive: 0,
    transitionedToPermanent: 0,
    disposalQueued: 0,
    notificationsCreated: 0
  };

  for (const archive of archives) {
    const classificationCode = toCode((archive as unknown as { classificationCode?: string }).classificationCode);
    const policy = byCode.get(classificationCode) || defaultPolicy;
    if (!policy) continue;

    const baseDate = archive.docDate || archive.createdAt || now;
    const activeUntil = addYears(baseDate, Number(policy.activeRetentionYears || 0));
    const inactiveUntil = addYears(activeUntil, Number(policy.inactiveRetentionYears || 0));

    (archive as unknown as { classificationCode?: string }).classificationCode = classificationCode;
    (archive as unknown as { retentionPolicyCode?: string }).retentionPolicyCode = String(policy.classificationCode || classificationCode);
    (archive as unknown as { retentionActiveUntil?: Date }).retentionActiveUntil = activeUntil;
    (archive as unknown as { retentionInactiveUntil?: Date }).retentionInactiveUntil = inactiveUntil;
    (archive as unknown as { retentionReviewedAt?: Date }).retentionReviewedAt = now;

    const state = String((archive as unknown as { lifecycleState?: string }).lifecycleState || 'ACTIVE');
    if (state === 'ACTIVE' && now >= activeUntil) {
      (archive as unknown as { lifecycleState?: string }).lifecycleState = 'INACTIVE';
      (archive as unknown as { storageTier?: string }).storageTier = 'cold';
      (archive as unknown as { lifecycleStateChangedAt?: Date }).lifecycleStateChangedAt = now;
      summary.transitionedToInactive += 1;
    }

    const currentState = String((archive as unknown as { lifecycleState?: string }).lifecycleState || 'ACTIVE');
    if (currentState === 'INACTIVE' && now >= inactiveUntil) {
      if (String(policy.terminalAction) === 'permanent') {
        (archive as unknown as { lifecycleState?: string }).lifecycleState = 'PERMANENT';
        (archive as unknown as { storageTier?: string }).storageTier = 'cold';
        (archive as unknown as { dispositionAt?: Date }).dispositionAt = now;
        (archive as unknown as { lifecycleStateChangedAt?: Date }).lifecycleStateChangedAt = now;
        summary.transitionedToPermanent += 1;
      } else {
        (archive as unknown as { disposalEligibleAt?: Date }).disposalEligibleAt = now;
        const existingPending = await DisposalRequest.findOne({
          archiveId: archive._id,
          overallStatus: 'pending'
        })
          .select({ _id: 1 })
          .lean();
        if (!existingPending) {
          const roles = (policy.approverRoles || []).filter(Boolean);
          const stages = (roles.length ? roles : ['admin', 'admin']).map((role, idx) => ({
            order: idx + 1,
            role,
            status: 'pending' as const,
            decidedBy: { userId: '', name: '', phone: '' },
            decidedAt: null,
            note: ''
          }));
          await DisposalRequest.create({
            archiveId: archive._id,
            classificationCode,
            policyCode: String(policy.classificationCode || classificationCode),
            eligibleAt: now,
            overallStatus: 'pending',
            stages,
            createdBySystem: true
          });
          summary.disposalQueued += 1;

          const notifiedBefore = (archive as unknown as { disposalNotifiedAt?: Date | null }).disposalNotifiedAt;
          if (!notifiedBefore) {
            await LifecycleNotification.create({
              type: 'disposal_eligible',
              archiveId: archive._id,
              classificationCode,
              title: `Archive eligible for disposal (${classificationCode})`,
              message: `Archive ${archive.originalName} has reached disposal eligibility and requires approval.`,
              forRoles: ['admin']
            });
            (archive as unknown as { disposalNotifiedAt?: Date }).disposalNotifiedAt = now;
            summary.notificationsCreated += 1;
          }
        }
      }
    }

    await archive.save();
  }

  return summary;
}

export async function executeApprovedDisposal(disposalRequestId: string) {
  const req = await DisposalRequest.findById(disposalRequestId);
  if (!req) throw new Error('REQUEST_NOT_FOUND');
  if (req.overallStatus !== 'approved') throw new Error('REQUEST_NOT_APPROVED');

  const archive = await Archive.findById(req.archiveId);
  if (!archive) throw new Error('ARCHIVE_NOT_FOUND');

  (archive as unknown as { lifecycleState?: string }).lifecycleState = 'DISPOSED';
  (archive as unknown as { lifecycleStateChangedAt?: Date }).lifecycleStateChangedAt = new Date();
  (archive as unknown as { dispositionAt?: Date }).dispositionAt = new Date();
  archive.status = 'deleted';
  archive.trashedAt = new Date();
  await archive.save();

  req.overallStatus = 'executed';
  req.executedAt = new Date();
  await req.save();

  return {
    archiveId: String(archive._id),
    requestId: String(req._id)
  };
}

export function isValidObjectId(id: string) {
  return Types.ObjectId.isValid(id);
}
