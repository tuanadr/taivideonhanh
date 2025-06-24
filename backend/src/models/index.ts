import User from './User';
import RefreshToken from './RefreshToken';
import StreamToken from './StreamToken';
import SubscriptionPlan from './SubscriptionPlan';
import UserSubscription from './UserSubscription';
import Payment from './Payment';
import Admin from './Admin';
import LegalDocument from './LegalDocument';
import DMCAReport from './DMCAReport';

// Define associations
User.hasMany(RefreshToken, {
  foreignKey: 'user_id',
  as: 'refreshTokens',
  onDelete: 'CASCADE',
});

RefreshToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

User.hasMany(StreamToken, {
  foreignKey: 'user_id',
  as: 'streamTokens',
  onDelete: 'CASCADE',
});

StreamToken.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// Subscription associations
User.hasMany(UserSubscription, {
  foreignKey: 'user_id',
  as: 'subscriptions',
  onDelete: 'CASCADE',
});

UserSubscription.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

UserSubscription.belongsTo(SubscriptionPlan, {
  foreignKey: 'plan_id',
  as: 'plan',
});

SubscriptionPlan.hasMany(UserSubscription, {
  foreignKey: 'plan_id',
  as: 'subscriptions',
});

// Payment associations
User.hasMany(Payment, {
  foreignKey: 'user_id',
  as: 'payments',
  onDelete: 'CASCADE',
});

Payment.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

Payment.belongsTo(UserSubscription, {
  foreignKey: 'subscription_id',
  as: 'subscription',
});

UserSubscription.hasMany(Payment, {
  foreignKey: 'subscription_id',
  as: 'payments',
});

// DMCA Report associations
DMCAReport.belongsTo(Admin, {
  foreignKey: 'processed_by',
  as: 'processedByAdmin',
});

Admin.hasMany(DMCAReport, {
  foreignKey: 'processed_by',
  as: 'processedReports',
});

export {
  User,
  RefreshToken,
  StreamToken,
  SubscriptionPlan,
  UserSubscription,
  Payment,
  Admin,
  LegalDocument,
  DMCAReport,
};

export default {
  User,
  RefreshToken,
  StreamToken,
  SubscriptionPlan,
  UserSubscription,
  Payment,
  Admin,
  LegalDocument,
  DMCAReport,
};
