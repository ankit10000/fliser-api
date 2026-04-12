import { connectDB } from '../../lib/db.js';
import { requireAuth } from '../../lib/middleware.js';
import User from '../../models/User.js';
import Doctor from '../../models/Doctor.js';

async function handler(req, res) {
  await connectDB();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { search, specialization, minRating, sortBy = 'rating', page = 1, limit = 20 } = req.query;

  const doctorFilter = {};
  if (specialization) doctorFilter.specialization = specialization;
  if (minRating) doctorFilter.rating = { $gte: parseFloat(minRating) };

  const userFilter = { role: 'doctor' };
  if (search) {
    userFilter.name = { $regex: search, $options: 'i' };
  }

  const doctorUserIds = await Doctor.find(doctorFilter).select('userId').lean();
  const userIds = doctorUserIds.map((d) => d.userId);
  userFilter._id = { $in: userIds };

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [users, total] = await Promise.all([
    User.find(userFilter)
      .select('_id name email profilePhoto phone address bio')
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    User.countDocuments(userFilter),
  ]);

  const userIdMap = users.reduce((acc, u) => { acc[u._id.toString()] = u; return acc; }, {});
  const allUserIds = users.map((u) => u._id);

  const doctorProfiles = await Doctor.find({ userId: { $in: allUserIds }, ...doctorFilter }).lean();

  let doctors = doctorProfiles.map((doc) => {
    const user = userIdMap[doc.userId.toString()];
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePhoto: user.profilePhoto,
      phone: user.phone,
      address: user.address,
      bio: user.bio,
      specialization: doc.specialization,
      specification: doc.specification,
      rating: doc.rating,
      openHour: doc.openHour,
      closeHour: doc.closeHour,
      consultationFee: doc.consultationFee,
      yearsExperience: doc.yearsExperience,
      isAvailable: doc.isAvailable,
      languages: doc.languages,
    };
  }).filter(Boolean);

  if (sortBy === 'rating') doctors.sort((a, b) => b.rating - a.rating);
  else if (sortBy === 'name') doctors.sort((a, b) => a.name.localeCompare(b.name));

  return res.status(200).json({
    doctors,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
  });
}

export default requireAuth(handler);
