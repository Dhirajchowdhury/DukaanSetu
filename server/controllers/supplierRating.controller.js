const { supabase } = require('../config/db');

const getRatings = async (req, res, next) => {
  try {
    const { supplierId } = req.params;

    const { data, error } = await supabase
      .from('supplier_ratings')
      .select(`
        *,
        reviewer:users!reviewer_id(id, shop_name)
      `)
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const agg = await supabase
      .from('supplier_ratings')
      .select('rating', { count: 'exact' })
      .eq('supplier_id', supplierId);

    const ratings = data || [];
    const allRatings = agg.data || [];
    const averageRating = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
      : 0;

    res.json({
      ratings: ratings.map(r => ({
        id: r.id,
        reviewerId: r.reviewer_id,
        reviewer: r.reviewer ? { id: r.reviewer.id, shopName: r.reviewer.shop_name } : null,
        rating: r.rating,
        reviewText: r.review_text,
        createdAt: r.created_at,
      })),
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: allRatings.length,
    });
  } catch (error) {
    next(error);
  }
};

const createRating = async (req, res, next) => {
  try {
    const { supplierId } = req.params;
    const { rating, reviewText } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    if (supplierId === req.user.id) {
      return res.status(400).json({ message: 'Cannot rate yourself' });
    }

    const { data: existing } = await supabase
      .from('supplier_ratings')
      .select('id')
      .eq('reviewer_id', req.user.id)
      .eq('supplier_id', supplierId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ message: 'You have already rated this supplier' });
    }

    const [u1, u2] = [req.user.id, supplierId].sort();
    const { data: conn } = await supabase
      .from('connections')
      .select('id')
      .eq('user_id', u1)
      .eq('connected_user_id', u2)
      .eq('status', 'accepted')
      .maybeSingle();

    if (!conn) {
      return res.status(403).json({ message: 'You can only rate connected suppliers' });
    }

    const { data: ratingData, error } = await supabase
      .from('supplier_ratings')
      .insert({
        reviewer_id: req.user.id,
        supplier_id: supplierId,
        rating,
        review_text: reviewText || null,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Rating submitted successfully',
      rating: {
        id: ratingData.id,
        reviewerId: ratingData.reviewer_id,
        rating: ratingData.rating,
        reviewText: ratingData.review_text,
        createdAt: ratingData.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRatings, createRating };
