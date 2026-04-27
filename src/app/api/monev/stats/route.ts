import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { dbConnect } from '@/lib/mongodb';
import { Feedback } from '@/models/Feedback';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const me = await requireAuth();
    if (me.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await dbConnect();

    const stats = await Feedback.aggregate([
      {
        $facet: {
          totalStats: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                avgRating: { $avg: '$rating' },
                totalNew: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
                totalReviewed: { $sum: { $cond: [{ $eq: ['$status', 'reviewed'] }, 1, 0] } },
                totalResolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
              }
            }
          ],
          byCategory: [
            {
              $group: {
                _id: '$category',
                value: { $sum: 1 }
              }
            },
            {
              $project: {
                label: '$_id',
                value: 1,
                _id: 0
              }
            }
          ]
        }
      }
    ]);

    const result = stats[0] || {};
    const totalStats = result.totalStats[0] || {
      total: 0,
      avgRating: 0,
      totalNew: 0,
      totalReviewed: 0,
      totalResolved: 0
    };

    return NextResponse.json({
      success: true,
      data: {
        total: totalStats.total,
        avgRating: totalStats.avgRating ? totalStats.avgRating.toFixed(1) : '0.0',
        totalNew: totalStats.totalNew,
        totalReviewed: totalStats.totalReviewed,
        totalResolved: totalStats.totalResolved,
        byCategory: result.byCategory || []
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    const status = msg === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ error: msg === 'UNAUTHORIZED' ? 'Unauthorized' : msg }, { status });
  }
}
