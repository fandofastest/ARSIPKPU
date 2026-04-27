import { NextResponse } from 'next/server';

import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { Archive } from '@/models/Archive';
import { buildReadAccessOrFilter } from '@/lib/archiveAccess';
import { DisposalRequest } from '@/models/DisposalRequest';
import { LifecycleNotification } from '@/models/LifecycleNotification';

export const runtime = 'nodejs';

type Bucket = { label: string; value: number };

export async function GET() {
  try {
    const me = await requireAuth();
    await dbConnect();

    const accessFilter: Record<string, unknown> = {
      status: 'active',
      $or: buildReadAccessOrFilter(me.userId)
    };

    const [byCategoryRaw, byUploaderRaw, lifecycleRaw, pendingDisposals, unreadNotifications] = await Promise.all([
      Archive.aggregate<{ _id?: string; total: number }>([
        { $match: accessFilter },
        {
          $group: {
            _id: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$category', null] },
                    { $eq: [{ $trim: { input: { $ifNull: ['$category', ''] } } }, ''] }
                  ]
                },
                'Lainnya',
                '$category'
              ]
            },
            total: { $sum: 1 }
          }
        },
        { $sort: { total: -1, _id: 1 } },
        { $limit: 10 }
      ]),
      Archive.aggregate<{ _id?: string; total: number }>([
        { $match: accessFilter },
        {
          $group: {
            _id: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$uploadedBy.name', null] },
                    { $eq: [{ $trim: { input: { $ifNull: ['$uploadedBy.name', ''] } } }, ''] }
                  ]
                },
                'Unknown',
                '$uploadedBy.name'
              ]
            },
            total: { $sum: 1 }
          }
        },
        { $sort: { total: -1, _id: 1 } },
        { $limit: 10 }
      ]),
      Archive.aggregate<{ _id?: string; total: number }>([
        { $match: accessFilter },
        {
          $group: {
            _id: { $ifNull: ['$lifecycleState', 'ACTIVE'] },
            total: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      DisposalRequest.countDocuments({ overallStatus: 'pending' }),
      LifecycleNotification.countDocuments({ type: 'disposal_eligible' })
    ]);

    const byCategory: Bucket[] = byCategoryRaw.map((x) => ({
      label: String(x._id ?? 'Lainnya'),
      value: Number(x.total ?? 0)
    }));
    const byUploader: Bucket[] = byUploaderRaw.map((x) => ({
      label: String(x._id ?? 'Unknown'),
      value: Number(x.total ?? 0)
    }));
    const lifecycle: Bucket[] = lifecycleRaw.map((x) => ({
      label: String(x._id ?? 'ACTIVE'),
      value: Number(x.total ?? 0)
    }));

    return NextResponse.json({
      success: true,
      data: {
        byCategory,
        byUploader,
        lifecycle,
        retentionAlerts: {
          pendingDisposals,
          unreadNotifications
        }
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
