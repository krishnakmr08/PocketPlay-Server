import Play from "../models/Play.js";

const selectors =
  "_id title description likes rating starred thumbnail_url stream_url genre";

export const getPlays = async (req, res) => {
  const livePlays = await Play.find({ is_live: true }).select(selectors).lean();

  const topLikedPlays = await Play.find({})
    .sort({ likes: -1 })
    .limit(10)
    .select(selectors)
    .lean();

  const topStarredPlays = await Play.find({})
    .sort({ starred: -1 })
    .limit(10)
    .select(selectors)
    .lean();

  const topRatedPlays = await Play.find({})
    .sort({ rating: -1 })
    .limit(10)
    .select(selectors)
    .lean();

  res.status(200).json({
    live: livePlays,
    top_liked: topLikedPlays,
    top_starred: topStarredPlays,
    top_rated: topRatedPlays,
  });
};
