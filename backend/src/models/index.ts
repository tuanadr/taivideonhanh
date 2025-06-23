import User from './User';
import RefreshToken from './RefreshToken';

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

export {
  User,
  RefreshToken,
};

export default {
  User,
  RefreshToken,
};
